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
    // Also store PostgreSQL user for reference
    req.pgUser = pgUser;
    console.log('Successfully mapped PostgreSQL ID to MongoDB ID:', req.mongoUserId);
    next();
  } catch (error) {
    console.error('Error mapping user IDs:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Utility function to transform chat data for frontend consumption
 */
const transformChatForFrontend = async (chat, currentMongoUserId) => {
  // Transform to plain object if it's a Mongoose document
  const chatObj = chat.toObject ? chat.toObject() : { ...chat };
  
  // Transform participants to include PostgreSQL IDs and full user data
  const transformedParticipants = await Promise.all(
    chatObj.participants.map(async (participant) => {
      try {
        // Find MongoDB user first
        const mongoUser = await MongoUser.findById(participant._id);
        if (!mongoUser) {
          console.log(`MongoDB user not found for ID: ${participant._id}`);
          return participant;
        }
        
        // Get PostgreSQL user details using email from MongoDB user
        const pgUser = await User.findOne({
          where: { email: mongoUser.email }
        });
        
        if (!pgUser) {
          console.log(`PostgreSQL user not found for email: ${mongoUser.email}`);
          return {
            ...participant,
            postgresId: null,
          };
        }
        
        // Return enhanced participant with PostgreSQL data
        return {
          ...participant,
          postgresId: pgUser.id,
          username: pgUser.username || participant.username,
          firstName: pgUser.firstName,
          lastName: pgUser.lastName,
          fullName: `${pgUser.firstName || ''} ${pgUser.lastName || ''}`.trim() || null,
          avatar: pgUser.avatar || null,
          bio: pgUser.bio || null
        };
      } catch (error) {
        console.error('Error transforming participant:', error);
        return participant;
      }
    })
  );
  
  // Transform lastMessage to be more frontend-friendly
  let transformedLastMessage = null;
  if (chatObj.lastMessage) {
    if (typeof chatObj.lastMessage === 'string') {
      // If it's just an ID reference, get the actual message
      const message = await Message.findById(chatObj.lastMessage)
        .populate('sender', 'username avatar');
      
      if (message) {
        transformedLastMessage = {
          _id: message._id,
          content: message.content,
          sender: message.sender,
          createdAt: message.createdAt
        };
      }
    } else {
      // It's already a populated message object
      transformedLastMessage = {
        _id: chatObj.lastMessage._id,
        content: chatObj.lastMessage.content,
        sender: chatObj.lastMessage.sender,
        createdAt: chatObj.lastMessage.createdAt
      };
    }
  }
  
  // Calculate unread count for current user
  const unreadCount = chatObj.unreadCounts?.find(
    count => count.user.toString() === currentMongoUserId
  )?.count || 0;
  
  return {
    ...chatObj,
    participants: transformedParticipants,
    lastMessage: transformedLastMessage,
    unreadCount
  };
};

/**
 * Utility function to transform message data for frontend consumption
 */
const transformMessageForFrontend = async (message) => {
  // Transform to plain object if it's a Mongoose document
  const msgObj = message.toObject ? message.toObject() : { ...message };
  
  // Add PostgreSQL ID to sender if possible
  if (msgObj.sender && msgObj.sender._id) {
    try {
      const mongoUser = await MongoUser.findById(msgObj.sender._id);
      if (mongoUser) {
        const pgUser = await User.findOne({
          where: { email: mongoUser.email }
        });
        
        if (pgUser) {
          // Enhance sender with full PostgreSQL user data
          msgObj.sender = {
            ...msgObj.sender,
            postgresId: pgUser.id,
            username: pgUser.username || msgObj.sender.username,
            firstName: pgUser.firstName,
            lastName: pgUser.lastName,
            fullName: `${pgUser.firstName || ''} ${pgUser.lastName || ''}`.trim() || null,
            avatar: pgUser.avatar || null,
            bio: pgUser.bio || null
          };
        }
      }
    } catch (error) {
      console.error('Error transforming message sender:', error);
    }
  }
  
  return msgObj;
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
    .populate('participants', 'username avatar onlineStatus lastActive email')
    .populate({
      path: 'lastMessage',
      populate: {
        path: 'sender',
        select: 'username avatar email'
      }
    })
    .sort({ updatedAt: -1 });
    
    // Transform chats for frontend consumption
    const transformedChats = await Promise.all(
      chats.map(chat => transformChatForFrontend(chat, req.mongoUserId))
    );
    
    res.json({ success: true, chats: transformedChats });
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
    
    console.log('Getting MongoDB user for PostgreSQL participant ID:', participantId);
    
    // First get the PostgreSQL user to get email
    const participantPgUser = await User.findByPk(participantId);
    
    if (!participantPgUser) {
      console.error('PostgreSQL participant not found with ID:', participantId);
      return res.status(404).json({ 
        success: false, 
        message: 'Participant not found' 
      });
    }
    
    // Find MongoDB user by email
    const participantMongoUser = await MongoUser.findOne({ email: participantPgUser.email });
    
    if (!participantMongoUser) {
      console.error('MongoDB participant not found for email:', participantPgUser.email);
      return res.status(404).json({ 
        success: false, 
        message: 'Participant not found in chat system. They may need to login first.' 
      });
    }
    
    const participantMongoId = participantMongoUser._id.toString();
    console.log('Successfully mapped participant PostgreSQL ID to MongoDB ID:', participantMongoId);
    
    // For direct chats, check if one already exists
    if (type === 'direct') {
      // Generate unique identifier for this participant pair
      const uniqueId = [req.mongoUserId, participantMongoId].sort().join('_');
      console.log('Generated unique pair identifier:', uniqueId);
      
      const existingChat = await Chat.findOne({
        type: 'direct',
        uniquePairIdentifier: uniqueId
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
      // Sort participant IDs for consistent order to prevent duplicate key issues
      participants: type === 'direct' 
        ? [req.mongoUserId, participantMongoId].sort() 
        : [req.mongoUserId, ...req.body.participants].sort(),
      // Also store PostgreSQL IDs for easy reference, maintaining same order as participants
      postgresParticipantIds: type === 'direct' 
        ? [req.user.id, participantId].sort() 
        : [req.user.id, ...req.body.postgresParticipantIds].sort(),
      admins: type === 'group' ? [req.mongoUserId] : [],
      unreadCounts: []
    });
    
    // Set uniquePairIdentifier for direct chats to ensure uniqueness
    if (type === 'direct') {
      newChat.uniquePairIdentifier = [req.mongoUserId, participantMongoId].sort().join('_');
    }
    
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
      .populate('sender', 'username avatar email')
      .populate({
        path: 'replyTo',
        populate: {
          path: 'sender',
          select: 'username avatar email'
        }
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    // Reset unread count for this user in this chat
    await Chat.updateOne(
      { _id: chatId, 'unreadCounts.user': req.mongoUserId },
      { $set: { 'unreadCounts.$.count': 0 } }
    );
    
    // Transform messages for frontend consumption
    const transformedMessages = await Promise.all(
      messages.map(message => transformMessageForFrontend(message))
    );
    
    res.json({ success: true, messages: transformedMessages.reverse() });
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
      .populate('sender', 'username avatar email')
      .populate({
        path: 'replyTo',
        populate: {
          path: 'sender',
          select: 'username avatar email'
        }
      });
    
    // Transform the message for frontend consumption
    const transformedMessage = await transformMessageForFrontend(populatedMessage);
    
    res.status(201).json({ success: true, message: transformedMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router; 