/**
 * Get user profile
 * @route GET /api/pg/auth/profile
 * @middleware auth - Authentication middleware attaches user to request
 * @returns {object} User profile
 */
export const getProfile = async (req, res) => {
  try {
    // User is already attached to req by auth middleware
    res.json(req.user);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}; 