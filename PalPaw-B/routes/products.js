import express from 'express';
import { authenticate, optionalAuthenticate } from '../middlewares/authMiddleware.js';
import { 
  getAllProducts,
  getProductById,
  saveProduct,
  unsaveProduct,
  getSavedProducts,
  getFeedProducts,
  searchProducts
} from '../controllers/products/index.js';

const router = express.Router();

/**
 * @route GET /api/pg/products
 * @desc Get all products with pagination, sorting and filtering
 * @access Public
 */
router.get('/', optionalAuthenticate, getAllProducts);

/**
 * Note: This route must come before /:id to avoid conflicts
 * @route GET /api/pg/products/saved
 * @desc Get all products saved by the user
 * @access Private
 */
router.get('/saved', authenticate, getSavedProducts);

/**
 * @route GET /api/pg/products/feed
 * @desc Get personalized feed of products, optionally filtered by category
 * @access Public
 */
router.get('/feed', optionalAuthenticate, getFeedProducts);

/**
 * @route GET /api/pg/products/search
 * @desc Search products by query string
 * @access Public
 */
router.get('/search', optionalAuthenticate, searchProducts);

/**
 * @route GET /api/pg/products/:id
 * @desc Get a single product by ID and increment view count
 * @access Public
 */
router.get('/:id', authenticate, getProductById);

/**
 * @route POST /api/pg/products
 * @desc Create a new product
 * @access Private
 */

/**
 * @route POST /api/pg/products/:id/save
 * @desc Save a product to user's collection
 * @access Private
 */
router.post('/:id/save', authenticate, saveProduct);

/**
 * @route DELETE /api/pg/products/:id/save
 * @desc Remove a product from user's collection
 * @access Private
 */
router.delete('/:id/save', authenticate, unsaveProduct);

export default router; 