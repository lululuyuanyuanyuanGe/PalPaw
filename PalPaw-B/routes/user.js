import express from 'express';
import { getUserById } from '../controllers/user/userController.js';
import { optionalAuthenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Get user by ID - use optionalAuthenticate to handle both authenticated and unauthenticated access
router.get('/:id', optionalAuthenticate, getUserById);

export default router;
