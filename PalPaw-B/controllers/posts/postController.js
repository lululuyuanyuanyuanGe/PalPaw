import Post from '../../models/Post.js';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get all posts
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAllPosts = async (req, res) => {
  try {
    const { limit = 20, offset = 0, userId } = req.query;
    
    // Build query options
    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset),
      where: { isDeleted: false },
      order: [['createdAt', 'DESC']]
    };
    
    // Add userId filter if provided
    if (userId) {
      options.where.userId = userId;
    }
    
    const posts = await Post.findAndCountAll(options);
    
    res.status(200).json({
      success: true,
      count: posts.count,
      posts: posts.rows
    });
  } catch (error) {
    console.error('Error in getAllPosts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching posts',
      error: error.message
    });
  }
};

/**
 * Get a single post by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const post = await Post.findOne({
      where: { id, isDeleted: false }
    });
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    res.status(200).json({
      success: true,
      post
    });
  } catch (error) {
    console.error('Error in getPostById:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching post',
      error: error.message
    });
  }
};

/**
 * Update a post
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      location,
      latitude,
      longitude,
      tags: tagsJson,
      visibility,
      mediaToDelete = []
    } = req.body;
    
    // Find post by ID
    const post = await Post.findByPk(id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Check if post belongs to user
    if (post.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this post'
      });
    }
    
    // Parse tags if they exist
    let tags = post.tags || [];
    if (tagsJson) {
      try {
        tags = JSON.parse(tagsJson);
      } catch (e) {
        console.error('Error parsing tags:', e);
      }
    }
    
    // Handle media files to delete
    let existingMedia = [...post.media];
    if (mediaToDelete && mediaToDelete.length > 0) {
      let mediaToDeleteArray = [];
      
      // Parse mediaToDelete if it's a string
      if (typeof mediaToDelete === 'string') {
        try {
          mediaToDeleteArray = JSON.parse(mediaToDelete);
        } catch (e) {
          console.error('Error parsing mediaToDelete:', e);
        }
      } else if (Array.isArray(mediaToDelete)) {
        mediaToDeleteArray = mediaToDelete;
      }
      
      // Filter out media to delete
      existingMedia = existingMedia.filter(url => !mediaToDeleteArray.includes(url));
      
      // Delete files from disk
      mediaToDeleteArray.forEach(url => {
        try {
          const filePath = path.join(process.cwd(), url.replace(/^\//, ''));
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (e) {
          console.error('Error deleting file:', e);
        }
      });
    }
    
    // Handle new media uploads
    const mediaUrls = [...existingMedia];
    
    if (req.files && req.files.media) {
      // Create upload directory if it doesn't exist
      const uploadDir = path.join(process.cwd(), 'uploads', 'posts');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // Process uploaded files
      if (Array.isArray(req.files.media)) {
        for (const file of req.files.media) {
          const fileName = `${uuidv4()}_${file.originalFilename || 'upload'}`;
          const filePath = path.join(uploadDir, fileName);
          
          // Copy file from temp location to uploads directory
          fs.copyFileSync(file.path, filePath);
          
          // Add to mediaUrls array
          mediaUrls.push(`/uploads/posts/${fileName}`);
        }
      } else {
        // If media is a single file
        const file = req.files.media;
        const fileName = `${uuidv4()}_${file.originalFilename || 'upload'}`;
        const filePath = path.join(uploadDir, fileName);
        
        // Copy file from temp location to uploads directory
        fs.copyFileSync(file.path, filePath);
        
        // Add to mediaUrls array
        mediaUrls.push(`/uploads/posts/${fileName}`);
      }
    }
    
    // Update post data
    const updatedData = {
      ...(title && { title }),
      ...(content !== undefined && { content }),
      ...(location !== undefined && { location }),
      media: mediaUrls,
      ...(visibility && { visibility }),
      tags,
      ...(latitude && longitude ? {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      } : {})
    };
    
    // Update post in database
    await post.update(updatedData);
    
    // Fetch the updated post
    const updatedPost = await Post.findByPk(id);
    
    res.status(200).json({
      success: true,
      message: 'Post updated successfully',
      post: updatedPost
    });
  } catch (error) {
    console.error('Error in updatePost:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating post',
      error: error.message
    });
  }
};

/**
 * Delete a post (soft delete)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find post by ID
    const post = await Post.findByPk(id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Check if post belongs to user or if user is admin
    if (post.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this post'
      });
    }
    
    // Soft delete by setting isDeleted flag
    await post.update({ isDeleted: true });
    
    res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Error in deletePost:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting post',
      error: error.message
    });
  }
};

/**
 * Like or unlike a post
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const likePost = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find post by ID
    const post = await Post.findByPk(id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Increment like count
    await post.update({ likes: post.likes + 1 });
    
    res.status(200).json({
      success: true,
      message: 'Post liked successfully',
      likes: post.likes + 1
    });
  } catch (error) {
    console.error('Error in likePost:', error);
    res.status(500).json({
      success: false,
      message: 'Error liking post',
      error: error.message
    });
  }
};
