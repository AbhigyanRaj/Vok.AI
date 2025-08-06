import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { isDBConnected, getMockUser } from '../utils/dbUtils.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'vokai-simple-secret');
    
    // Check if database is available
    if (!isDBConnected()) {
      console.log('⚠️  Database not available - using mock user for authentication');
      req.user = getMockUser(decoded.id);
      return next();
    }

    req.user = await User.findById(decoded.id).select('-password');
    next();
  } catch (error) {
    res.status(401).json({ error: 'Not authorized, token failed' });
  }
};

export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'vokai-simple-secret', {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
}; 