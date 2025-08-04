import express from 'express';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get user profile
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user tokens (for purchases)
router.put('/tokens', protect, async (req, res) => {
  try {
    const { amount } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { tokens: amount } },
      { new: true }
    );
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update tokens' });
  }
});

// Get user analytics
router.get('/analytics', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    // Add analytics logic here
    res.json({
      totalTokens: user.tokens,
      // Add more analytics as needed
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router; 