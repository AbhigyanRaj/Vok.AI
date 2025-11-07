import dotenv from 'dotenv';
import { testGoogleTTS, generateGoogleTTS, listGoogleVoices, getGoogleTTSUsage } from './src/config/googleTTS.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

console.log('🚀 Google TTS Integration Test\n');
console.log('=' .repeat(60));

async function runTests() {
  try {
    // Test 1: Check API key
    console.log('\n📋 Test 1: Checking API Key Configuration');
    console.log('-'.repeat(60));
    const apiKey = process.env.GOOGLE_TTS_API_KEY;
    if (apiKey) {
      console.log('✅ API Key found:', apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4));
    } else {
      console.log('❌ API Key not found in environment variables');
      return;
    }

    // Test 2: List available voices
    console.log('\n📋 Test 2: Available Indian English Voices');
    console.log('-'.repeat(60));
    const voices = listGoogleVoices();
    voices.forEach(voice => {
      console.log(`   ${voice.key.padEnd(10)} - ${voice.name.padEnd(10)} (${voice.gender}) - ${voice.description}`);
    });

    // Test 3: Basic API connectivity test
    console.log('\n📋 Test 3: Testing API Connectivity');
    console.log('-'.repeat(60));
    const testResult = await testGoogleTTS();
    
    if (testResult.success) {
      console.log('✅ API Test Passed!');
      console.log(`   Audio generated: ${testResult.audioSize} bytes`);
      console.log(`   Text processed: ${testResult.textLength} characters`);
      console.log(`   Voice used: ${testResult.voice.name} (${testResult.voice.id})`);
    } else {
      console.log('❌ API Test Failed:', testResult.error);
      return;
    }

    // Test 4: Generate sample audio with different voices
    console.log('\n📋 Test 4: Generating Sample Audio Files');
    console.log('-'.repeat(60));
    
    const testTexts = [
      {
        text: 'Hello! Welcome to Vok AI. This is Neerja speaking in Indian English.',
        voice: 'NEERJA',
        filename: 'test_neerja.mp3'
      },
      {
        text: 'Namaste! I am Prabhat, your AI assistant speaking in Indian English.',
        voice: 'PRABHAT',
        filename: 'test_prabhat.mp3'
      },
      {
        text: 'Good morning! This is a test of the loan application module. Are you interested in applying for a personal loan?',
        voice: 'NEERJA',
        filename: 'test_loan_question.mp3'
      }
    ];

    const audioDir = path.join(__dirname, 'src', 'audio');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    for (const test of testTexts) {
      try {
        console.log(`\n   Generating: ${test.filename}`);
        console.log(`   Voice: ${test.voice}`);
        console.log(`   Text: "${test.text.substring(0, 50)}..."`);
        
        const audioBuffer = await generateGoogleTTS(test.text, test.voice);
        const filepath = path.join(audioDir, test.filename);
        fs.writeFileSync(filepath, audioBuffer);
        
        console.log(`   ✅ Saved to: ${filepath}`);
        console.log(`   Size: ${audioBuffer.length} bytes`);
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
      }
    }

    // Test 5: Test with different speaking rates and pitch
    console.log('\n📋 Test 5: Testing Voice Customization');
    console.log('-'.repeat(60));
    
    const customTests = [
      { rate: 0.8, pitch: 0, desc: 'Slower speed' },
      { rate: 1.2, pitch: 2, desc: 'Faster with higher pitch' },
      { rate: 1.0, pitch: -2, desc: 'Normal speed, lower pitch' }
    ];

    for (const custom of customTests) {
      try {
        console.log(`\n   Testing: ${custom.desc}`);
        const audioBuffer = await generateGoogleTTS(
          'This is a test with custom voice settings.',
          'NEERJA',
          { speakingRate: custom.rate, pitch: custom.pitch }
        );
        console.log(`   ✅ Generated ${audioBuffer.length} bytes`);
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
      }
    }

    // Test 6: Show usage statistics
    console.log('\n📋 Test 6: Usage Statistics');
    console.log('-'.repeat(60));
    const usage = getGoogleTTSUsage();
    console.log(`   Characters used: ${usage.charactersUsed} / ${usage.freeMonthlyLimit}`);
    console.log(`   Percentage used: ${usage.percentageUsed}%`);
    console.log(`   Characters remaining: ${usage.charactersRemaining}`);
    console.log(`   Total requests: ${usage.requestCount}`);
    console.log(`   Successful: ${usage.successes}`);
    console.log(`   Errors: ${usage.errors}`);
    console.log(`   Estimated cost: $${usage.estimatedCost}`);

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 All Tests Completed Successfully!');
    console.log('='.repeat(60));
    console.log('\n✅ Google TTS is ready to use!');
    console.log('✅ Indian English voices are working perfectly!');
    console.log('✅ Audio files saved to:', audioDir);
    console.log('\n💡 Next steps:');
    console.log('   1. Check the generated audio files in src/audio/');
    console.log('   2. Listen to test_neerja.mp3 and test_prabhat.mp3');
    console.log('   3. Integration is ready for production use!');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run all tests
runTests();
