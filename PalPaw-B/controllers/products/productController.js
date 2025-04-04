import { Op } from 'sequelize';
import { Product, User } from '../../models/index.js';

/**
 * Get all products with pagination, sorting and filtering
 * @route GET /api/pg/products
 */
export const getAllProducts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sort = 'createdAt', 
      order = 'DESC',
      userId,
      category,
      status = 'active'
    } = req.query;
    
    const offset = (page - 1) * limit;
    const where = { isDeleted: false };
    
    // Filter by status (default is active only)
    if (status) {
      where.status = status;
    }
    
    // Filter by user if specified
    if (userId) {
      where.userId = userId;
    }
    
    // Filter by category if specified
    if (category) {
      where.category = category;
    }
    
    // Get total count for pagination
    const total = await Product.count({ where });
    
    // Get products with seller info - explicitly specify attributes to avoid missing column errors
    const products = await Product.findAll({
      attributes: [
        'id', 'userId', 'name', 'description', 'price', 'media', 
        'category', 'condition', 'status', 'tags', 'views',
        'isDeleted', 'createdAt', 'updatedAt', 'shipping'
      ],
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort, order]],
      include: [
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'username', 'avatar']
        }
      ]
    });
    
    // Transform products to include seller info in the expected format
    const formattedProducts = products.map(product => {
      const productJson = product.toJSON();
      return {
        ...productJson,
        views: productJson.views || 0, // Ensure views has a value
        sellerData: {
          ...productJson.seller,
          avatar: productJson.seller?.avatar || null // Ensure avatar is explicitly included even if null
        },
        seller: undefined // Remove the nested seller object
      };
    });
    
    res.json({
      success: true,
      products: formattedProducts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch products',
      error: error.message
    });
  }
};

/**
 * Get a single product by ID and increment view count
 * @route GET /api/pg/products/:id
 */
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findByPk(id, {
      attributes: [
        'id', 'userId', 'name', 'description', 'price', 'media', 
        'category', 'condition', 'status', 'tags', 'views',
        'isDeleted', 'createdAt', 'updatedAt', 'shipping', 'quantity'
      ],
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
    
    // Increment view count if the column exists
    try {
      if (product.views !== undefined) {
        product.views = (product.views || 0) + 1;
        await product.save();
      }
    } catch (viewError) {
      console.log('Could not update view count:', viewError.message);
      // Continue even if updating views fails
    }
    
    // Check if the current user has saved this product
    let isSaved = false;
    if (req.user) {
      isSaved = req.user.hasSavedProduct(id);
    }
    
    // Transform product to include seller info in the expected format
    const productJson = product.toJSON();
    const formattedProduct = {
      ...productJson,
      sellerData: {
        ...productJson.seller,
        avatar: productJson.seller?.avatar || null // Ensure avatar is explicitly included even if null
      },
      seller: undefined, // Remove the nested seller object
      isSaved // Add flag indicating if product is saved by current user
    };
    
    res.json({
      success: true,
      product: formattedProduct
    });
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch product',
      error: error.message
    });
  }
};

/**
 * Create a new product
 * @route POST /api/pg/products
 */
export const createProduct = async (req, res) => {
  try {
    const { name, description, price, media, category, condition, tags } = req.body;
    
    if (!name || !price) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name and price are required' 
      });
    }
    
    const product = await Product.create({
      userId: req.user.id,
      name,
      description: description || '',
      price,
      media: media || [],
      category,
      condition,
      tags: tags || []
    });
    
    res.status(201).json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create product',
      error: error.message
    });
  }
};

/**
 * Save a product to user's collection
 * @route POST /api/pg/products/:id/save
 */
export const saveProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if product exists
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }
    
    // Save product to user's collection
    const saved = await req.user.saveProduct(id);
    
    res.json({
      success: true,
      message: saved ? 'Product saved to collection' : 'Product already in collection',
      savedProductIds: req.user.savedProductIds
    });
  } catch (error) {
    console.error('Error saving product:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save product',
      error: error.message
    });
  }
};

/**
 * Remove a product from user's collection
 * @route DELETE /api/pg/products/:id/save
 */
export const unsaveProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if product exists
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }
    
    // Remove product from user's collection
    const removed = await req.user.unsaveProduct(id);
    
    res.json({
      success: true,
      message: removed ? 'Product removed from collection' : 'Product was not in collection',
      savedProductIds: req.user.savedProductIds
    });
  } catch (error) {
    console.error('Error removing saved product:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to remove product from collection',
      error: error.message
    });
  }
};

/**
 * Get all products saved by the user
 * @route GET /api/pg/products/saved
 */
