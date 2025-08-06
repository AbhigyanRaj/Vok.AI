import express from 'express';
import { makeCall, createTwiMLResponse, validateTwilioRequest } from '../config/twilio.js';
import { transcribeAudio, generateSummary, evaluateApplication } from '../config/openai.js';
import { formatPhoneNumber, validatePhoneNumber } from '../utils/phoneUtils.js';
import twilio from 'twilio';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Track active calls (in memory - in production, use Redis)
const activeCalls = new Map();

// Initiate a call - AUTH REQUIRED
router.post('/initiate', protect, async (req, res) => {
  try {
    const { moduleId, phoneNumber, customerName } = req.body;
    const userId = req.user._id;

    // Validation
    if (!phoneNumber || !customerName) {
      return res.status(400).json({ 
        error: 'Missing required fields: phoneNumber and customerName are required' 
      });
    }

    // Get user and check token balance
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has enough tokens for a call (5 tokens per call)
    if (!user.hasEnoughTokensForCall()) {
      return res.status(402).json({
        error: 'Insufficient tokens',
        message: `You need ${user.getCostPerCall()} tokens to make a call. Current balance: ${user.tokens} tokens.`,
        currentBalance: user.tokens,
        requiredTokens: user.getCostPerCall()
      });
    }

    // Format and validate phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);
    if (!formattedPhone) {
      return res.status(400).json({
        error: 'Invalid phone number format',
        message: 'Phone number must be a valid format (e.g., +91XXXXXXXXXX for Indian numbers)'
      });
    }

    // Check for active calls to the same number
    const existingActiveCall = Array.from(activeCalls.values()).find(
      call => call.phoneNumber === formattedPhone && 
      Date.now() - call.timestamp < 30000 // 30 seconds
    );

    if (existingActiveCall) {
      return res.status(409).json({
        error: 'Call in progress',
        message: 'There is already an active call for this number. Please wait for it to complete.'
      });
    }

    console.log('\n=== Initiating REAL Call ===');
    console.log('User ID:', userId);
    console.log('Customer:', customerName);
    console.log('Phone:', formattedPhone);
    console.log('Tokens before call:', user.tokens);

    // Check if we have Twilio credentials
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      return res.status(500).json({
        error: 'Twilio not configured',
        message: 'Please configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in your .env file'
      });
    }

    // Create Twilio client
    const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    // For now, let's make a simple call without webhooks
    // We'll use Twilio's built-in TwiML for a simple voice message
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say(`Hello ${customerName}, this is a test call from Vok.AI. Thank you for testing our system.`, {
      voice: 'Polly.Aditi'
    });
    twiml.hangup();

    // Make the actual call
    console.log('📞 Making REAL call to:', formattedPhone);
    console.log('📞 From number:', process.env.TWILIO_PHONE_NUMBER);
    
    const call = await twilioClient.calls.create({
      twiml: twiml.toString(),
      to: formattedPhone,
      from: process.env.TWILIO_PHONE_NUMBER
    });

    console.log('✅ REAL call initiated!');
    console.log('Call SID:', call.sid);
    console.log('Call Status:', call.status);

    // Deduct tokens for the call
    const tokensDeducted = user.deductTokens();
    if (!tokensDeducted) {
      return res.status(402).json({
        error: 'Failed to deduct tokens',
        message: 'Unable to deduct tokens for the call'
      });
    }

    // Increment total calls made
    user.totalCallsMade += 1;

    // Save user changes
    await user.save();

    console.log('✅ Tokens deducted successfully');
    console.log('Tokens after call:', user.tokens);
    console.log('Total calls made:', user.totalCallsMade);

    // Create call record
    const callRecord = {
      _id: `call-${Date.now()}`,
      userId: userId,
      customerName: customerName.trim(),
      phoneNumber: formattedPhone,
      twilioCallSid: call.sid,
      status: call.status,
      currentStep: 0,
      tokensUsed: user.getCostPerCall(),
      createdAt: new Date()
    };

    // Add to active calls
    activeCalls.set(callRecord._id, {
      ...callRecord,
      timestamp: Date.now()
    });

    return res.json({
      success: true,
      message: 'REAL call initiated successfully!',
      call: callRecord,
      tokensUsed: user.getCostPerCall(),
      remainingTokens: user.tokens,
      note: 'You should receive a call within 30 seconds'
    });

  } catch (error) {
    console.error('❌ Call initiation error:', error);
    res.status(500).json({ 
      error: 'Failed to initiate call',
      message: error.message 
    });
  }
});

