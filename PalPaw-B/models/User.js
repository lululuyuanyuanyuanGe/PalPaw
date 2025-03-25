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
  const { id, username, firstName, lastName, avatar, bio, followerCount, followingCount } = this;
  return {
    id,
    username,
    firstName,
    lastName,
    avatar,
    bio,
    followers: followerCount,
    following: followingCount
  };
};

// Instance method to check if user follows another user
User.prototype.isFollowing = async function(userId) {
  const following = await this.getFollowing({
    where: { followedId: userId }
  });
  return following.length > 0;
};

export default User; 