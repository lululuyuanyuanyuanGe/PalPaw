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
        'category', 'condition', 'status', 'tags', 'savedCount', 
        'isDeleted', 'createdAt', 'updatedAt'
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
        views: 0, // Add default views value since it's missing in the database
        sellerData: productJson.seller,
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
        'category', 'condition', 'status', 'tags', 'savedCount', 
        'isDeleted', 'createdAt', 'updatedAt', 'shipping'
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
    
    // We can't increment view count since the column doesn't exist yet
    // Instead of: product.views += 1; await product.save();
    
    // Check if the current user has saved this product
    let isSaved = false;
    if (req.user) {
      isSaved = req.user.hasSavedProduct(id);
    }
    
    // Transform product to include seller info in the expected format
    const productJson = product.toJSON();
    const formattedProduct = {
      ...productJson,
      views: 0, // Add default views value
      sellerData: productJson.seller,
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
    
    if (saved) {
      // Increment saved count on product
      product.savedCount = (product.savedCount || 0) + 1;
      await product.save();
    }
    
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
    
    if (removed && product.savedCount > 0) {
      // Decrement saved count on product
      product.savedCount -= 1;
      await product.save();
    }
    
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
        sellerData: productJson.seller,
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