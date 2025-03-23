import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { Op } from 'sequelize';
import Product from '../../models/Product.js';

// Simple file storage setup - similar to posts
const simpleStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads', 'products');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueName = `${uuidv4()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

// Simple upload middleware that mimics the posts controller approach
const simpleUpload = multer({ 
  storage: simpleStorage,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

// Simple product creation with media - similar to posts controller
export const createProductWithMedia = async (req, res) => {
  try {
    console.log('createProductWithMedia called');
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);

    // Extract data from request body
    const {
      name,
      description,
      price,
      category,
      condition = 'New',
      quantity = 1,
      shippingOptions: shippingOptionsJson,
      tags: tagsJson
    } = req.body;
    
    // Log actual values
    console.log('Extracted values:', {
      name,
      description,
      price,
      category,
      condition,
      quantity
    });
    
    // Validate required fields
    if (!name || !description || !price) {
      console.error('Missing required fields:', { name: !!name, description: !!description, price: !!price });
      return res.status(400).json({
        success: false,
        message: 'Name, description, and price are required'
      });
    }
    
    // Parse tags if they exist
    let tags = [];
    if (tagsJson) {
      try {
        tags = JSON.parse(tagsJson);
        console.log('Parsed tags:', tags);
      } catch (e) {
        console.error('Error parsing tags:', e);
      }
    }
    
    // Parse shipping options if they exist
    let shippingOptions = [];
    if (shippingOptionsJson) {
      try {
        shippingOptions = JSON.parse(shippingOptionsJson);
        console.log('Parsed shipping options:', shippingOptions);
      } catch (e) {
        console.error('Error parsing shipping options:', e);
      }
    }
    
    // Create shipping object
    const shipping = {
      options: shippingOptions,
      free: shippingOptions.includes('Free Shipping')
    };

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads', 'products');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Process media files - similar to posts controller
    const mediaUrls = [];
    
    if (req.files && req.files.images) {
      // If images is an array of files
      if (Array.isArray(req.files.images)) {
        for (const file of req.files.images) {
          const fileName = `${uuidv4()}_${file.originalname || 'upload'}`;
          const filePath = path.join(uploadDir, fileName);
          
          // Copy file from temp location to uploads directory
          fs.copyFileSync(file.path, filePath);
          
          // Add to mediaUrls array
          mediaUrls.push(`/uploads/products/${fileName}`);
        }
      } else {
        // If images is a single file
        const file = req.files.images;
        const fileName = `${uuidv4()}_${file.originalname || 'upload'}`;
        const filePath = path.join(uploadDir, fileName);
        
        // Copy file from temp location to uploads directory
        fs.copyFileSync(file.path, filePath);
        
        // Add to mediaUrls array
        mediaUrls.push(`/uploads/products/${fileName}`);
      }
    }
    
    // Also check for 'media' field which might be used by the frontend
    if (req.files && req.files.media) {
      // If media is an array of files
      if (Array.isArray(req.files.media)) {
        for (const file of req.files.media) {
          const fileName = `${uuidv4()}_${file.originalname || 'upload'}`;
          const filePath = path.join(uploadDir, fileName);
          
          // Copy file from temp location to uploads directory
          fs.copyFileSync(file.path, filePath);
          
          // Add to mediaUrls array
          mediaUrls.push(`/uploads/products/${fileName}`);
        }
      } else {
        // If media is a single file
        const file = req.files.media;
        const fileName = `${uuidv4()}_${file.originalname || 'upload'}`;
        const filePath = path.join(uploadDir, fileName);
        
        // Copy file from temp location to uploads directory
        fs.copyFileSync(file.path, filePath);
        
        // Add to mediaUrls array
        mediaUrls.push(`/uploads/products/${fileName}`);
      }
    }
    
    // Create product media objects for JSONB field
    const mediaObjects = mediaUrls.map(url => ({
      url,
      type: 'image'
    }));
    
    console.log('Creating product with data:', { 
      name, description, price, category, condition, mediaObjects 
    });
    
    if (!req.user || !req.user.id) {
      console.error('User not available in request:', req.user);
      return res.status(401).json({
        success: false,
        message: 'User authentication failed'
      });
    }
    
    // Create product in database
    try {
      const product = await Product.create({
        userId: req.user.id,
        name,
        description,
        price: parseFloat(price),
        category: category || 'Uncategorized',
        condition,
        media: mediaObjects,
        quantity: parseInt(quantity, 10),
        tags,
        shipping,
        status: 'active'
      });
      
      console.log('Product created successfully:', product.id);
      
      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        productId: product.id,
        product
      });
    } catch (dbError) {
      console.error('Database error creating product:', dbError);
      res.status(500).json({
        success: false,
        message: 'Error creating product in database',
        error: dbError.message
      });
    }
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message
    });
  }
};

