import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const ChatSchema = new Schema({
  // Unique conversation identifier
  chatId: {
    type: String,
    required: true,
    unique: true
  },
  
  // Type of chat (direct, group)
  type: {
    type: String,
    enum: ['direct', 'group'],
    default: 'direct'
  },
  
  // For group chats only
  name: {
    type: String,
    default: null
  },
  
  // Chat participants (MongoDB user references)
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'MongoUser',
    required: true
  }],
  
  // PostgreSQL participant IDs for easier cross-reference
  postgresParticipantIds: [{
    type: String,
    required: true
  }],
  
  // Unique identifier for participant pairs (for direct chats)
  uniquePairIdentifier: {
    type: String,
    sparse: true
  },
  
  // Admin user(s) for group chats
  admins: [{
    type: Schema.Types.ObjectId,
    ref: 'MongoUser'
  }],
  
  // Last message for preview/sorting
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },
  
  // Last message content preview (denormalized for efficiency)
  lastMessagePreview: {
    content: String,
    timestamp: Date,
    senderId: Schema.Types.ObjectId
  },
  
  // Unread counts per user
  unreadCounts: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'MongoUser'
    },
    count: {
      type: Number,
      default: 0
    }
  }],
  
  // For direct chats, we can store if both users have deleted this chat
  deletedFor: [{
    type: Schema.Types.ObjectId,
    ref: 'MongoUser'
  }],
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// For direct chats, create a unique compound index for participant pairs
// But ensure we're not creating partial indexes that can lead to duplicate key errors
ChatSchema.index({ chatId: 1 }, { unique: true });

// For direct chats, we'll use a different approach for uniqueness
// Create a compound index on a different field that we will control directly
ChatSchema.index({ type: 1, uniquePairIdentifier: 1 }, { 
  unique: true,
  sparse: true // Only index documents that have this field
});

// Simple indexes for performance
ChatSchema.index({ participants: 1 });
ChatSchema.index({ 'unreadCounts.user': 1 });

// Helper method to generate a unique identifier for a participant pair
// This method will be used instead of relying on MongoDB's array indexing
ChatSchema.methods.generateUniquePairId = function() {
  if (this.type === 'direct' && this.participants && this.participants.length === 2) {
    // Sort the participant IDs to ensure consistency
    const sortedIds = [...this.participants].sort().map(id => id.toString());
    // Join them to create a unique string
    return sortedIds.join('_');
  }
  return null;
};

const Chat = mongoose.model('Chat', ChatSchema);

export default Chat; 