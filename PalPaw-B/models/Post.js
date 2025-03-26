import { DataTypes } from 'sequelize';
import { sequelize } from '../config/postgres.js';

// Define Post model
const Post = sequelize.define('Post', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // Foreign key to User
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: ''
  },
  // Media items with URLs and types
  media: {
    type: DataTypes.ARRAY(DataTypes.JSONB),
    defaultValue: []
  },
  // Like count
  likes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  // View count
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of times this post has been viewed'
  },
  // Optional location data - human readable address
  location: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Optional tags (array of strings)
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  // Visibility: public (default), private, followers
  visibility: {
    type: DataTypes.ENUM('public', 'private', 'followers'),
    defaultValue: 'public'
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
      name: 'post_user_id_index'
    },
    {
      fields: ['visibility'],
      name: 'post_visibility_index'
    },
    {
      fields: ['tags'],
      name: 'post_tags_index',
      using: 'gin' // GIN index for array search
    }
  ]
});

export default Post; 