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
  
  // Chat participants
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'MongoUser',
    required: true
  }],
  
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
ChatSchema.index({ type: 1, participants: 1 }, { 
  unique: true, 
  partialFilterExpression: { type: 'direct' } 
});

// Indexes for performance
ChatSchema.index({ participants: 1, updatedAt: -1 });
ChatSchema.index({ 'unreadCounts.user': 1, 'unreadCounts.count': 1 });

const Chat = mongoose.model('Chat', ChatSchema);

export default Chat; 