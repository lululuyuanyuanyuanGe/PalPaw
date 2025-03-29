import { User, Follow, Like, Post } from '../../models/index.js';
import fs from 'fs';
import { promisify } from 'util';
import path from 'path';

const unlinkAsync = promisify(fs.unlink);

/**
 * Get user by ID, with special handling for current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with user data or error
 */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    let userId = id;
    
    // Check if it's the current user (me or current)
    if (id === 'me' || id === 'current') {
      // Ensure user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required to access your own profile'
        });
      }
      userId = req.user.id;
    } else {
      // When accessing a specific user profile
      // For users other than 'me', we still need authentication for private data
      if (!req.user) {
        // Allow limited public profile viewing without authentication
        // but we could restrict this if needed
        console.log('Unauthenticated access to user profile:', id);
      } else {
        // Check if the user is requesting their own profile
        if (req.user.id === id) {
          console.log('User is accessing their own profile');
        } else {
          console.log('User', req.user.id, 'is accessing profile of user', id);
        }
      }
    }
    
    // Find user by ID with Sequelize
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'email', 'firstName', 'lastName', 'avatar', 'bio', 'createdAt', 'updatedAt']
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get follower count - users who follow this user
    const followerCount = await Follow.count({
      where: { followingId: userId, status: 'accepted' }
    });
    
    // Get following count - users this user follows
    const followingCount = await Follow.count({
      where: { followerId: userId, status: 'accepted' }
    });
    
    // Get array of users this user is following
    const following = await Follow.findAll({
      where: { followerId: userId, status: 'accepted' },
      attributes: ['followingId']
    });
    
    // Create response object with user data and counts
    const userData = user.toJSON();
    userData.followerCount = followerCount;
    userData.followingCount = followingCount;
    userData.following = following.map(f => f.followingId);
    
    res.status(200).json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching user data',
      error: error.message
    });
  }
};