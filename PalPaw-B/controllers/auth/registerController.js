import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { User } from '../../models/index.js';

/**
 * Register a new user
 * @route POST /api/pg/auth/register
 * @param {object} req.body - User registration data
 * @returns {object} User object and JWT token
 */
export const register = async (req, res) => {
  try {
    console.log('Register controller called with body:', req.body);
    
    const { username, email, password, firstName, lastName } = req.body;
    
    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email and password are required"
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
        field: existingUser.username === username ? "username" : "email"
      });
    }

    // Create new user
    const newUser = await User.create({
      username,
      email,
      password, // Will be hashed by model hook
      firstName,
      lastName
    });

    // Generate token
    const token = jwt.sign(
      { id: newUser.id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1d' }
    );

    // Return success response without password
    const userResponse = newUser.toJSON();
    delete userResponse.password;

    console.log('User registered successfully:', userResponse.id);
    
    res.status(201).json({
      message: "User registered successfully",
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Register error details:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors.map(e => ({ field: e.path, message: e.message }))
      });
    }
    
    res.status(500).json({ 
      message: "Server error", 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}; 