// Twilio webhook for handling voice interactions
router.post('/handle-call', validateTwilioRequest, async (req, res) => {
  try {
    // Get parameters from query string and form data
    const moduleId = req.query.moduleId || req.body.moduleId;
    const customerName = req.query.customerName || req.body.customerName || 'Customer';
    let step = parseInt(req.query.step || req.body.step || '0');
    const phoneNumber = req.query.phoneNumber || req.body.phoneNumber;
    const previousResponse = req.body.SpeechResult || '';

    console.log('\n=== Handle Call Webhook ===');
    console.log('Module ID:', moduleId);
    console.log('Customer:', customerName);
    console.log('Step:', step);
    console.log('Phone:', phoneNumber);
    console.log('Previous Response:', previousResponse);
    
    // Enhanced user input logging
    if (previousResponse) {
      console.log('\n🎤 CUSTOMER SAID:', previousResponse);
      console.log('📝 Response Length:', previousResponse.length, 'characters');
      console.log('🔍 Response Analysis:', previousResponse.toLowerCase().includes('yes') ? 'POSITIVE' : 'NEGATIVE/NEUTRAL');
    }

    // Get module and its questions
    // const module = await Module.findById(moduleId); // Removed database dependency
    // if (!module) {
    //   const errorResponse = createTwiMLResponse();
    //   errorResponse.say('Sorry, there was an error. Please try again later.', { voice: 'Polly.Aditi' });
    //   errorResponse.hangup();
    //   return res.type('text/xml').send(errorResponse.toString());
    // }

    // const questions = module.questions.sort((a, b) => a.order - b.order); // Removed database dependency
    const twimlResponse = createTwiMLResponse();

    // Handle different steps of the call
    if (step === 0) {
      // Initial greeting
      console.log('Starting new call flow (step 0)');
      twimlResponse.say(
        `Hi ${customerName}, we are from VokAI. Is it the right time to speak to you about your ${moduleId === 'mock-module-1' ? 'credit card' : 'loan'} application?`,
        { voice: 'Polly.Aditi' }
      );

      const nextUrl = new URL(`${process.env.BASE_URL}/api/calls/handle-call`);
      nextUrl.searchParams.set('moduleId', moduleId);
      nextUrl.searchParams.set('customerName', customerName);
      nextUrl.searchParams.set('step', '1');
      nextUrl.searchParams.set('phoneNumber', phoneNumber);

      const gather = twimlResponse.gather({
        input: 'speech',
        action: nextUrl.toString(),
        timeout: 5,
        method: 'POST'
      });

    } else if (step === 1) {
      // Check if customer confirmed availability
      if (previousResponse && ['yes', 'okay', 'sure', 'go ahead', 'yeah'].some(word => 
        previousResponse.toLowerCase().includes(word))) {
        
        console.log('\n✅ CUSTOMER CONFIRMED AVAILABILITY!');
        console.log('🎯 Moving to service description...');
        
        // const displayType = module.type === 'credit_card' ? 'credit card' : module.type; // Removed database dependency
        twimlResponse.say(
          `Great! Let me tell you about our service:`,
          { voice: 'Polly.Aditi' }
        );
        twimlResponse.pause({ length: 1 });

        const nextUrl = new URL(`${process.env.BASE_URL}/api/calls/handle-call`);
        nextUrl.searchParams.set('moduleId', moduleId);
        nextUrl.searchParams.set('customerName', customerName);
        nextUrl.searchParams.set('step', '2');
        nextUrl.searchParams.set('phoneNumber', phoneNumber);

        const gather = twimlResponse.gather({
          input: 'speech',
          action: nextUrl.toString(),
          timeout: 10,
          method: 'POST'
        });
        // gather.say(questions[0].question, { voice: 'Polly.Aditi' }); // Removed database dependency

      } else {
        console.log('\n❌ CUSTOMER DECLINED OR NO RESPONSE');
        console.log('📞 Ending call...');
        
        twimlResponse.say(
          "I understand this isn't a good time. We'll call you back later. Thank you!",
          { voice: 'Polly.Aditi' }
        );
        twimlResponse.hangup();
      }

    } else if (step < 2) { // Removed questions.length + 2
      // Handle question responses
      const questionIndex = step - 2;
      
      // Store previous response if available
      if (previousResponse && phoneNumber) {
        console.log(`Storing response for question ${questionIndex}: ${previousResponse}`);
        
        // Update call record with response
        // await Call.findOneAndUpdate( // Removed database dependency
        //   { phoneNumber: phoneNumber, status: { $in: ['initiated', 'ringing', 'in-progress', 'answered'] } },
        //   { 
        //     $set: { 
        //       [`responses.${questionIndex}`]: previousResponse,
        //       currentStep: step,
        //       status: 'in-progress'
        //     }
        //   }
        // );

        // Update active call tracking
        if (activeCalls.has(phoneNumber)) {
          activeCalls.get(phoneNumber).responses.set(questionIndex, previousResponse);
        }
      }

      // Check if we've reached the end of questions
      if (questionIndex >= 2) { // Removed questions.length
        // End of questions - play outro
        console.log('End of questions reached, playing outro...');
        twimlResponse.say(
          'Thank you for providing the information. We are now evaluating your application.',
          { voice: 'Polly.Aditi' }
        );
        twimlResponse.pause({ length: 1 });
        twimlResponse.say(
          'Our team will reach out to you within 24 hours with the results. Have a great day!',
          { voice: 'Polly.Aditi' }
        );
        twimlResponse.hangup();

      } else {
        // Ask next question
        const nextUrl = new URL(`${process.env.BASE_URL}/api/calls/handle-call`);
        nextUrl.searchParams.set('moduleId', moduleId);
        nextUrl.searchParams.set('customerName', customerName);
        nextUrl.searchParams.set('step', (step + 1).toString());
        nextUrl.searchParams.set('phoneNumber', phoneNumber);

        const gather = twimlResponse.gather({
          input: 'speech',
          action: nextUrl.toString(),
          timeout: 10,
          method: 'POST'
        });
        // gather.say(questions[questionIndex].question, { voice: 'Polly.Aditi' }); // Removed database dependency
        console.log(`Asked question ${questionIndex}: ${moduleId === 'mock-module-1' ? 'Is it the right time to speak to you about your credit card application?' : 'Is it the right time to speak to you about your loan application?'}`); // Placeholder question
      }
    }

    res.type('text/xml').send(twimlResponse.toString());

  } catch (error) {
    console.error('Handle call error:', error);
    const errorResponse = createTwiMLResponse();
    errorResponse.say(
      'I apologize, but there was an error. We will call you back later.',
      { voice: 'Polly.Aditi' }
    );
    errorResponse.hangup();
    res.type('text/xml').send(errorResponse.toString());
  }
});

