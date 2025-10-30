import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create audio directory if it doesn't exist
const audioDir = path.join(__dirname, '../audio');

// Ensure audio directory exists
async function ensureAudioDir() {
  try {
    await fs.access(audioDir);
  } catch {
    await fs.mkdir(audioDir, { recursive: true });
  }
}

// Available Edge-TTS voices for Indian English
export const EDGE_VOICES = {
  FEMALE: 'en-IN-NeerjaNeural',
  MALE: 'en-IN-PrabhatNeural',
  FEMALE_ALT: 'en-US-AriaNeural',
  MALE_ALT: 'en-US-GuyNeural'
};

/**
 * Generate speech using Edge-TTS
 * @param {string} text - Text to convert to speech
 * @param {string} voice - Voice to use (default: Indian female)
 * @returns {Promise<Buffer>} Audio buffer
 */
export async function generateEdgeTTS(text, voice = EDGE_VOICES.FEMALE) {
  return new Promise((resolve, reject) => {
    console.log(`🎤 Edge-TTS: Generating speech with voice ${voice}`);
    
    // Use edge-tts command line tool
    const edgeTTS = spawn('edge-tts', [
      '--voice', voice,
      '--text', text,
      '--write-media', '-'
    ]);

    const audioChunks = [];
    let errorOutput = '';

    edgeTTS.stdout.on('data', (chunk) => {
      audioChunks.push(chunk);
    });

    edgeTTS.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    edgeTTS.on('close', (code) => {
      if (code === 0 && audioChunks.length > 0) {
        const audioBuffer = Buffer.concat(audioChunks);
        console.log(`✅ Edge-TTS: Generated ${audioBuffer.length} bytes of audio`);
        resolve(audioBuffer);
      } else {
        console.error(`❌ Edge-TTS failed with code ${code}:`, errorOutput);
        reject(new Error(`Edge-TTS failed: ${errorOutput}`));
      }
    });

    edgeTTS.on('error', (error) => {
      console.error('❌ Edge-TTS spawn error:', error);
      reject(error);
    });
  });
}

/**
 * Generate speech and save to file
 * @param {string} text - Text to convert
 * @param {string} voice - Voice to use
 * @returns {Promise<string>} File path of generated audio
 */
export async function generateAndSaveEdgeTTS(text, voice = EDGE_VOICES.FEMALE) {
  try {
    await ensureAudioDir();
    
    const audioBuffer = await generateEdgeTTS(text, voice);
    const filename = `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`;
    const filepath = path.join(audioDir, filename);
    
    await fs.writeFile(filepath, audioBuffer);
    console.log(`💾 Edge-TTS: Saved audio to ${filepath}`);
    
    return filepath;
  } catch (error) {
    console.error('❌ Edge-TTS generation failed:', error);
    throw error;
  }
}

/**
 * Generate speech and return public URL
 * @param {string} text - Text to convert
 * @param {string} voice - Voice to use
 * @param {string} baseUrl - Base URL for serving files
 * @returns {Promise<string>} Public URL to audio file
 */
export async function generateEdgeTTSUrl(text, voice = EDGE_VOICES.FEMALE, baseUrl = 'http://localhost:5001') {
  try {
    const filepath = await generateAndSaveEdgeTTS(text, voice);
    const filename = path.basename(filepath);
    const publicUrl = `${baseUrl}/api/audio/${filename}`;
    
    console.log(`🌐 Edge-TTS: Public URL: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error('❌ Edge-TTS URL generation failed:', error);
    throw error;
  }
}

/**
 * Clean up old audio files (older than 1 hour)
 */
export async function cleanupOldAudioFiles() {
  try {
    await ensureAudioDir();
    const files = await fs.readdir(audioDir);
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const file of files) {
      if (file.startsWith('edge_')) {
        const filepath = path.join(audioDir, file);
        const stats = await fs.stat(filepath);
        
        if (stats.mtime.getTime() < oneHourAgo) {
          await fs.unlink(filepath);
          console.log(`🗑️ Cleaned up old audio file: ${file}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Audio cleanup failed:', error);
  }
}

// Auto-cleanup every 30 minutes
setInterval(cleanupOldAudioFiles, 30 * 60 * 1000);