// Export the upload middleware
export const uploadProductMedia = simpleUpload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'media', maxCount: 10 } // Also accept 'media' as field name for backward compatibility
]);

// Middleware to handle file uploads
export const uploadProductFiles = (req, res, next) => {
  console.log('Starting file upload middleware');
  
  // Force initialization of the request body
  req.body = req.body || {};
  
  // Check if there's already a parsing error
  if (req.parsingError) {
    console.error('Request already has parsing error:', req.parsingError);
    req.fileUploadError = req.parsingError;
    req.fileUrls = [];
    return next();
  }
  
  // Use fields to handle multiple possible field names
  const upload = uploadConfig.fields([
    { name: 'images', maxCount: 10 },
    { name: 'media', maxCount: 10 } // Also accept 'media' as field name for backward compatibility
  ]);
  
  upload(req, res, function(err) {
    // Make sure req.body is initialized
    req.body = req.body || {};
    
    console.log('After multer processing - Body keys:', Object.keys(req.body));
    console.log('After multer processing - Files:', req.files ? Object.keys(req.files).length : 'None');
    
    if (err) {
      // Special handling for "Unexpected end of form" error
      if (err.message && err.message.includes('Unexpected end of form')) {
        console.error('Form data was truncated or malformed:', err);
        console.log('Request body before error:', req.body);
        console.log('Form content type:', req.headers['content-type']);
        console.log('Form content length:', req.headers['content-length']);
        
        // Continue with the request but mark that there was an error
        req.fileUploadError = {
          type: 'malformed_data',
          message: 'File upload failed - form data was truncated or malformed. Try reducing the number or size of images.'
        };
        // Set empty fileUrls to continue processing without files
        req.fileUrls = [];
        return next();
      }
      
      // Regular error handling for other multer errors
      console.error('Multer upload error:', err);
      req.multerError = err;
      return next(err);
    }
    
    // Process uploaded files from both possible field names
    const files = [];
    if (req.files) {
      console.log('Files received:', Object.keys(req.files));
      console.log('Request body after upload:', Object.keys(req.body));
      
      // Handle files from 'images' field
      if (req.files.images) {
        files.push(...req.files.images);
      }
      
      // Handle files from 'media' field
      if (req.files.media) {
        files.push(...req.files.media);
      }
      
      console.log(`Total files processed: ${files.length}`);
    } else {
      console.log('No files received in request');
    }
    
    // Generate URLs for processed files
    if (files.length > 0) {
      req.fileUrls = files.map(file => `/uploads/products/${file.filename}`);
      console.log('File URLs generated:', req.fileUrls);
    } else {
      req.fileUrls = [];
      console.log('No files processed');
    }
    
    next();
  });
};

// Error handler for multer errors
export const handleProductMulterError = (err, req, res, next) => {
  if (req.multerError) {
    console.error('Handling multer error:', req.multerError.message || err.message);
    
    // Check for specific error types
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'File too large. Maximum file size is 15MB.'
      });
    }
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded. Maximum is 10 images.'
      });
    }
    
    if (err.message && err.message.includes('Unexpected end of form')) {
      return res.status(400).json({
        success: false,
        message: 'Upload failed: form data was truncated or malformed. Try reducing the number or size of images.'
      });
    }
    
    return res.status(400).json({
      success: false,
      message: req.multerError.message || 'Error uploading files'
    });
  }
  next(err);
};

