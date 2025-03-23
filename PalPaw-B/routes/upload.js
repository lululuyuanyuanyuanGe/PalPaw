import express from 'express';
import { createPostWithMedia } from '../controllers/posts/uploadController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @route POST /api/upload/post
 * @desc Upload media files and create a post
 * @access Private
 */
router.post('/post', authenticate, createPostWithMedia);

export default router; 