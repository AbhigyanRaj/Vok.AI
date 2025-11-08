import dotenv from 'dotenv';
import { generateGoogleTTS, listGoogleVoices } from './src/config/googleTTS.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Debug: Check if env vars are loaded
console.log('🎤 Testing All Google TTS Voices\n');
console.log('Debug: GOOGLE_TTS_API_KEY exists?', !!process.env.GOOGLE_TTS_API_KEY);
console.log('=' .repeat(60));

async function testAllVoices() {
  try {
    // Check API key
    const apiKey = process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.log('❌ Google TTS API Key not found in .env file');
      console.log('💡 Add GOOGLE_TTS_API_KEY=your_key_here to your .env file');
      return;
    }
    console.log('✅ API Key configured\n');

    // Create audio directory
    const audioDir = path.join(__dirname, 'src', 'audio', 'voice-samples');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    // Get all available voices
    const voices = listGoogleVoices();
    console.log(`Found ${voices.length} voices:\n`);

    // Test text
    const testText = 'Hello! My name is {name}. I am speaking in Indian English. How can I help you today?';

    // Generate audio for each voice
    for (const voice of voices) {
      try {
        console.log(`🎙️  Testing: ${voice.key} (${voice.name})`);
        console.log(`   Type: ${voice.type} | Gender: ${voice.gender}`);
        console.log(`   Description: ${voice.description}`);
        
        const personalizedText = testText.replace('{name}', voice.name);
        const audioBuffer = await generateGoogleTTS(personalizedText, voice.key);
        
        const filename = `${voice.key.toLowerCase()}_${voice.name.toLowerCase()}.mp3`;
        const filepath = path.join(audioDir, filename);
        fs.writeFileSync(filepath, audioBuffer);
        
        console.log(`   ✅ Generated: ${filename} (${(audioBuffer.length / 1024).toFixed(2)} KB)`);
        console.log('');
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}\n`);
      }
    }

    console.log('=' .repeat(60));
    console.log('🎉 Voice samples generated successfully!\n');
    console.log('📁 Location:', audioDir);
    console.log('\n💡 How to listen:');
    console.log('   1. Open Finder and navigate to:');
    console.log(`      ${audioDir}`);
    console.log('   2. Double-click any .mp3 file to play it');
    console.log('   3. Compare the voices and choose your favorite!\n');
    
    console.log('📋 Generated files:');
    const files = fs.readdirSync(audioDir).filter(f => f.endsWith('.mp3'));
    files.forEach(file => {
      const stats = fs.statSync(path.join(audioDir, file));
      console.log(`   • ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    });

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testAllVoices();
