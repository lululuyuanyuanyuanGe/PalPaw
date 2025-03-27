import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import Post from '../../models/Post.js';
import Product from '../../models/Product.js';
import User from '../../models/User.js';
import { generateVideoThumbnail } from '../../utils/videoThumbnail.js';

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
      
      // Create thumbnails directory if it doesn't exist
      const thumbnailDir = path.join(process.cwd(), 'uploads', userId.toString(), 'thumbnails');
      if (!fs.existsSync(thumbnailDir)) {
        fs.mkdirSync(thumbnailDir, { recursive: true });
      }
      
      // Process each file (includes thumbnail generation for videos)
      for (const file of req.files) {
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
        const mediaObject = {
          url: fileUrl,
          type: mediaType,
          size: file.size,
          filename: file.filename
        };
        
        // Generate thumbnail for video files
        if (mediaType === 'video') {
          try {
            // Full path to the uploaded video
            const videoPath = path.join(process.cwd(), 'uploads', userId.toString(), 'posts', file.filename);
            
            // Generate unique thumbnail filename
            const thumbnailFilename = `thumbnail_${uuidv4()}.jpg`;
            const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);
            
            // Generate thumbnail (at 2 seconds into the video)
            await generateVideoThumbnail(videoPath, thumbnailPath, 0, '320x240');
            
            // Add thumbnail URL to the media object
            mediaObject.thumbnail = `/uploads/${userId}/thumbnails/${thumbnailFilename}`;
            console.log(`Created thumbnail at ${thumbnailPath} for video ${file.filename}`);
          } catch (thumbnailError) {
            console.error('Error generating thumbnail:', thumbnailError);
            // Continue without thumbnail if generation fails
          }
        }
        
        mediaObjects.push(mediaObject);
      }
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

/**
 * Get posts for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getUserPosts = async (req, res) => {
  try {
    // Get user ID from params or from authenticated user
    const userId = req.params.userId || req.user.id;

    // Fetch posts for the user
    const posts = await Post.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      posts
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching posts',
      error: error.message
    });
  }
};

/**
 * Get a specific post by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getPostById = async (req, res) => {
  try {
    const postId = req.params.postId;
    
    const post = await Post.findByPk(postId, {
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'avatar']
        }
      ]
    });
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      post
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching post',
      error: error.message
    });
  }
};

/**
 * Get products for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getUserProducts = async (req, res) => {
  try {
    // Get user ID from params or from authenticated user
    const userId = req.params.userId || req.user.id;

    // Fetch products for the user
    const products = await Product.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Error fetching user products:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching products',
      error: error.message
    });
  }
};

/**
 * Get a specific product by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getProductById = async (req, res) => {
  try {
    const productId = req.params.productId;
    
    const product = await Product.findByPk(productId, {
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'avatar']
        }
      ]
    });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching product',
      error: error.message
    });
  }
};

/**
 * Create a product with media uploads
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createProductWithMedia = async (req, res) => {
  try {
    console.log('createProductWithMedia called');
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);

    // Extract product information from the form fields
    const { 
      name, 
      description, 
      price, 
      category, 
      condition = 'New',
      quantity = 1,
      shippingOptions,
      tags: tagsJson 
    } = req.body;
    
    // Validate required fields
    if (!name || !price) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name and price are required' 
      });
    }
    
    // Parse tags if they exist
    let tags = [];
    if (tagsJson) {
      try {
        tags = typeof tagsJson === 'string' ? JSON.parse(tagsJson) : tagsJson;
      } catch (e) {
        console.error('Error parsing tags:', e);
      }
    }

    // Parse shipping options if they exist
    let parsedShippingOptions = [];
    if (shippingOptions) {
      try {
        parsedShippingOptions = typeof shippingOptions === 'string' ? 
          JSON.parse(shippingOptions) : shippingOptions;
      } catch (e) {
        console.error('Error parsing shipping options:', e);
      }
    }
    
    // Get user ID from authenticated request
    const userId = req.user.id;
    
    // Process media files - exactly as done for posts
    const mediaObjects = [];
    
    if (req.files && req.files.length > 0) {
      // Create thumbnails directory if it doesn't exist
      const thumbnailDir = path.join(process.cwd(), 'uploads', userId.toString(), 'thumbnails');
      if (!fs.existsSync(thumbnailDir)) {
        fs.mkdirSync(thumbnailDir, { recursive: true });
      }
      
      // Process each file (includes thumbnail generation for videos)
      for (const file of req.files) {
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
        
        // Create media object compatible with the model's JSONB structure
        const mediaObject = {
          url: fileUrl,
          type: mediaType,
          size: file.size,
          filename: file.filename
        };
        
        // Generate thumbnail for video files
        if (mediaType === 'video') {
          try {
            // Full path to the uploaded video
            const videoPath = path.join(process.cwd(), 'uploads', userId.toString(), 'posts', file.filename);
            
            // Generate unique thumbnail filename
            const thumbnailFilename = `thumbnail_${uuidv4()}.jpg`;
            const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);
            
            // Generate thumbnail (at 2 seconds into the video)
            await generateVideoThumbnail(videoPath, thumbnailPath, 0, '320x240');
            
            // Add thumbnail URL to the media object
            mediaObject.thumbnail = `/uploads/${userId}/thumbnails/${thumbnailFilename}`;
            console.log(`Created thumbnail at ${thumbnailPath} for video ${file.filename}`);
          } catch (thumbnailError) {
            console.error('Error generating thumbnail:', thumbnailError);
            // Continue without thumbnail if generation fails
          }
        }
        
        mediaObjects.push(mediaObject);
      }
    }

    console.log('Media objects to save:', mediaObjects);
    
    // Create product with media
    const product = await Product.create({
      userId,
      name,
      description: description || '',
      price: parseFloat(price),
      media: mediaObjects,
      category: category || 'Other',
      condition,
      quantity: parseInt(quantity) || 1,
      tags: tags,
      shipping: { options: parsedShippingOptions }
    });
    
    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      productId: product.id,
      product
    });
  } catch (error) {
    console.error('Error creating product with media:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating product',
      error: error.message
    });
  }
};
