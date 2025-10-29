import mongoose from 'mongoose';

const moduleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    enum: ['loan', 'credit_card', 'custom'],
    required: true,
  },
  questions: [{
    question: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      required: true,
    },
    required: {
      type: Boolean,
      default: true,
    },
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
  totalCalls: {
    type: Number,
    default: 0,
  },
  successfulCalls: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

const Module = mongoose.model('Module', moduleSchema);

export default Module; 