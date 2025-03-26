import express from 'express';
import { 
  createComment, 
  getPostComments, 
  updateComment, 
  deleteComment,
  likeComment,
  unlikeComment
} from '../controllers/posts/commentController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Create a new comment
router.post('/', createComment);

// Get all comments for a post
router.get('/post/:postId', getPostComments);

// Update a comment
router.put('/:id', updateComment);

// Delete a comment
router.delete('/:id', deleteComment);

// Like a comment
router.post('/:id/like', likeComment);

// Unlike a comment
router.post('/:id/unlike', unlikeComment);

export default router; 