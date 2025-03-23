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
    
    // Check if user already exists in the database
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email }],
      },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Username or email already exists",
      });
    }

    // Create a new user with default profile values
    const user = await User.create({
      username,
      email,
      password,
      firstName: firstName || '',
      lastName: lastName || '',
      bio: "Hello! I'm new to PalPaw.",
      avatar: "https://robohash.org/" + username + "?set=set4&bgset=bg1",
      isActive: true,
      role: 'user'
    });

    // Generate token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1d' }
    );

    // Return success response without password
    const userResponse = user.toJSON();
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