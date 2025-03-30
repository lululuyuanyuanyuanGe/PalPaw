import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const MessageSchema = new Schema({
  // Reference to which chat this message belongs
  chat: {
    type: Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  
  // Message sender
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'MongoUser',
    required: true
  },
  
  // Text content
  content: {
    type: String,
    required: false
  },
  
  // For media messages
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'video', 'audio', 'file'],
    },
    url: String,
    thumbnailUrl: String,
    name: String,
    size: Number,
    mimeType: String
  }],
  
  // For tracking who has read the message
  readBy: [{
    type: Schema.Types.ObjectId,
    ref: 'MongoUser'
  }],
  
  // Message status
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  
  // For replies to other messages
  replyTo: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },
  
  // For edited messages
  edited: {
    type: Boolean,
    default: false
  },
  
  // For deleted messages
  deleted: {
    type: Boolean,
    default: false
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

// Create indexes for efficient queries
MessageSchema.index({ chat: 1, createdAt: -1 });
MessageSchema.index({ sender: 1 });
MessageSchema.index({ readBy: 1 });

const Message = mongoose.model('Message', MessageSchema);

export default Message; 