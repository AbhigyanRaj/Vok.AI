import express from 'express';
import { validateTwilioRequest } from '../config/twilio.js';
import { createTwiMLResponse } from '../utils/twimlHelpers.js';
import { analyzeResponseWithGemini } from '../config/openai.js';
import { formatPhoneNumber, validatePhoneNumber } from '../utils/phoneUtils.js';
import { 
  testElevenLabsConnection, 
  getVoiceInfo, 
  sayWithElevenLabs, 
  generateAndSaveAudio,
  generateAndSaveAudioWithFallback,
  VOICES 
} from '../config/elevenlabs.js';
import { getOrGenerateAudio } from '../services/audioCache.js';
import twilio from 'twilio';
import User from '../models/User.js';
import Module from '../models/Module.js';
import Call from '../models/Call.js';
import { protect } from '../middleware/auth.js';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// AI Response Analysis Function
async function analyzeCustomerResponse(response, question) {
  try {
    console.log('🤖 Analyzing customer response:', response);
    
    // Use Gemini to analyze the response
    const analysisPrompt = `
    Analyze this customer response to determine if they are saying YES, NO, or MAYBE/UNCERTAIN.
    
    Question asked: "${question}"
    Customer response: "${response}"
    
    Rules:
    - Return only "YES" if the response is clearly positive/affirmative
    - Return only "NO" if the response is clearly negative/declining
    - Return only "MAYBE" if the response is uncertain, unclear, or needs follow-up
    
    Consider variations like:
    - YES: "yes", "yeah", "sure", "okay", "definitely", "absolutely", "of course", "I am interested"
    - NO: "no", "nah", "not interested", "not now", "I don't want", "not for me"
    - MAYBE: "maybe", "I'm not sure", "let me think", "possibly", "depends", unclear responses
    
    Response (only YES, NO, or MAYBE):`;

    const result = await analyzeResponseWithGemini(analysisPrompt);
    
    // Ensure we return a valid result
    if (result && ['YES', 'NO', 'MAYBE'].includes(result.toUpperCase())) {
      return result.toUpperCase();
    }
    
    // Fallback analysis using simple keyword matching
    const responseText = response.toLowerCase();
    
    // Positive indicators
    if (['yes', 'yeah', 'yep', 'sure', 'okay', 'ok', 'definitely', 'absolutely', 'of course', 'interested', 'good', 'great'].some(word => responseText.includes(word))) {
      return 'YES';
    }
    
    // Negative indicators
    if (['no', 'nah', 'not interested', 'not now', 'don\'t want', 'not for me', 'never', 'refuse'].some(phrase => responseText.includes(phrase))) {
      return 'NO';
    }
    
    // Default to MAYBE for uncertain responses
    return 'MAYBE';
    
  } catch (error) {
    console.error('Error analyzing response:', error);
    return 'MAYBE'; // Default to MAYBE on error
  }
}

// Configuration - Smart Hybrid System
const HYBRID_CONFIG = {
  // ElevenLabs usage limits to prevent abuse detection
  MAX_ELEVENLABS_PER_CALL: 3,
  MAX_ELEVENLABS_PER_MINUTE: 5,
  MAX_ELEVENLABS_PER_HOUR: 20,
  
  // Priority system for ElevenLabs usage
  PRIORITY: {
    HIGH: ['greeting', 'first_question', 'outro'], // Always try ElevenLabs
    MEDIUM: ['key_questions'], // Try ElevenLabs if within limits
    LOW: ['confirmation', 'decline', 'final'] // Use Twilio TTS
  },
  
  // Voice settings
  ELEVENLABS_VOICE: 'RACHEL',
  TWILIO_VOICE: 'Polly.Aditi',
  TWILIO_LANGUAGE: 'en-IN'
};

// Track ElevenLabs usage for rate limiting
let elevenLabsUsage = {
  perCall: new Map(),
  perMinute: { count: 0, resetTime: Date.now() + 60000 },
  perHour: { count: 0, resetTime: Date.now() + 3600000 }
};

