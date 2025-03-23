import express from 'express';
import { createPost, getPosts, getPostById } from '../controllers/posts/postController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Routes that require authentication
router.post('/', authenticate, createPost);

// Public routes (but will return more data if authenticated)
router.get('/', getPosts);
router.get('/:id', getPostById);

export default router; 