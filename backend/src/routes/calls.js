import express from 'express';
import { makeCall, createTwiMLResponse, validateTwilioRequest } from '../config/twilio.js';
import { transcribeAudio, generateSummary, evaluateApplication } from '../config/openai.js';
import { formatPhoneNumber, validatePhoneNumber } from '../utils/phoneUtils.js';
import { 
  testElevenLabsConnection, 
  getVoiceInfo, 
  sayWithElevenLabs, 
  generateAndSaveAudio,
  generateAndSaveAudioWithFallback,
  VOICES 
} from '../config/elevenlabs.js';
import twilio from 'twilio';
import User from '../models/User.js';
import Module from '../models/Module.js';
import Call from '../models/Call.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Track active calls (in memory - in production, use Redis)
const activeCalls = new Map();

// Test ElevenLabs TTS generation (must be before parameterized routes)
router.get('/test-elevenlabs-tts', async (req, res) => {
  try {
    console.log('🧪 Testing ElevenLabs TTS generation...');
    
    const testText = 'Hello! This is a test of ElevenLabs text-to-speech. If you can hear this, ElevenLabs is working perfectly!';
    const voiceType = 'RACHEL';
    
    console.log('🎯 Attempting to generate speech...');
    const result = await generateAndSaveAudioWithFallback(testText, voiceType, 'test');
    
    if (result.fallback) {
      res.json({
        success: false,
        message: 'ElevenLabs failed, using Twilio fallback',
        fallback: true,
        twiml: result.twiml,
        error: 'ElevenLabs API call failed'
      });
    } else {
      res.json({
        success: true,
        message: 'ElevenLabs TTS working perfectly!',
        audioUrl: result.audioUrl,
        fallback: false,
        voiceType: voiceType
      });
    }
  } catch (error) {
    console.error('❌ ElevenLabs TTS test failed:', error);
    res.status(500).json({
      success: false,
      message: 'ElevenLabs TTS test failed',
      error: error.message,
      stack: error.stack
    });
  }
});

// Test ElevenLabs direct API call
router.get('/test-elevenlabs-direct', async (req, res) => {
  try {
    console.log('🧪 Testing ElevenLabs direct API call...');
    
    // Import the function directly
    const { generateSpeech } = await import('../config/elevenlabs.js');
    
    const testText = 'Hello test';
    const voiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel
    
    console.log('🎯 Calling ElevenLabs API directly...');
    const audioBuffer = await generateSpeech(testText, voiceId);
    
    res.json({
      success: true,
      message: 'ElevenLabs direct API call successful!',
      audioSize: audioBuffer.byteLength,
      voiceId: voiceId
    });
  } catch (error) {
    console.error('❌ ElevenLabs direct API call failed:', error);
    res.status(500).json({
      success: false,
      message: 'ElevenLabs direct API call failed',
      error: error.message,
      stack: error.stack
    });
  }
});

