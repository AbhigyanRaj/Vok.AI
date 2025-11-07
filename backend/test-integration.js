import dotenv from 'dotenv';
import { generateHybridTTS, testAllTTSServices, getTTSUsageStats, listAvailableVoices } from './src/services/hybridTTS.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

console.log('\n🚀 VOK.AI - Complete TTS Integration Test\n');
console.log('='.repeat(70));

async function runCompleteTest() {
  try {
    // Test 1: Check environment
    console.log('\n📋 Step 1: Environment Check');
    console.log('-'.repeat(70));
    const googleKey = process.env.GOOGLE_TTS_API_KEY;
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    console.log(`   Google TTS API Key: ${googleKey ? '✅ Configured' : '❌ Missing'}`);
    console.log(`   ElevenLabs API Key: ${elevenLabsKey ? '✅ Configured' : '❌ Missing'}`);
    console.log(`   Twilio: ✅ Always available (fallback)`);

    // Test 2: List available voices
    console.log('\n📋 Step 2: Available Voice Options');
    console.log('-'.repeat(70));
    const voices = listAvailableVoices();
    console.log('\n   Voice Options with Indian English Accent:');
    voices.forEach((voice, index) => {
      console.log(`   ${index + 1}. ${voice.name}`);
      console.log(`      Google: ${voice.google}`);
      console.log(`      ElevenLabs: ${voice.elevenlabs}`);
      console.log(`      Twilio: ${voice.twilio}`);
      console.log('');
    });

    // Test 3: Test all services
    console.log('\n📋 Step 3: Testing All TTS Services');
    console.log('-'.repeat(70));
    const serviceTests = await testAllTTSServices();
    
    console.log('\n   Service Status:');
    console.log(`   Google TTS: ${serviceTests.google.success ? '✅ Working' : '❌ Failed'}`);
    if (serviceTests.google.success) {
      console.log(`      Audio size: ${serviceTests.google.audioSize} bytes`);
    } else {
      console.log(`      Error: ${serviceTests.google.error}`);
    }
    
    console.log(`   ElevenLabs: ${serviceTests.elevenlabs.success ? '✅ Working' : '❌ Failed'}`);
    if (serviceTests.elevenlabs.success) {
      console.log(`      Audio size: ${serviceTests.elevenlabs.audioSize} bytes`);
    } else {
      console.log(`      Error: ${serviceTests.elevenlabs.error}`);
    }
    
    console.log(`   Twilio Polly: ✅ ${serviceTests.twilio.note}`);

    // Test 4: Generate sample call audio
    console.log('\n📋 Step 4: Generating Sample Call Audio');
    console.log('-'.repeat(70));
    
    const callScenarios = [
      {
        text: 'Hello! Welcome to Vok AI. I am calling regarding your loan application.',
        voice: 'FEMALE_INDIAN',
        filename: 'sample_greeting.mp3'
      },
      {
        text: 'What is your monthly income?',
        voice: 'FEMALE_INDIAN',
        filename: 'sample_question.mp3'
      },
      {
        text: 'Thank you for your response. Let me process that information.',
        voice: 'FEMALE_INDIAN',
        filename: 'sample_acknowledgment.mp3'
      },
      {
        text: 'Based on your responses, you are eligible for the loan. We will contact you soon.',
        voice: 'FEMALE_INDIAN',
        filename: 'sample_approval.mp3'
      }
    ];

    const audioDir = path.join(__dirname, 'src', 'audio');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    for (const scenario of callScenarios) {
      try {
        console.log(`\n   Generating: ${scenario.filename}`);
        console.log(`   Text: "${scenario.text}"`);
        console.log(`   Voice: ${scenario.voice}`);
        
        const result = await generateHybridTTS(scenario.text, scenario.voice, {
          audioType: 'test',
          callId: 'test-call'
        });
        
        if (result.success && !result.useTwiML) {
          console.log(`   ✅ Generated successfully!`);
          console.log(`      Source: ${result.source}`);
          console.log(`      Cached: ${result.cached ? 'Yes' : 'No'}`);
          console.log(`      Audio URL: ${result.audioUrl}`);
          console.log(`      File size: ${result.audioBuffer?.length || 0} bytes`);
        } else if (result.useTwiML) {
          console.log(`   ⚠️ Using Twilio TTS fallback`);
          console.log(`      Voice: ${result.voice}`);
        }
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
      }
    }

    // Test 5: Test voice variations
    console.log('\n📋 Step 5: Testing Different Voice Options');
    console.log('-'.repeat(70));
    
    const voiceTests = [
      { voice: 'FEMALE_INDIAN', desc: 'Female Indian (Neerja)' },
      { voice: 'MALE_INDIAN', desc: 'Male Indian (Prabhat)' },
      { voice: 'FEMALE_INDIAN_ALT', desc: 'Female Indian Alt (Divya)' },
      { voice: 'MALE_INDIAN_ALT', desc: 'Male Indian Alt (Ravi)' }
    ];

    for (const test of voiceTests) {
      try {
        console.log(`\n   Testing: ${test.desc}`);
        const result = await generateHybridTTS(
          'This is a test of the voice system.',
          test.voice,
          { audioType: 'test' }
        );
        
        if (result.success && !result.useTwiML) {
          console.log(`   ✅ ${result.source.toUpperCase()} - ${result.audioBuffer?.length || 0} bytes`);
        } else {
          console.log(`   ⚠️ Fallback to Twilio`);
        }
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
      }
    }

    // Test 6: Usage statistics
    console.log('\n📋 Step 6: Usage Statistics');
    console.log('-'.repeat(70));
    const stats = getTTSUsageStats();
    
    console.log('\n   Google TTS:');
    console.log(`      Characters used: ${stats.google.charactersUsed} / ${stats.google.charactersRemaining + stats.google.charactersUsed}`);
    console.log(`      Percentage used: ${stats.google.percentageUsed}%`);
    console.log(`      Successful requests: ${stats.google.success}`);
    console.log(`      Failed requests: ${stats.google.failure}`);
    
    console.log('\n   ElevenLabs:');
    console.log(`      Successful requests: ${stats.elevenlabs.success}`);
    console.log(`      Failed requests: ${stats.elevenlabs.failure}`);
    console.log(`      Characters used: ${stats.elevenlabs.totalChars}`);
    
    console.log('\n   Twilio:');
    console.log(`      Successful requests: ${stats.twilio.success}`);
    console.log(`      Characters used: ${stats.twilio.totalChars}`);
    
    console.log('\n   Overall:');
    console.log(`      Total requests: ${stats.totalRequests}`);
    console.log(`      Total failures: ${stats.totalFailures}`);

    // Final summary
    console.log('\n' + '='.repeat(70));
    console.log('🎉 INTEGRATION TEST COMPLETE!');
    console.log('='.repeat(70));
    
    const googleWorking = serviceTests.google.success;
    const elevenLabsWorking = serviceTests.elevenlabs.success;
    
    console.log('\n✅ System Status:');
    if (googleWorking) {
      console.log('   🥇 PRIMARY: Google TTS with Indian voices is WORKING!');
    } else {
      console.log('   ⚠️ PRIMARY: Google TTS is not available');
    }
    
    if (elevenLabsWorking) {
      console.log('   🥈 SECONDARY: ElevenLabs is available as backup');
    } else {
      console.log('   ⚠️ SECONDARY: ElevenLabs is not available');
    }
    
    console.log('   🥉 FALLBACK: Twilio Polly is always available');
    
    console.log('\n📁 Generated Audio Files:');
    console.log(`   Location: ${audioDir}`);
    console.log('   Files:');
    const files = fs.readdirSync(audioDir).filter(f => f.endsWith('.mp3'));
    files.forEach(file => {
      const stats = fs.statSync(path.join(audioDir, file));
      console.log(`      - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    });
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Start your backend server: npm start');
    console.log('   2. Test via API: GET http://localhost:5001/api/calls/test-google-tts');
    console.log('   3. Make a test call to hear the Indian English voice!');
    console.log('   4. Listen to the generated audio files in src/audio/');
    
    console.log('\n🎤 Voice Quality:');
    console.log('   Google TTS (Neural2): ⭐⭐⭐⭐⭐ Excellent Indian accent');
    console.log('   ElevenLabs: ⭐⭐⭐⭐⭐ Premium quality (no Indian accent)');
    console.log('   Twilio Polly: ⭐⭐⭐ Good quality Indian accent');
    
    console.log('\n💰 Cost Estimate:');
    console.log('   Google TTS: FREE for first 1M characters/month');
    console.log('   After free tier: $16 per 1M characters');
    console.log('   Your current usage: ' + stats.google.charactersUsed + ' characters (virtually free!)');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the complete test
runCompleteTest();
