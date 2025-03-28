import { Comment, User, Post } from '../../models/index.js';

// Create a new comment
export const createComment = async (req, res, next) => {
  try {
    const { postId, content } = req.body;
    const userId = req.user.id;

    // Validate post exists
    const post = await Post.findByPk(postId);
    if (!post) {
      throw new ApiError(404, 'Post not found');
    }

    // Create comment (without parentId)
    const comment = await Comment.create({
      userId,
      postId,
      content,
    });

    // Fetch the user data to include with the response
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'avatar']
    });

    // Format the response to match frontend's Comment interface
    const formattedComment = {
      id: comment.id,
      author: user.username,
      content: comment.content,
      timestamp: comment.createdAt,
      avatarUri: user.avatar || `https://robohash.org/${userId}?set=set4`,
      likes: 0
    };

    res.status(201).json({
      success: true,
      comment: formattedComment
    });
  } catch (error) {
    next(error);
  }
};

// Get all comments for a post
export const getPostComments = async (req, res, next) => {
  try {
    const { postId } = req.params;
    
    // Check if post exists
    const post = await Post.findByPk(postId);
    if (!post) {
      throw new ApiError(404, 'Post not found');
    }

    // Get top-level comments (no parentId)
    const comments = await Comment.findAll({
      where: { 
        postId,
        parentId: null,
        isDeleted: false
      },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar']
        },
        {
          model: Comment,
          as: 'replies',
          where: { isDeleted: false },
          required: false,
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

    // Format comments for response
    const formattedComments = comments.map(comment => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      likes: comment.likes,
      author: {
        id: comment.author.id,
        username: comment.author.username,
        avatar: comment.author.avatar
      },
      replies: comment.replies?.map(reply => ({
        id: reply.id,
        content: reply.content,
        createdAt: reply.createdAt,
        likes: reply.likes,
        author: {
          id: reply.author.id,
          username: reply.author.username,
          avatar: reply.author.avatar
        },
        parentId: comment.id
      })) || []
    }));

    res.status(200).json({
      success: true,
      comments: formattedComments
    });
  } catch (error) {
    next(error);
  }
};

// Update a comment
export const updateComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const comment = await Comment.findByPk(id);
    
    // Check if comment exists
    if (!comment) {
      throw new ApiError(404, 'Comment not found');
    }

    // Check if user is the author of the comment
    if (comment.userId !== userId) {
      throw new ApiError(403, 'You are not authorized to update this comment');
    }

    // Update comment
    comment.content = content;
    await comment.save();

    res.status(200).json({
      success: true,
      comment: {
        id: comment.id,
        content: comment.content,
        updatedAt: comment.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete a comment (soft delete)
export const deleteComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findByPk(id);
    
    // Check if comment exists
    if (!comment) {
      throw new ApiError(404, 'Comment not found');
    }

    // Check if user is the author of the comment
    if (comment.userId !== userId) {
      throw new ApiError(403, 'You are not authorized to delete this comment');
    }

    // Soft delete the comment
    comment.isDeleted = true;
    await comment.save();

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Like a comment
export const likeComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const comment = await Comment.findByPk(id);
    
    // Check if comment exists
    if (!comment) {
      throw new ApiError(404, 'Comment not found');
    }

    // Increment like count
    comment.likes = (comment.likes || 0) + 1;
    await comment.save();

    res.status(200).json({
      success: true,
      likes: comment.likes
    });
  } catch (error) {
    next(error);
  }
};

// Unlike a comment
export const unlikeComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const comment = await Comment.findByPk(id);
    
    // Check if comment exists
    if (!comment) {
      throw new ApiError(404, 'Comment not found');
    }

    // Decrement like count, but not below 0
    comment.likes = Math.max(0, (comment.likes || 0) - 1);
    await comment.save();

    res.status(200).json({
      success: true,
      likes: comment.likes
    });
  } catch (error) {
    next(error);
  }
}; 