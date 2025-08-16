#!/usr/bin/env node

/**
 * Test script for local development with ngrok
 * This script helps you test ElevenLabs audio with Twilio calls locally
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Vok.AI Local Testing with ngrok');
console.log('=====================================\n');

// Check if ngrok is installed
try {
  execSync('ngrok --version', { stdio: 'ignore' });
  console.log('✅ ngrok is installed');
} catch (error) {
  console.log('❌ ngrok is not installed');
  console.log('📦 Install ngrok: npm install -g ngrok');
  console.log('🔗 Or download from: https://ngrok.com/download\n');
  process.exit(1);
}

// Check if backend is running
try {
  const response = await fetch('http://localhost:5001/api/health');
  if (response.ok) {
    console.log('✅ Backend is running on localhost:5001');
  } else {
    throw new Error('Backend not responding');
  }
} catch (error) {
  console.log('❌ Backend is not running on localhost:5001');
  console.log('🚀 Start backend: npm run dev\n');
  process.exit(1);
}

console.log('\n📋 Instructions:');
console.log('1. Start ngrok: ngrok http 5001');
console.log('2. Copy the HTTPS URL (e.g., https://abc123.ngrok.io)');
console.log('3. Set environment variable: export BASE_URL=https://abc123.ngrok.io');
console.log('4. Restart your backend server');
console.log('5. Test calls - they will now use the ngrok URL\n');

console.log('🧪 Test endpoints:');
console.log('- URL Generation: http://localhost:5001/api/calls/test-url-generation');
console.log('- TwiML with ElevenLabs: http://localhost:5001/api/calls/test-twillml-elevenlabs');
console.log('- Hybrid Status: http://localhost:5001/api/calls/hybrid-status\n');

console.log('📞 For production deployment:');
console.log('- Your Render URL: https://vok-ai.onrender.com');
console.log('- Audio files will automatically use the correct URL\n');

console.log('🎯 Current setup:');
console.log('- Local development: Uses localhost:5001');
console.log('- Production (Render): Uses https://vok-ai.onrender.com');
console.log('- Custom testing: Set BASE_URL environment variable\n');