// Smart function to determine if we should use ElevenLabs - ALWAYS USE ELEVENLABS when public URL available
function shouldUseElevenLabs(audioType, callId) {
  // Always use ElevenLabs when we have a public URL (ngrok/production)
  console.log(`🎯 Using ElevenLabs for ${audioType} - Full ElevenLabs experience enabled`);
  return true;
}

// Function to record ElevenLabs usage
function recordElevenLabsUsage(callId) {
  const callUsage = (elevenLabsUsage.perCall.get(callId) || 0) + 1;
  elevenLabsUsage.perCall.set(callId, callUsage);
  elevenLabsUsage.perMinute.count++;
  elevenLabsUsage.perHour.count++;
  
  console.log(`📊 ElevenLabs usage recorded - Call: ${callUsage}, Minute: ${elevenLabsUsage.perMinute.count}, Hour: ${elevenLabsUsage.perHour.count}`);
}

// Check if we have a publicly accessible URL for audio files
function hasPublicUrl() {
  const baseUrl = process.env.BASE_URL || process.env.NGROK_URL;
  return baseUrl && !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1');
}

// Smart hybrid audio generation function with 3-tier caching
async function generateSmartAudio(text, audioType, callId, twimlResponse, selectedVoice = 'RACHEL', moduleId = null) {
  console.log(`🎤 Smart audio generation for: ${audioType} with voice: ${selectedVoice}`);
  
  // Check if we have a public URL for serving audio files
  if (!hasPublicUrl()) {
    console.log(`⚠️ No public URL available - using Twilio TTS directly for ${audioType}`);
    twimlResponse.say(text, { 
      voice: HYBRID_CONFIG.TWILIO_VOICE,
      language: HYBRID_CONFIG.TWILIO_LANGUAGE
    });
    return;
  }
  
  try {
    // Use 3-tier caching system (Local → MongoDB → ElevenLabs API)
    console.log(`🔍 Looking up cached audio for ${audioType}...`);
    const result = await getOrGenerateAudio(text, selectedVoice, {
      category: audioType,
      isShared: audioType === 'greeting' || audioType === 'outro',
      moduleId: moduleId
    });
    
    if (result.success) {
      console.log(`✅ Audio ready from ${result.source}: ${result.audioUrl}`);
      
      // Verify the URL is publicly accessible
      if (result.audioUrl.includes('localhost') || result.audioUrl.includes('127.0.0.1')) {
        console.log(`⚠️ Audio URL is localhost - falling back to Twilio TTS`);
        twimlResponse.say(text, { 
          voice: HYBRID_CONFIG.TWILIO_VOICE,
          language: HYBRID_CONFIG.TWILIO_LANGUAGE
        });
      } else {
        twimlResponse.play(result.audioUrl);
        if (result.apiCallMade) {
          recordElevenLabsUsage(callId);
          console.log(`⚠️ API call made for ${audioType} - audio was not pre-generated`);
        } else {
          console.log(`✅ Using pre-generated audio (0 API calls)`);
        }
      }
    } else {
      throw new Error('Audio generation failed');
    }
  } catch (error) {
    console.log(`❌ Audio generation failed for ${audioType}, using Twilio TTS fallback`);
    console.error('Error:', error.message);
    twimlResponse.say(text, { 
      voice: HYBRID_CONFIG.TWILIO_VOICE,
      language: HYBRID_CONFIG.TWILIO_LANGUAGE
    });
  }
}

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
    const { moduleId, phoneNumber, customerName, selectedVoice } = req.body;
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
        webhookUrl.searchParams.set('selectedVoice', selectedVoice || 'RACHEL');

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
          // Enable recording with transcription
          record: true,
          recordingStatusCallback: `${publicUrl}/api/calls/recording-status`,
          recordingStatusCallbackMethod: 'POST',
          recordingChannels: 'mono',
          trim: 'trim-silence',
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
      // Fallback to simple TwiML for local development - HYBRID VERSION
      console.log('📞 Using smart hybrid TwiML flow for local development');
      
      try {
        const twiml = new twilio.twiml.VoiceResponse();
        
        // Get questions from module
        const questions = module.questions.sort((a, b) => a.order - b.order);
        
        // Generate unique call ID for tracking
        const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Use smart hybrid for greeting (HIGH PRIORITY)
        await generateSmartAudio(
          `Hello ${customerName}, this is a call from Vok.AI. We have a few questions for you.`,
          'greeting',
          callId,
          twiml,
          selectedVoice,
          moduleId
        );
        
        twiml.pause({ length: 1 });
        
        // Ask all questions from the module using smart hybrid
        if (questions && questions.length > 0) {
          for (const [index, question] of questions.entries()) {
            // Determine audio type based on question importance
            const audioType = index === 0 ? 'first_question' : 'key_questions';
            
            await generateSmartAudio(
              question.question,
              'question',
              callId,
              twiml,
              selectedVoice,
              moduleId
            );
            
            twiml.pause({ length: 3 }); // Give time for response
          }
          
          // Use smart hybrid for outro (HIGH PRIORITY)
          await generateSmartAudio(
            'Thank you for answering all our questions. Have a great day!',
            'outro',
            callId,
            twiml,
            selectedVoice,
            moduleId
          );
        } else {
          // Use Twilio TTS for simple message
          twiml.say('Thank you for taking our call. Have a great day!', { 
            voice: HYBRID_CONFIG.TWILIO_VOICE,
            language: HYBRID_CONFIG.TWILIO_LANGUAGE
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
          timeout: 120,
          // Enable recording with transcription
          record: true,
          recordingStatusCallback: `${process.env.BASE_URL}/api/calls/recording-status`,
          recordingStatusCallbackMethod: 'POST',
          recordingChannels: 'mono',
          trim: 'trim-silence'
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
    const selectedVoice = req.query.selectedVoice || req.body.selectedVoice || 'RACHEL'; // Get selectedVoice from query or body

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
      // Initial greeting - Use smart hybrid system
      console.log('Starting new call flow (step 0)');
      
      // Generate call ID for tracking
      const callId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Use smart hybrid for greeting (HIGH PRIORITY)
      await generateSmartAudio(
        `Hello ${customerName}, this is an automated call from Vok AI. We have a few important questions that will only take 2-3 minutes of your time. Is now a good time to speak with you?`,
        'greeting',
        callId,
        twimlResponse,
        selectedVoice,
        moduleId
      );

      const nextUrl = new URL(`${process.env.BASE_URL}/api/calls/handle-call`);
      nextUrl.searchParams.set('moduleId', moduleId);
      nextUrl.searchParams.set('customerName', customerName);
      nextUrl.searchParams.set('step', '1');
      nextUrl.searchParams.set('phoneNumber', phoneNumber);
      nextUrl.searchParams.set('selectedVoice', selectedVoice);
      nextUrl.searchParams.set('callId', callId); // Pass callId for tracking

      console.log('Next URL for step 1:', nextUrl.toString());

      const gather = twimlResponse.gather({
        input: 'speech',
        action: nextUrl.toString(),
        timeout: 12,
        method: 'POST',
        speechTimeout: 'auto',
        speechModel: 'experimental_conversations',
        enhanced: true,
        language: 'en-US',
        hints: 'yes,no,okay,sure,go ahead,yeah,hmm,uh huh,alright,fine,good,great'
      });

    } else if (step === 1) {
      // Check if customer confirmed availability
      const callId = req.query.callId || req.body.callId || `webhook_${Date.now()}`;
      
      if (previousResponse && previousResponse.trim().length > 0) {
        // Customer responded - check if positive
        if (['yes', 'okay', 'sure', 'go ahead', 'yeah', 'hmm', 'uh huh', 'alright', 'fine', 'good', 'great'].some(word => 
          previousResponse.toLowerCase().includes(word))) {
          
          console.log('\n✅ CUSTOMER CONFIRMED AVAILABILITY!');
          console.log('🎯 Moving to questions...');
          
          // Use smart hybrid for confirmation
          await generateSmartAudio(
            'Perfect! Thank you for your time. I will now ask you a few quick questions. Please speak clearly after each question, and I will wait for your response.',
            'confirmation',
            callId,
            twimlResponse,
            selectedVoice,
            moduleId
          );
          
          twimlResponse.pause({ length: 0.5 });

          const nextUrl = new URL(`${process.env.BASE_URL}/api/calls/handle-call`);
          nextUrl.searchParams.set('moduleId', moduleId);
          nextUrl.searchParams.set('customerName', customerName);
          nextUrl.searchParams.set('step', '2');
          nextUrl.searchParams.set('phoneNumber', phoneNumber);
          nextUrl.searchParams.set('selectedVoice', selectedVoice);
          nextUrl.searchParams.set('callId', callId);

          const gather = twimlResponse.gather({
            input: 'speech',
            action: nextUrl.toString(),
            timeout: 20,
            method: 'POST',
            speechTimeout: 'auto',
            speechModel: 'experimental_conversations',
            enhanced: true,
            language: 'en-US'
          });
          
          // Use smart hybrid for the first question (HIGH PRIORITY)
          await generateSmartAudio(
            questions[0].question,
            'question',
            callId,
            gather,
            selectedVoice,
            moduleId
          );

        } else {
          console.log('\n❌ CUSTOMER DECLINED');
          console.log('📞 Ending call gracefully...');
          
          // Use smart hybrid for decline message
          await generateSmartAudio(
            "I completely understand. Thank you for your time today. We'll reach out at a more convenient time. Have a wonderful day!",
            'decline',
            callId,
            twimlResponse,
            selectedVoice,
            moduleId
          );
          
          twimlResponse.hangup();

          // Update call status
          if (call) {
            call.status = 'completed';
            call.currentStep = step;
            call.completedAt = new Date();
            call.responses.set('decline_reason', 'customer_declined');
            
            // Calculate duration if not already set
            if (!call.duration && call.createdAt) {
              const durationMs = new Date() - new Date(call.createdAt);
              call.duration = Math.floor(durationMs / 1000);
            }
            
            await call.save();
            console.log(`✅ Call declined with duration: ${call.duration} seconds`);
          }
        }
      } else {
        console.log('\n⚠️ NO RESPONSE FROM CUSTOMER');
        console.log('📞 Handling gracefully...');
        
        // Use smart hybrid for no response message
        await generateSmartAudio(
          "It looks like this might not be the right time to call. No worries at all! We'll reach out to you again at a more convenient time. Thank you and have a great day!",
          'no_response',
          callId,
          twimlResponse,
          selectedVoice,
          moduleId
        );
        
        twimlResponse.hangup();

        // Update call status
        if (call) {
          call.status = 'no-answer';
          call.currentStep = step;
          call.completedAt = new Date();
          call.responses.set('no_response', 'customer_silent');
          
          // Calculate duration if not already set
          if (!call.duration && call.createdAt) {
            const durationMs = new Date() - new Date(call.createdAt);
            call.duration = Math.floor(durationMs / 1000);
          }
          
          await call.save();
          console.log(`✅ Call no-answer with duration: ${call.duration} seconds`);
        }
      }

    } else if (step < questions.length + 2) {
      // Handle question responses
      const questionIndex = step - 2;
      const callId = req.query.callId || req.body.callId || `webhook_${Date.now()}`;
      
      // Store previous response if available
      if (previousResponse && phoneNumber && call) {
        console.log(`Storing response for question ${questionIndex}: ${previousResponse}`);
        
        // Analyze the response using AI to determine Yes/No/Maybe
        const analysisResult = await analyzeCustomerResponse(previousResponse, questions[questionIndex - 1]?.question || '');
        console.log(`🤖 AI Analysis Result: ${analysisResult}`);
        
        // Update call record with response and analysis
        call.responses.set(questionIndex.toString(), previousResponse);
        call.currentStep = step;
        call.status = 'in-progress';
        
        // Store analysis result
        if (!call.evaluation) {
          call.evaluation = {
            result: analysisResult,
            comments: []
          };
        } else {
          call.evaluation.result = analysisResult;
        }
        
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
          conversation += `VokAI: [Analysis: ${analysisResult}]\n`;
        }
        
        call.transcription = conversation;
        
        await call.save();

        console.log('✅ Response stored in database');
        console.log('✅ AI Analysis completed:', analysisResult);
        console.log('✅ Conversation updated:', conversation);
      }

      // Check if we've reached the end of questions
      if (questionIndex >= questions.length) {
        // End of questions - play outro
        console.log('End of questions reached, playing outro...');
        
        // Analyze all responses to provide personalized thank you
        const allResponses = Array.from(call.responses.values());
        const positiveResponses = allResponses.filter(response => {
          const analysis = response.toLowerCase();
          return ['yes', 'yeah', 'sure', 'interested', 'definitely'].some(word => analysis.includes(word));
        });
        
        let thankYouMessage = '';
        if (positiveResponses.length > allResponses.length / 2) {
          thankYouMessage = `Excellent! Thank you so much for taking the time to answer all our questions. Based on your positive responses, our team will be in touch with you soon with more details.`;
        } else {
          thankYouMessage = `Thank you so much for taking the time to answer all our questions. Your honest feedback is very valuable to us, and we appreciate your time.`;
        }
        
        // Use smart hybrid for personalized outro (HIGH PRIORITY)
        await generateSmartAudio(
          thankYouMessage,
          'outro',
          callId,
          twimlResponse,
          selectedVoice,
          moduleId
        );
        
        twimlResponse.pause({ length: 1 });
        
        // Use smart hybrid for final message
        await generateSmartAudio(
          'Our team will carefully review your responses. Thank you for choosing Vok AI, and have a wonderful day!',
          'final',
          callId,
          twimlResponse,
          selectedVoice,
          moduleId
        );
        
        twimlResponse.hangup();

        // Update call status to completed
        if (call) {
          call.status = 'completed';
          call.currentStep = step;
          call.completedAt = new Date();
          
          // Calculate duration if not already set
          if (!call.duration && call.createdAt) {
            const durationMs = new Date() - new Date(call.createdAt);
            call.duration = Math.floor(durationMs / 1000); // Convert to seconds
          }
          
          await call.save();
          console.log(`✅ Call completed with duration: ${call.duration} seconds`);
        }

      } else {
        // Ask next question with optimized flow
        const nextUrl = new URL(`${process.env.BASE_URL}/api/calls/handle-call`);
        nextUrl.searchParams.set('moduleId', moduleId);
        nextUrl.searchParams.set('customerName', customerName);
        nextUrl.searchParams.set('step', (step + 1).toString());
        nextUrl.searchParams.set('phoneNumber', phoneNumber);
        nextUrl.searchParams.set('selectedVoice', selectedVoice);
        nextUrl.searchParams.set('callId', callId);

        const gather = twimlResponse.gather({
          input: 'speech',
          action: nextUrl.toString(),
          timeout: 20,
          method: 'POST',
          speechTimeout: 'auto',
          speechModel: 'experimental_conversations',
          enhanced: true,
          language: 'en-US'
        });
        
        // Use smart hybrid for the question
        await generateSmartAudio(
          questions[questionIndex].question,
          'question',
          callId,
          gather,
          selectedVoice,
          moduleId
        );
        
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
      
      // Map Twilio status to our internal status
      let mappedStatus = CallStatus;
      if (CallStatus === 'completed' && CallDuration && parseInt(CallDuration) < 10) {
        mappedStatus = 'no-answer'; // Very short calls are likely ignored
      }
      
      call.status = mappedStatus;
      if (CallDuration) {
        call.duration = parseInt(CallDuration);
        console.log(`📞 Duration updated: ${call.duration} seconds`);
      }
      
      // Set completion time for final statuses
      if (['completed', 'failed', 'busy', 'no-answer', 'canceled'].includes(mappedStatus)) {
        call.completedAt = new Date();
      }
      
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

// Add TTS preview endpoint for Twilio fallback
router.get('/tts-preview', async (req, res) => {
  try {
    const { voice, text } = req.query;
    
    if (!voice || !text) {
      return res.status(400).json({ error: 'Voice and text parameters required' });
    }
    
    // Map voice types to different Twilio voices for variety
    const twilioVoiceMap = {
      'RACHEL': 'Polly.Joanna',  // US English Female
      'DOMI': 'Polly.Matthew',   // US English Male
      'BELLA': 'Polly.Amy',      // British English Female
      'ANTONI': 'Polly.Brian',   // British English Male
      'THOMAS': 'Polly.Joey',    // US English Male
      'JOSH': 'Polly.Justin'     // US English Male Child
    };
    
    const twilioVoice = twilioVoiceMap[voice] || 'Polly.Joanna';
    
    // Create TwiML for audio generation
    const twiml = createTwiMLResponse();
    twiml.say({
      voice: twilioVoice,
      language: 'en-US'
    }, text);
    
    // Set proper headers for audio response
    res.set({
      'Content-Type': 'text/xml',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, ngrok-skip-browser-warning',
      'Access-Control-Allow-Methods': 'GET, OPTIONS'
    });
    
    // Return TwiML that can be used for audio generation
    res.send(twiml.toString());
    
  } catch (error) {
    console.error('Error generating TTS preview:', error);
    res.status(500).json({ error: 'Failed to generate TTS preview' });
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

// Test URL generation for different environments
router.get('/test-url-generation', async (req, res) => {
  try {
    console.log('🧪 Testing URL generation...');
    
    const testText = 'Hello! This is a test of URL generation.';
    const result = await generateAndSaveAudioWithFallback(testText, 'RACHEL', 'url_test');
    
    // Get current environment info
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      RENDER: process.env.RENDER,
      BASE_URL: process.env.BASE_URL,
      currentUrl: result.audioUrl || 'No URL generated'
    };
    
    console.log('Environment Info:', envInfo);
    
    res.json({
      success: true,
      message: 'URL generation test completed',
      environment: envInfo,
      result: result,
      expectedUrl: result.audioUrl && result.audioUrl.includes('vok-ai.onrender.com') ? 'Production URL' : 'Local URL'
    });
  } catch (error) {
    console.error('❌ URL generation test failed:', error);
    res.status(500).json({
      success: false,
      message: 'URL generation test failed',
      error: error.message
    });
  }
});

// Test TwiML with ElevenLabs audio
router.get('/test-twillml-elevenlabs', async (req, res) => {
  try {
    console.log('🧪 Testing TwiML with ElevenLabs audio...');
    
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Generate ElevenLabs audio
    const testText = 'Hello! This is ElevenLabs audio in TwiML. If you can hear this, everything is working!';
    const result = await generateAndSaveAudioWithFallback(testText, 'RACHEL', 'test_twillml');
    
    if (result.fallback) {
      console.log('⚠️ ElevenLabs failed, using Twilio TTS in TwiML');
      twiml.say(testText, { 
        voice: 'Polly.Aditi',
        language: 'en-IN'
      });
    } else {
      console.log('✅ Using ElevenLabs audio in TwiML');
      console.log('Audio URL:', result.audioUrl);
      twiml.play(result.audioUrl);
    }
    
    twiml.pause({ length: 1 });
    twiml.say('This is Twilio TTS to confirm both are working.', { 
      voice: 'Polly.Aditi',
      language: 'en-IN'
    });
    twiml.hangup();
    
    console.log('Generated TwiML:', twiml.toString());
    
    res.type('text/xml').send(twiml.toString());
  } catch (error) {
    console.error('❌ TwiML with ElevenLabs test failed:', error);
    res.status(500).json({
      success: false,
      message: 'TwiML with ElevenLabs test failed',
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

// Monitor hybrid system performance
router.get('/hybrid-status', async (req, res) => {
  try {
    const now = Date.now();
    
    // Calculate usage statistics
    const currentCallUsage = Array.from(elevenLabsUsage.perCall.values());
    const totalCallUsage = currentCallUsage.reduce((sum, usage) => sum + usage, 0);
    const activeCalls = elevenLabsUsage.perCall.size;
    
    // Check if limits are reset
    const minuteResetIn = Math.max(0, elevenLabsUsage.perMinute.resetTime - now);
    const hourResetIn = Math.max(0, elevenLabsUsage.perHour.resetTime - now);
    
    const status = {
      system: 'Smart Hybrid TTS System',
      timestamp: new Date().toISOString(),
      
      // Current usage
      currentUsage: {
        perMinute: elevenLabsUsage.perMinute.count,
        perHour: elevenLabsUsage.perHour.count,
        activeCalls: activeCalls,
        totalCallUsage: totalCallUsage
      },
      
      // Limits
      limits: {
        perCall: HYBRID_CONFIG.MAX_ELEVENLABS_PER_CALL,
        perMinute: HYBRID_CONFIG.MAX_ELEVENLABS_PER_MINUTE,
        perHour: HYBRID_CONFIG.MAX_ELEVENLABS_PER_HOUR
      },
      
      // Reset times
      resets: {
        minuteResetIn: Math.round(minuteResetIn / 1000) + ' seconds',
        hourResetIn: Math.round(hourResetIn / 1000 / 60) + ' minutes'
      },
      
      // Priority system
      priorities: {
        high: HYBRID_CONFIG.PRIORITY.HIGH,
        medium: HYBRID_CONFIG.PRIORITY.MEDIUM,
        low: HYBRID_CONFIG.PRIORITY.LOW
      },
      
      // System health
      health: {
        minuteLimitReached: elevenLabsUsage.perMinute.count >= HYBRID_CONFIG.MAX_ELEVENLABS_PER_MINUTE,
        hourLimitReached: elevenLabsUsage.perHour.count >= HYBRID_CONFIG.MAX_ELEVENLABS_PER_HOUR,
        systemStatus: 'operational'
      }
    };
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Hybrid status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get hybrid status',
      error: error.message
    });
  }
});

// Test ElevenLabs integration
router.get('/test-elevenlabs', async (req, res) => {
  try {
    console.log('\n=== Testing ElevenLabs Integration ===');
    
    const result = await testElevenLabsConnection();
    
    if (result.success) {
      console.log('✅ ElevenLabs test successful');
      console.log('Available voices:', result.availableVoices);
      console.log('Configured voices:', result.configuredVoices);
    } else {
      console.log('❌ ElevenLabs test failed:', result.error);
    }
    
    res.json(result);
  } catch (error) {
    console.error('❌ ElevenLabs test error:', error);
    res.status(500).json({
      success: false,
      message: 'ElevenLabs test failed',
      error: error.message
    });
  }
});

// Test ElevenLabs connection (simple status check)
router.get('/test-elevenlabs-status', async (req, res) => {
  try {
    console.log('🔍 Testing ElevenLabs connection status...');
    
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      res.json({
        status: 'success',
        message: 'ElevenLabs connection successful',
        availableVoices: data.voices ? data.voices.length : 0,
        apiKeyStatus: process.env.ELEVENLABS_API_KEY ? 'Loaded' : 'Not loaded'
      });
    } else {
      const errorText = await response.text();
      res.status(response.status).json({
        status: 'error',
        message: 'ElevenLabs connection failed',
        statusCode: response.status,
        error: errorText,
        apiKeyStatus: process.env.ELEVENLABS_API_KEY ? 'Loaded' : 'Not loaded'
      });
    }
  } catch (error) {
    console.error('❌ ElevenLabs status check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check ElevenLabs status',
      error: error.message,
      apiKeyStatus: process.env.ELEVENLABS_API_KEY ? 'Loaded' : 'Not loaded'
    });
  }
});

// Voice system health check
router.get('/voices/health', async (req, res) => {
  try {
    const elevenLabsStatus = await testElevenLabsConnection();
    const environmentInfo = {
      NODE_ENV: process.env.NODE_ENV,
      BASE_URL: process.env.BASE_URL,
      RENDER: process.env.RENDER,
      ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY ? 'Configured' : 'Not configured'
    };
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      elevenLabs: elevenLabsStatus,
      environment: environmentInfo,
      message: 'Voice system is operational'
    });
  } catch (error) {
    console.error('❌ Voice health check failed:', error);
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        BASE_URL: process.env.BASE_URL,
        RENDER: process.env.RENDER
      }
    });
  }
});

// Serve a short demo audio for a given voice (cached)
router.get('/voices/sample', async (req, res) => {
  try {
    const voiceId = req.query.voice || 'RACHEL';
    const voiceName = {
      RACHEL: 'Rachel',
      DOMI: 'Domi',
      BELLA: 'Bella',
      ANTONI: 'Antoni',
      THOMAS: 'Thomas',
      JOSH: 'Josh',
    }[voiceId] || 'Rachel';
    const sampleText = `Yo!! ${voiceName} here. Welcome to Vok AI.`;
     
    console.log(`🎵 Generating voice sample for ${voiceId}: ${sampleText}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔧 BASE_URL: ${process.env.BASE_URL}`);
    console.log(`🔧 RENDER: ${process.env.RENDER}`);
    
    // Check if ElevenLabs API key is available and working
    if (!process.env.ELEVENLABS_API_KEY) {
      console.log(`⚠️ ElevenLabs API key not configured, returning fallback message`);
      return res.json({
        success: false,
        fallback: true,
        message: `Voice preview not available for ${voiceName}. ElevenLabs not configured.`,
        voiceId: voiceId,
        error: 'ElevenLabs not configured',
        suggestion: 'Please configure ElevenLabs API key in production environment'
      });
    }
    
    // Use a special audioType for caching
    const result = await generateAndSaveAudioWithFallback(sampleText, voiceId, 'voice_sample');
    
    // Handle fallback cases properly
    if (result.fallback) {
      // ElevenLabs failed, generate Twilio TTS preview
      const previewText = `Hello! This is ${voiceName} speaking. This voice will be used for your calls.`;
      const baseUrl = process.env.BASE_URL || 'https://2d7aa02d9e18.ngrok-free.app';
      const ttsPreviewUrl = `${baseUrl}/api/calls/tts-preview?voice=${voiceId}&text=${encodeURIComponent(previewText)}`;
      
      return res.json({
        success: true,
        audioUrl: ttsPreviewUrl,
        voiceId: voiceId,
        message: `Voice preview using Twilio TTS for ${voiceName}`,
        fallback: true,
        service: 'Twilio TTS'
      });
    }
    
    if (!result.audioUrl) {
      console.error(`❌ Failed to generate sample audio for ${voiceId}:`, result);
      return res.status(500).json({ 
        error: 'Failed to generate sample audio.',
        details: result,
        environment: process.env.NODE_ENV,
        baseUrl: process.env.BASE_URL
      });
    }
    
    console.log(`✅ Audio generated successfully for ${voiceId}:`, result.audioUrl);
    
    // Instead of serving the file directly, return the public URL
    // This lets the frontend fetch the audio from the static file endpoint
    const audioUrl = result.audioUrl;
    
    console.log(`🔗 Returning public audio URL: ${audioUrl}`);
    
    // Return the audio URL as JSON response
    res.json({
      success: true,
      audioUrl: audioUrl,
      voiceId: voiceId,
      message: `Voice sample ready for ${voiceName}`,
      fallback: result.fallback || false
    });
    
  } catch (error) {
    console.error('❌ Error generating voice sample:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to generate voice sample.',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      environment: process.env.NODE_ENV
    });
  }
});

// Handle CORS preflight for voice sample endpoint
router.options('/voices/sample', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, ngrok-skip-browser-warning');
  res.sendStatus(200);
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

// Recording status webhook - handles recording completion and transcription
router.post('/recording-status', validateTwilioRequest, async (req, res) => {
  try {
    const { 
      CallSid, 
      RecordingUrl, 
      RecordingSid,
      RecordingStatus,
      RecordingDuration 
    } = req.body;
    
    console.log('\n=== Recording Status Update ===');
    console.log('Call SID:', CallSid);
    console.log('Recording SID:', RecordingSid);
    console.log('Recording Status:', RecordingStatus);
    console.log('Recording URL:', RecordingUrl);
    console.log('Duration:', RecordingDuration);

    // Find the call record
    const call = await Call.findOne({ twilioCallSid: CallSid });
    
    if (call && RecordingStatus === 'completed') {
      // Save recording URL
      call.recordingUrl = RecordingUrl;
      
      // Add .json to get the recording metadata which includes transcription if available
      const recordingMetadataUrl = `${RecordingUrl}.json`;
      
      console.log('✅ Recording completed and saved');
      console.log('Recording URL:', RecordingUrl);
      
      // Note: Twilio's automatic transcription is a paid add-on
      // For now, we'll just save the recording URL
      // The transcription from speech responses during the call is already captured
      
      await call.save();
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Recording status webhook error:', error);
    res.sendStatus(200); // Still return 200 to Twilio
  }
});

export default router; 