import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request object
 * Rejects requests with no token or invalid token
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    
    // Find user
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Optional authentication middleware
 * Verifies JWT token and attaches user to request object if present and valid
 * Continues to next middleware regardless of authentication status
 */
export const optionalAuthenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    // If no token, skip authentication but continue
    if (!token) {
      return next();
    }
    
    // Try to verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      
      // Find user
      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
      });
      
      if (user) {
        // Attach user to request
        req.user = user;
      }
    } catch (tokenError) {
      // Token is invalid, but we'll continue anyway
      console.info('Invalid token in optional auth, continuing...');
    }
    
    next();
  } catch (error) {
    // Even on error, proceed to the next middleware
    console.error('Optional auth middleware error:', error);
    next();
  }
}; 