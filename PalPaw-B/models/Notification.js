import { DataTypes } from 'sequelize';
import { sequelize } from '../config/postgres.js';

// Define Notification model for system and user-to-user notifications
const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // User receiving the notification
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  // Optional: User who triggered the notification (null for system notifications)
  triggeredBy: {
    type: DataTypes.UUID,
    allowNull: true
  },
  // Notification type
  type: {
    type: DataTypes.ENUM(
      'follow', 
      'like', 
      'comment', 
      'mention', 
      'tag',
      'product_sold',
      'product_interest',
      'system'
    ),
    allowNull: false
  },
  // Message content
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  // Target entity type (post, comment, product, user, etc.)
  entityType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Target entity ID
  entityId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  // Is the notification read
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // Additional data (JSON format)
  data: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  timestamps: true, // Automatically add createdAt and updatedAt
  indexes: [
    {
      fields: ['userId'],
      name: 'notification_user_id_index'
    },
    {
      fields: ['triggeredBy'],
      name: 'notification_triggered_by_index'
    },
    {
      fields: ['isRead'],
      name: 'notification_is_read_index'
    },
    {
      fields: ['type'],
      name: 'notification_type_index'
    }
  ]
});

export default Notification; 