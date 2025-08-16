import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Production-grade ElevenLabs Configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

// Rate limiting configuration
const RATE_LIMIT = {
  MAX_REQUESTS_PER_MINUTE: 50,
  MAX_REQUESTS_PER_HOUR: 1000,
  RETRY_DELAY_MS: 1000,
  MAX_RETRIES: 3
};

// Request tracking for rate limiting
let requestCounts = {
  minute: { count: 0, resetTime: Date.now() + 60000 },
  hour: { count: 0, resetTime: Date.now() + 3600000 }
};

// Available voices with fallback options
export const VOICES = {
  RACHEL: { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', gender: 'female', quality: 'high' },
  DOMI: { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', gender: 'female', quality: 'high' },
  BELLA: { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'female', quality: 'high' },
  ANTONI: { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'male', quality: 'high' },
  THOMAS: { id: 'GBv7mTt0atIp3Br8iCZE', name: 'Thomas', gender: 'male', quality: 'high' },
  JOSH: { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', gender: 'male', quality: 'high' }
};

// Cache for generated audio files
const audioCache = new Map();
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Production-grade logging
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    data,
    service: 'ElevenLabs'
  };
  
  console.log(`[${timestamp}] [${level}] ElevenLabs: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  
  // In production, you'd send this to a logging service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to logging service (e.g., Winston, Bunyan, etc.)
  }
}

// Rate limiting check
function checkRateLimit() {
  const now = Date.now();
  
  // Reset counters if time has passed
  if (now > requestCounts.minute.resetTime) {
    requestCounts.minute = { count: 0, resetTime: now + 60000 };
  }
  if (now > requestCounts.hour.resetTime) {
    requestCounts.hour = { count: 0, resetTime: now + 3600000 };
  }
  
  // Check limits
  if (requestCounts.minute.count >= RATE_LIMIT.MAX_REQUESTS_PER_MINUTE) {
    throw new Error('Rate limit exceeded: Too many requests per minute');
  }
  if (requestCounts.hour.count >= RATE_LIMIT.MAX_REQUESTS_PER_HOUR) {
    throw new Error('Rate limit exceeded: Too many requests per hour');
  }
  
  // Increment counters
  requestCounts.minute.count++;
  requestCounts.hour.count++;
  
  return true;
}

// Enhanced error handling with retry logic
async function makeRequestWithRetry(url, options, retries = RATE_LIMIT.MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      log('INFO', `API request attempt ${attempt}/${retries}`, { url, method: options.method });
      
      const response = await fetch(url, options);
      
      if (response.ok) {
        log('INFO', 'API request successful', { status: response.status, attempt });
        return response;
      }
      
      // Handle specific error cases
      if (response.status === 401) {
        const errorText = await response.text();
        log('ERROR', 'Authentication failed', { status: response.status, error: errorText, attempt });
        throw new Error(`Authentication failed: ${errorText}`);
      }
      
      if (response.status === 429) {
        log('WARN', 'Rate limit hit, waiting before retry', { attempt, retries });
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.RETRY_DELAY_MS * attempt));
        continue;
      }
      
      if (response.status >= 500) {
        log('WARN', 'Server error, retrying', { status: response.status, attempt });
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.RETRY_DELAY_MS * attempt));
        continue;
      }
      
      // Non-retryable error
      const errorText = await response.text();
      log('ERROR', 'Non-retryable error', { status: response.status, error: errorText });
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      
    } catch (error) {
      if (attempt === retries) {
        log('ERROR', 'All retry attempts failed', { error: error.message, attempts: retries });
        throw error;
      }
      
      log('WARN', `Request attempt ${attempt} failed, retrying`, { error: error.message });
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.RETRY_DELAY_MS * attempt));
    }
  }
}

// Test ElevenLabs connection with enhanced error handling
export async function testElevenLabsConnection() {
  try {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    log('INFO', 'Testing ElevenLabs connection');
    
    const response = await makeRequestWithRetry(`${ELEVENLABS_BASE_URL}/voices`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'User-Agent': 'VokAI-Backend/1.0.0'
      }
    });

    const data = await response.json();
    
    log('INFO', 'Connection test successful', { 
      availableVoices: data.voices?.length || 0,
      apiKeyStatus: 'Valid'
    });
    
    return {
      success: true,
      message: 'ElevenLabs connection successful',
      availableVoices: data.voices?.length || 0,
      apiKeyStatus: 'Valid',
      rateLimitInfo: {
        currentMinute: requestCounts.minute.count,
        currentHour: requestCounts.hour.count,
        limits: RATE_LIMIT
      }
    };
  } catch (error) {
    log('ERROR', 'Connection test failed', { error: error.message });
    return {
      success: false,
      message: error.message,
      availableVoices: 0,
      apiKeyStatus: 'Invalid or Error',
      error: error.message
    };
  }
}

// Get voice information with caching
export async function getVoiceInfo(voiceId) {
  try {
    checkRateLimit();
    
    const cacheKey = `voice_${voiceId}`;
    if (audioCache.has(cacheKey)) {
      const cached = audioCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_EXPIRY) {
        log('INFO', 'Voice info retrieved from cache', { voiceId });
        return cached.data;
      }
    }

    log('INFO', 'Fetching voice info', { voiceId });
    
    const response = await makeRequestWithRetry(`${ELEVENLABS_BASE_URL}/voices/${voiceId}`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'User-Agent': 'VokAI-Backend/1.0.0'
      }
    });

    const data = await response.json();
    
    // Cache the result
    audioCache.set(cacheKey, {
      timestamp: Date.now(),
      data: data
    });
    
    log('INFO', 'Voice info retrieved successfully', { voiceId, name: data.name });
    return data;
  } catch (error) {
    log('ERROR', 'Voice info retrieval failed', { voiceId, error: error.message });
    return null;
  }
}

// Generate speech with production-grade error handling
export async function generateSpeech(text, voiceId = VOICES.RACHEL.id) {
  try {
    checkRateLimit();
    
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    log('INFO', 'Generating speech', { 
      textLength: text.length, 
      voiceId,
      textPreview: text.substring(0, 100)
    });

    const response = await makeRequestWithRetry(`${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'User-Agent': 'VokAI-Backend/1.0.0'
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    });

    const audioBuffer = await response.arrayBuffer();
    
    log('INFO', 'Speech generated successfully', { 
      audioSize: audioBuffer.byteLength,
      voiceId,
      textLength: text.length
    });
    
    return audioBuffer;
  } catch (error) {
    log('ERROR', 'Speech generation failed', { 
      error: error.message, 
      voiceId, 
      textLength: text.length 
    });
    throw error;
  }
}

