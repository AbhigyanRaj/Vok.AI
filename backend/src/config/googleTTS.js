import textToSpeech from '@google-cloud/text-to-speech';
import fetch from 'node-fetch';

// Google Cloud TTS Configuration
// Support both GOOGLE_TTS_API_KEY and GOOGLE_API_KEY for flexibility
// Use a function to get the key dynamically (allows dotenv to load first)
const getApiKey = () => process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_API_KEY;
const GOOGLE_TTS_ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';

// Available Indian English voices
export const GOOGLE_VOICES = {
  // English voices
  NEERJA: {
    id: 'en-IN-Neural2-A',
    name: 'Neerja',
    gender: 'FEMALE',
    type: 'Neural2',
    language: 'en-IN',
    description: 'Indian English Female (Premium)'
  },
  PRABHAT: {
    id: 'en-IN-Neural2-B',
    name: 'Prabhat',
    gender: 'MALE',
    type: 'Neural2',
    language: 'en-IN',
    description: 'Indian English Male (Premium)'
  },
  KAVYA: {
    id: 'en-IN-Neural2-C',
    name: 'Kavya',
    gender: 'MALE',
    type: 'Neural2',
    language: 'en-IN',
    description: 'Indian English Male Alt (Premium)'
  },
  DIVYA: {
    id: 'en-IN-Neural2-D',
    name: 'Divya',
    gender: 'FEMALE',
    type: 'Neural2',
    language: 'en-IN',
    description: 'Indian English Female Alt (Premium)'
  },
  ADITI: {
    id: 'en-IN-Wavenet-A',
    name: 'Aditi',
    gender: 'FEMALE',
    type: 'Wavenet',
    language: 'en-IN',
    description: 'Indian English Female (High Quality)'
  },
  RAVI: {
    id: 'en-IN-Wavenet-B',
    name: 'Ravi',
    gender: 'MALE',
    type: 'Wavenet',
    language: 'en-IN',
    description: 'Indian English Male (High Quality)'
  },
  // Hindi voices
  NEERJA_HI: {
    id: 'hi-IN-Neural2-A',
    name: 'Neerja',
    gender: 'FEMALE',
    type: 'Neural2',
    language: 'hi-IN',
    description: 'Hindi Female (Premium)'
  },
  PRABHAT_HI: {
    id: 'hi-IN-Neural2-B',
    name: 'Prabhat',
    gender: 'MALE',
    type: 'Neural2',
    language: 'hi-IN',
    description: 'Hindi Male (Premium)'
  },
  KAVYA_HI: {
    id: 'hi-IN-Neural2-C',
    name: 'Kavya',
    gender: 'MALE',
    type: 'Neural2',
    language: 'hi-IN',
    description: 'Hindi Male Alt (Premium)'
  },
  DIVYA_HI: {
    id: 'hi-IN-Neural2-D',
    name: 'Divya',
    gender: 'FEMALE',
    type: 'Neural2',
    language: 'hi-IN',
    description: 'Hindi Female Alt (Premium)'
  },
  ADITI_HI: {
    id: 'hi-IN-Wavenet-A',
    name: 'Aditi',
    gender: 'FEMALE',
    type: 'Wavenet',
    language: 'hi-IN',
    description: 'Hindi Female (High Quality)'
  },
  RAVI_HI: {
    id: 'hi-IN-Wavenet-B',
    name: 'Ravi',
    gender: 'MALE',
    type: 'Wavenet',
    language: 'hi-IN',
    description: 'Hindi Male (High Quality)'
  }
};

// Usage tracking
let usageStats = {
  charactersUsed: 0,
  requestCount: 0,
  lastReset: new Date(),
  errors: 0,
  successes: 0
};

/**
 * Generate speech using Google Cloud Text-to-Speech API
 * Using REST API with API Key (simpler than service account)
 */
