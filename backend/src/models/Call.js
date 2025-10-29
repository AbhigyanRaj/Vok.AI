import mongoose from 'mongoose';

const callSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  moduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module',
    required: true,
  },
  customerName: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  twilioCallSid: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['initiated', 'queued', 'ringing', 'in-progress', 'answered', 'completed', 'failed', 'busy', 'no-answer', 'canceled'],
    default: 'initiated',
  },
  duration: {
    type: Number,
    default: 0,
  },
  responses: {
    type: Map,
    of: String,
    default: new Map(),
  },
  transcription: {
    type: String,
    default: '',
  },
  summary: {
    type: String,
    default: '',
  },
  evaluation: {
    result: {
      type: String,
      enum: ['YES', 'NO', 'MAYBE', 'INVESTIGATION_REQUIRED', 'DECLINED'],
      default: null,
    },
    comments: [{
      type: String,
    }],
  },
  recordingUrl: {
    type: String,
    default: '',
  },
  currentStep: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

const Call = mongoose.model('Call', callSchema);

export default Call; 