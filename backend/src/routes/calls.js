import express from 'express';
import Call from '../models/Call.js';
import Module from '../models/Module.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { makeCall, generateTwiML } from '../config/twilio.js';
import { transcribeAudio, generateSummary } from '../config/openai.js';

const router = express.Router();

// Initiate a call
router.post('/initiate', protect, async (req, res) => {
  try {
    const { moduleId, phoneNumber } = req.body;

    // Check if user has enough tokens
    if (req.user.tokens < 1) {
      return res.status(400).json({ error: 'Insufficient tokens' });
    }

    const module = await Module.findById(moduleId);
    if (!module || module.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ error: 'Module not found' });
    }

    // Generate TwiML for the call
    const twiml = generateTwiML(module.questions);
    
    // Make the call using Twilio
    const call = await makeCall(
      phoneNumber,
      process.env.TWILIO_PHONE_NUMBER,
      `${process.env.BASE_URL}/api/calls/twiml/${moduleId}`
    );

    // Create call record
    const callRecord = await Call.create({
      userId: req.user._id,
      moduleId,
      phoneNumber,
      twilioCallSid: call.sid,
      status: 'initiated',
    });

    // Deduct tokens
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { tokens: -1 }
    });

    res.json({ call: callRecord, twilioCall: call });
  } catch (error) {
    res.status(500).json({ error: 'Failed to initiate call' });
  }
});

// Twilio webhook for call status updates
router.post('/webhook', async (req, res) => {
  try {
    const { CallSid, CallStatus, CallDuration, RecordingUrl } = req.body;
    
    const call = await Call.findOne({ twilioCallSid: CallSid });
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    call.status = CallStatus;
    if (CallDuration) call.duration = parseInt(CallDuration);
    if (RecordingUrl) call.recordingUrl = RecordingUrl;

    await call.save();
    res.sendStatus(200);
  } catch (error) {
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Get call history
router.get('/history', protect, async (req, res) => {
  try {
    const calls = await Call.find({ userId: req.user._id })
      .populate('moduleId')
      .sort({ createdAt: -1 });
    res.json(calls);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch call history' });
  }
});

export default router; 