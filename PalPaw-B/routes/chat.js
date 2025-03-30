import express from 'express';
import { Chat, Message, MongoUser } from '../models/index.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { User } from '../models/index.js';

const router = express.Router();

/**
 * Middleware to get MongoDB user ID from PostgreSQL user
 */
const getMongoUserId = async (req, res, next) => {
  try {
    console.log('Getting MongoDB user for PostgreSQL user ID:', req.user.id);
    
    // First get the PostgreSQL user to get email
    const pgUser = await User.findByPk(req.user.id);
    
    if (!pgUser) {
      console.error('PostgreSQL user not found with ID:', req.user.id);
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Now find MongoDB user by email
    const mongoUser = await MongoUser.findOne({ email: pgUser.email });
    
    if (!mongoUser) {
      console.error('MongoDB user not found for email:', pgUser.email);
      return res.status(404).json({ 
        success: false, 
        message: 'Chat user not found. Please set up your chat profile first.' 
      });
    }
    
    // Add MongoDB user ID to req object
    req.mongoUserId = mongoUser._id.toString();
    console.log('Successfully mapped PostgreSQL ID to MongoDB ID:', req.mongoUserId);
    next();
  } catch (error) {
    console.error('Error mapping user IDs:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @route   GET /api/chats
 * @desc    Get all chats for current user
 * @access  Private
 */
router.get('/', authenticate, getMongoUserId, async (req, res) => {
  try {
    const chats = await Chat.find({ 
      participants: req.mongoUserId,
      deletedFor: { $ne: req.mongoUserId }
    })
    .populate('participants', 'username avatar onlineStatus lastActive')
    .populate({
      path: 'lastMessage',
      populate: {
        path: 'sender',
        select: 'username avatar'
      }
    })
    .sort({ updatedAt: -1 });
    
    res.json({ success: true, chats });
  } catch (error) {
    console.error('Error getting chats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   POST /api/chats
 * @desc    Create a new chat
 * @access  Private
 */
router.post('/', authenticate, getMongoUserId, async (req, res) => {
  try {
    const { participantId, type, name } = req.body;
    
    // Validate participantId exists
    if (!participantId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Participant ID is required' 
      });
    }
    
    // For direct chats, check if one already exists
    if (type === 'direct') {
      const existingChat = await Chat.findOne({
        type: 'direct',
        participants: { $all: [req.mongoUserId, participantId] }
      })
      .populate('participants', 'username avatar onlineStatus lastActive');
      
      if (existingChat) {
        return res.json({ success: true, chat: existingChat });
      }
    }
    
    // Create new chat
    const newChat = new Chat({
      chatId: Date.now().toString(), // Simple ID generation
      type: type || 'direct',
      name: type === 'group' ? name : null,
      participants: type === 'direct' ? [req.mongoUserId, participantId] : [req.mongoUserId, ...req.body.participants],
      admins: type === 'group' ? [req.mongoUserId] : [],
      unreadCounts: []
    });
    
    // Initialize unread counts for all participants
    newChat.participants.forEach(participant => {
      newChat.unreadCounts.push({
        user: participant,
        count: 0
      });
    });
    
    await newChat.save();
    
    // Populate participant data
    const chat = await Chat.findById(newChat._id)
      .populate('participants', 'username avatar onlineStatus lastActive');
    
    res.status(201).json({ success: true, chat });
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   GET /api/chats/:chatId
 * @desc    Get a single chat by ID
 * @access  Private
 */
router.get('/:chatId', authenticate, getMongoUserId, async (req, res) => {
  try {
    const { chatId } = req.params;
    
    const chat = await Chat.findOne({
      _id: chatId,
      participants: req.mongoUserId,
      deletedFor: { $ne: req.mongoUserId }
    })
    .populate('participants', 'username avatar onlineStatus lastActive')
    .populate({
      path: 'lastMessage',
      populate: {
        path: 'sender',
        select: 'username avatar'
      }
    });
    
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }
    
    res.json({ success: true, chat });
  } catch (error) {
    console.error('Error getting chat:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   GET /api/chats/:chatId/messages
 * @desc    Get messages for a chat
 * @access  Private
 */
router.get('/:chatId/messages', authenticate, getMongoUserId, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { limit = 20, before } = req.query;
    
    // Verify user is part of this chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: req.mongoUserId,
      deletedFor: { $ne: req.mongoUserId }
    });
    
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }
    
    // Query messages
    let query = { chat: chatId };
    if (before) {
      query._id = { $lt: before };
    }
    
    const messages = await Message.find(query)
      .populate('sender', 'username avatar')
      .populate({
        path: 'replyTo',
        populate: {
          path: 'sender',
          select: 'username avatar'
        }
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    // Reset unread count for this user in this chat
    await Chat.updateOne(
      { _id: chatId, 'unreadCounts.user': req.mongoUserId },
      { $set: { 'unreadCounts.$.count': 0 } }
    );
    
    res.json({ success: true, messages: messages.reverse() });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   POST /api/chats/:chatId/messages
 * @desc    Send a message in a chat
 * @access  Private
 */
router.post('/:chatId/messages', authenticate, getMongoUserId, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, attachments, replyTo } = req.body;
    
    // Verify user is part of this chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: req.mongoUserId,
      deletedFor: { $ne: req.mongoUserId }
    });
    
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }
    
    // Require content or attachments
    if (!content && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Message content or attachments are required' 
      });
    }
    
    // Create new message
    const newMessage = new Message({
      chat: chatId,
      sender: req.mongoUserId,
      content,
      attachments: attachments || [],
      replyTo,
      status: 'sent',
      readBy: [req.mongoUserId] // Sender has read their own message
    });
    
    await newMessage.save();
    
    // Update chat's lastMessage
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: newMessage._id,
      updatedAt: new Date()
    });
    
    // Update unread counts for other participants
    await Chat.updateMany(
      { _id: chatId, 'unreadCounts.user': { $ne: req.mongoUserId } },
      { $inc: { 'unreadCounts.$.count': 1 } }
    );
    
    // Populate sender info for the response
    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'username avatar')
      .populate({
        path: 'replyTo',
        populate: {
          path: 'sender',
          select: 'username avatar'
        }
      });
    
    res.status(201).json({ success: true, message: populatedMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router; 