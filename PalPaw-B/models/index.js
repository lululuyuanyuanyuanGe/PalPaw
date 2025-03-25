import { sequelize } from '../config/postgres.js';
import User from './User.js';
import Post from './Post.js';
import Comment from './Comment.js';
import Like from './Like.js';
import Product from './Product.js';
import Notification from './Notification.js';
import Follow from './Follow.js';

// ===================================================
// Define model relationships
// ===================================================

// User - Post relationship
User.hasMany(Post, { foreignKey: 'userId', as: 'posts' });
Post.belongsTo(User, { foreignKey: 'userId', as: 'author' });

// User - Comment relationship
User.hasMany(Comment, { foreignKey: 'userId', as: 'comments' });
Comment.belongsTo(User, { foreignKey: 'userId', as: 'author' });

// Post - Comment relationship
Post.hasMany(Comment, { foreignKey: 'postId', as: 'comments' });
Comment.belongsTo(Post, { foreignKey: 'postId', as: 'post' });

// Comment - Comment (nested comments) relationship
Comment.hasMany(Comment, { foreignKey: 'parentId', as: 'replies' });
Comment.belongsTo(Comment, { foreignKey: 'parentId', as: 'parent' });

// User - Product relationship
User.hasMany(Product, { foreignKey: 'userId', as: 'products' });
Product.belongsTo(User, { foreignKey: 'userId', as: 'seller' });

// User - Follow relationships (followers)
User.hasMany(Follow, { foreignKey: 'followedId', as: 'followers' });
Follow.belongsTo(User, { foreignKey: 'followedId', as: 'followed' });

// User - Follow relationships (following)
User.hasMany(Follow, { foreignKey: 'followerId', as: 'following' });
Follow.belongsTo(User, { foreignKey: 'followerId', as: 'follower' });

// User - Like relationship
User.hasMany(Like, { foreignKey: 'userId', as: 'likes' });
Like.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User - Notification relationship
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'recipient' });

// User - Notification (triggered) relationship
User.hasMany(Notification, { foreignKey: 'triggeredBy', as: 'triggeredNotifications' });
Notification.belongsTo(User, { foreignKey: 'triggeredBy', as: 'trigger' });

// User - Post for likes (many-to-many relationship)
User.belongsToMany(Post, {
  through: {
    model: Like,
    scope: {
      entityType: 'post'
    }
  },
  foreignKey: 'userId',
  otherKey: 'entityId',
  as: 'likedPosts',
  constraints: false
});

Post.belongsToMany(User, {
  through: {
    model: Like,
    scope: {
      entityType: 'post'
    }
  },
  foreignKey: 'entityId',
  otherKey: 'userId',
  as: 'likedBy',
  constraints: false
});

// Function to sync all models with the database
const syncModels = async (force = false) => {
  try {
    await sequelize.sync({ force });
    console.log('All models were synchronized successfully.');
  } catch (error) {
    console.error('Error synchronizing models:', error);
  }
};

export {
  User,
  Post,
  Comment,
  Like,
  Product,
  Follow,
  Notification,
  syncModels
}; 