import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Post, User } from '../../models/index.js';

// Define allowed file types
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
const allowedVideoTypes = ['video/mp4'];
const allowedFileTypes = [...allowedImageTypes, ...allowedVideoTypes];

// Configure upload directory
const uploadDir = path.resolve('./uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename with original extension
    const extension = path.extname(file.originalname);
    const filename = `${uuidv4()}${extension}`;
    cb(null, filename);
  }
});

// Configure file filter
const fileFilter = (req, file, cb) => {
  if (allowedFileTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedFileTypes.join(', ')}`), false);
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 10 // Max 10 files per upload
  }
});

/**
 * Create a post with media files
 * Handles multipart form data with files
 * @param {object} req - Express request object with files from multer
 * @param {object} res - Express response object
 */
export const createPostWithMedia = async (req, res) => {
  try {
    // Debug logs to see exactly what's in the request
    console.log('==== UPLOAD CONTROLLER - CREATE POST WITH MEDIA ====');
    console.log('Request body:', req.body);
    console.log('Title value:', req.body.title);
    console.log('Title type:', typeof req.body.title);
    console.log('Files:', Object.keys(req.files || {}).length);
    console.log('=====================');
    
    // Extract post data from request body
    const title = req.body.title ? String(req.body.title).trim() : '';
    const content = req.body.content || '';
    const location = req.body.location;
    const tags = req.body.tags;
    const visibility = req.body.visibility || 'public';
    
    // Get user ID from auth middleware
    const userId = req.user?.id;
    
    if (!userId) {
      // Clean up any uploaded files
      if (req.files) {
        Object.values(req.files).forEach(file => {
          if (Array.isArray(file)) {
            file.forEach(f => {
              if (f.path) fs.unlinkSync(f.path);
            });
          } else if (file.path) {
            fs.unlinkSync(file.path);
          }
        });
      }
      
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized - You must be logged in to create a post' 
      });
    }

    // Validate required fields
    if (!title || title === '') {
      console.log('Title validation failed in upload controller. Title:', title);
      console.log('Title type:', typeof title);
      
      // Clean up any uploaded files
      if (req.files) {
        Object.values(req.files).forEach(file => {
          if (Array.isArray(file)) {
            file.forEach(f => {
              if (f.path) fs.unlinkSync(f.path);
            });
          } else if (file.path) {
            fs.unlinkSync(file.path);
          }
        });
      }
      
      return res.status(400).json({ 
        success: false,
        message: 'Title is required' 
      });
    }

    // Process media files (if any)
    let mediaUrls = [];
    
    if (req.files && Object.keys(req.files).length > 0) {
      // Get media files
      const mediaFiles = req.files.media || [];
      const files = Array.isArray(mediaFiles) ? mediaFiles : [mediaFiles];
      
      // Convert file paths to URLs
      mediaUrls = files.map(file => {
        // Move file to uploads directory if it's not already there
        const filename = path.basename(file.path);
        const targetPath = path.join(uploadDir, filename);
        
        // Only move if not already in upload dir
        if (file.path !== targetPath) {
          fs.copyFileSync(file.path, targetPath);
        }
        
        // Return the URL that will be accessible from the frontend
        return `/uploads/${filename}`;
      });
    }

    // Parse tags if they're provided as a string
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (error) {
        console.warn('Failed to parse tags, using empty array', error);
      }
    }

    // Create the post
    const newPost = await Post.create({
      userId,
      title,
      content: content || '',
      media: mediaUrls,
      location,
      tags: parsedTags,
      visibility
    });

    // Fetch the post with user data
    const postWithUser = await Post.findByPk(newPost.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Post created successfully with media',
      post: postWithUser
    });
  } catch (error) {
    console.error('Error creating post with media:', error);
    
    // Clean up any uploaded files in case of error
    if (req.files) {
      Object.values(req.files).forEach(file => {
        try {
          if (Array.isArray(file)) {
            file.forEach(f => {
              if (f.path) fs.unlinkSync(f.path);
            });
          } else if (file.path) {
            fs.unlinkSync(file.path);
          }
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Error creating post with media',
      error: error.message 
    });
  }
};

// Middleware for handling file uploads - up to 10 files
export const uploadFiles = (req, res, next) => {
  console.log('Upload middleware called');
  console.log('Request headers:', req.headers);
  
  // Use multer middleware with our configuration
  const uploadMiddleware = upload.array('media', 10);
  
  // Call the middleware and handle any errors
  uploadMiddleware(req, res, (err) => {
    if (err) {
      console.error('Multer error in middleware:', err);
      // Let the error handler middleware deal with it
      return next(err);
    }
    
    // Log successful upload
    console.log('Files uploaded successfully:', req.files ? req.files.length : 0);
    console.log('Form fields after upload:', req.body);
    
    // Continue to the next middleware
    next();
  });
};

// Error handler for multer errors
export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A multer error occurred when uploading
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 10 files per upload.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Multer error: ${err.message}`
    });
  } else if (err) {
    // Handle other errors
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
}; 