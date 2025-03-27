import express from 'express';
import { 
  createPostWithMedia, 
  upload, 
  handlePostMulterError,
  getUserPosts,
  getPostById,
  getUserProducts,
  getProductById,
  createProductWithMedia
} from '../controllers/upload/uploadController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { createProduct } from '../controllers/products/productController.js';

const router = express.Router();

/**
 * @route POST /api/upload/post
 * @desc Upload media files and create a post
 * @access Private
 */
router.post('/post', authenticate, upload.array('media', 10), handlePostMulterError, createPostWithMedia);

/**
 * @route GET /api/upload/posts
 * @desc Get all posts for the authenticated user
 * @access Private
 */
router.get('/posts', authenticate, getUserPosts);

/**
 * @route GET /api/upload/posts/:userId
 * @desc Get all posts for a specific user
 * @access Public
 */
router.get('/posts/:userId', getUserPosts);

/**
 * @route GET /api/upload/post/:postId
 * @desc Get a specific post by ID
 * @access Public
 */
router.get('/post/:postId', getPostById);

/**
 * @route POST /api/upload/product
 * @desc Upload media files and create a product
 * @access Private
 */
// router.post('/product', authenticate, productUpload.array('media'), handlePostMulterError, createProductWithFormData);

/**
 * @route POST /api/products/upload
 * @desc Upload media files and create a product - endpoint that frontend expects
 * @access Private
 */
router.post('/products/upload', authenticate, upload.array('media', 10), handlePostMulterError, createProductWithMedia);

/**
 * @route GET /api/upload/products
 * @desc Get all products for the authenticated user
 * @access Private
 */
router.get('/products/:userId', authenticate, getUserProducts);

/**
 * @route GET /api/upload/products/:userId
 * @desc Get all products for a specific user
 * @access Private
 */
router.post('/products', authenticate, createProduct);

/**
 * @route GET /api/upload/product/:productId
 * @desc Get a specific product by ID
 * @access Public
 */
router.get('/product/:productId', getProductById);

export default router;