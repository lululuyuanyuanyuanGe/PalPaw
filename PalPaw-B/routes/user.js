import express from 'express';
import { getUserById, getUserFollowers, getUserFollowing } from '../controllers/user/userController.js';
import { optionalAuthenticate, authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Get user by ID - use optionalAuthenticate to handle both authenticated and unauthenticated access
router.get('/:id', optionalAuthenticate, getUserById);

// Get user's followers
router.get('/:id/followers', authenticate, getUserFollowers);

// Get users that the specified user is following
router.get('/:id/following', authenticate, getUserFollowing);

export default router;
