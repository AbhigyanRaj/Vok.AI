import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { getOrGenerateAudio } from './src/services/audioCache.js';
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

async function debugAudioLookup() {
  console.log('\n🔍 DEBUG: Audio Lookup System');
  console.log('='.repeat(60));
  
  await connectDB();
  
  // Test 1: Check what's in the database
  console.log('\n📋 TEST 1: What audio files exist in MongoDB?');
  const allAudio = await AudioFile.find().select('text voiceType category isShared moduleId usageCount');
  console.log(`Total files: ${allAudio.length}`);
  
  if (allAudio.length > 0) {
    console.log('\nFirst 10 files:');
    allAudio.slice(0, 10).forEach((file, i) => {
      console.log(`${i + 1}. "${file.text.substring(0, 40)}..." - Voice: ${file.voiceType}, Category: ${file.category}, Shared: ${file.isShared}, ModuleId: ${file.moduleId || 'none'}`);
    });
  } else {
    console.log('⚠️  No audio files in database!');
  }
  
  // Test 2: Try to lookup a specific question
  console.log('\n📋 TEST 2: Lookup specific question');
  const testQuestion = 'What is your monthly income?';
  console.log(`Question: "${testQuestion}"`);
  
  try {
    const result = await getOrGenerateAudio(testQuestion, 'RACHEL', {
      category: 'question',
      isShared: false,
      moduleId: null
    });
    
    console.log(`Result: ${result.source}`);
    console.log(`Cached: ${result.cached}`);
    console.log(`API Call: ${result.apiCallMade ? 'Yes' : 'No'}`);
    console.log(`URL: ${result.audioUrl}`);
  } catch (error) {
    console.error('❌ Lookup failed:', error.message);
  }
  
  // Test 3: Check if moduleId affects lookup
  console.log('\n📋 TEST 3: Check moduleId impact');
  const mockModuleId = new mongoose.Types.ObjectId();
  console.log(`Mock ModuleId: ${mockModuleId}`);
  
  // Check if any audio has this moduleId
  const moduleAudio = await AudioFile.find({ moduleId: mockModuleId });
  console.log(`Audio files with this moduleId: ${moduleAudio.length}`);
  
  // Test 4: Check text hash matching
  console.log('\n📋 TEST 4: Text Hash Matching');
  const crypto = await import('crypto');
  const testText = 'What is your monthly income?';
  const testVoice = 'RACHEL';
  const testHash = crypto.default.createHash('md5').update(`${testText}_${testVoice}`).digest('hex');
  console.log(`Text: "${testText}"`);
  console.log(`Voice: ${testVoice}`);
  console.log(`Expected Hash: ${testHash}`);
  
  const matchingAudio = await AudioFile.findOne({ textHash: testHash, voiceType: testVoice });
  if (matchingAudio) {
    console.log('✅ Found matching audio in DB!');
    console.log(`   Category: ${matchingAudio.category}`);
    console.log(`   ModuleId: ${matchingAudio.moduleId || 'none'}`);
    console.log(`   Shared: ${matchingAudio.isShared}`);
  } else {
    console.log('❌ No matching audio found in DB');
  }
  
  // Test 5: Check local filesystem
  console.log('\n📋 TEST 5: Local Filesystem Check');
  const fs = await import('fs');
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.default.dirname(__filename);
  const audioDir = path.default.join(__dirname, 'src', 'audio');
  
  if (fs.default.existsSync(audioDir)) {
    const files = fs.default.readdirSync(audioDir);
    console.log(`Audio directory exists: ${audioDir}`);
    console.log(`Files in directory: ${files.length}`);
    if (files.length > 0) {
      console.log('First 5 files:');
      files.slice(0, 5).forEach((file, i) => {
        const stats = fs.default.statSync(path.default.join(audioDir, file));
        console.log(`${i + 1}. ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
      });
    }
  } else {
    console.log('⚠️  Audio directory does not exist!');
  }
  
  await mongoose.connection.close();
  console.log('\n✅ Debug complete');
}

debugAudioLookup().catch(err => {
  console.error('❌ Debug failed:', err);
  process.exit(1);
});
