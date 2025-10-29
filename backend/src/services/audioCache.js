import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AudioFile from '../models/AudioFile.js';
import { generateSpeech, VOICES } from '../config/elevenlabs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Audio storage directory
const AUDIO_DIR = path.join(__dirname, '..', 'audio');

// Ensure audio directory exists
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// Generate hash for text
function generateTextHash(text, voiceType) {
  return crypto.createHash('md5').update(`${text}_${voiceType}`).digest('hex');
}

// Get local file path
function getLocalFilePath(textHash, voiceType) {
  return path.join(AUDIO_DIR, `${textHash}_${voiceType}.mp3`);
}

// Get public URL
function getPublicUrl(filename) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5001';
  return `${baseUrl}/audio/${filename}`;
}

/**
 * Three-tier audio lookup system
 * 1. Check local filesystem
 * 2. Check MongoDB
 * 3. Generate with ElevenLabs API
 */
export async function getOrGenerateAudio(text, voiceType = 'RACHEL', options = {}) {
  const {
    category = 'custom',
    isShared = false,
    moduleId = null,
  } = options;

  const textHash = generateTextHash(text, voiceType);
  const localPath = getLocalFilePath(textHash, voiceType);
  const filename = path.basename(localPath);

  console.log(`🔍 Looking up audio: ${text.substring(0, 50)}...`);

  // TIER 1: Check local filesystem
  if (fs.existsSync(localPath)) {
    console.log('✅ Found in local filesystem');
    
    // Update usage in MongoDB (async, non-blocking)
    AudioFile.findByTextHash(textHash, voiceType)
      .then(audioFile => {
        if (audioFile) audioFile.incrementUsage();
      })
      .catch(err => console.error('Error updating usage:', err));

    return {
      success: true,
      audioUrl: getPublicUrl(filename),
      source: 'local',
      cached: true,
    };
  }

  // TIER 2: Check MongoDB
  console.log('🔍 Checking MongoDB...');
  const audioFile = await AudioFile.findByTextHash(textHash, voiceType);
  
  if (audioFile) {
    console.log('✅ Found in MongoDB, restoring to local filesystem');
    
    // Write to local filesystem
    fs.writeFileSync(localPath, audioFile.audioBuffer);
    
    // Update usage
    await audioFile.incrementUsage();

    return {
      success: true,
      audioUrl: getPublicUrl(filename),
      source: 'mongodb',
      cached: true,
    };
  }

  // TIER 3: Generate with ElevenLabs API
  console.log('🎤 Generating with ElevenLabs API...');
  
  try {
    const voiceId = VOICES[voiceType]?.id || VOICES.RACHEL.id;
    const audioBuffer = await generateSpeech(text, voiceId);
    const buffer = Buffer.from(audioBuffer);

    // Save to local filesystem
    fs.writeFileSync(localPath, buffer);
    console.log('💾 Saved to local filesystem');

    // Save to MongoDB
    const newAudioFile = new AudioFile({
      text,
      textHash,
      voiceType,
      category,
      audioBuffer: buffer,
      audioSize: buffer.length,
      localPath,
      publicUrl: getPublicUrl(filename),
      isShared,
      moduleId,
      usageCount: 1,
    });

    await newAudioFile.save();
    console.log('💾 Saved to MongoDB');

    return {
      success: true,
      audioUrl: getPublicUrl(filename),
      source: 'elevenlabs',
      cached: false,
      apiCallMade: true,
    };
  } catch (error) {
    console.error('❌ ElevenLabs generation failed:', error.message);
    throw error;
  }
}

/**
 * Pre-generate audio for a module
 * Called when module is created
 */
