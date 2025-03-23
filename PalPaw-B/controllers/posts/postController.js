import { Post, User } from '../../models/index.js';
import { Op } from 'sequelize';

/**
 * Create a new post
 * @route POST /api/posts
 * @param {object} req.body - Post data
 * @param {string} req.user.id - User ID from auth middleware
 * @returns {object} Created post
 */
export const createPost = async (req, res) => {
  try {
    // Debug logs to see exactly what's in the request
    console.log('==== POST CONTROLLER - CREATE POST ====');
    console.log('Request body:', req.body);
    console.log('Title value:', req.body.title);
    console.log('Title type:', typeof req.body.title);
    console.log('=====================');
    
    // Extract fields directly from request body
    const title = req.body.title;
    const content = req.body.content || '';
    const media = req.body.media || [];
    const location = req.body.location;
    const tags = req.body.tags || [];
    const visibility = req.body.visibility || 'public';
    
    // Get user ID from auth middleware (assumes auth middleware sets req.user)
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized - You must be logged in to create a post' });
    }

    // Validate required fields
    if (!title || title.trim() === '') {
      console.log('Title validation failed. Title:', title);
      return res.status(400).json({ message: 'Title is required' });
    }

    // Create the post
    const newPost = await Post.create({
      userId,
      title,
      content,
      media,
      location,
      tags,
      visibility
    });

    // Fetch the post with user data
    const postWithUser = await Post.findByPk(newPost.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post: postWithUser
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error creating post',
      error: error.message 
    });
  }
};

/**
 * Get all posts with pagination
 * @route GET /api/posts
 * @param {number} req.query.page - Page number
 * @param {number} req.query.limit - Number of posts per page
 * @returns {object} List of posts
 */
export const getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Find all posts that are public or belong to the current user
    const posts = await Post.findAndCountAll({
      where: {
        isDeleted: false,
        // If user is logged in, include their private posts
        ...(req.user?.id ? {
          [Op.or]: [
            { visibility: 'public' },
            { userId: req.user.id }
          ]
        } : { visibility: 'public' })
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    // Calculate total pages
    const totalPages = Math.ceil(posts.count / limit);

    res.status(200).json({
      success: true,
      posts: posts.rows,
      pagination: {
        total: posts.count,
        totalPages,
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    console.error('Error getting posts:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error retrieving posts',
      error: error.message 
    });
  }
};

/**
 * Get a post by ID
 * @route GET /api/posts/:id
 * @param {string} req.params.id - Post ID
 * @returns {object} Post
 */
export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findOne({
      where: { 
        id,
        isDeleted: false,
        // If user is logged in, include private posts if they belong to the user
        ...(req.user?.id ? {
          [Op.or]: [
            { visibility: 'public' },
            { userId: req.user.id }
          ]
        } : { visibility: 'public' })
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
        }
      ]
    });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.status(200).json({
      success: true,
      post
    });
  } catch (error) {
    console.error('Error getting post:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error retrieving post',
      error: error.message 
    });
  }
}; 