// Create a new product
export const createProduct = async (req, res) => {
  try {
    // Log the request for debugging
    console.log('Create product request received');
    console.log('Request body keys:', Object.keys(req.body));
    
    // Check for backup fields if the body is empty
    if (Object.keys(req.body).length === 0 && req.backupFields) {
      console.log('Main body empty, using backup fields:', Object.keys(req.backupFields));
      req.body = { ...req.backupFields };
    }
    
    console.log('Final request body keys:', Object.keys(req.body));
    console.log('Request files:', req.files ? `Available - ${Object.keys(req.files).length} types` : 'Not available');
    console.log('File URLs:', req.fileUrls);
    
    // Check if there was a file upload error but we're proceeding anyway
    if (req.fileUploadError) {
      console.warn('Creating product with file upload error:', req.fileUploadError);
    }
    
    // Get image URLs from uploadProductFiles middleware
    const media = req.fileUrls || [];
    
    // Extract data from request body
    const {
      name,
      description,
      price,
      category,
      condition = 'New',
      quantity = 1,
      shippingOptions: shippingOptionsJson,
      tags: tagsJson
    } = req.body;
    
    // Log actual values
    console.log('Extracted values:', {
      name,
      description,
      price,
      category,
      condition,
      quantity
    });
    
    // If we're missing all required fields and there was a file upload error,
    // it's likely the entire form was malformed - return a more helpful error
    if ((!name && !description && !price) && req.fileUploadError) {
      return res.status(400).json({
        success: false,
        message: 'Form data was corrupted. Try reducing the number or size of images, and ensure all required fields are filled.',
        details: req.fileUploadError.message,
        receivedFields: Object.keys(req.body),
        hadBackupFields: req.backupFields ? Object.keys(req.backupFields).length > 0 : false
      });
    }
    
    // Validate required fields
    if (!name || !description || !price) {
      console.error('Missing required fields:', { name: !!name, description: !!description, price: !!price });
      return res.status(400).json({
        success: false,
        message: 'Name, description, and price are required',
        receivedFields: Object.keys(req.body),
        hadBackupFields: req.backupFields ? Object.keys(req.backupFields).length > 0 : false
      });
    }
    
    // Parse tags if they exist
    let tags = [];
    if (tagsJson) {
      try {
        tags = JSON.parse(tagsJson);
        console.log('Parsed tags:', tags);
      } catch (e) {
        console.error('Error parsing tags:', e);
      }
    }
    
    // Parse shipping options if they exist
    let shippingOptions = [];
    if (shippingOptionsJson) {
      try {
        shippingOptions = JSON.parse(shippingOptionsJson);
        console.log('Parsed shipping options:', shippingOptions);
      } catch (e) {
        console.error('Error parsing shipping options:', e);
      }
    }
    
    // Create shipping object
    const shipping = {
      options: shippingOptions,
      free: shippingOptions.includes('Free Shipping')
    };
    
    // Create product media objects for JSONB field
    const mediaObjects = media.map(url => ({
      url,
      type: 'image'
    }));
    
    console.log('Creating product with data:', { 
      name, description, price, category, condition, mediaObjects 
    });
    
    if (!req.user || !req.user.id) {
      console.error('User not available in request:', req.user);
      return res.status(401).json({
        success: false,
        message: 'User authentication failed'
      });
    }
    
    // Create product in database
    try {
      const product = await Product.create({
        userId: req.user.id,
        name,
        description,
        price: parseFloat(price),
        category: category || 'Uncategorized',
        condition,
        media: mediaObjects,
        quantity: parseInt(quantity, 10),
        tags,
        shipping,
        status: 'active'
      });
      
      console.log('Product created successfully:', product.id);
      
      // If we had a file upload error but still created the product, include a warning
      if (req.fileUploadError) {
        return res.status(201).json({
          success: true,
          message: 'Product created successfully, but image upload failed. You can add images later.',
          warning: req.fileUploadError.message,
          productId: product.id,
          product
        });
      }
      
      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        productId: product.id,
        product
      });
    } catch (dbError) {
      console.error('Database error creating product:', dbError);
      res.status(500).json({
        success: false,
        message: 'Error creating product in database',
        error: dbError.message
      });
    }
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message
    });
  }
};

