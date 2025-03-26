import { User, Post, Like } from '../../models/index.js';
import { sequelize } from '../../config/postgres.js';

/**
 * Like a post
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
export const likePost = async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;

  try {
    // Find the post
    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if already liked
    const existingLike = await Like.findOne({
      where: {
        userId,
        entityType: 'post',
        entityId: postId
      }
    });

    if (existingLike) {
      return res.status(400).json({ message: 'Post already liked' });
    }

    // Start a transaction
    const transaction = await sequelize.transaction();

    try {
      // Create a like record
      await Like.create({
        userId,
        entityType: 'post',
        entityId: postId
      }, { transaction });

      // Increment post likes count
      await Post.update(
        { likes: sequelize.literal('likes + 1') },
        { where: { id: postId }, transaction }
      );

      // Update user's liked posts
      const user = await User.findByPk(userId);
      await user.likePost(postId);

      await transaction.commit();

      return res.status(200).json({ 
        success: true, 
        message: 'Post liked successfully',
        likedPostIds: user.likedPostIds
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error liking post:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Unlike a post
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
export const unlikePost = async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;

  try {
    // Find the like
    const existingLike = await Like.findOne({
      where: {
        userId,
        entityType: 'post',
        entityId: postId
      }
    });

    if (!existingLike) {
      return res.status(400).json({ message: 'Post not liked yet' });
    }

    // Start a transaction
    const transaction = await sequelize.transaction();

    try {
      // Delete the like record
      await existingLike.destroy({ transaction });

      // Decrement post likes count
      await Post.update(
        { likes: sequelize.literal('likes - 1') },
        { 
          where: { id: postId },
          transaction
        }
      );

      // Update user's liked posts
      const user = await User.findByPk(userId);
      await user.unlikePost(postId);

      await transaction.commit();

      return res.status(200).json({ 
        success: true, 
        message: 'Post unliked successfully',
        likedPostIds: user.likedPostIds
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error unliking post:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get all posts liked by the authenticated user
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
export const getLikedPosts = async (req, res) => {
  const userId = req.user.id;

  try {
    // Find the user with their liked posts
    const user = await User.findByPk(userId, {
      include: [{
        model: Post,
        as: 'likedPosts',
        through: { 
          attributes: [] // Don't include join table fields
        },
        include: [{
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar']
        }]
      }]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Transform liked posts to include author info in the expected format
    // This ensures they match the structure returned by the posts controller
    const formattedLikedPosts = user.likedPosts.map(post => {
      const postJson = post.toJSON();
      return {
        ...postJson,
        views: postJson.views || 0, // Ensure views field is present
        authorData: postJson.author, // Add authorData field in the expected format
        author: undefined, // Remove the nested author object to avoid confusion
        isLiked: true // All posts in this list are liked by the user
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedLikedPosts.length,
      likedPosts: formattedLikedPosts,
      likedPostIds: user.likedPostIds
    });
  } catch (error) {
    console.error('Error fetching liked posts:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get all users who liked a specific post
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
export const getLikedUsers = async (req, res) => {
  const { postId } = req.params;
  
  try {
    // Find the post with users who liked it
    const post = await Post.findByPk(postId, {
      include: [{
        model: User,
        as: 'likedBy',
        through: { 
          attributes: [] // Don't include join table fields
        },
        attributes: ['id', 'username', 'avatar'] // Only send necessary user info
      }]
    });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    return res.status(200).json({
      success: true,
      count: post.likedBy.length,
      users: post.likedBy
    });
  } catch (error) {
    console.error('Error fetching users who liked the post:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 