export async function preGenerateModuleAudio(module, voiceType = 'RACHEL') {
  console.log(`🎬 Pre-generating audio for module: ${module.name}`);
  
  const results = {
    greeting: null,
    questions: [],
    outro: null,
  };

  try {
    // Generate greeting
    const greetingText = `Hello, this is an automated call from Vok AI. We have a few questions for you.`;
    results.greeting = await getOrGenerateAudio(greetingText, voiceType, {
      category: 'greeting',
      isShared: true,
    });

    // Generate questions
    for (let i = 0; i < module.questions.length; i++) {
      const question = module.questions[i];
      const questionAudio = await getOrGenerateAudio(question.question, voiceType, {
        category: 'question',
        isShared: false,
        moduleId: module._id,
      });
      results.questions.push(questionAudio);
    }

    // Generate outro
    const outroText = `Thank you for your time. Your responses have been recorded.`;
    results.outro = await getOrGenerateAudio(outroText, voiceType, {
      category: 'outro',
      isShared: true,
    });

    console.log('✅ Module audio pre-generation complete');
    return results;
  } catch (error) {
    console.error('❌ Module audio pre-generation failed:', error.message);
    throw error;
  }
}

/**
 * Initialize shared audio library
 * Run once on server startup
 */
export async function initializeSharedAudioLibrary(voiceType = 'RACHEL') {
  console.log('🎬 Initializing shared audio library...');

  const sharedPhrases = [
    { text: 'Hello, this is an automated call from Vok AI', category: 'greeting' },
    { text: 'Good morning, this is Vok AI calling', category: 'greeting' },
    { text: 'Hi, this is an automated call from Vok AI', category: 'greeting' },
    { text: 'Is now a good time to speak?', category: 'confirmation' },
    { text: 'Can I ask you a few questions?', category: 'confirmation' },
    { text: 'This will only take 2 to 3 minutes', category: 'confirmation' },
    { text: 'Thank you for your time', category: 'outro' },
    { text: 'Have a great day', category: 'outro' },
    { text: 'Your responses have been recorded', category: 'outro' },
    { text: 'I understand', category: 'response' },
    { text: 'Thank you for that information', category: 'response' },
  ];

  let generated = 0;
  let cached = 0;

  for (const phrase of sharedPhrases) {
    try {
      const result = await getOrGenerateAudio(phrase.text, voiceType, {
        category: phrase.category,
        isShared: true,
      });

      if (result.apiCallMade) {
        generated++;
      } else {
        cached++;
      }
    } catch (error) {
      console.error(`Failed to generate: ${phrase.text}`, error.message);
    }
  }

  console.log(`✅ Shared audio library initialized: ${generated} generated, ${cached} cached`);
  return { generated, cached, total: sharedPhrases.length };
}

/**
 * Cleanup old audio files
 * Remove local files not used in 7 days
 */
export async function cleanupOldAudio() {
  console.log('🧹 Starting audio cleanup...');

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  // Find audio files not used in 7 days
  const oldFiles = await AudioFile.find({
    lastUsedAt: { $lt: sevenDaysAgo },
    isShared: false, // Don't delete shared audio
  });

  let deleted = 0;

  for (const audioFile of oldFiles) {
    try {
      // Delete from local filesystem
      if (audioFile.localPath && fs.existsSync(audioFile.localPath)) {
        fs.unlinkSync(audioFile.localPath);
        deleted++;
      }
    } catch (error) {
      console.error(`Failed to delete: ${audioFile.localPath}`, error.message);
    }
  }

  console.log(`✅ Cleanup complete: ${deleted} files removed from local storage`);
  return { deleted, total: oldFiles.length };
}

/**
 * Get audio statistics
 */
export async function getAudioStats() {
  const totalFiles = await AudioFile.countDocuments();
  const sharedFiles = await AudioFile.countDocuments({ isShared: true });
  const moduleFiles = await AudioFile.countDocuments({ isShared: false });
  
  const totalSize = await AudioFile.aggregate([
    { $group: { _id: null, totalSize: { $sum: '$audioSize' } } }
  ]);

  const mostUsed = await AudioFile.find()
    .sort({ usageCount: -1 })
    .limit(10)
    .select('text voiceType usageCount category');

  return {
    totalFiles,
    sharedFiles,
    moduleFiles,
    totalSize: totalSize[0]?.totalSize || 0,
    mostUsed,
  };
}
