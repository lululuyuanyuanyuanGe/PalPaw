import express from 'express';
import { User } from '../models/index.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Get user by ID
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }
    
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] } // Exclude sensitive information
    });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Return user with additional stats
    return res.status(200).json({
      success: true,
      user: {
        ...user.toJSON(),
        followers: 0, // You can implement these later
        following: 0  // You can implement these later
      }
    });
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
});

export default router; 