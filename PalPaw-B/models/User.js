import { DataTypes } from 'sequelize';
import { sequelize } from '../config/postgres.js';
import bcrypt from 'bcryptjs';

/**
 * User model - represents users in the application
 */
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [2, 50]
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [6, 100]
    }
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user'
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  followerCount: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.getDataValue('_followerCount') || 0;
    },
    set(value) {
      this.setDataValue('_followerCount', value);
    }
  },
  followingCount: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.getDataValue('_followingCount') || 0;
    },
    set(value) {
      this.setDataValue('_followingCount', value);
    }
  },
  likedPostsCount: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.getDataValue('_likedPostsCount') || 0;
    },
    set(value) {
      this.setDataValue('_likedPostsCount', value);
    }
  },
  likedPostIds: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    defaultValue: [],
    allowNull: false
  },
  savedProductIds: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    defaultValue: [],
    allowNull: false,
    comment: 'Array of product IDs saved/collected by this user'
  }
}, {
  timestamps: true, // Automatically add createdAt and updatedAt
  hooks: {
    // Hash password before saving to database
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Instance method to compare password
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to get public profile
User.prototype.getPublicProfile = function() {
  const { id, username, firstName, lastName, avatar, bio, followerCount, followingCount, likedPostsCount, likedPostIds, savedProductIds } = this;
  return {
    id,
    username,
    firstName,
    lastName,
    avatar,
    bio,
    followers: followerCount,
    following: followingCount,
    likedPosts: likedPostsCount,
    likedPostIds,
    savedProductIds
  };
};

// Instance method to check if user follows another user
User.prototype.isFollowing = async function(userId) {
  const following = await this.getFollowing({
    where: { followedId: userId }
  });
  return following.length > 0;
};

// Instance method to check if user has liked a post
User.prototype.hasLikedPost = function(postId) {
  return this.likedPostIds.includes(postId);
};

// Instance method to like a post
User.prototype.likePost = async function(postId) {
  if (!this.hasLikedPost(postId)) {
    this.likedPostIds = [...this.likedPostIds, postId];
    await this.save();
    return true;
  }
  return false;
};

// Instance method to unlike a post
User.prototype.unlikePost = async function(postId) {
  if (this.hasLikedPost(postId)) {
    this.likedPostIds = this.likedPostIds.filter(id => id !== postId);
    await this.save();
    return true;
  }
  return false;
};

// Instance method to check if user has saved a product
User.prototype.hasSavedProduct = function(productId) {
  return this.savedProductIds.includes(productId);
};

// Instance method to save a product
User.prototype.saveProduct = async function(productId) {
  if (!this.hasSavedProduct(productId)) {
    this.savedProductIds = [...this.savedProductIds, productId];
    await this.save();
    return true;
  }
  return false;
};

// Instance method to unsave a product
User.prototype.unsaveProduct = async function(productId) {
  if (this.hasSavedProduct(productId)) {
    this.savedProductIds = this.savedProductIds.filter(id => id !== productId);
    await this.save();
    return true;
  }
  return false;
};

export default User; 