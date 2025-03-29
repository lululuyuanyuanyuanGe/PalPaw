import express from 'express';
import { 
  getUserById, 
  getUserFollowers, 
  getUserFollowing,
  followUser,
  unfollowUser,
  updateUserProfile,
  getCurrentUserProfile
} from '../controllers/user/userController.js';
import { optionalAuthenticate, authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Get current user profile
router.get('/me', authenticate, getCurrentUserProfile);

// Get user by ID - use optionalAuthenticate to handle both authenticated and unauthenticated access
router.get('/:id', optionalAuthenticate, getUserById);

// User followers/following
router.get('/:id/followers', authenticate, getUserFollowers);
router.get('/:id/following', authenticate, getUserFollowing);

// Follow/unfollow actions
router.post('/:id/follow', authenticate, followUser);
router.post('/:id/unfollow', authenticate, unfollowUser);

// Profile updates
router.put('/profile/update', authenticate, updateUserProfile);

export default router;
