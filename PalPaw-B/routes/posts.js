import express from 'express';
import { 
  getAllPosts, 
  getPostById, 
  createPost,
  updatePost, 
  deletePost, 
  likePost 
} from '../controllers/posts/postController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @route POST /api/pg/posts
 * @desc Create a new post
 * @access Private
 */
router.post('/', authenticate, createPost);

/**
 * @route GET /api/pg/posts
 * @desc Get all posts with pagination
 * @access Public
 */
router.get('/', getAllPosts);

/**
 * @route GET /api/posts/:id
 * @desc Get a post by ID
 * @access Public
 */
router.get('/:id', getPostById);

/**
 * @route PUT /api/posts/:id
 * @desc Update a post
 * @access Private
 */
router.put('/:id', authenticate, updatePost);

/**
 * @route DELETE /api/posts/:id
 * @desc Delete a post (soft delete)
 * @access Private
 */
router.delete('/:id', authenticate, deletePost);

/**
 * @route POST /api/posts/:id/like
 * @desc Like a post
 * @access Private
 */
router.post('/:id/like', authenticate, likePost);

export default router;
