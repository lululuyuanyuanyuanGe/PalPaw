import express from 'express';
import { authenticate, optionalAuthenticate } from '../middlewares/authMiddleware.js';
import { 
  getAllPosts, 
  getPostById, 
  createPost, 
  updatePost, 
  deletePost,
  incrementPostViews
} from '../controllers/posts/index.js';
import { getRandomPosts, getFriendsPosts } from '../controllers/upload/uploadController.js';

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
 * @route GET /api/pg/posts/friends
 * @desc Get posts from user's followers and following (max 6 posts)
 * @access Private
 */
router.get('/friends', authenticate, getFriendsPosts);

/**
 * @route GET /api/pg/posts/:id
 * @desc Get a single post by ID and increment view count
 * @access Public (with visibility checks)
 */
router.get('/:id', optionalAuthenticate, getPostById);

/**
 * @route GET /api/pg/posts/:id/views
 * @desc Increment view count for a post
 * @access Public
 */
// Commented out to prevent double counting of views
// View count is already incremented in the getPostById method
// router.get('/:id/views', incrementPostViews);

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