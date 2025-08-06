import express from 'express';
import User from '../models/User.js';
import Call from '../models/Call.js';
import Module from '../models/Module.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get user profile
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-googleId');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        tokens: user.tokens,
        subscription: user.subscription,
        totalCallsMade: user.totalCallsMade,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch profile',
      message: error.message 
    });
  }
});

// Update user tokens (for purchases)
router.put('/tokens', protect, async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid token amount' });
    }

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // In a real implementation, you would process payment here
    user.addTokens(amount);
    await user.save();

    res.json({
      success: true,
      message: `${amount} tokens added successfully`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        tokens: user.tokens,
        subscription: user.subscription,
      }
    });
  } catch (error) {
    console.error('Update tokens error:', error);
    res.status(500).json({ 
      error: 'Failed to update tokens',
      message: error.message 
    });
  }
});

// Get user analytics
router.get('/analytics', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get call statistics
    const callStats = await Call.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalDuration: { $sum: '$duration' }
        }
      }
    ]);

    // Get module statistics
    const moduleStats = await Module.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalCalls: { $sum: '$totalCalls' },
          successfulCalls: { $sum: '$successfulCalls' }
        }
      }
    ]);

    // Get recent call activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCalls = await Call.find({
      userId: user._id,
      createdAt: { $gte: thirtyDaysAgo }
    }).countDocuments();

    // Calculate success rate
    const totalCalls = user.totalCallsMade;
    const completedCalls = callStats.find(stat => stat._id === 'completed')?.count || 0;
    const successRate = totalCalls > 0 ? ((completedCalls / totalCalls) * 100).toFixed(1) : 0;

    // Process call statistics
    const callStatusBreakdown = {};
    let totalCallDuration = 0;

    callStats.forEach(stat => {
      callStatusBreakdown[stat._id] = {
        count: stat.count,
        totalDuration: stat.totalDuration || 0
      };
      totalCallDuration += stat.totalDuration || 0;
    });

    // Process module statistics
    const moduleTypeBreakdown = {};
    moduleStats.forEach(stat => {
      moduleTypeBreakdown[stat._id] = {
        moduleCount: stat.count,
        totalCalls: stat.totalCalls,
        successfulCalls: stat.successfulCalls,
        successRate: stat.totalCalls > 0 ? ((stat.successfulCalls / stat.totalCalls) * 100).toFixed(1) : 0
      };
    });

    res.json({
      success: true,
      analytics: {
        user: {
          totalTokens: user.tokens,
          totalCallsMade: user.totalCallsMade,
          subscription: user.subscription,
          accountAge: Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24)), // days
          recentCallsLast30Days: recentCalls
        },
        calls: {
          total: totalCalls,
          statusBreakdown: callStatusBreakdown,
          totalDuration: totalCallDuration,
          averageDuration: totalCalls > 0 ? Math.round(totalCallDuration / totalCalls) : 0,
          successRate: parseFloat(successRate)
        },
        modules: {
          typeBreakdown: moduleTypeBreakdown,
          totalModules: await Module.countDocuments({ userId: user._id }),
          activeModules: await Module.countDocuments({ userId: user._id, isActive: true })
        }
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch analytics',
      message: error.message 
    });
  }
});

// Get user dashboard summary
router.get('/dashboard', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get recent calls (last 5)
    const recentCalls = await Call.find({ userId: user._id })
      .populate('moduleId', 'name type')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get active modules
    const activeModules = await Module.find({ 
      userId: user._id, 
      isActive: true 
    }).limit(5);

    // Get quick stats
    const totalModules = await Module.countDocuments({ userId: user._id });
    const totalCalls = await Call.countDocuments({ userId: user._id });
    const completedCalls = await Call.countDocuments({ 
      userId: user._id, 
      status: 'completed' 
    });

    res.json({
      success: true,
      dashboard: {
        user: {
          name: user.name,
          email: user.email,
          tokens: user.tokens,
          subscription: user.subscription
        },
        quickStats: {
          totalModules,
          totalCalls,
          completedCalls,
          successRate: totalCalls > 0 ? ((completedCalls / totalCalls) * 100).toFixed(1) : 0
        },
        recentCalls: recentCalls.map(call => ({
          _id: call._id,
          customerName: call.customerName,
          phoneNumber: call.phoneNumber,
          status: call.status,
          duration: call.duration,
          createdAt: call.createdAt,
          module: call.moduleId ? {
            name: call.moduleId.name,
            type: call.moduleId.type
          } : null
        })),
        activeModules: activeModules.map(module => ({
          _id: module._id,
          name: module.name,
          type: module.type,
          totalCalls: module.totalCalls,
          successfulCalls: module.successfulCalls,
          questions: module.questions.length
        }))
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard',
      message: error.message 
    });
  }
});

export default router; 