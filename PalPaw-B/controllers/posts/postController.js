import { Op } from 'sequelize';
import { Post, User, Comment } from '../../models/index.js';

/**
 * Get all posts with pagination, sorting and filtering
 * @route GET /api/pg/posts
 */
export const getAllPosts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sort = 'createdAt', 
      order = 'DESC',
      userId,
      tag
    } = req.query;
    
    const offset = (page - 1) * limit;
    const where = { isDeleted: false };
    
    // Filter by visibility
    if (!req.user) {
      // If not authenticated, only show public posts
      where.visibility = 'public';
    } else if (userId !== req.user.id) {
      // If viewing someone else's posts, show public and followers (if following)
      // This would need a more complex query to check following status
      where.visibility = 'public';
    }
    
    // Filter by user if specified
    if (userId) {
      where.userId = userId;
    }
    
    // Filter by tag if specified
    if (tag) {
      where.tags = { [Op.contains]: [tag] };
    }
    
    // Get total count for pagination
    const total = await Post.count({ where });
    
    // Get posts with author info - explicitly specify attributes to avoid missing column errors
    const posts = await Post.findAll({
      attributes: [
        'id', 'userId', 'title', 'content', 'media', 'likes', 
        'location', 'tags', 'visibility', 'isDeleted', 'createdAt', 'updatedAt'
      ],
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort, order]],
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar']
        }
      ]
    });
    
    // Transform posts to include author info in the expected format
    const formattedPosts = posts.map(post => {
      const postJson = post.toJSON();
      return {
        ...postJson,
        views: 0, // Add default views value since it's missing in the database
        authorData: postJson.author,
        author: undefined // Remove the nested author object
      };
    });
    
    res.json({
      success: true,
      posts: formattedPosts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch posts',
      error: error.message
    });
  }
};

/**
 * Get a single post by ID
 * @route GET /api/pg/posts/:id
 */
export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const post = await Post.findByPk(id, {
      attributes: [
        'id', 'userId', 'title', 'content', 'media', 'likes', 
        'location', 'tags', 'visibility', 'isDeleted', 'createdAt', 'updatedAt'
      ],
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar']
        },
        {
          model: Comment,
          as: 'comments',
          include: [
            {
              model: User,
              as: 'author',
              attributes: ['id', 'username', 'avatar']
            }
          ]
        }
      ]
    });
    
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: 'Post not found' 
      });
    }
    
    // Check visibility permissions
    if (post.visibility !== 'public' && 
        (!req.user || (post.userId !== req.user.id))) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to view this post' 
      });
    }
    
    // Check if the current user has liked this post
    let isLiked = false;
    if (req.user) {
      isLiked = req.user.hasLikedPost(post.id);
    }
    
    // Transform post to include author info in the expected format
    const postJson = post.toJSON();
    const formattedPost = {
      ...postJson,
      views: 0, // Add default views value
      authorData: postJson.author,
      author: undefined, // Remove the nested author object
      isLiked
    };
    
    // Format comments to match frontend expectations
    if (formattedPost.comments) {
      formattedPost.comments = formattedPost.comments.map(comment => ({
        id: comment.id,
        author: comment.author.username,
        content: comment.content,
        timestamp: comment.createdAt,
        avatarUri: comment.author.avatar,
        likes: comment.likes || 0
      }));
    }
    
    res.json({
      success: true,
      post: formattedPost
    });
  } catch (error) {
    console.error('Error fetching post by ID:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch post',
      error: error.message
    });
  }
};

/**
 * Create a new post
 * @route POST /api/pg/posts
 */
export const createPost = async (req, res) => {
  try {
    const { title, content, media, location, tags, visibility } = req.body;
    
    if (!title) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title is required' 
      });
    }
    
    const post = await Post.create({
      userId: req.user.id,
      title,
      content: content || '',
      media: media || [],
      location,
      tags: tags || [],
      visibility: visibility || 'public'
    });
    
    res.status(201).json({
      success: true,
      post
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create post',
      error: error.message
    });
  }
};

/**
 * Update a post
 * @route PUT /api/pg/posts/:id
 */
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, media, location, tags, visibility } = req.body;
    
    const post = await Post.findByPk(id);
    
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: 'Post not found' 
      });
    }
    
    // Check if the user is the post owner
    if (post.userId !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to update this post' 
      });
    }
    
    // Update post fields
    post.title = title || post.title;
    post.content = content !== undefined ? content : post.content;
    post.media = media || post.media;
    post.location = location !== undefined ? location : post.location;
    post.tags = tags || post.tags;
    post.visibility = visibility || post.visibility;
    
    await post.save();
    
    res.json({
      success: true,
      post
    });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update post',
      error: error.message
    });
  }
};

/**
 * Delete a post (soft delete)
 * @route DELETE /api/pg/posts/:id
 */
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    
    const post = await Post.findByPk(id);
    
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: 'Post not found' 
      });
    }
    
    // Check if the user is the post owner
    if (post.userId !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to delete this post' 
      });
    }
    
    // Soft delete the post
    post.isDeleted = true;
    await post.save();
    
    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete post',
      error: error.message
    });
  }
}; 