// Initiate a call - AUTH REQUIRED
router.post('/initiate', protect, async (req, res) => {
  try {
    const { moduleId, phoneNumber, customerName } = req.body;
    const userId = req.user._id;

    // Validation
    if (!phoneNumber || !customerName || !moduleId) {
      return res.status(400).json({ 
        error: 'Missing required fields: moduleId, phoneNumber and customerName are required' 
      });
    }

    // Get user and check token balance
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get the module
    const module = await Module.findById(moduleId);
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    // Check if user owns this module
    if (module.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Access denied to this module' });
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
    console.log('Module ID:', moduleId);
    console.log('Module Name:', module.name);
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

    // Check if we have a public URL (ngrok) for webhooks
    const publicUrl = process.env.NGROK_URL || process.env.BASE_URL;
    let call; // Declare call variable outside the if/else blocks
    
    if (publicUrl && !publicUrl.includes('localhost')) {
      // Use webhook for interactive flow
      console.log('📞 Using webhook flow with public URL:', publicUrl);
      
      try {
        const webhookUrl = new URL(`${publicUrl}/api/calls/handle-call`);
        webhookUrl.searchParams.set('moduleId', moduleId);
        webhookUrl.searchParams.set('customerName', customerName);
        webhookUrl.searchParams.set('phoneNumber', formattedPhone);
        webhookUrl.searchParams.set('step', '0');

        const statusCallbackUrl = new URL(`${publicUrl}/api/calls/status`);
        
        call = await twilioClient.calls.create({
          method: 'POST',
          url: webhookUrl.toString(),
          to: formattedPhone,
          from: process.env.TWILIO_PHONE_NUMBER,
          statusCallback: statusCallbackUrl.toString(),
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
          statusCallbackMethod: 'POST',
          // Add timeout to prevent hanging calls
          timeout: 120, // 2 minutes max call duration
          // Add recording for debugging
          record: false,
          // Add machine detection with valid parameters only
          machineDetection: 'DetectMessageEnd',
          machineDetectionTimeout: 30
        });
      } catch (twilioError) {
        console.error('❌ Twilio call creation error:', twilioError);
        
        // Handle specific Twilio trial account errors
        if (twilioError.code === 21211 || twilioError.message?.includes('unverified')) {
          return res.status(400).json({
            error: 'Trial account limitation',
            message: `The number ${formattedPhone} is unverified. Trial accounts may only make calls to verified numbers. Please verify this number in your Twilio console or upgrade to a paid account.`,
            code: 'UNVERIFIED_NUMBER',
            suggestion: 'To verify numbers, go to Twilio Console > Phone Numbers > Verified Caller IDs'
          });
        }
        
        // Handle other Twilio errors
        if (twilioError.code === 21214) {
          return res.status(400).json({
            error: 'Invalid phone number',
            message: 'The phone number format is invalid. Please check the number and try again.',
            code: 'INVALID_NUMBER'
          });
        }
        
        // Re-throw other errors
        throw twilioError;
      }
    } else {
      // Fallback to simple TwiML for local development - FIXED VERSION
      console.log('📞 Using simple TwiML flow for local development');
      
      try {
        const twiml = new twilio.twiml.VoiceResponse();
        
        // Get questions from module
        const questions = module.questions.sort((a, b) => a.order - b.order);
        
        // Start with greeting using Twilio TTS (reliable fallback)
        twiml.say(`Hello ${customerName}, this is a call from Vok.AI. We have a few questions for you.`, { 
          voice: 'Polly.Aditi',
          language: 'en-IN'
        });
        twiml.pause({ length: 1 });
        
        // Ask all questions from the module using Twilio TTS
        if (questions && questions.length > 0) {
          for (const [index, question] of questions.entries()) {
            twiml.say(`Question ${index + 1}: ${question.question}`, { 
              voice: 'Polly.Aditi',
              language: 'en-IN'
            });
            twiml.pause({ length: 3 }); // Give time for response
          }
          twiml.say('Thank you for answering all our questions. Have a great day!', { 
            voice: 'Polly.Aditi',
            language: 'en-IN'
          });
        } else {
          twiml.say('Thank you for taking our call. Have a great day!', { 
            voice: 'Polly.Aditi',
            language: 'en-IN'
          });
        }
        
        twiml.hangup();
        
        // Create status callback URL for local development
        const statusCallbackUrl = new URL(`${process.env.BASE_URL}/api/calls/status`);
        
        call = await twilioClient.calls.create({
          twiml: twiml.toString(),
          to: formattedPhone,
          from: process.env.TWILIO_PHONE_NUMBER,
          statusCallback: statusCallbackUrl.toString(),
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed', 'failed', 'busy', 'no-answer', 'canceled'],
          statusCallbackMethod: 'POST',
          timeout: 120
        });
      } catch (twilioError) {
        console.error('❌ Twilio call creation error:', twilioError);
        
        // Handle specific Twilio trial account errors
        if (twilioError.code === 21211 || twilioError.message?.includes('unverified')) {
          return res.status(400).json({
            error: 'Trial account limitation',
            message: `The number ${formattedPhone} is unverified. Trial accounts may only make calls to verified numbers. Please verify this number in your Twilio console or upgrade to a paid account.`,
            code: 'UNVERIFIED_NUMBER',
            suggestion: 'To verify numbers, go to Twilio Console > Phone Numbers > Verified Caller IDs'
          });
        }
        
        // Handle other Twilio errors
        if (twilioError.code === 21214) {
          return res.status(400).json({
            error: 'Invalid phone number',
            message: 'The phone number format is invalid. Please check the number and try again.',
            code: 'INVALID_NUMBER'
          });
        }
        
        // Re-throw other errors
        throw twilioError;
      }
    
    }

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

    // Create call record in database
    const callRecord = new Call({
      userId: userId,
      moduleId: moduleId,
      customerName: customerName.trim(),
      phoneNumber: formattedPhone,
      twilioCallSid: call.sid,
      status: call.status || 'initiated', // Use actual call status
      currentStep: 0,
      tokensUsed: user.getCostPerCall(),
      duration: 0, // Will be updated when call completes
    });

    // Store initial conversation with proper formatting
    if (module.questions && module.questions.length > 0) {
      const questions = module.questions.sort((a, b) => a.order - b.order);
      const transcription = `VokAI: Hello ${customerName.trim()}, this is a call from Vok.AI. We have a few questions for you.\n`;
      callRecord.transcription = transcription;
    }

    try {
      await callRecord.save();
      console.log('✅ Call record saved to database');
    } catch (error) {
      console.error('❌ Error saving call record:', error);
      // Continue with the call even if database save fails
    }

    // Add to active calls
    activeCalls.set(callRecord._id.toString(), {
      ...callRecord.toObject(),
      timestamp: Date.now()
    });

    return res.json({
      success: true,
      message: 'REAL call initiated successfully!',
      call: callRecord,
      module: {
        id: module._id,
        name: module.name,
        questions: module.questions
      },
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
    const voiceType = req.query.voiceType || req.body.voiceType || 'RACHEL'; // Get voiceType from query or body

    console.log('\n=== Handle Call Webhook ===');
    console.log('Module ID:', moduleId);
    console.log('Customer:', customerName);
    console.log('Step:', step);
    console.log('Phone:', phoneNumber);
    console.log('Previous Response:', previousResponse);
    console.log('Request Body:', req.body);
    console.log('Request Query:', req.query);
    
    // Enhanced user input logging
    if (previousResponse) {
      console.log('\n🎤 CUSTOMER SAID:', previousResponse);
      console.log('📝 Response Length:', previousResponse.length, 'characters');
      console.log('🔍 Response Analysis:', previousResponse.toLowerCase().includes('yes') ? 'POSITIVE' : 'NEGATIVE/NEUTRAL');
    }

    // Get module and its questions
    const module = await Module.findById(moduleId);
    if (!module) {
      const errorResponse = createTwiMLResponse();
      errorResponse.say('Sorry, there was an error. Please try again later.', { 
        voice: 'Polly.Aditi',
        language: 'en-IN'
      });
      errorResponse.hangup();
      return res.type('text/xml').send(errorResponse.toString());
    }

    const questions = module.questions.sort((a, b) => a.order - b.order);
    const twimlResponse = createTwiMLResponse();

    // Find the call record
    const call = await Call.findOne({ 
      phoneNumber: phoneNumber, 
      status: { $in: ['initiated', 'ringing', 'in-progress', 'answered'] },
      moduleId: moduleId
    });

    // Handle different steps of the call
    if (step === 0) {
      // Initial greeting - Use reliable Twilio TTS
      console.log('Starting new call flow (step 0)');
      
      twimlResponse.say(`Hi ${customerName}, we are from VokAI. Is it the right time to speak to you about our questions?`, { 
        voice: 'Polly.Aditi',
        language: 'en-IN'
      });

      const nextUrl = new URL(`${process.env.BASE_URL}/api/calls/handle-call`);
      nextUrl.searchParams.set('moduleId', moduleId);
      nextUrl.searchParams.set('customerName', customerName);
      nextUrl.searchParams.set('step', '1');
      nextUrl.searchParams.set('phoneNumber', phoneNumber);
      nextUrl.searchParams.set('voiceType', voiceType); // Pass voiceType to next step

      console.log('Next URL for step 1:', nextUrl.toString());

      const gather = twimlResponse.gather({
        input: 'speech',
        action: nextUrl.toString(),
        timeout: 8,
        method: 'POST',
        speechTimeout: 'auto'
      });

    } else if (step === 1) {
      // Check if customer confirmed availability
      if (previousResponse && ['yes', 'okay', 'sure', 'go ahead', 'yeah', 'hmm', 'uh huh'].some(word => 
        previousResponse.toLowerCase().includes(word))) {
        
        console.log('\n✅ CUSTOMER CONFIRMED AVAILABILITY!');
        console.log('🎯 Moving to questions...');
        
        twimlResponse.say(`Great! Let me ask you a few questions.`, { 
          voice: 'Polly.Aditi',
          language: 'en-IN'
        });
        twimlResponse.pause({ length: 0.5 });

        const nextUrl = new URL(`${process.env.BASE_URL}/api/calls/handle-call`);
        nextUrl.searchParams.set('moduleId', moduleId);
        nextUrl.searchParams.set('customerName', customerName);
        nextUrl.searchParams.set('step', '2');
        nextUrl.searchParams.set('phoneNumber', phoneNumber);
        nextUrl.searchParams.set('voiceType', voiceType); // Pass voiceType to next step

        const gather = twimlResponse.gather({
          input: 'speech',
          action: nextUrl.toString(),
          timeout: 15,
          method: 'POST',
          speechTimeout: 'auto'
        });
        gather.say(questions[0].question, { 
          voice: 'Polly.Aditi',
          language: 'en-IN'
        });

      } else {
        console.log('\n❌ CUSTOMER DECLINED OR NO RESPONSE');
        console.log('📞 Ending call...');
        
        twimlResponse.say("I understand this isn't a good time. We'll call you back later. Thank you!", { 
          voice: 'Polly.Aditi',
          language: 'en-IN'
        });
        twimlResponse.hangup();

        // Update call status
        if (call) {
          call.status = 'completed';
          call.currentStep = step;
          await call.save();
        }
      }

    } else if (step < questions.length + 2) {
      // Handle question responses
      const questionIndex = step - 2;
      
      // Store previous response if available
      if (previousResponse && phoneNumber && call) {
        console.log(`Storing response for question ${questionIndex}: ${previousResponse}`);
        
        // Update call record with response
        call.responses.set(questionIndex.toString(), previousResponse);
        call.currentStep = step;
        call.status = 'in-progress';
        
        // Store conversation in transcription field with proper formatting
        let conversation = call.transcription || '';
        
        // If this is the first response, initialize the conversation
        if (conversation === '') {
          conversation = `VokAI: Hi ${customerName}, we are from VokAI. Is it the right time to speak to you about our questions?\n`;
          if (previousResponse) {
            conversation += `User: ${previousResponse}\n`;
            conversation += `VokAI: Great! Let me ask you a few questions.\n`;
          }
        }
        
        // Add the current question and response
        if (questionIndex >= 0 && questionIndex < questions.length) {
          conversation += `VokAI: Question ${questionIndex + 1}: ${questions[questionIndex].question}\n`;
          conversation += `User: ${previousResponse}\n`;
        }
        
        call.transcription = conversation;
        
        await call.save();

        console.log('✅ Response stored in database');
        console.log('✅ Conversation updated:', conversation);
      }

      // Check if we've reached the end of questions
      if (questionIndex >= questions.length) {
        // End of questions - play outro
        console.log('End of questions reached, playing outro...');
        twimlResponse.say('Thank you for providing the information. We have recorded all your responses.', { 
          voice: 'Polly.Aditi',
          language: 'en-IN'
        });
        twimlResponse.pause({ length: 0.5 });
        twimlResponse.say('Our team will review your responses. Have a great day!', { 
          voice: 'Polly.Aditi',
          language: 'en-IN'
        });
        twimlResponse.hangup();

        // Update call status to completed
        if (call) {
          call.status = 'completed';
          call.currentStep = step;
          await call.save();
        }

      } else {
        // Ask next question with optimized flow
        const nextUrl = new URL(`${process.env.BASE_URL}/api/calls/handle-call`);
        nextUrl.searchParams.set('moduleId', moduleId);
        nextUrl.searchParams.set('customerName', customerName);
        nextUrl.searchParams.set('step', (step + 1).toString());
        nextUrl.searchParams.set('phoneNumber', phoneNumber);
        nextUrl.searchParams.set('voiceType', voiceType); // Pass voiceType to next step

        const gather = twimlResponse.gather({
          input: 'speech',
          action: nextUrl.toString(),
          timeout: 15,
          method: 'POST',
          // Add speech recognition settings for better accuracy
          speechTimeout: 'auto'
        });
        gather.say(questions[questionIndex].question, { 
          voice: 'Polly.Aditi',
          language: 'en-IN'
        });
        console.log(`Asked question ${questionIndex}: ${questions[questionIndex].question}`);
      }
    }

    res.type('text/xml').send(twimlResponse.toString());

  } catch (error) {
    console.error('Handle call error:', error);
    const errorResponse = createTwiMLResponse();
    errorResponse.say(
      'I apologize, but there was an error. We will call you back later.',
      { 
        voice: 'Polly.Aditi',
        language: 'en-IN'
      }
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
    console.log('Request Body:', req.body);
    console.log('Request Headers:', req.headers);

    // Update call record
    const call = await Call.findOne({ twilioCallSid: CallSid });
    if (call) {
      const previousStatus = call.status;
      call.status = CallStatus;
      if (CallDuration) call.duration = parseInt(CallDuration);
      
      // Only update transcription if it's empty or contains placeholder text
      if (!call.transcription || call.transcription.includes('[Call in progress')) {
        if (['failed', 'busy', 'no-answer', 'canceled'].includes(CallStatus)) {
          // Call was cut off or failed
          call.transcription = call.transcription ? call.transcription.replace(
            /User: \[Call in progress - responses will be collected\]/g,
            'User: [Call was cut off - no response collected]'
          ) : 'VokAI: Call was cut off or failed\nUser: [No response collected]';
          console.log('❌ Call was cut off or failed');
        } else if (CallStatus === 'completed' && call.duration < 30) {
          // Call completed but was too short (likely cut off)
          call.transcription = call.transcription ? call.transcription.replace(
            /User: \[Call in progress - responses will be collected\]/g,
            'User: [Call ended too quickly - likely cut off]'
          ) : 'VokAI: Call ended too quickly\nUser: [Call ended too quickly - likely cut off]';
          console.log('⚠️ Call completed but was too short');
        } else if (CallStatus === 'completed') {
          // Call completed successfully
          call.transcription = call.transcription ? call.transcription.replace(
            /User: \[Call in progress - responses will be collected\]/g,
            'User: [Call completed successfully]'
          ) : 'VokAI: Call completed successfully\nUser: [Call completed successfully]';
          console.log('✅ Call completed successfully');
        }
      }
      
      await call.save();
      console.log('✅ Call status updated in database');

      // If call completed, process the responses
      if (['completed', 'failed', 'busy', 'no-answer', 'canceled'].includes(CallStatus)) {
        await processCallCompletion(call, phoneNumber);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Status webhook error:', error);
    res.sendStatus(200); // Still return 200 to Twilio
  }
});

// Temporary status webhook without validation (for debugging)
router.post('/status-no-validate', async (req, res) => {
  try {
    const { CallSid, CallStatus, CallDuration, To: phoneNumber } = req.body;
    
    console.log('\n=== Call Status Update (No Validation) ===');
    console.log('Call SID:', CallSid);
    console.log('Status:', CallStatus);
    console.log('Duration:', CallDuration);
    console.log('Phone:', phoneNumber);
    console.log('Request Body:', req.body);
    console.log('Request Headers:', req.headers);
    console.log('Environment:', process.env.NODE_ENV);

    // Update call record
    const call = await Call.findOne({ twilioCallSid: CallSid });
    if (call) {
      const previousStatus = call.status;
      call.status = CallStatus;
      if (CallDuration) call.duration = parseInt(CallDuration);
      
      // Update transcription based on call status
      if (['failed', 'busy', 'no-answer', 'canceled'].includes(CallStatus)) {
        // Call was cut off or failed
        call.transcription = call.transcription.replace(
          /User: \[Call in progress - responses will be collected\]/g,
          'User: [Call was cut off - no response collected]'
        );
        console.log('❌ Call was cut off or failed');
      } else if (CallStatus === 'completed' && call.duration < 30) {
        // Call completed but was too short (likely cut off)
        call.transcription = call.transcription.replace(
          /User: \[Call in progress - responses will be collected\]/g,
          'User: [Call ended too quickly - likely cut off]'
        );
        console.log('⚠️ Call completed but was too short');
      } else if (CallStatus === 'completed') {
        // Call completed successfully
        call.transcription = call.transcription.replace(
          /User: \[Call in progress - responses will be collected\]/g,
          'User: [Call completed successfully]'
        );
        console.log('✅ Call completed successfully');
      }
      
      await call.save();
      console.log('✅ Call status updated in database');

      // If call completed, process the responses
      if (['completed', 'failed', 'busy', 'no-answer', 'canceled'].includes(CallStatus)) {
        await processCallCompletion(call, phoneNumber);
      }
    }

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
    const module = await Module.findById(call.moduleId);
    if (!module) {
      console.log('Module not found for call');
      return;
    }

    // Convert Map to object for OpenAI
    const responseData = {};
    responses.forEach((value, key) => {
      responseData[key] = value;
    });

    console.log('Evaluating application with responses:', responseData);

    // Evaluate application using OpenAI
    let evaluation = 'INVESTIGATION_REQUIRED';
    try {
      evaluation = await evaluateApplication(module.type, responseData);
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
    call.evaluation = {
      result: evaluation,
      comments
    };
    
    // Generate summary using OpenAI
    try {
      const responsesText = Object.entries(responseData)
        .map(([key, value]) => `Q${key}: ${value}`)
        .join('. ');
      call.summary = await generateSummary(responsesText);
    } catch (error) {
      console.error('Summary generation error:', error);
      call.summary = 'Summary generation failed';
    }

    await call.save();

    // Update module statistics
    if (evaluation === 'YES') {
      await Module.findByIdAndUpdate(call.moduleId, {
        $inc: { successfulCalls: 1 }
      });
    }

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
    console.log('Environment:', process.env.NODE_ENV);
    console.log('All Environment Variables:', Object.keys(process.env).filter(key => key.includes('TWILIO')));

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
        config,
        environment: process.env.NODE_ENV,
        availableEnvVars: Object.keys(process.env).filter(key => key.includes('TWILIO'))
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test simple TwiML generation
router.get('/test-twillml', async (req, res) => {
  try {
    console.log('🧪 Testing TwiML generation...');
    
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Simple test with Twilio TTS
    twiml.say('Hello! This is a test call from Vok.AI. If you can hear this, the audio is working correctly!', { 
      voice: 'Polly.Aditi',
      language: 'en-IN'
    });
    twiml.pause({ length: 1 });
    twiml.say('This is a second test message to confirm audio is working.', { 
      voice: 'Polly.Aditi',
      language: 'en-IN'
    });
    twiml.hangup();
    
    res.type('text/xml').send(twiml.toString());
  } catch (error) {
    console.error('❌ TwiML test failed:', error);
    res.status(500).json({
      success: false,
      message: 'TwiML test failed',
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
router.get('/history', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, moduleId } = req.query;
    const userId = req.user._id;
    
    const query = { userId: userId };
    
    if (status) {
      query.status = status;
    }
    
    if (moduleId) {
      query.moduleId = moduleId;
    }

    const calls = await Call.find(query)
      .populate('moduleId', 'name type description')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Call.countDocuments(query);

    // Process calls to include module name
    const processedCalls = calls.map(call => {
      const callObj = call.toObject();
      return {
        ...callObj,
        moduleName: callObj.moduleId?.name || 'Unknown Module'
      };
    });

    res.json({
      success: true,
      calls: processedCalls,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / limit)
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

// IMPORTANT: This route must be LAST to avoid catching other routes
// Get single call details
router.get('/:id', async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);

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

// Manual status update endpoint for testing
router.post('/:id/status', protect, async (req, res) => {
  try {
    const { status, duration } = req.body;
    const call = await Call.findById(req.params.id);

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    call.status = status;
    if (duration) call.duration = parseInt(duration);
    
    // Update transcription based on status
    if (['failed', 'busy', 'no-answer', 'canceled'].includes(status)) {
      call.transcription = call.transcription.replace(
        /User: \[Call in progress - responses will be collected\]/g,
        'User: [Call was cut off - no response collected]'
      );
    } else if (status === 'completed') {
      call.transcription = call.transcription.replace(
        /User: \[Call in progress - responses will be collected\]/g,
        'User: [Call completed successfully]'
      );
    }
    
    await call.save();
    
    res.json({
      success: true,
      message: 'Call status updated manually',
      call
    });
  } catch (error) {
    console.error('Manual status update error:', error);
    res.status(500).json({ 
      error: 'Failed to update call status',
      message: error.message 
    });
  }
});

// Delete a call
router.delete('/:id', protect, async (req, res) => {
  try {
    const callId = req.params.id;
    const userId = req.user._id;

    // Find the call and verify ownership
    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Check if the call belongs to the user
    if (call.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Access denied to this call' });
    }

    // Delete the call
    await Call.findByIdAndDelete(callId);

    console.log(`✅ Call ${callId} deleted by user ${userId}`);

    res.json({
      success: true,
      message: 'Call deleted successfully'
    });

  } catch (error) {
    console.error('Delete call error:', error);
    res.status(500).json({ 
      error: 'Failed to delete call',
      message: error.message 
    });
  }
});

// Delete multiple calls
router.delete('/batch/delete', protect, async (req, res) => {
  try {
    const { callIds } = req.body;
    const userId = req.user._id;

    if (!callIds || !Array.isArray(callIds) || callIds.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'callIds array is required' 
      });
    }

    // Find all calls and verify ownership
    const calls = await Call.find({ 
      _id: { $in: callIds },
      userId: userId 
    });

    if (calls.length === 0) {
      return res.status(404).json({ error: 'No calls found to delete' });
    }

    // Delete all calls
    await Call.deleteMany({ 
      _id: { $in: callIds },
      userId: userId 
    });

    console.log(`✅ ${calls.length} calls deleted by user ${userId}`);

    res.json({
      success: true,
      message: `${calls.length} calls deleted successfully`,
      deletedCount: calls.length
    });

  } catch (error) {
    console.error('Batch delete calls error:', error);
    res.status(500).json({ 
      error: 'Failed to delete calls',
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

// Test status webhook endpoint
router.post('/test-status', (req, res) => {
  try {
    console.log('=== Test Status Webhook ===');
    console.log('Request Body:', req.body);
    console.log('Request Headers:', req.headers);
    
    res.json({
      success: true,
      message: 'Status webhook test received',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router; 