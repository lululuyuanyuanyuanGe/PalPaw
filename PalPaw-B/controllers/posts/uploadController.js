import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import Post from '../../models/Post.js';

/**
 * Creates a new post with media files
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createPostWithMedia = async (req, res) => {
  try {
    console.log('createPostWithMedia called');
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);

    // Extract fields from request body
    const { 
      title, 
      content, 
      location,
      latitude, 
      longitude,
      tags: tagsJson,
      postType = 'pet'
    } = req.body;

    // Parse tags if they exist
    let tags = [];
    if (tagsJson) {
      try {
        tags = JSON.parse(tagsJson);
      } catch (e) {
        console.error('Error parsing tags:', e);
      }
    }

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads', 'posts');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Process media files
    const mediaUrls = [];
    
    if (req.files && req.files.media) {
      // If media is an array of files
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

    // Create post in database
    const post = await Post.create({
      userId: req.user.id, // From auth middleware
      title,
      content: content || '',
      media: mediaUrls,
      location: location || null,
      ...(latitude && longitude ? {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      } : {}),
      tags: tags,
      visibility: 'public',
      postType
    });

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      postId: post.id,
      post
    });
  } catch (error) {
    console.error('Error in createPostWithMedia:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating post',
      error: error.message
    });
  }
};
