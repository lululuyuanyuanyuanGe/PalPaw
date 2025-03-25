import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import Post from '../../models/Post.js';

// Configure multer storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Get the user ID from the authenticated request
    const userId = req.user?.id;
    
    if (!userId) {
      return cb(new Error('User ID not available for file upload'), null);
    }
    
    // Create path structure: uploads/{userId}/posts
    const userUploadDir = path.join(process.cwd(), 'uploads', userId.toString(), 'posts');
    
    // Create directories recursively if they don't exist
    if (!fs.existsSync(userUploadDir)) {
      fs.mkdirSync(userUploadDir, { recursive: true });
    }
    
    cb(null, userUploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueName = `${uuidv4()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

// Configure multer with increased file size limits
export const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 100 * 1024 * 1024, // 100MB limit for videos
    fieldSize: 25 * 1024 * 1024 // 25MB for field size limit
  }
});

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

    // Check if files exist
    if (!req.files || req.files.length === 0) {
      console.error('No files received in the request');
      return res.status(400).json({
        success: false,
        message: 'No media files uploaded. Please include at least one image or video.'
      });
    }

    // Extract fields from request body
    const { 
      title, 
      content, 
      location,
      latitude, 
      longitude,
      tags: tagsJson
    } = req.body;

    // Validate title
    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    // Parse tags if they exist
    let tags = [];
    if (tagsJson) {
      try {
        tags = JSON.parse(tagsJson);
      } catch (e) {
        console.error('Error parsing tags:', e);
      }
    }

    // Process media files - this is now handled by multer
    const mediaObjects = [];
    
    if (req.files) {
      // Get the user ID for constructing the file URL
      const userId = req.user.id;
      
      // Multer adds the files under their field name
      req.files.forEach(file => {
        // Log each file for debugging
        console.log('Processing file:', {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          filename: file.filename
        });
        
        // Get the file path relative to the server - now includes user ID in path
        const fileUrl = `/uploads/${userId}/posts/${file.filename}`;
        
        // Determine media type based on mimetype
        const mediaType = file.mimetype.startsWith('image/') ? 'image' : 
                          file.mimetype.startsWith('video/') ? 'video' : 'image'; // Default to image if unknown
        
        // Create media object compatible with the Post model's JSONB structure
        mediaObjects.push({
          url: fileUrl,
          type: mediaType,
          size: file.size,
          filename: file.filename
        });
      });
    }

    console.log('Media objects to save:', mediaObjects);

    // Create post in database
    const post = await Post.create({
      userId: req.user.id, // From auth middleware
      title,
      content: content || '',
      media: mediaObjects,
      location: location || null,
      ...(latitude && longitude ? {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      } : {}),
      tags: tags,
      visibility: 'public'
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

/**
 * Error handler for multer errors
 */
export const handlePostMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err.message);
    
    // Handle specific multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'File too large. Maximum file size is 100MB.'
      });
    }
    
    if (err.code === 'LIMIT_FIELD_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'Form field too large.'
      });
    }
    
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  } else if (err) {
    console.error('Unknown error during upload:', err.message);
    
    // Handle "Unexpected end of form" specifically
    if (err.message && err.message.includes('Unexpected end of form')) {
      return res.status(400).json({
        success: false,
        message: 'Upload was interrupted. Please try again with a smaller file or check your connection.'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred during file upload'
    });
  }
  next();
};
