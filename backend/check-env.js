import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log('\n🔍 Environment Variables Check\n');
console.log('='.repeat(60));

const requiredVars = [
  'GOOGLE_TTS_API_KEY',
  'MONGODB_URI',
  'JWT_SECRET',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'GEMINI_API_KEY'
];

const optionalVars = [
  'ELEVENLABS_API_KEY',
  'DEEPGRAM_API_KEY',
  'BASE_URL',
  'FRONTEND_URL'
];

console.log('\n📋 Required Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const display = value ? `${value.substring(0, 10)}...${value.substring(value.length - 4)}` : 'NOT SET';
  console.log(`   ${status} ${varName.padEnd(25)} ${display}`);
});

console.log('\n📋 Optional Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '⚠️';
  const display = value ? (value.length > 30 ? `${value.substring(0, 10)}...${value.substring(value.length - 4)}` : value) : 'NOT SET';
  console.log(`   ${status} ${varName.padEnd(25)} ${display}`);
});

console.log('\n' + '='.repeat(60));

// Check if critical TTS keys are present
const hasTTS = process.env.GOOGLE_TTS_API_KEY || process.env.ELEVENLABS_API_KEY;
if (hasTTS) {
  console.log('✅ TTS Configuration: OK');
  if (process.env.GOOGLE_TTS_API_KEY) {
    console.log('   Primary: Google TTS (Indian voices)');
  }
  if (process.env.ELEVENLABS_API_KEY) {
    console.log('   Secondary: ElevenLabs');
  }
  console.log('   Fallback: Twilio Polly');
} else {
  console.log('⚠️ TTS Configuration: Only Twilio Polly available');
}

console.log('\n');
