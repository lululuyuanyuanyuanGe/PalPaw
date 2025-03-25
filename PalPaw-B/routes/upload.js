import express from 'express';
import { createPostWithMedia, upload, handlePostMulterError } from '../controllers/posts/uploadPostsController.js';
import { 
  createProductWithFormData, 
  productUpload, 
  handleProductMulterError 
} from '../controllers/products/productController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @route POST /api/upload/post
 * @desc Upload media files and create a post
 * @access Private
 */
router.post('/post', authenticate, upload.array('media'), handlePostMulterError, createPostWithMedia);

/**
 * @route POST /api/upload/product
 * @desc Upload media files and create a product
 * @access Private
 */
router.post('/product', authenticate, productUpload.array('media'), handleProductMulterError, createProductWithFormData);

export default router;