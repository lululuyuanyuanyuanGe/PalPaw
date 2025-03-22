import { DataTypes } from 'sequelize';
import { sequelize } from '../config/postgres.js';

// Define Like model to support likes on different entity types (posts, comments, products)
const Like = sequelize.define('Like', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // User who made the like
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  // The type of entity being liked
  entityType: {
    type: DataTypes.ENUM('post', 'comment', 'product'),
    allowNull: false
  },
  // The ID of the entity being liked
  entityId: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  timestamps: true, // Automatically add createdAt and updatedAt
  indexes: [
    // Composite index for uniqueness (user can only like an entity once)
    {
      fields: ['userId', 'entityType', 'entityId'],
      unique: true,
      name: 'like_user_entity_index'
    },
    // Index for finding all likes for an entity
    {
      fields: ['entityType', 'entityId'],
      name: 'like_entity_index'
    },
    // Index for finding all likes by a user
    {
      fields: ['userId'],
      name: 'like_user_id_index'
    }
  ]
});

export default Like; 