// Get all products with filtering and pagination
export const getProducts = async (req, res) => {
  try {
    const { 
      category, 
      minPrice, 
      maxPrice, 
      condition, 
      status = 'active',
      limit = 10, 
      offset = 0 
    } = req.query;
    
    // Build query options
    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset),
      where: { 
        isDeleted: false,
        status: status
      },
      order: [['createdAt', 'DESC']]
    };
    
    // Add filters if provided
    if (category) {
      options.where.category = category;
    }
    
    if (condition) {
      options.where.condition = condition;
    }
    
    if (minPrice || maxPrice) {
      options.where.price = {};
      if (minPrice) options.where.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) options.where.price[Op.lte] = parseFloat(maxPrice);
    }
    
    const products = await Product.findAndCountAll(options);
    
    res.status(200).json({
      success: true,
      count: products.count,
      products: products.rows
    });
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving products',
      error: error.message
    });
  }
};

// Get a single product by ID
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findOne({
      where: { id, isDeleted: false }
    });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Increment view count
    await product.update({ views: product.views + 1 });
    
    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Error getting product:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving product',
      error: error.message
    });
  }
};

// Get products by user ID
export const getUserProducts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10, offset = 0, status = 'active' } = req.query;
    
    console.log(`Fetching products for user ${userId}, limit: ${limit}, offset: ${offset}, status: ${status}`);
    
    // Build the query with proper conditions
    const whereClause = { 
      userId,
      isDeleted: false
    };
    
    // Add status filter if provided
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    
    console.log('Using where clause:', whereClause);
    
    const products = await Product.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`Found ${products.count} products for user ${userId}`);
    
    // Log the first product if available for debugging
    if (products.rows.length > 0) {
      console.log('First product sample:', {
        id: products.rows[0].id,
        name: products.rows[0].name,
        mediaCount: products.rows[0].media ? products.rows[0].media.length : 0,
        hasMedia: !!products.rows[0].media && products.rows[0].media.length > 0
      });
    }
    
    res.status(200).json({
      success: true,
      count: products.count,
      products: products.rows
    });
  } catch (error) {
    console.error('Error getting user products:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving user products',
      error: error.message
    });
  }
};

// Update a product
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      category,
      condition,
      quantity,
      status,
      tags: tagsJson,
      shippingOptions: shippingOptionsJson
    } = req.body;
    
    // Find product by ID
    const product = await Product.findByPk(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Check if product belongs to user
    if (product.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product'
      });
    }
    
    // Parse tags if they exist
    let tags = product.tags || [];
    if (tagsJson) {
      try {
        tags = JSON.parse(tagsJson);
      } catch (e) {
        console.error('Error parsing tags:', e);
      }
    }
    
    // Parse shipping options if they exist
    let shippingOptions = [];
    if (shippingOptionsJson) {
      try {
        shippingOptions = JSON.parse(shippingOptionsJson);
      } catch (e) {
        console.error('Error parsing shipping options:', e);
      }
    }
    
    // Create shipping object
    const shipping = {
      options: shippingOptions,
      free: shippingOptions.includes('Free Shipping')
    };
    
    // Get new files from request if any
    const newMediaUrls = req.fileUrls || [];
    let updatedMedia = [...product.media];
    
    // Add new media files
    if (newMediaUrls.length > 0) {
      newMediaUrls.forEach(url => {
        updatedMedia.push({
          url,
          type: 'image'
        });
      });
    }
    
    // Update product data
    const updatedData = {
      ...(name && { name }),
      ...(description && { description }),
      ...(price && { price: parseFloat(price) }),
      ...(category && { category }),
      ...(condition && { condition }),
      ...(quantity && { quantity: parseInt(quantity, 10) }),
      ...(status && { status }),
      ...(shippingOptionsJson && { shipping }),
      ...(tagsJson && { tags }),
      ...(newMediaUrls.length > 0 && { media: updatedMedia })
    };
    
    // Update product in database
    await product.update(updatedData);
    
    // Fetch the updated product
    const updatedProduct = await Product.findByPk(id);
    
    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: error.message
    });
  }
};

// Delete a product (soft delete)
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find product by ID
    const product = await Product.findByPk(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Check if product belongs to user or if user is admin
    if (product.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this product'
      });
    }
    
    // Soft delete by setting isDeleted flag
    await product.update({ isDeleted: true, status: 'unavailable' });
    
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: error.message
    });
  }
};

