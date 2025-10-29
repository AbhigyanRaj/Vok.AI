// Environment variable validation utility

const REQUIRED_VARS = {
  // Core
  'PORT': { required: false, default: '5001' },
  'NODE_ENV': { required: false, default: 'development' },
  
  // Database
  'MONGODB_URI': { required: true, description: 'MongoDB connection string' },
  
  // Authentication
  'JWT_SECRET': { required: true, description: 'JWT secret for token signing' },
  
  // Twilio (Required for calls)
  'TWILIO_ACCOUNT_SID': { required: true, description: 'Twilio Account SID' },
  'TWILIO_AUTH_TOKEN': { required: true, description: 'Twilio Auth Token' },
  'TWILIO_PHONE_NUMBER': { required: true, description: 'Twilio Phone Number' },
  
  // AI Services
  'GEMINI_API_KEY': { required: true, description: 'Google Gemini API key for AI summaries' },
  
  // Optional
  'ELEVENLABS_API_KEY': { required: false, description: 'ElevenLabs API key for voice synthesis' },
  'BASE_URL': { required: false, description: 'Base URL for webhooks' },
  'NGROK_URL': { required: false, description: 'Ngrok URL for local development' },
};

export function validateEnvironment() {
  console.log('\n🔍 Validating environment variables...\n');
  
  const missing = [];
  const warnings = [];
  
  for (const [key, config] of Object.entries(REQUIRED_VARS)) {
    const value = process.env[key];
    
    if (!value || value.trim() === '') {
      if (config.required) {
        missing.push({ key, description: config.description });
      } else if (config.default) {
        warnings.push(`⚠️  ${key} not set, using default: ${config.default}`);
      } else {
        warnings.push(`ℹ️  ${key} not set (optional): ${config.description}`);
      }
    } else {
      console.log(`✅ ${key}: SET`);
    }
  }
  
  // Print warnings
  if (warnings.length > 0) {
    console.log('\n');
    warnings.forEach(w => console.log(w));
  }
  
  // Handle missing required variables
  if (missing.length > 0) {
    console.error('\n❌ MISSING REQUIRED ENVIRONMENT VARIABLES:\n');
    missing.forEach(({ key, description }) => {
      console.error(`   ${key}: ${description}`);
    });
    console.error('\nPlease configure these variables in your .env file.');
    console.error('See env.example for reference.\n');
    return false;
  }
  
  console.log('\n✅ All required environment variables are set\n');
  return true;
}

export function getEnvSummary() {
  return {
    database: !!process.env.MONGODB_URI,
    twilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    elevenlabs: !!process.env.ELEVENLABS_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
    webhooks: !!(process.env.BASE_URL || process.env.NGROK_URL),
  };
}