// Twilio webhook for call status updates
router.post('/status', validateTwilioRequest, async (req, res) => {
  try {
    const { CallSid, CallStatus, CallDuration, To: phoneNumber } = req.body;
    
    console.log('\n=== Call Status Update ===');
    console.log('Call SID:', CallSid);
    console.log('Status:', CallStatus);
    console.log('Duration:', CallDuration);
    console.log('Phone:', phoneNumber);

    // Update call record
    // const call = await Call.findOne({ twilioCallSid: CallSid }); // Removed database dependency
    // if (call) {
    //   call.status = CallStatus;
    //   if (CallDuration) call.duration = parseInt(CallDuration);
    //   await call.save();

    //   // If call completed, process the application
    //   if (['completed', 'failed', 'busy', 'no-answer', 'canceled'].includes(CallStatus)) {
    //     await processCallCompletion(call, phoneNumber);
    //   }
    // }

    res.sendStatus(200);
  } catch (error) {
    console.error('Status webhook error:', error);
    res.sendStatus(200); // Still return 200 to Twilio
  }
});

// Process call completion and evaluate application
async function processCallCompletion(call, phoneNumber) {
  try {
    console.log(`Processing completion for call: ${call.twilioCallSid}`);

    // Get responses from call record
    const responses = call.responses || new Map();
    
    if (responses.size === 0) {
      console.log('No responses collected for call');
      return;
    }

    // Get module to determine application type
    // const module = await Module.findById(call.moduleId); // Removed database dependency
    // if (!module) {
    //   console.log('Module not found for call');
    //   return;
    // }

    // Convert Map to object for OpenAI
    const responseData = {};
    responses.forEach((value, key) => {
      responseData[key] = value;
    });

    console.log('Evaluating application with responses:', responseData);

    // Evaluate application using OpenAI
    let evaluation = 'INVESTIGATION_REQUIRED';
    try {
      evaluation = await evaluateApplication('credit_card', responseData); // Placeholder module type
    } catch (error) {
      console.error('Evaluation error:', error);
    }

    // Generate comments based on evaluation
    const comments = [];
    if (evaluation === 'YES') {
      comments.push('Application meets all eligibility criteria');
    } else if (evaluation === 'NO') {
      comments.push('Application does not meet minimum eligibility requirements');
    } else {
      comments.push('Further verification and documentation required');
    }

    if (call.duration < 30) {
      comments.push('Call duration was too short - incomplete information');
    } else if (call.duration < 60) {
      comments.push('Partial information collected');
    }

    // Update call record with evaluation
    // call.evaluation = { // Removed database dependency
    //   result: evaluation,
    //   comments
    // };
    
    // Generate summary using OpenAI
    try {
      const responsesText = Object.entries(responseData)
        .map(([key, value]) => `Q${key}: ${value}`)
        .join('. ');
      // call.summary = await generateSummary(responsesText); // Removed database dependency
    } catch (error) {
      console.error('Summary generation error:', error);
      // call.summary = 'Summary generation failed'; // Removed database dependency
    }

    // await call.save(); // Removed database dependency

    // Update module statistics
    // if (evaluation === 'YES') { // Removed database dependency
    //   await Module.findByIdAndUpdate(call.moduleId, {
    //     $inc: { successfulCalls: 1 }
    //   });
    // }

    // Clean up active call tracking
    if (phoneNumber && activeCalls.has(phoneNumber)) {
      activeCalls.delete(phoneNumber);
    }

    console.log(`Call processing completed. Evaluation: ${evaluation}`);

  } catch (error) {
    console.error('Error processing call completion:', error);
  }
}

