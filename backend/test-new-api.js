import dotenv from 'dotenv';
dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

async function testNewAPI() {
  console.log('🧪 Testing new ElevenLabs API key...');
  console.log('API Key:', ELEVENLABS_API_KEY ? '✅ Loaded' : '❌ Not found');
  
  try {
    // Test 1: Check voices endpoint
    console.log('\n📡 Testing /voices endpoint...');
    const voicesResponse = await fetch(`${ELEVENLABS_BASE_URL}/voices`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      }
    });
    
    if (voicesResponse.ok) {
      const voicesData = await voicesResponse.json();
      console.log('✅ Voices endpoint working!');
      console.log(`Available voices: ${voicesData.voices?.length || 0}`);
    } else {
      console.log(`❌ Voices endpoint failed: ${voicesResponse.status}`);
    }
    
    // Test 2: Test TTS endpoint
    console.log('\n🎵 Testing /text-to-speech endpoint...');
    const testText = 'Hello test';
    const voiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel
    
    const ttsResponse = await fetch(`${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: testText,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    });
    
    if (ttsResponse.ok) {
      const audioBuffer = await ttsResponse.arrayBuffer();
      console.log('✅ TTS endpoint working!');
      console.log(`Audio generated: ${audioBuffer.byteLength} bytes`);
    } else {
      const errorText = await ttsResponse.text();
      console.log(`❌ TTS endpoint failed: ${ttsResponse.status}`);
      console.log(`Error: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testNewAPI();



