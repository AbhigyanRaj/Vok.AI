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
  phoneNumber: {
    type: String,
    required: true,
  },
  twilioCallSid: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['initiated', 'ringing', 'in-progress', 'completed', 'failed'],
    default: 'initiated',
  },
  duration: {
    type: Number,
    default: 0,
  },
  transcription: {
    type: String,
    default: '',
  },
  summary: {
    type: String,
    default: '',
  },
  recordingUrl: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

const Call = mongoose.model('Call', callSchema);

export default Call; 