// Test Twilio configuration
router.get('/test-twilio', async (req, res) => {
  try {
    console.log('\n=== Testing Twilio Configuration ===');
    
    const config = {
      accountSid: process.env.TWILIO_ACCOUNT_SID ? '✅ Configured' : '❌ Missing',
      authToken: process.env.TWILIO_AUTH_TOKEN ? '✅ Configured' : '❌ Missing',
      phoneNumber: process.env.TWILIO_PHONE_NUMBER ? '✅ Configured' : '❌ Missing'
    };

    console.log('Twilio Account SID:', config.accountSid);
    console.log('Twilio Auth Token:', config.authToken);
    console.log('Twilio Phone Number:', config.phoneNumber);

    if (config.accountSid === '✅ Configured' && 
        config.authToken === '✅ Configured' && 
        config.phoneNumber === '✅ Configured') {
      
      try {
        const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        const account = await twilioClient.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
        
        res.json({
          success: true,
          message: 'Twilio credentials are valid!',
          config,
          account: {
            status: account.status,
            type: account.type,
            balance: account.balance
          }
        });
      } catch (twilioError) {
        res.json({
          success: false,
          message: 'Twilio credentials are invalid',
          config,
          error: twilioError.message
        });
      }
    } else {
      res.json({
        success: false,
        message: 'Missing Twilio configuration',
        config
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get call cost information
router.get('/cost-info', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      costPerCall: user.getCostPerCall(),
      currentBalance: user.tokens,
      canMakeCall: user.hasEnoughTokensForCall(),
      totalCallsMade: user.totalCallsMade
    });
  } catch (error) {
    console.error('Get cost info error:', error);
    res.status(500).json({ 
      error: 'Failed to get cost information',
      message: error.message 
    });
  }
});

// Get call history
router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, moduleId } = req.query;
    
    // const query = { userId: req.user._id }; // Removed database dependency
    
    // if (status) {
    //   query.status = status;
    // }
    
    // if (moduleId) {
    //   query.moduleId = moduleId;
    // }

    // const calls = await Call.find(query) // Removed database dependency
    //   .populate('moduleId', 'name type description')
    //   .sort({ createdAt: -1 })
    //   .limit(limit * 1)
    //   .skip((page - 1) * limit);

    // const total = await Call.countDocuments(query); // Removed database dependency

    res.json({
      success: true,
      calls: [], // Placeholder for calls
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0, // Placeholder for total
        pages: 0 // Placeholder for pages
      }
    });
  } catch (error) {
    console.error('Get call history error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch call history',
      message: error.message 
    });
  }
});

// Get single call details
router.get('/:id', async (req, res) => {
  try {
    const call = activeCalls.get(req.params.id); // Placeholder for call details

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    res.json({
      success: true,
      call
    });
  } catch (error) {
    console.error('Get call error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch call details',
      message: error.message 
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  try {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      baseUrl: process.env.BASE_URL,
      activeCallsCount: activeCalls.size
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

export default router; 