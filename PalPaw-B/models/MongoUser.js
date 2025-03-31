import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  // Reference to the PostgreSQL user ID
  postgresId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Email is relatively stable so we can keep it
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  
  // Chat-specific fields that don't exist in PostgreSQL user model
  onlineStatus: {
    type: String,
    enum: ['online', 'offline', 'away'],
    default: 'offline'
  },
  
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
UserSchema.index({ postgresId: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ onlineStatus: 1 });

// Get public profile - only includes MongoDB-specific properties
UserSchema.methods.getPublicProfile = function() {
  const { _id, postgresId, onlineStatus, lastActive } = this;
  return {
    id: _id,
    postgresId,
    onlineStatus,
    lastActive
  };
};

const MongoUser = mongoose.model('MongoUser', UserSchema);

export default MongoUser; 