import { DataTypes } from 'sequelize';
import { sequelize } from '../config/postgres.js';

// Define Comment model
const Comment = sequelize.define('Comment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // Foreign key to User (who made the comment)
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  // Foreign key to Post
  postId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  // Self-reference for nested comments (parent comment id)
  parentId: {
    type: DataTypes.UUID,
    allowNull: true, // Null means it's a top-level comment
    defaultValue: null
  },
  // Comment content
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  // Like count
  likes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  // Optional media attachment (single image/video)
  media: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Soft delete flag
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true, // Automatically add createdAt and updatedAt
  indexes: [
    {
      fields: ['userId'],
      name: 'comment_user_id_index'
    },
    {
      fields: ['postId'],
      name: 'comment_post_id_index'
    },
    {
      fields: ['parentId'],
      name: 'comment_parent_id_index'
    }
  ]
});

export default Comment; 