/**
 * Creates a new product with media files using express-form-data
 * This approach matches how posts are handled
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createProductWithFormData = async (req, res) => {
  try {
    console.log('createProductWithFormData called');
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);

    // Extract data from request body
    const {
      name,
      description,
      price,
      category,
      condition = 'New',
      quantity = 1,
      shippingOptions: shippingOptionsJson,
      tags: tagsJson
    } = req.body;
    
    // Log actual values
    console.log('Extracted values:', {
      name,
      description,
      price,
      category,
      condition,
      quantity
    });
    
    // Validate required fields
    if (!name || !description || !price) {
      console.error('Missing required fields:', { name: !!name, description: !!description, price: !!price });
      return res.status(400).json({
        success: false,
        message: 'Name, description, and price are required'
      });
    }
    
    // Parse tags if they exist
    let tags = [];
    if (tagsJson) {
      try {
        tags = JSON.parse(tagsJson);
        console.log('Parsed tags:', tags);
      } catch (e) {
        console.error('Error parsing tags:', e);
      }
    }
    
    // Parse shipping options if they exist
    let shippingOptions = [];
    if (shippingOptionsJson) {
      try {
        shippingOptions = JSON.parse(shippingOptionsJson);
        console.log('Parsed shipping options:', shippingOptions);
      } catch (e) {
        console.error('Error parsing shipping options:', e);
      }
    }
    
    // Create shipping object
    const shipping = {
      options: shippingOptions,
      free: shippingOptions.includes('Free Shipping')
    };

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads', 'products');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Process media files from express-form-data
    const mediaUrls = [];
    
    // In express-form-data, files are directly in req.files as an object
    // with the field name as key
    if (req.files) {
      // Check for media field
      if (req.files.media) {
        const mediaFiles = Array.isArray(req.files.media) ? req.files.media : [req.files.media];
        
        console.log(`Processing ${mediaFiles.length} media files`);
        
        for (const file of mediaFiles) {
          // Generate a unique filename
          const fileName = `${uuidv4()}_${path.basename(file.path)}`;
          const destPath = path.join(uploadDir, fileName);
          
          // Copy file from tmp to uploads directory
          try {
            fs.copyFileSync(file.path, destPath);
            mediaUrls.push(`/uploads/products/${fileName}`);
            console.log(`Copied file to ${destPath}`);
          } catch (err) {
            console.error('Error copying file:', err);
          }
        }
      }
      
      // Also check for images field
      if (req.files.images) {
        const imageFiles = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
        
        console.log(`Processing ${imageFiles.length} image files`);
        
        for (const file of imageFiles) {
          // Generate a unique filename
          const fileName = `${uuidv4()}_${path.basename(file.path)}`;
          const destPath = path.join(uploadDir, fileName);
          
          // Copy file from tmp to uploads directory
          try {
            fs.copyFileSync(file.path, destPath);
            mediaUrls.push(`/uploads/products/${fileName}`);
            console.log(`Copied file to ${destPath}`);
          } catch (err) {
            console.error('Error copying file:', err);
          }
        }
      }
    }
    
    // Create product media objects for JSONB field
    const mediaObjects = mediaUrls.map(url => ({
      url,
      type: 'image'
    }));
    
    console.log('Creating product with data:', { 
      name, description, price, category, condition, mediaObjects 
    });
    
    if (!req.user || !req.user.id) {
      console.error('User not available in request:', req.user);
      return res.status(401).json({
        success: false,
        message: 'User authentication failed'
      });
    }
    
    // Create product in database
    try {
      const product = await Product.create({
        userId: req.user.id,
        name,
        description,
        price: parseFloat(price),
        category: category || 'Uncategorized',
        condition,
        media: mediaObjects,
        quantity: parseInt(quantity, 10),
        tags,
        shipping,
        status: 'active'
      });
      
      console.log('Product created successfully:', product.id);
      
      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        productId: product.id,
        product
      });
    } catch (dbError) {
      console.error('Database error creating product:', dbError);
      res.status(500).json({
        success: false,
        message: 'Error creating product in database',
        error: dbError.message
      });
    }
  } catch (error) {
    console.error('Error in createProductWithFormData:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message
    });
  }
};
