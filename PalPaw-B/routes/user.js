import express from 'express';
import { 
  updateUserProfile,
  getUserById
} from '../controllers/user/userController.js';
import { authenticate } from '../middlewares/authMiddleware.js';


const router = express.Router();

// Get user by ID (auth required for current user, public for other users)
router.get('/:id', getUserById);

export default router;
