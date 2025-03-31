import { sequelize } from '../config/postgres.js';
import User from './User.js';
import Post from './Post.js';
import Comment from './Comment.js';
import Like from './Like.js';
import Product from './Product.js';
import Notification from './Notification.js';
import Follow from './Follow.js';
import Chat from './Chat.js';
import Message from './Message.js';
import MongoUser from './MongoUser.js';
import PostgresUser from './PostgresUser.js';

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
// Users who are being followed (Fixed to use followingId to match controller)
User.hasMany(Follow, { foreignKey: 'followingId', as: 'followers' });
Follow.belongsTo(User, { foreignKey: 'followingId', as: 'following' });

// User - Follow relationships (following)
// Users who follow others
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

// Helper function to create or update a MongoDB user from PostgreSQL user
async function syncUserToMongo(postgresUser) {
  try {
    const mongoUser = await MongoUser.findOne({ postgresId: postgresUser.id });
    
    if (mongoUser) {
      // Update existing MongoDB user if needed
      if (mongoUser.email !== postgresUser.email) {
        mongoUser.email = postgresUser.email;
        await mongoUser.save();
      }
      return mongoUser;
    } else {
      // Create new MongoDB user
      const newMongoUser = new MongoUser({
        postgresId: postgresUser.id,
        email: postgresUser.email
      });
      await newMongoUser.save();
      return newMongoUser;
    }
  } catch (error) {
    console.error('Error syncing user to MongoDB:', error);
    throw error;
  }
}

// Function to populate user info from PostgreSQL when getting chat data
async function populateChatWithPostgresUsers(chat, includeMessages = false) {
  try {
    // Fetch all PostgreSQL users for participants
    const postgresUsers = await Promise.all(
      chat.postgresParticipantIds.map(id => PostgresUser.findByPk(id))
    );
    
    // Create a map of PostgreSQL user data with all relevant profile fields
    const userMap = {};
    postgresUsers.forEach(user => {
      if (user) {
        userMap[user.id] = {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          firstName: user.firstName,
          lastName: user.lastName,
          bio: user.bio
        };
      }
    });
    
    // Transform the chat object to include PostgreSQL user data
    const chatData = chat.toObject ? chat.toObject() : {...chat};
    
    // Add PostgreSQL user data to each participant
    chatData.enrichedParticipants = chat.postgresParticipantIds.map(id => {
      const pgUser = userMap[id];
      if (pgUser) {
        // Get online status from MongoDB user
        const mongoParticipant = chat.participants.find(p => 
          p.postgresId && p.postgresId.toString() === id.toString()
        );
        
        return {
          ...pgUser,
          onlineStatus: mongoParticipant?.onlineStatus || 'offline',
          lastActive: mongoParticipant?.lastActive
        };
      }
      return null;
    }).filter(user => user !== null);
    
    // If messages are included, enrich them too
    if (includeMessages && chatData.messages) {
      chatData.messages = chatData.messages.map(message => {
        const pgUser = userMap[message.senderPostgresId];
        if (pgUser) {
          return {
            ...message,
            senderDetails: pgUser
          };
        }
        return message;
      });
    }
    
    return chatData;
  } catch (error) {
    console.error('Error populating chat with PostgreSQL users:', error);
    throw error;
  }
}

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
  syncModels,
  Chat,
  Message,
  MongoUser,
  PostgresUser,
  syncUserToMongo,
  populateChatWithPostgresUsers
}; 