// Generate and save audio with enhanced file management
export async function generateAndSaveAudio(text, voiceType = 'RACHEL', audioType = 'general') {
  try {
    const voice = VOICES[voiceType] || VOICES.RACHEL;
    
    // Check cache first
    const cacheKey = `${audioType}_${voiceType}_${text.substring(0, 50)}`;
    if (audioCache.has(cacheKey)) {
      const cached = audioCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_EXPIRY) {
        log('INFO', 'Audio retrieved from cache', { cacheKey, audioUrl: cached.audioUrl });
        return cached.audioUrl;
      }
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedText = text.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const filename = `${audioType}_${voiceType}_${sanitizedText}_${timestamp}.mp3`;
    const filepath = path.join(__dirname, '..', 'audio', filename);
    
    log('INFO', 'Generating and saving audio', { 
      textPreview: text.substring(0, 50),
      filepath,
      voiceType
    });
    
    const audioBuffer = await generateSpeech(text, voice.id);
    
    // Ensure audio directory exists
    const audioDir = path.dirname(filepath);
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
      log('INFO', 'Audio directory created', { audioDir });
    }
    
    // Write audio file
    fs.writeFileSync(filepath, Buffer.from(audioBuffer));
    log('INFO', 'Audio file saved', { filepath, size: audioBuffer.byteLength });
    
    // Return public URL for Twilio
    const publicUrl = `${process.env.BASE_URL}/audio/${filename}`;
    
    // Cache the result
    audioCache.set(cacheKey, {
      timestamp: Date.now(),
      audioUrl: publicUrl,
      filepath: filepath
    });
    
    log('INFO', 'Audio generation complete', { 
      publicUrl, 
      filepath, 
      cacheKey 
    });
    
    return publicUrl;
  } catch (error) {
    log('ERROR', 'Audio generation and save failed', { 
      error: error.message, 
      voiceType, 
      audioType 
    });
    throw error;
  }
}

// Generate audio with intelligent fallback
export async function generateAndSaveAudioWithFallback(text, voiceType = 'RACHEL', audioType = 'general') {
  try {
    log('INFO', 'Attempting ElevenLabs generation', { 
      textPreview: text.substring(0, 50), 
      voiceType, 
      audioType 
    });
    
    const audioUrl = await generateAndSaveAudio(text, voiceType, audioType);
    
    return {
      success: true,
      audioUrl: audioUrl,
      fallback: false,
      message: 'ElevenLabs audio generated successfully',
      service: 'ElevenLabs',
      voiceType: voiceType
    };
  } catch (error) {
    log('WARN', 'ElevenLabs failed, using Twilio fallback', { 
      error: error.message, 
      voiceType, 
      audioType 
    });
    
    return {
      success: true,
      fallback: true,
      twiml: text,
      message: 'Using Twilio TTS fallback due to ElevenLabs failure',
      service: 'Twilio',
      error: error.message,
      voiceType: voiceType
    };
  }
}

// Simple function to use ElevenLabs for speech
export async function sayWithElevenLabs(text, voiceType = 'RACHEL') {
  try {
    const audioUrl = await generateAndSaveAudio(text, voiceType, 'speech');
    return audioUrl;
  } catch (error) {
    log('ERROR', 'ElevenLabs speech failed', { 
      error: error.message, 
      voiceType 
    });
    throw error;
  }
}

// Health check function for production monitoring
export async function healthCheck() {
  try {
    const connectionTest = await testElevenLabsConnection();
    const cacheStats = {
      cacheSize: audioCache.size,
      cacheKeys: Array.from(audioCache.keys())
    };
    
    return {
      status: connectionTest.success ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      connection: connectionTest,
      cache: cacheStats,
      rateLimits: {
        currentMinute: requestCounts.minute.count,
        currentHour: requestCounts.hour.count,
        limits: RATE_LIMIT
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

// Cleanup function for production
export function cleanup() {
  // Clear expired cache entries
  const now = Date.now();
  for (const [key, value] of audioCache.entries()) {
    if (now - value.timestamp > CACHE_EXPIRY) {
      audioCache.delete(key);
    }
  }
  
  log('INFO', 'Cache cleanup completed', { 
    remainingEntries: audioCache.size 
  });
}

// Run cleanup every hour
setInterval(cleanup, 60 * 60 * 1000);
