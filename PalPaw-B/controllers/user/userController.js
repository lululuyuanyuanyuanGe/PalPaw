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
    }
    
    // Find user by ID with Sequelize
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
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
    
    // Get likes count
    const likedPostsCount = await Like.count({
      where: { 
        userId: userId,
        entityType: 'post'
      }
    });
    
    // Get array of liked post IDs
    const likedPosts = await Like.findAll({
      where: { 
        userId: userId,
        entityType: 'post'
      },
      attributes: ['entityId']
    });
    
    const likedPostIds = likedPosts.map(like => like.entityId);
    
    // Get array of users this user is following
    const following = await Follow.findAll({
      where: { followerId: userId, status: 'accepted' },
      attributes: ['followingId']
    });
    
    // Create response object with user data and counts
    const userData = user.toJSON();
    userData.followerCount = followerCount;
    userData.followingCount = followingCount;
    userData.likedPostsCount = likedPostsCount;
    userData.likedPostIds = likedPostIds;
    userData.following = following.map(f => f.followingId);
    
    // Ensure savedProductIds exists (matches UserContext.tsx)
    if (!userData.savedProductIds) {
      userData.savedProductIds = [];
    }
    
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

/**
 * Update user profile information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with updated user or error
 */
export const updateUserProfile = async (req, res) => {
  try {
    // Get user from authentication middleware
    const userId = req.user.id;
    
    // Find existing user with Sequelize
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Update basic profile information
    const { username, bio, firstName, lastName } = req.body;
    
    // Update username if provided
    if (username) {
      user.username = username;
    }
    
    // Update optional fields if provided
    if (bio !== undefined) {
      user.bio = bio;
    }
    
    if (firstName !== undefined) {
      user.firstName = firstName;
    }
    
    if (lastName !== undefined) {
      user.lastName = lastName;
    }
    
    // Handle avatar upload
    if (req.files && req.files.avatar && req.files.avatar.length > 0) {
      // Delete old avatar file if exists and it's not the default
      if (user.avatar && !user.avatar.includes('default-avatar') && fs.existsSync(user.avatar)) {
        try {
          await unlinkAsync(user.avatar);
        } catch (err) {
          console.error('Error deleting old avatar file:', err);
        }
      }
      
      // Set new avatar path
      user.avatar = req.files.avatar[0].path;
    }
    
    // Save updated user with Sequelize
    await user.save();
    
    // Get updated user data with all required fields
    const updatedUser = await getUserById({ params: { id: userId }, user: req.user }, { 
      status: (code) => ({ 
        json: (data) => data 
      }) 
    });
    
    // Return the updated user
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser.user
    });
    
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ 
      success: false,
      message: 'An error occurred while updating profile',
      error: error.message
    });
  }
};
