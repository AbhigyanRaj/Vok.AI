import dotenv from 'dotenv';
dotenv.config();

// Test the new ElevenLabs API key with a single call
async function testSingleAPICall() {
  const API_KEY = 'sk_4fc2892096e111dd14ecfa1d88a24bc73e8e8f143a2d3ae9';
  const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel
  const TEST_TEXT = 'Hello, this is a test.';
  
  console.log('🧪 Testing ElevenLabs API Key...');
  console.log('API Key:', API_KEY.substring(0, 15) + '...');
  console.log('Test Text:', TEST_TEXT);
  console.log('\n🔄 Making API call...\n');
  
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
        'User-Agent': 'VokAI-Test/1.0.0'
      },
      body: JSON.stringify({
        text: TEST_TEXT,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    });
    
    if (response.ok) {
      const audioBuffer = await response.arrayBuffer();
      console.log('✅ SUCCESS! API key is working!');
      console.log(`📊 Audio generated: ${audioBuffer.byteLength} bytes`);
      console.log(`🎯 Status: ${response.status} ${response.statusText}`);
      console.log('\n✅ This API key is VALID and ready to use!\n');
      return true;
    } else {
      const errorText = await response.text();
      console.log('❌ FAILED! API call returned error');
      console.log(`Status: ${response.status} ${response.statusText}`);
      console.log('Error:', errorText);
      console.log('\n❌ This API key is NOT working\n');
      return false;
    }
  } catch (error) {
    console.log('❌ FAILED! Exception occurred');
    console.log('Error:', error.message);
    console.log('\n❌ This API key is NOT working\n');
    return false;
  }
}

// Run the test
testSingleAPICall().then(success => {
  process.exit(success ? 0 : 1);
});
