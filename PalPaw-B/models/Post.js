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
    allowNull: false
  },
  // Array of media URLs (images, videos)
  media: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  // Like count
  likes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  // Optional location data
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Latitude coordinate for precise location
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    validate: {
      min: -90,
      max: 90
    }
  },
  // Longitude coordinate for precise location
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
    validate: {
      min: -180,
      max: 180
    }
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
    },
    {
      fields: ['latitude', 'longitude'],
      name: 'post_location_index'
    }
  ]
});

export default Post; 