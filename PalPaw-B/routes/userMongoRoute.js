import express from 'express';
import { MongoUser } from '../models/index.js';
import { User } from '../models/index.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @route   POST /api/mongo/users/sync
 * @desc    Sync current user from PostgreSQL to MongoDB
 * @access  Private
 */
router.post('/sync', authenticate, async (req, res) => {
  try {
    const pgUser = req.user;
    
    // Check if user already exists in MongoDB
    let mongoUser = await MongoUser.findOne({ email: pgUser.email });
    
    if (mongoUser) {
      // Update existing user
      mongoUser.username = pgUser.username;
      mongoUser.firstName = pgUser.firstName || '';
      mongoUser.lastName = pgUser.lastName || '';
      mongoUser.avatar = pgUser.avatar || '';
      mongoUser.bio = pgUser.bio || '';
      
      await mongoUser.save();
      
      return res.json({ 
        success: true, 
        message: 'User synced with MongoDB',
        user: mongoUser.getPublicProfile()
      });
    }
    
    // Create new MongoDB user
    mongoUser = new MongoUser({
      username: pgUser.username,
      email: pgUser.email,
      password: pgUser.password || 'SYNCED_USER', // This won't actually be used for auth
      firstName: pgUser.firstName || '',
      lastName: pgUser.lastName || '',
      avatar: pgUser.avatar || '',
      bio: pgUser.bio || '',
      onlineStatus: 'offline',
      lastActive: new Date()
    });
    
    await mongoUser.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'User created in MongoDB',
      user: mongoUser.getPublicProfile()
    });
  } catch (error) {
    console.error('Error syncing user to MongoDB:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   GET /api/mongo/users/status/:userId
 * @desc    Get a user's online status
 * @access  Public
 */
router.get('/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const mongoUser = await MongoUser.findById(userId).select('onlineStatus lastActive');
    
    if (!mongoUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ 
      success: true,
      onlineStatus: mongoUser.onlineStatus,
      lastActive: mongoUser.lastActive
    });
  } catch (error) {
    console.error('Error getting user status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   GET /api/mongo/users/find-by-postgres/:pgUserId
 * @desc    Find a MongoDB user by PostgreSQL user ID
 * @access  Private
 */
router.get('/find-by-postgres/:pgUserId', authenticate, async (req, res) => {
  try {
    const { pgUserId } = req.params;
    
    // First, get the user from PostgreSQL
    const pgUser = await User.findByPk(pgUserId);
    
    if (!pgUser) {
      return res.status(404).json({ success: false, message: 'PostgreSQL user not found' });
    }
    
    // Find the user in MongoDB by email (unique identifier)
    const mongoUser = await MongoUser.findOne({ email: pgUser.email });
    
    if (!mongoUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found in MongoDB. Please sync the user first.'
      });
    }
    
    res.json({ 
      success: true,
      mongoUserId: mongoUser._id,
      userProfile: mongoUser.getPublicProfile()
    });
  } catch (error) {
    console.error('Error finding MongoDB user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router; 