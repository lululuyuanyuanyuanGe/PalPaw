import { User } from '../../models/index.js';
import fs from 'fs';
import { promisify } from 'util';
import path from 'path';

const unlinkAsync = promisify(fs.unlink);

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
    
    // Find existing user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Update basic profile information
    const { username, bio, firstName, lastName } = req.body;
    
    // Update username if provided (no uniqueness check - repeated names allowed)
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
    
    // Save updated user
    await user.save();
    
    // Return updated user (excluding password)
    const updatedUser = await User.findById(userId).select('-password');
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
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
