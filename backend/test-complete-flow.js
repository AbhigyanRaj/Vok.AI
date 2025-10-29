import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { preGenerateModuleAudio, getOrGenerateAudio } from './src/services/audioCache.js';
import AudioFile from './src/models/AudioFile.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vokai');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

async function testCompleteFlow() {
  console.log('\n🧪 COMPLETE FLOW TEST: Module Creation → Call Execution');
  console.log('='.repeat(70));
  
  await connectDB();
  
  // Simulate a module
  const mockModule = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Test Loan Module',
    questions: [
      { question: 'What is your annual income?', order: 0 },
      { question: 'Do you own a house?', order: 1 },
      { question: 'What is your credit score?', order: 2 },
    ]
  };
  
  console.log(`\n📋 STEP 1: Module Creation`);
  console.log(`Module: ${mockModule.name}`);
  console.log(`Module ID: ${mockModule._id}`);
  console.log(`Questions: ${mockModule.questions.length}`);
  
  let apiCallsModuleCreation = 0;
  
  try {
    console.log('\n🎤 Pre-generating audio for module...');
    const result = await preGenerateModuleAudio(mockModule, 'RACHEL');
    
    // Count API calls
    if (result.greeting.apiCallMade) apiCallsModuleCreation++;
    result.questions.forEach(q => { if (q.apiCallMade) apiCallsModuleCreation++; });
    if (result.outro.apiCallMade) apiCallsModuleCreation++;
    
    console.log(`✅ Module audio pre-generated`);
    console.log(`   API calls made: ${apiCallsModuleCreation}`);
  } catch (error) {
    console.error('❌ Pre-generation failed:', error.message);
    await mongoose.connection.close();
    return;
  }
  
  // Check filesystem
  console.log('\n📁 Checking local filesystem...');
  const audioDir = path.join(__dirname, 'src', 'audio');
  const files = fs.readdirSync(audioDir);
  console.log(`   Files in audio directory: ${files.length}`);
  
  // Check MongoDB
  console.log('\n💾 Checking MongoDB...');
  const dbFiles = await AudioFile.countDocuments();
  console.log(`   Audio files in database: ${dbFiles}`);
  
  // STEP 2: Simulate call execution
  console.log(`\n📞 STEP 2: Call Execution (Simulating)`);
  console.log(`Using Module ID: ${mockModule._id}`);
  
  let apiCallsCallExecution = 0;
  
  // Greeting
  console.log('\n1. Greeting...');
  const greeting = await getOrGenerateAudio(
    'Hello, this is an automated call from Vok AI. We have a few questions for you.',
    'RACHEL',
    { category: 'greeting', isShared: true }
  );
  console.log(`   Source: ${greeting.source}`);
  console.log(`   API Call: ${greeting.apiCallMade ? 'Yes ⚠️' : 'No ✅'}`);
  if (greeting.apiCallMade) apiCallsCallExecution++;
  
  // Questions
  for (let i = 0; i < mockModule.questions.length; i++) {
    console.log(`\n${i + 2}. Question ${i + 1}...`);
    const q = await getOrGenerateAudio(
      mockModule.questions[i].question,
      'RACHEL',
      { category: 'question', isShared: false, moduleId: mockModule._id }
    );
    console.log(`   Source: ${q.source}`);
    console.log(`   API Call: ${q.apiCallMade ? 'Yes ⚠️' : 'No ✅'}`);
    if (q.apiCallMade) apiCallsCallExecution++;
  }
  
  // Outro
  console.log(`\n${mockModule.questions.length + 2}. Outro...`);
  const outro = await getOrGenerateAudio(
    'Thank you for your time. Your responses have been recorded.',
    'RACHEL',
    { category: 'outro', isShared: true }
  );
  console.log(`   Source: ${outro.source}`);
  console.log(`   API Call: ${outro.apiCallMade ? 'Yes ⚠️' : 'No ✅'}`);
  if (outro.apiCallMade) apiCallsCallExecution++;
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 RESULTS SUMMARY');
  console.log('='.repeat(70));
  console.log(`Module Creation API Calls: ${apiCallsModuleCreation}`);
  console.log(`Call Execution API Calls: ${apiCallsCallExecution}`);
  console.log(`Total API Calls: ${apiCallsModuleCreation + apiCallsCallExecution}`);
  console.log(`\nLocal Files: ${files.length}`);
  console.log(`Database Files: ${dbFiles}`);
  
  if (apiCallsCallExecution === 0) {
    console.log('\n✅ SUCCESS! Call used 0 API calls (all cached)');
  } else {
    console.log(`\n⚠️  WARNING! Call made ${apiCallsCallExecution} API calls`);
    console.log('   Expected: 0 (all should be cached from module creation)');
  }
  
  await mongoose.connection.close();
  console.log('\n👋 Test complete');
}

testCompleteFlow().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
