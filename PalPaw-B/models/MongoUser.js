import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: ''
  },
  firstName: {
    type: String,
    default: ''
  },
  lastName: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  following: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'MongoUser' 
  }],
  followers: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'MongoUser' 
  }],
  likedPosts: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'Post' 
  }],
  savedProducts: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'Product' 
  }],
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  
  // Online status for chat functionality
  onlineStatus: {
    type: String,
    enum: ['online', 'offline', 'away'],
    default: 'offline'
  },
  
  // Last active timestamp
  lastActive: {
    type: Date,
    default: Date.now
  },
  
  // For push notifications
  fcmTokens: [{
    token: String,
    device: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ onlineStatus: 1 });

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Get public profile
UserSchema.methods.getPublicProfile = function() {
  const { _id, username, firstName, lastName, avatar, bio, following, followers, likedPosts, savedProducts, onlineStatus, lastActive } = this;
  return {
    id: _id,
    username,
    firstName,
    lastName,
    avatar,
    bio,
    followingCount: following.length,
    followerCount: followers.length,
    likedPostsCount: likedPosts.length,
    savedProductsCount: savedProducts.length,
    onlineStatus,
    lastActive
  };
};

const MongoUser = mongoose.model('MongoUser', UserSchema);

export default MongoUser; 