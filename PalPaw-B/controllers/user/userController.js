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

/**
 * Get user's followers - users who follow the specified user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with followers data or error
 */
export const getUserFollowers = async (req, res) => {
  try {
    const { id } = req.params;
    let userId = id;
    
    // Handle special 'me' or 'current' user ID
    if (id === 'me' || id === 'current') {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required to access your followers'
        });
      }
      userId = req.user.id;
    }
    
    // Find all follow relationships where this user is being followed
    const followerRelations = await Follow.findAll({
      where: { followingId: userId, status: 'accepted' },
      include: [
        {
          model: User,
          as: 'follower',
          attributes: ['id', 'username', 'avatar', 'bio']
        }
      ]
    });
    
    // Extract and format follower data
    const followers = followerRelations.map(relation => {
      const follower = relation.follower.toJSON();
      
      // Add isFollowing flag to indicate if the current user follows this follower
      if (req.user && req.user.following) {
        // Check if the current user follows this follower
        follower.isFollowing = req.user.following.includes(follower.id);
      } else {
        follower.isFollowing = false;
      }
      
      return follower;
    });
    
    res.status(200).json({
      success: true,
      followers
    });
  } catch (error) {
    console.error('Error fetching user followers:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching followers',
      error: error.message
    });
  }
};

/**
 * Get users that the specified user is following
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with following users data or error
 */
export const getUserFollowing = async (req, res) => {
  try {
    const { id } = req.params;
    let userId = id;
    
    // Handle special 'me' or 'current' user ID
    if (id === 'me' || id === 'current') {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required to access your following list'
        });
      }
      userId = req.user.id;
    }
    
    // Find all follow relationships where this user is following others
    const followingRelations = await Follow.findAll({
      where: { followerId: userId, status: 'accepted' },
      include: [
        {
          model: User,
          as: 'following',
          attributes: ['id', 'username', 'avatar', 'bio']
        }
      ]
    });
    
    // Extract and format following user data
    const following = followingRelations.map(relation => {
      const followingUser = relation.following.toJSON();
      
      // Always mark as following since these are users the requested user follows
      followingUser.isFollowing = true;
      
      return followingUser;
    });
    
    res.status(200).json({
      success: true,
      following
    });
  } catch (error) {
    console.error('Error fetching user following:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching following users',
      error: error.message
    });
  }
};

/**
 * Follow a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with success status or error
 */
export const followUser = async (req, res) => {
  try {
    // Get the ID of the user to follow
    const { id } = req.params;
    
    // Get the current user's ID
    const currentUserId = req.user.id;
    
    // Prevent users from following themselves
    if (id === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot follow yourself'
      });
    }
    
    // Check if the user to follow exists
    const userToFollow = await User.findByPk(id);
    if (!userToFollow) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if already following
    const existingFollow = await Follow.findOne({
      where: {
        followerId: currentUserId,
        followingId: id
      }
    });
    
    if (existingFollow) {
      // If already following, update status if needed
      if (existingFollow.status !== 'accepted') {
        await existingFollow.update({ status: 'accepted' });
        
        return res.status(200).json({
          success: true,
          message: 'Follow request accepted'
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Already following this user'
      });
    }
    
    // Create new follow relationship
    await Follow.create({
      followerId: currentUserId,
      followingId: id,
      status: 'accepted' // Direct accept for now, could implement request system later
    });
    
    res.status(200).json({
      success: true,
      message: 'User followed successfully'
    });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while following the user',
      error: error.message
    });
  }
};

/**
 * Unfollow a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with success status or error
 */
export const unfollowUser = async (req, res) => {
  try {
    // Get the ID of the user to unfollow
    const { id } = req.params;
    
    // Get the current user's ID
    const currentUserId = req.user.id;
    
    // Check if the relationship exists
    const followRelationship = await Follow.findOne({
      where: {
        followerId: currentUserId,
        followingId: id
      }
    });
    
    if (!followRelationship) {
      return res.status(400).json({
        success: false,
        message: 'You are not following this user'
      });
    }
    
    // Delete the follow relationship
    await followRelationship.destroy();
    
    res.status(200).json({
      success: true,
      message: 'User unfollowed successfully'
    });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while unfollowing the user',
      error: error.message
    });
  }
};

/**
 * Update user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with updated user data or error
 */
export const updateUserProfile = async (req, res) => {
  try {
    // Get current user ID
    const userId = req.user.id;
    
    // Get updatable fields from request body
    const { firstName, lastName, bio } = req.body;
    
    // Find user to update
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update only provided fields
    const updates = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (bio !== undefined) updates.bio = bio;
    
    // If there's nothing to update
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update were provided'
      });
    }
    
    // Update user profile
    await user.update(updates);
    
    // Get updated user data
    const updatedUser = await User.findByPk(userId, {
      attributes: ['id', 'username', 'email', 'firstName', 'lastName', 'avatar', 'bio', 'createdAt', 'updatedAt']
    });
    
    // Get follower and following counts
    const followerCount = await Follow.count({
      where: { followingId: userId, status: 'accepted' }
    });
    
    const followingCount = await Follow.count({
      where: { followerId: userId, status: 'accepted' }
    });
    
    // Get array of users this user is following
    const following = await Follow.findAll({
      where: { followerId: userId, status: 'accepted' },
      attributes: ['followingId']
    });
    
    // Prepare response
    const userData = updatedUser.toJSON();
    userData.followerCount = followerCount;
    userData.followingCount = followingCount;
    userData.following = following.map(f => f.followingId);
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: userData
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating the profile',
      error: error.message
    });
  }
};

/**
 * Get current user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with current user data or error
 */
export const getCurrentUserProfile = async (req, res) => {
  try {
    // Get the current user ID from authenticated user
    const userId = req.user.id;
    
    // Find the user
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'email', 'firstName', 'lastName', 'avatar', 'bio', 'createdAt', 'updatedAt']
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get follower count
    const followerCount = await Follow.count({
      where: { followingId: userId, status: 'accepted' }
    });
    
    // Get following count
    const followingCount = await Follow.count({
      where: { followerId: userId, status: 'accepted' }
    });
    
    // Get following list
    const following = await Follow.findAll({
      where: { followerId: userId, status: 'accepted' },
      attributes: ['followingId']
    });
    
    // Create response data
    const userData = user.toJSON();
    userData.followerCount = followerCount;
    userData.followingCount = followingCount;
    userData.following = following.map(f => f.followingId);
    
    res.status(200).json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error('Error fetching current user profile:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching your profile',
      error: error.message
    });
  }
};