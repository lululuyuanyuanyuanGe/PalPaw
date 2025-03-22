import { DataTypes } from 'sequelize';
import { sequelize } from '../config/postgres.js';

// Define Follow model for user follow relationships
const Follow = sequelize.define('Follow', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // User who initiated the follow
  followerId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  // User who is being followed
  followingId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  // Status of the follow (for features like follow requests)
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'blocked'),
    defaultValue: 'accepted' // Direct follows are accepted by default
  }
}, {
  timestamps: true, // Automatically add createdAt and updatedAt
  indexes: [
    // Composite index for uniqueness and faster lookups
    {
      fields: ['followerId', 'followingId'],
      unique: true,
      name: 'follow_follower_following_index'
    },
    // Index for finding followers
    {
      fields: ['followingId'],
      name: 'follow_following_id_index'
    },
    // Index for finding who a user follows
    {
      fields: ['followerId'],
      name: 'follow_follower_id_index'
    }
  ]
});

export default Follow; 