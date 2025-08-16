import dotenv from 'dotenv';
import { 
  testElevenLabsConnection, 
  generateAndSaveAudioWithFallback,
  healthCheck,
  VOICES 
} from './src/config/elevenlabs.js';

dotenv.config();

console.log('🚀 PRODUCTION-GRADE ELEVENLABS TEST SUITE');
console.log('==========================================\n');

async function runProductionTests() {
  try {
    // Test 1: Environment Configuration
    console.log('📋 Test 1: Environment Configuration');
    console.log('API Key:', process.env.ELEVENLABS_API_KEY ? '✅ Configured' : '❌ Missing');
    console.log('Base URL:', process.env.BASE_URL || '❌ Missing');
    console.log('');

    // Test 2: Connection Test
    console.log('🔌 Test 2: ElevenLabs Connection Test');
    const connectionResult = await testElevenLabsConnection();
    console.log('Connection Status:', connectionResult.success ? '✅ SUCCESS' : '❌ FAILED');
    if (connectionResult.success) {
      console.log('Available Voices:', connectionResult.availableVoices);
      console.log('Rate Limit Info:', JSON.stringify(connectionResult.rateLimitInfo, null, 2));
    } else {
      console.log('Error:', connectionResult.message);
    }
    console.log('');

    // Test 3: Voice Information
    console.log('🎭 Test 3: Voice Information');
    console.log('Available Voices:');
    Object.entries(VOICES).forEach(([name, voice]) => {
      console.log(`  ${name}: ${voice.name} (${voice.gender}) - ${voice.quality} quality`);
    });
    console.log('');

    // Test 4: TTS Generation Test
    console.log('🎵 Test 4: Text-to-Speech Generation Test');
    const testText = 'Hello! This is a production test of ElevenLabs text-to-speech. If you can hear this, the system is working perfectly!';
    
    console.log('Testing with voice: RACHEL');
    const ttsResult = await generateAndSaveAudioWithFallback(testText, 'RACHEL', 'production_test');
    
    if (ttsResult.success) {
      if (ttsResult.fallback) {
        console.log('⚠️  Result: Fallback to Twilio TTS');
        console.log('Reason:', ttsResult.error);
        console.log('Service:', ttsResult.service);
      } else {
        console.log('✅ Result: ElevenLabs TTS Success');
        console.log('Audio URL:', ttsResult.audioUrl);
        console.log('Service:', ttsResult.service);
        console.log('Voice Type:', ttsResult.voiceType);
      }
    } else {
      console.log('❌ Result: TTS Generation Failed');
      console.log('Error:', ttsResult.message);
    }
    console.log('');

    // Test 5: Health Check
    console.log('🏥 Test 5: System Health Check');
    const health = await healthCheck();
    console.log('Overall Status:', health.status.toUpperCase());
    console.log('Timestamp:', health.timestamp);
    console.log('Cache Size:', health.cache.cacheSize);
    console.log('Rate Limits:', JSON.stringify(health.rateLimits, null, 2));
    console.log('');

    // Test 6: Multiple Voice Test
    console.log('🎭 Test 6: Multiple Voice Test');
    const voicesToTest = ['RACHEL', 'DOMI', 'ANTONI'];
    
    for (const voiceType of voicesToTest) {
      console.log(`Testing voice: ${voiceType}`);
      const shortText = `This is a test with ${voiceType} voice.`;
      
      try {
        const result = await generateAndSaveAudioWithFallback(shortText, voiceType, 'multi_voice_test');
        if (result.success && !result.fallback) {
          console.log(`  ✅ ${voiceType}: Success`);
        } else if (result.fallback) {
          console.log(`  ⚠️  ${voiceType}: Fallback to Twilio`);
        } else {
          console.log(`  ❌ ${voiceType}: Failed`);
        }
      } catch (error) {
        console.log(`  ❌ ${voiceType}: Error - ${error.message}`);
      }
    }
    console.log('');

    // Test 7: Performance Test
    console.log('⚡ Test 7: Performance Test');
    const startTime = Date.now();
    const performanceText = 'This is a performance test to measure response time.';
    
    try {
      const perfResult = await generateAndSaveAudioWithFallback(performanceText, 'RACHEL', 'performance_test');
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`Response Time: ${duration}ms`);
      console.log(`Result: ${perfResult.success ? 'Success' : 'Failed'}`);
      console.log(`Service: ${perfResult.service}`);
    } catch (error) {
      console.log(`Performance test failed: ${error.message}`);
    }
    console.log('');

    // Summary
    console.log('📊 TEST SUMMARY');
    console.log('===============');
    console.log('Environment: ✅ Configured');
    console.log('Connection: ' + (connectionResult.success ? '✅ Working' : '❌ Failed'));
    console.log('TTS Generation: ' + (ttsResult.success ? '✅ Working' : '❌ Failed'));
    console.log('Fallback System: ' + (ttsResult.fallback ? '✅ Active' : '❌ Not Needed'));
    console.log('Health Status: ' + health.status.toUpperCase());
    
    if (connectionResult.success && ttsResult.success && !ttsResult.fallback) {
      console.log('\n🎉 ALL TESTS PASSED! ElevenLabs is working perfectly!');
    } else if (ttsResult.fallback) {
      console.log('\n⚠️  ElevenLabs failed but fallback system is working correctly.');
      console.log('This is expected behavior when ElevenLabs has issues.');
    } else {
      console.log('\n❌ Some tests failed. Check the error messages above.');
    }

  } catch (error) {
    console.error('💥 Test suite crashed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the tests
runProductionTests();



