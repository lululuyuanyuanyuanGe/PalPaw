import express from 'express';
import { authenticate, optionalAuthenticate } from '../middlewares/authMiddleware.js';
import { 
  getAllPosts, 
  getPostById, 
  createPost, 
  updatePost, 
  deletePost 
} from '../controllers/posts/index.js';
import { getRandomPosts } from '../controllers/upload/uploadController.js';

const router = express.Router();

/**
 * @route GET /api/pg/posts
 * @desc Get all posts with pagination, sorting and filtering
 * @access Public
 */
router.get('/', optionalAuthenticate, getAllPosts);

/**
 * @route GET /api/pg/posts/feed
 * @desc Get random posts for the discovery feed (6 by default)
 * @access Public
 */
router.get('/feed', optionalAuthenticate, getRandomPosts);

/**
 * @route GET /api/pg/posts/:id
 * @desc Get a single post by ID and increment view count
 * @access Public (with visibility checks)
 */
router.get('/:id', optionalAuthenticate, getPostById);

/**
 * @route POST /api/pg/posts
 * @desc Create a new post
 * @access Private
 */
router.post('/', authenticate, createPost);

/**
 * @route PUT /api/pg/posts/:id
 * @desc Update a post
 * @access Private
 */
router.put('/:id', authenticate, updatePost);

/**
 * @route DELETE /api/pg/posts/:id
 * @desc Delete a post (soft delete)
 * @access Private
 */
router.delete('/:id', authenticate, deletePost);

export default router; 