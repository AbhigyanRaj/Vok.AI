import mongoose from 'mongoose';

// Schema for storing audio files in MongoDB
const audioFileSchema = new mongoose.Schema({
  // Text content that was converted to speech
  text: {
    type: String,
    required: true,
  },
  // Hash of text for quick lookup
  textHash: {
    type: String,
    required: true,
    index: true,
  },
  // Voice type used (RACHEL, DOMI, etc.)
  voiceType: {
    type: String,
    required: true,
    enum: ['RACHEL', 'DOMI', 'BELLA', 'ANTONI', 'THOMAS', 'JOSH'],
    default: 'RACHEL',
  },
  // Category of audio
  category: {
    type: String,
    enum: ['greeting', 'question', 'confirmation', 'outro', 'response', 'custom'],
    default: 'custom',
  },
  // Audio data stored as Buffer
  audioBuffer: {
    type: Buffer,
    required: true,
  },
  // Size in bytes
  audioSize: {
    type: Number,
    required: true,
  },
  // Local file path (if saved to disk)
  localPath: String,
  // Public URL for accessing the audio
  publicUrl: String,
  // Whether this is shared across all users
  isShared: {
    type: Boolean,
    default: false,
  },
  // Module reference (if module-specific)
  moduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module',
    sparse: true,
  },
  // Usage tracking
  usageCount: {
    type: Number,
    default: 0,
  },
  lastUsedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Compound index for efficient lookups
audioFileSchema.index({ textHash: 1, voiceType: 1 });
audioFileSchema.index({ moduleId: 1, category: 1 });
audioFileSchema.index({ isShared: 1, category: 1 });

// Instance method to increment usage
audioFileSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  return this.save();
};

// Static method to find by text hash
audioFileSchema.statics.findByTextHash = function(textHash, voiceType) {
  return this.findOne({ textHash, voiceType });
};

// Static method to find shared audio
audioFileSchema.statics.findSharedAudio = function(category, voiceType) {
  return this.find({ isShared: true, category, voiceType });
};

const AudioFile = mongoose.model('AudioFile', audioFileSchema);

export default AudioFile;
