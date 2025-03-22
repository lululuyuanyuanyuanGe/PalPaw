import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { User } from '../../models/index.js';

/**
 * Login user
 * @route POST /api/pg/auth/login
 * @param {string} req.body.login - Username or email
 * @param {string} req.body.password - User password
 * @returns {object} User object and JWT token
 */
export const login = async (req, res) => {
  try {
    const { login, password } = req.body;
    
    // Check if user exists (using either username or email)
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username: login },
          { email: login }
        ]
      }
    });
    
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Generate token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1d' }
    );
    
    // Return response without password
    const userResponse = user.toJSON();
    delete userResponse.password;
    
    res.json({
      message: "Login successful",
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}; 