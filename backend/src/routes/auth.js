import express from 'express';
import User from '../models/User.js';
import { generateToken, protect } from '../middleware/auth.js';
import { isDBConnected, getMockUser } from '../utils/dbUtils.js';

const router = express.Router();

// Google OAuth callback
router.post('/google', async (req, res) => {
  try {
    const { email, name, googleId } = req.body;

    console.log('Received auth data:', { email, name, googleId });

    if (!email || !name || !googleId) {
      console.log('Missing required fields:', { email: !!email, name: !!name, googleId: !!googleId });
      return res.status(400).json({ 
        error: 'Missing required fields: email, name, and googleId are required' 
      });
    }

    // Check if database is available
    if (!isDBConnected()) {
      console.log('⚠️  Database not available - using mock user');
      const mockUser = getMockUser();
      const token = generateToken(mockUser._id);
      
      return res.json({
        success: true,
        user: {
          _id: mockUser._id,
          name: mockUser.name,
          email: mockUser.email,
          tokens: mockUser.tokens,
          subscription: mockUser.subscription,
          totalCallsMade: mockUser.totalCallsMade,
        },
        token,
        warning: 'Running in development mode without database'
      });
    }

    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Ensure name is not undefined or empty
      const userName = name && name.trim() ? name.trim() : 'User';
      
      console.log('Creating new user with data:', {
        email: email.toLowerCase(),
        name: userName,
        googleId,
      });
      
      try {
        user = await User.create({
          email: email.toLowerCase(),
          name: userName,
          googleId,
        });
        console.log(`New user created: ${user.email} with name: ${user.name}`);
      } catch (createError) {
        console.error('User creation failed:', createError);
        console.error('User creation data:', {
          email: email.toLowerCase(),
          name: userName,
          googleId,
        });
        throw createError;
      }
    } else {
      // Update existing user
      console.log(`Existing user found: ${user.email}`);
      console.log(`Current user data:`, {
        name: user.name,
        googleId: user.googleId,
        email: user.email
      });
      
      let needsUpdate = false;
      
      // Update googleId if not set
      if (!user.googleId) {
        user.googleId = googleId;
        needsUpdate = true;
      }
      
      // Update name if it's missing, null, or empty
      if (!user.name || user.name.trim() === '') {
        user.name = name && name.trim() ? name.trim() : 'User';
        needsUpdate = true;
        console.log(`Updating missing name to: ${user.name}`);
      }
      
      if (needsUpdate) {
        try {
          await user.save();
          console.log(`User updated: ${user.email}`);
        } catch (updateError) {
          console.error('User update failed:', updateError);
          throw updateError;
        }
      } else {
        console.log(`Existing user logged in: ${user.email}`);
      }
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        tokens: user.tokens,
        subscription: user.subscription,
        totalCallsMade: user.totalCallsMade,
      },
      token,
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ 
      error: 'Authentication failed',
      message: error.message 
    });
  }
});

// Get current user (protected route)
router.get('/me', protect, async (req, res) => {
  try {
    // Check if database is available
    if (!isDBConnected()) {
      console.log('⚠️  Database not available - returning mock user');
      const mockUser = getMockUser(req.user._id);
      
      return res.json({
        success: true,
        user: {
          _id: mockUser._id,
          name: mockUser.name,
          email: mockUser.email,
          tokens: mockUser.tokens,
          subscription: mockUser.subscription,
          totalCallsMade: mockUser.totalCallsMade,
          isActive: mockUser.isActive,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        warning: 'Running in development mode without database'
      });
    }

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
    console.error('Get user error:', error);
    res.status(500).json({ 
      error: 'Failed to get user',
      message: error.message 
    });
  }
});

// Update user profile (protected route)
router.put('/profile', protect, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.name = name.trim();
    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        tokens: user.tokens,
        subscription: user.subscription,
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      error: 'Failed to update profile',
      message: error.message 
    });
  }
});

// Token management routes
router.post('/buy-tokens', protect, async (req, res) => {
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
    // For now, we'll just add tokens directly
    user.addTokens(amount);
    await user.save();

    res.json({
      success: true,
      message: `${amount} tokens added successfully`,
      newBalance: user.tokens
    });
  } catch (error) {
    console.error('Buy tokens error:', error);
    res.status(500).json({ 
      error: 'Failed to purchase tokens',
      message: error.message 
    });
  }
});

// Get user statistics
router.get('/stats', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // You can add more complex statistics here
    // For now, returning basic user stats
    res.json({
      success: true,
      stats: {
        totalCallsMade: user.totalCallsMade,
        tokensRemaining: user.tokens,
        subscription: user.subscription,
        accountAge: Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24)), // days
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get statistics',
      message: error.message 
    });
  }
});

// Logout (optional - mainly for clearing client-side tokens)
router.post('/logout', protect, async (req, res) => {
  try {
    // In a stateless JWT system, logout is mainly handled client-side
    // But we can log the logout event
    console.log(`User ${req.user.email} logged out`);
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      error: 'Logout failed',
      message: error.message 
    });
  }
});

export default router; 