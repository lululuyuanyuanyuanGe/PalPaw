import express from 'express';
import { register, login, getProfile } from '../controllers/auth/index.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Register Route
router.post("/register", register);

// Login Route
router.post("/login", login);

// Get user profile - protected by auth middleware
router.get("/profile", authenticate, getProfile);

export default router; 