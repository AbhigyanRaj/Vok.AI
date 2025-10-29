import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { getOrGenerateAudio, initializeSharedAudioLibrary, getAudioStats } from './src/services/audioCache.js';
import AudioFile from './src/models/AudioFile.js';

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

// Test 1: Initialize Shared Audio Library
async function testSharedAudioLibrary() {
  console.log('\n📋 TEST 1: Shared Audio Library Initialization');
  console.log('='.repeat(60));
  
  try {
    const result = await initializeSharedAudioLibrary('RACHEL');
    console.log(`✅ Result: ${result.generated} generated, ${result.cached} cached`);
    console.log(`   Total phrases: ${result.total}`);
    
    if (result.generated > 0) {
      console.log(`⚠️  WARNING: ${result.generated} API calls made`);
    } else {
      console.log(`✅ No API calls - all cached!`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

// Test 2: Get or Generate Audio (should use cache)
async function testGetOrGenerateAudio() {
  console.log('\n📋 TEST 2: Get or Generate Audio (Cache Test)');
  console.log('='.repeat(60));
  
  const testCases = [
    { text: 'Hello, this is a test', category: 'greeting', shouldCache: false },
    { text: 'Hello, this is a test', category: 'greeting', shouldCache: true }, // Same text - should be cached
    { text: 'What is your name?', category: 'question', shouldCache: false },
    { text: 'What is your name?', category: 'question', shouldCache: true }, // Same text - should be cached
  ];
  
  let apiCalls = 0;
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\nTest ${i + 1}: "${testCase.text}"`);
    
    try {
      const result = await getOrGenerateAudio(testCase.text, 'RACHEL', {
        category: testCase.category,
        isShared: false,
      });
      
      console.log(`  Source: ${result.source}`);
      console.log(`  Cached: ${result.cached ? 'Yes' : 'No'}`);
      console.log(`  API Call: ${result.apiCallMade ? 'Yes' : 'No'}`);
      
      if (result.apiCallMade) {
        apiCalls++;
      }
      
      // Verify caching behavior
      if (testCase.shouldCache && result.apiCallMade) {
        console.log(`  ⚠️  WARNING: Expected cached, but API call was made!`);
      } else if (testCase.shouldCache && !result.apiCallMade) {
        console.log(`  ✅ Correctly used cache`);
      }
    } catch (error) {
      console.error(`  ❌ Failed:`, error.message);
    }
  }
  
  console.log(`\n📊 Total API calls in this test: ${apiCalls}`);
  console.log(`   Expected: 2 (first occurrence of each unique text)`);
  
  return apiCalls;
}

// Test 3: Verify MongoDB Storage
async function testMongoDBStorage() {
  console.log('\n📋 TEST 3: MongoDB Storage Verification');
  console.log('='.repeat(60));
  
  try {
    const stats = await getAudioStats();
    
    console.log(`Total audio files in DB: ${stats.totalFiles}`);
    console.log(`Shared files: ${stats.sharedFiles}`);
    console.log(`Module-specific files: ${stats.moduleFiles}`);
    console.log(`Total storage: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
    
    console.log('\nMost used audio files:');
    stats.mostUsed.forEach((file, index) => {
      console.log(`  ${index + 1}. "${file.text.substring(0, 50)}..." - ${file.usageCount} uses (${file.category})`);
    });
    
    return stats;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

// Test 4: Simulate Module Creation (Pro User)
async function testModuleAudioGeneration() {
  console.log('\n📋 TEST 4: Module Audio Pre-generation Simulation');
  console.log('='.repeat(60));
  
  const mockModule = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Test Module',
    questions: [
      { question: 'What is your monthly income?', order: 0 },
      { question: 'Do you have any existing loans?', order: 1 },
      { question: 'What is your employment status?', order: 2 },
    ]
  };
  
  console.log(`Module: ${mockModule.name}`);
  console.log(`Questions: ${mockModule.questions.length}`);
  
  let apiCalls = 0;
  
  try {
    // Generate greeting (shared)
    console.log('\n1. Generating greeting...');
    const greeting = await getOrGenerateAudio(
      'Hello, this is an automated call from Vok AI. We have a few questions for you.',
      'RACHEL',
      { category: 'greeting', isShared: true }
    );
    console.log(`   Source: ${greeting.source}, API Call: ${greeting.apiCallMade ? 'Yes' : 'No'}`);
    if (greeting.apiCallMade) apiCalls++;
    
    // Generate questions
    for (let i = 0; i < mockModule.questions.length; i++) {
      const q = mockModule.questions[i];
      console.log(`\n${i + 2}. Generating question ${i + 1}...`);
      const result = await getOrGenerateAudio(q.question, 'RACHEL', {
        category: 'question',
        isShared: false,
        moduleId: mockModule._id,
      });
      console.log(`   Source: ${result.source}, API Call: ${result.apiCallMade ? 'Yes' : 'No'}`);
      if (result.apiCallMade) apiCalls++;
    }
    
    // Generate outro (shared)
    console.log('\n5. Generating outro...');
    const outro = await getOrGenerateAudio(
      'Thank you for your time. Your responses have been recorded.',
      'RACHEL',
      { category: 'outro', isShared: true }
    );
    console.log(`   Source: ${outro.source}, API Call: ${outro.apiCallMade ? 'Yes' : 'No'}`);
    if (outro.apiCallMade) apiCalls++;
    
    console.log(`\n📊 Total API calls for module creation: ${apiCalls}`);
    console.log(`   Expected: 0-5 (depending on cache state)`);
    
    return apiCalls;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

// Test 5: Cleanup Test Data
async function cleanupTestData() {
  console.log('\n📋 TEST 5: Cleanup (Optional)');
  console.log('='.repeat(60));
  
  try {
    // Don't delete shared audio
    const testFiles = await AudioFile.find({
      isShared: false,
      $or: [
        { text: 'Hello, this is a test' },
        { text: 'What is your name?' },
      ]
    });
    
    console.log(`Found ${testFiles.length} test files to clean up`);
    
    // Uncomment to actually delete
    // await AudioFile.deleteMany({ _id: { $in: testFiles.map(f => f._id) } });
    // console.log('✅ Test files cleaned up');
    
    console.log('ℹ️  Cleanup skipped (keeping test data for verification)');
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('\n🧪 ELEVENLABS AUDIO CACHING SYSTEM - END-TO-END TEST');
  console.log('='.repeat(60));
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`ElevenLabs API Key: ${process.env.ELEVENLABS_API_KEY ? 'SET ✅' : 'NOT SET ❌'}`);
  console.log(`MongoDB URI: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/vokai'}`);
  
  if (!process.env.ELEVENLABS_API_KEY) {
    console.error('\n❌ ELEVENLABS_API_KEY not set. Please configure it in .env file.');
    process.exit(1);
  }
  
  try {
    // Connect to database
    await connectDB();
    
    // Run tests
    const sharedLibResult = await testSharedAudioLibrary();
    const cacheTestApiCalls = await testGetOrGenerateAudio();
    const dbStats = await testMongoDBStorage();
    const moduleApiCalls = await testModuleAudioGeneration();
    await cleanupTestData();
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Shared Library: ${sharedLibResult.generated} generated, ${sharedLibResult.cached} cached`);
    console.log(`Cache Test: ${cacheTestApiCalls} API calls (expected: 2)`);
    console.log(`Module Test: ${moduleApiCalls} API calls (expected: 0-5)`);
    console.log(`Total Files in DB: ${dbStats.totalFiles}`);
    console.log(`Total Storage: ${(dbStats.totalSize / 1024 / 1024).toFixed(2)} MB`);
    
    const totalApiCalls = sharedLibResult.generated + cacheTestApiCalls + moduleApiCalls;
    console.log(`\n🎯 TOTAL API CALLS IN THIS TEST: ${totalApiCalls}`);
    
    if (totalApiCalls === 0) {
      console.log('✅ PERFECT! All audio served from cache - no API abuse!');
    } else if (totalApiCalls < 20) {
      console.log('✅ GOOD! Minimal API usage - caching is working!');
    } else {
      console.log('⚠️  WARNING! High API usage - check caching implementation!');
    }
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run tests
runTests();