export async function generateGoogleTTS(text, voiceType = 'NEERJA', options = {}) {
  const GOOGLE_TTS_API_KEY = getApiKey();
  if (!GOOGLE_TTS_API_KEY) {
    throw new Error('Google TTS API key not configured');
  }

  const voice = GOOGLE_VOICES[voiceType] || GOOGLE_VOICES.NEERJA;
  
  const {
    speakingRate = 1.0,  // 0.25 to 4.0
    pitch = 0.0,         // -20.0 to 20.0
    volumeGainDb = 0.0,  // -96.0 to 16.0
  } = options;

  console.log(`\n🎤 [Google TTS] Voice Configuration:`);
  console.log(`   Requested voiceType: ${voiceType}`);
  console.log(`   Found in GOOGLE_VOICES: ${!!GOOGLE_VOICES[voiceType]}`);
  console.log(`   Using voice: ${voice.name} (${voice.id})`);
  console.log(`   Language: ${voice.language}`);
  console.log(`   Text length: ${text.length} characters`);

  try {
    const requestBody = {
      input: {
        text: text
      },
      voice: {
        languageCode: voice.language,  // Use the language from voice config (en-IN or hi-IN)
        name: voice.id,
        ssmlGender: voice.gender
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: speakingRate,
        pitch: pitch,
        volumeGainDb: volumeGainDb,
        sampleRateHertz: 24000
      }
    };

    const response = await fetch(`${GOOGLE_TTS_ENDPOINT}?key=${GOOGLE_TTS_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Google TTS API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.audioContent) {
      throw new Error('No audio content in response');
    }

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(data.audioContent, 'base64');

    // Update usage stats
    usageStats.charactersUsed += text.length;
    usageStats.requestCount++;
    usageStats.successes++;

    console.log(`✅ [Google TTS] Successfully generated ${audioBuffer.length} bytes`);
    console.log(`📊 Usage: ${usageStats.charactersUsed} chars, ${usageStats.requestCount} requests`);

    return audioBuffer;

  } catch (error) {
    usageStats.errors++;
    console.error('❌ [Google TTS] Generation failed:', error.message);
    throw error;
  }
}

/**
 * Test Google TTS connection and API key
 */
export async function testGoogleTTS() {
  const GOOGLE_TTS_API_KEY = getApiKey();
  console.log('\n🧪 Testing Google TTS API...');
  console.log('API Key configured:', !!GOOGLE_TTS_API_KEY);
  
  if (!GOOGLE_TTS_API_KEY) {
    return {
      success: false,
      error: 'API key not configured'
    };
  }

  try {
    const testText = 'Hello! This is a test of Google Text to Speech with Indian English voice.';
    const audioBuffer = await generateGoogleTTS(testText, 'NEERJA');
    
    console.log('✅ Google TTS test successful!');
    console.log(`   Audio size: ${audioBuffer.length} bytes`);
    console.log(`   Text length: ${testText.length} characters`);
    
    return {
      success: true,
      audioSize: audioBuffer.length,
      textLength: testText.length,
      voice: GOOGLE_VOICES.NEERJA,
      message: 'Google TTS is working perfectly!'
    };
  } catch (error) {
    console.error('❌ Google TTS test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get usage statistics
 */
export function getGoogleTTSUsage() {
  const freeMonthlyLimit = 1000000; // 1 million characters for Neural2
  const percentageUsed = (usageStats.charactersUsed / freeMonthlyLimit) * 100;
  
  return {
    ...usageStats,
    freeMonthlyLimit,
    charactersRemaining: freeMonthlyLimit - usageStats.charactersUsed,
    percentageUsed: percentageUsed.toFixed(2),
    estimatedCost: usageStats.charactersUsed > freeMonthlyLimit 
      ? ((usageStats.charactersUsed - freeMonthlyLimit) / 1000000 * 16).toFixed(2)
      : 0
  };
}

/**
 * Reset usage statistics (call this monthly)
 */
export function resetGoogleTTSUsage() {
  usageStats = {
    charactersUsed: 0,
    requestCount: 0,
    lastReset: new Date(),
    errors: 0,
    successes: 0
  };
  console.log('📊 Google TTS usage statistics reset');
}

/**
 * List all available voices
 */
export function listGoogleVoices() {
  return Object.entries(GOOGLE_VOICES).map(([key, voice]) => ({
    key,
    ...voice
  }));
}

export default {
  generateGoogleTTS,
  testGoogleTTS,
  getGoogleTTSUsage,
  resetGoogleTTSUsage,
  listGoogleVoices,
  GOOGLE_VOICES
};