export const getSavedProducts = async (req, res) => {
  try {
    // Get user's saved product IDs
    const { savedProductIds } = req.user;
    
    if (!savedProductIds || savedProductIds.length === 0) {
      return res.json({
        success: true,
        products: [],
        count: 0
      });
    }
    
    // Fetch the saved products
    const products = await Product.findAll({
      where: {
        id: {
          [Op.in]: savedProductIds
        },
        isDeleted: false
      },
      attributes: [
        'id', 'userId', 'name', 'description', 'price', 'media', 
        'category', 'condition', 'status', 'tags', 'views',
        'isDeleted', 'createdAt', 'updatedAt', 'shipping', 'quantity'
      ],
      include: [
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'username', 'avatar']
        }
      ]
    });
    
    // Transform products to include seller info
    const formattedProducts = products.map(product => {
      const productJson = product.toJSON();
      return {
        ...productJson,
        sellerData: {
          ...productJson.seller,
          avatar: productJson.seller?.avatar || null // Ensure avatar is explicitly included even if null
        },
        seller: undefined, // Remove the nested seller object
        isSaved: true
      };
    });
    
    res.json({
      success: true,
      products: formattedProducts,
      count: products.length
    });
  } catch (error) {
    console.error('Error fetching saved products:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch saved products',
      error: error.message
    });
  }
};

/**
 * Get personalized feed of products, optionally filtered by category
 * @route GET /api/pg/products/feed
 */
export const getFeedProducts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sort = 'createdAt', 
      order = 'DESC',
      category
    } = req.query;
    
    const offset = (page - 1) * limit;
    const where = { 
      isDeleted: false,
      status: 'active'
    };
    
    // Filter by category if specified
    if (category && category !== 'All') {
      where.category = category;
    }
    
    // Get total count for pagination
    const total = await Product.count({ where });
    
    // Get products with seller info
    const products = await Product.findAll({
      attributes: [
        'id', 'userId', 'name', 'description', 'price', 'media', 
        'category', 'condition', 'status', 'tags', 'views',
        'isDeleted', 'createdAt', 'updatedAt', 'shipping'
      ],
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort, order]],
      include: [
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'username', 'avatar']
        }
      ]
    });
    
    // Check if user has saved any of these products
    const userSavedProductIds = req.user ? req.user.savedProductIds || [] : [];
    
    // Transform products to include seller info and saved status
    const formattedProducts = products.map(product => {
      const productJson = product.toJSON();
      return {
        ...productJson,
        views: productJson.views || 0,
        sellerData: {
          ...productJson.seller,
          avatar: productJson.seller?.avatar || null
        },
        seller: undefined, // Remove the nested seller object
        isSaved: userSavedProductIds.includes(productJson.id)
      };
    });
    
    res.json({
      success: true,
      products: formattedProducts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching feed products:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch feed products',
      error: error.message
    });
  }
};

/**
 * Search products by query string
 * @route GET /api/pg/products/search
 */
export const searchProducts = async (req, res) => {
  try {
    const { 
      q,
      page = 1, 
      limit = 10, 
      sort = 'createdAt', 
      order = 'DESC',
      category
    } = req.query;
    
    if (!q || q.trim() === '') {
      return res.json({
        success: true,
        products: [],
        pagination: {
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: 0
        }
      });
    }
    
    const searchTerm = q.trim().toLowerCase();
    const offset = (page - 1) * limit;
    
    // Build the where clause for search
    const where = { 
      isDeleted: false,
      status: 'active',
      [Op.or]: [
        {
          name: {
            [Op.iLike]: `%${searchTerm}%`
          }
        },
        {
          description: {
            [Op.iLike]: `%${searchTerm}%`
          }
        },
        // Search in tags if it's an array field
        {
          tags: {
            [Op.overlap]: [searchTerm]
          }
        }
      ]
    };
    
    // Filter by category if specified
    if (category && category !== 'All') {
      where.category = category;
    }
    
    // Get total count for pagination
    const total = await Product.count({ where });
    
    // Get products with seller info
    const products = await Product.findAll({
      attributes: [
        'id', 'userId', 'name', 'description', 'price', 'media', 
        'category', 'condition', 'status', 'tags', 'views',
        'isDeleted', 'createdAt', 'updatedAt', 'shipping'
      ],
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort, order]],
      include: [
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'username', 'avatar']
        }
      ]
    });
    
    // Check if user has saved any of these products
    const userSavedProductIds = req.user ? req.user.savedProductIds || [] : [];
    
    // Transform products to include seller info and saved status
    const formattedProducts = products.map(product => {
      const productJson = product.toJSON();
      return {
        ...productJson,
        views: productJson.views || 0,
        sellerData: {
          ...productJson.seller,
          avatar: productJson.seller?.avatar || null
        },
        seller: undefined, // Remove the nested seller object
        isSaved: userSavedProductIds.includes(productJson.id)
      };
    });
    
    res.json({
      success: true,
      products: formattedProducts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to search products',
      error: error.message
    });
  }
}; 