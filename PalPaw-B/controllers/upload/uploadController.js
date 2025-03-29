import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import Post from '../../models/Post.js';
import Product from '../../models/Product.js';
import User from '../../models/User.js';
import { generateVideoThumbnail } from '../../utils/videoThumbnail.js';
import { promisify } from 'util';
import Comment from '../../models/Comment.js';
import { Op } from 'sequelize';

// Configure multer storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Get the user ID from the authenticated request
    const userId = req.user?.id;
    
    if (!userId) {
      return cb(new Error('User ID not available for file upload'), null);
    }
    
    // Determine the appropriate directory based on the route
    // Check if the request URL contains 'product' or 'products' anywhere in the path
    const isProduct = req.originalUrl.includes('/product') || req.originalUrl.includes('/products');
    const dirType = isProduct ? 'products' : 'posts';
    
    console.log(`File upload request: URL=${req.originalUrl}, Destination=${dirType}`);
    
    // Create path structure: uploads/{userId}/posts or uploads/{userId}/products
    const userUploadDir = path.join(process.cwd(), 'uploads', userId.toString(), dirType);
    
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

    // Fetch posts for the user with author and comments included
    const posts = await Post.findAll({
      where: { userId },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar']
        },
        {
          model: Comment,
          as: 'comments',
          include: [
            {
              model: User,
              as: 'author',
              attributes: ['id', 'username', 'avatar']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Transform posts to ensure proper data structure
    const formattedPosts = posts.map(post => {
      const postJSON = post.toJSON();
      
      // Ensure author data is in the expected format
      if (postJSON.author) {
        postJSON.authorData = {
          id: postJSON.author.id,
          username: postJSON.author.username || 'User',
          avatar: postJSON.author.avatar || `https://robohash.org/${postJSON.author.id}?set=set4`
        };
      }
      
      return postJSON;
    });

    return res.status(200).json({
      success: true,
      posts: formattedPosts
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
 * Get random posts for feed/discovery feature
 * Retrieves 6 random posts from all users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getRandomPosts = async (req, res) => {
  try {
    console.log('Getting random posts for feed/discovery');
    
    // Get count parameter with default of 6
    const count = parseInt(req.query.count) || 6;
    
    // Validate count to prevent excessive queries
    if (count > 20) {
      return res.status(400).json({
        success: false,
        message: 'Maximum count allowed is 20'
      });
    }
    
    // Get all public posts with their authors
    const allPosts = await Post.findAll({
      where: { 
        visibility: 'public',
        isDeleted: false
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar']
        },
        {
          model: Comment,
          as: 'comments',
          include: [
            {
              model: User,
              as: 'author',
              attributes: ['id', 'username', 'avatar']
            }
          ]
        }
      ]
    });
    
    console.log(`Found ${allPosts.length} total posts to choose from`);
    
    // Fisher-Yates shuffle algorithm
    const shuffleArray = (array) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };
    
    // Shuffle and select 'count' posts
    const shuffledPosts = shuffleArray([...allPosts]);
    const randomPosts = shuffledPosts.slice(0, count);
    
    // Transform posts to ensure proper data structure
    const formattedPosts = randomPosts.map(post => {
      const postJSON = post.toJSON();
      
      // Ensure author data is in the expected format
      if (postJSON.author) {
        postJSON.authorData = {
          id: postJSON.author.id,
          username: postJSON.author.username || 'User',
          avatar: postJSON.author.avatar || `https://robohash.org/${postJSON.author.id}?set=set4`
        };
      }
      
      return postJSON;
    });
    
    console.log(`Returning ${formattedPosts.length} random posts`);
    
    return res.status(200).json({
      success: true,
      posts: formattedPosts
    });
  } catch (error) {
    console.error('Error fetching random posts:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching random posts',
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

    // Fetch products for the user with user data included
    const products = await Product.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'username', 'avatar']
        }
      ]
    });

    // Transform products to include sellerData in a consistent format
    const transformedProducts = products.map(product => {
      const productJson = product.toJSON();
      
      // Add sellerData object for consistent format with posts
      if (productJson.seller) {
        productJson.sellerData = {
          id: productJson.seller.id,
          username: productJson.seller.username,
          avatar: productJson.seller.avatar
        };
      }
      
      return productJson;
    });

    return res.status(200).json({
      success: true,
      products: transformedProducts
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
          as: 'seller',
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
    
    // Increment view count
    product.views = (product.views || 0) + 1;
    await product.save();
    
    // Transform product to ensure consistent format with seller data
    const transformedProduct = product.toJSON();
    
    // Add sellerData object for consistent format
    if (transformedProduct.seller) {
      transformedProduct.sellerData = {
        id: transformedProduct.seller.id,
        username: transformedProduct.seller.username,
        avatar: transformedProduct.seller.avatar
      };
    }
    
    // Check if current user has saved this product
    let isSaved = false;
    if (req.user) {
      isSaved = req.user.hasSavedProduct(productId);
      transformedProduct.isSaved = isSaved;
    }
    
    return res.status(200).json({
      success: true,
      product: transformedProduct
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
    
    // Process media files for products
    const mediaObjects = [];
    
    if (req.files && req.files.length > 0) {
      // Create thumbnails directory if it doesn't exist
      const thumbnailDir = path.join(process.cwd(), 'uploads', userId.toString(), 'thumbnails');
      if (!fs.existsSync(thumbnailDir)) {
        fs.mkdirSync(thumbnailDir, { recursive: true });
      }
      
      // Process each file
      for (const file of req.files) {
        // Log each file for debugging
        console.log('Processing file:', {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          filename: file.filename,
          destination: file.destination
        });
        
        // Check if the file was saved to the correct directory
        const fileDir = path.dirname(file.path);
        const isInProductsDir = fileDir.includes(path.join('uploads', userId.toString(), 'products'));
        
        if (!isInProductsDir) {
          console.warn(`File ${file.filename} was not saved to the products directory. It was saved to ${fileDir}`);
        }
        
        // Get the file path relative to the server
        const fileUrl = `/uploads/${userId}/products/${file.filename}`;
        
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
            const videoPath = path.join(process.cwd(), 'uploads', userId.toString(), 'products', file.filename);
            
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

// Delete post
const unlinkAsync = promisify(fs.unlink);

export const deletePost = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user.id;

    // Find the post
    const post = await Post.findOne({
      where: { id: postId, userId }
    });

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Delete associated media files
    if (post.media && Array.isArray(post.media)) {
      for (const file of post.media) {
        const mediaPath = path.join(process.cwd(), 'uploads', userId.toString(), 'posts', file.filename);
        try {
          await unlinkAsync(mediaPath);
        } catch (err) {
          console.warn(`Failed to delete file ${mediaPath}:`, err.message);
        }

        if (file.thumbnail) {
          const thumbnailPath = path.join(process.cwd(), file.thumbnail);
          try {
            await unlinkAsync(thumbnailPath);
          } catch (err) {
            console.warn(`Failed to delete thumbnail ${thumbnailPath}:`, err.message);
          }
        }
      }
    }

    // Remove this post from all users' likedPostIds arrays
    try {
      // Find all users who have liked this post
      const users = await User.findAll({
        where: {
          likedPostIds: {
            [Op.contains]: [postId]
          }
        }
      });

      console.log(`Found ${users.length} users who liked the post being deleted`);

      // Remove the post ID from each user's likedPostIds
      for (const user of users) {
        user.likedPostIds = user.likedPostIds.filter(id => id !== postId);
        await user.save();
      }
    } catch (err) {
      console.warn('Error removing post from liked posts:', err.message);
      // Continue with post deletion even if this fails
    }

    // Finally delete the post from DB
    await post.destroy();

    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ success: false, message: 'Server error deleting post' });
  }
};


/**
 * Delete a product and its associated media files
 * @route DELETE /api/products/:productId
 */
export const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.productId;
    const userId = req.user.id;

    // Find product belonging to this user
    const product = await Product.findOne({
      where: { id: productId, userId }
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Remove associated media files
    if (product.media && Array.isArray(product.media)) {
      for (const file of product.media) {
        // Check in products directory first, then posts as fallback
        const productsFilePath = path.join(process.cwd(), 'uploads', userId.toString(), 'products', file.filename);
        const postsFilePath = path.join(process.cwd(), 'uploads', userId.toString(), 'posts', file.filename);

        // Try to delete from products directory
        try {
          await unlinkAsync(productsFilePath);
          console.log(`Deleted media file: ${productsFilePath}`);
        } catch (productsErr) {
          // If file not found in products directory, try posts directory
          try {
            await unlinkAsync(postsFilePath);
            console.log(`Deleted media file from posts directory: ${postsFilePath}`);
          } catch (postsErr) {
            console.warn(`Failed to delete media file, not found in products or posts directory: ${file.filename}`);
          }
        }

        // Delete thumbnail if it exists
        if (file.thumbnail) {
          const thumbnailPath = path.join(process.cwd(), file.thumbnail);
          try {
            await unlinkAsync(thumbnailPath);
            console.log(`Deleted thumbnail: ${thumbnailPath}`);
          } catch (err) {
            console.warn(`Failed to delete thumbnail ${thumbnailPath}:`, err.message);
          }
        }
      }
    }

    // Remove this product from all users' savedProductIds arrays
    try {
      // Find all users who have saved this product
      const users = await User.findAll({
        where: {
          savedProductIds: {
            [Op.contains]: [productId]
          }
        }
      });

      console.log(`Found ${users.length} users who saved the product being deleted`);

      // Remove the product ID from each user's savedProductIds
      for (const user of users) {
        user.savedProductIds = user.savedProductIds.filter(id => id !== productId);
        await user.save();
      }
    } catch (err) {
      console.warn('Error removing product from saved products:', err.message);
      // Continue with product deletion even if this fails
    }

    // Delete product from database
    await product.destroy();

    return res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting product' });
  }
};

/**
 * Update user profile including avatar, bio and username
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateUserProfile = async (req, res) => {
  try {
    console.log('updateUserProfile called');
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);

    const userId = req.user.id;
    const { username, bio } = req.body;
    
    // Find the user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update username and bio if provided
    if (username) user.username = username;
    if (bio !== undefined) user.bio = bio;

    // Handle avatar upload if provided
    if (req.file) {
      // Create avatar directory if it doesn't exist
      const avatarDir = path.join(process.cwd(), 'uploads', userId.toString(), 'avatar');
      if (!fs.existsSync(avatarDir)) {
        fs.mkdirSync(avatarDir, { recursive: true });
      }

      // Delete old avatar if it exists
      if (user.avatar && !user.avatar.includes('robohash')) {
        try {
          const oldAvatarPath = path.join(process.cwd(), user.avatar);
          if (fs.existsSync(oldAvatarPath)) {
            await promisify(fs.unlink)(oldAvatarPath);
            console.log(`Deleted old avatar: ${oldAvatarPath}`);
          }
        } catch (error) {
          console.warn('Failed to delete old avatar:', error.message);
        }
      }

      // Set the new avatar path
      const avatarUrl = `/uploads/${userId}/avatar/${req.file.filename}`;
      user.avatar = avatarUrl;
    }

    // Save the updated user
    await user.save();

    // Return the updated user without sensitive information
    const userResponse = {
      id: user.id,
      username: user.username,
      bio: user.bio,
      avatar: user.avatar,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating profile',
      error: error.message
    });
  }
};

// Configure avatar-specific storage
const avatarStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    const userId = req.user?.id;
    
    if (!userId) {
      return cb(new Error('User ID not available for avatar upload'), null);
    }
    
    // Create avatar directory
    const avatarDir = path.join(process.cwd(), 'uploads', userId.toString(), 'avatar');
    if (!fs.existsSync(avatarDir)) {
      fs.mkdirSync(avatarDir, { recursive: true });
    }
    
    cb(null, avatarDir);
  },
  filename: function(req, file, cb) {
    const uniqueName = `avatar_${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Configure avatar upload with limits
export const avatarUpload = multer({ 
  storage: avatarStorage,
  limits: { 
    fileSize: 5 * 1024 * 1024 // 5MB limit for avatars
  },
  fileFilter: function(req, file, cb) {
    // Only accept images
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed for avatars'));
    }
    cb(null, true);
  }
});