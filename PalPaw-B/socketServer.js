import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Chat, Message, MongoUser, User } from './models/index.js';

// Import models to ensure schema definitions are loaded
import './models/Chat.js';
import './models/Message.js';
import './models/MongoUser.js';

/**
 * Sets up the Socket.io server for real-time chat
 * @param {Object} server - HTTP server instance
 * @returns {Object} Socket.io instance
 */
function setupSocketServer(server) {
  console.log('🚀 SocketServer: Initializing Socket.io server...');
  
  const io = new Server(server, {
    cors: {
      origin: '*', // In production, restrict to your app's domain
      methods: ['GET', 'POST']
    }
  });
  
  console.log('✅ SocketServer: Socket.io instance created with CORS settings:', {
    origin: '*',
    methods: ['GET', 'POST']
  });

  // Middleware to authenticate socket connections using JWT
  io.use(async (socket, next) => {
    console.log('🔄 SocketServer: Authentication middleware executing for new connection...');
    console.log('🔍 SocketServer: Connection info - transport:', socket.conn.transport.name);
    
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      console.error('❌ SocketServer: No auth token provided in handshake');
      console.log('📋 SocketServer: Handshake data:', {
        headers: socket.handshake.headers,
        query: socket.handshake.query,
        auth: socket.handshake.auth
      });
      return next(new Error('Authentication required'));
    }
    
    console.log('🔑 SocketServer: Token received, length:', token.length);
    console.log('🔒 SocketServer: Using JWT_SECRET from env:', process.env.JWT_SECRET ? 'Available' : 'Not available (using default)');
    
    try {
      // Verify JWT token (use your actual JWT secret)
      console.log('🔍 SocketServer: Verifying JWT token...');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
      console.log('✅ SocketServer: JWT verification successful, decoded payload:', { id: decoded.id });
      
      // This is the PostgreSQL user ID from the token
      const pgUserId = decoded.id;
      socket.pgUserId = pgUserId;
      
      // Find or create MongoDB user based on PostgreSQL user
      try {
        // Get PostgreSQL user first to get email
        console.log('🔍 SocketServer: Fetching PostgreSQL user with ID:', pgUserId);
        const pgUser = await User.findByPk(pgUserId);
        
        if (!pgUser) {
          console.error('❌ SocketServer: PostgreSQL user not found with ID:', pgUserId);
          return next(new Error('User not found'));
        }
        
        console.log('✅ SocketServer: PostgreSQL user found:', { email: pgUser.email, username: pgUser.username });
        
        // Find MongoDB user by email
        console.log('🔍 SocketServer: Looking for MongoDB user with email:', pgUser.email);
        let mongoUser = await MongoUser.findOne({ email: pgUser.email });
        
        if (!mongoUser) {
          console.log('⚠️ SocketServer: MongoDB user not found, creating new user for:', pgUser.email);
          // Create MongoDB user if not exists
          mongoUser = new MongoUser({
            postgresId: pgUser.id,
            email: pgUser.email,
            onlineStatus: 'offline',
            lastActive: new Date()
          });
          
          await mongoUser.save();
          console.log('✅ SocketServer: Created MongoDB user for', pgUser.email, 'with ID:', mongoUser._id.toString());
        } else {
          console.log('✅ SocketServer: Found MongoDB user with ID:', mongoUser._id.toString());
        }
        
        // Set MongoDB user ID on socket
        socket.userId = mongoUser._id.toString();
        console.log('🔗 SocketServer: Authentication successful, proceeding with connection');
        next();
      } catch (error) {
        console.error('❌ SocketServer: Error finding/creating MongoDB user:', error);
        console.error('🔍 SocketServer: Error stack:', error.stack);
        next(new Error('Error processing user authentication'));
      }
    } catch (err) {
      console.error('❌ SocketServer: JWT validation failed:', err.message);
      console.error('🔍 SocketServer: Error details:', err);
      next(new Error('Invalid authentication token'));
    }
  });

  // Store user socket mappings for multiple devices/tabs
  const userSockets = new Map();

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    
    console.log(`🎉 SocketServer: User connected: ${userId}, socket.id: ${socket.id}`);
    
    // Store socket reference for this user (supports multiple connections per user)
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
      console.log(`📝 SocketServer: Created new socket set for user ${userId}`);
    }
    userSockets.get(userId).add(socket.id);
    console.log(`📊 SocketServer: User ${userId} now has ${userSockets.get(userId).size} active connections`);
    
    try {
      // Update user's online status
      console.log(`🔄 SocketServer: Updating ${userId} status to online`);
      await MongoUser.findByIdAndUpdate(userId, {
        onlineStatus: 'online',
        lastActive: new Date()
      });
      
      // Broadcast to users who have chats with this user that they're online
      console.log(`📡 SocketServer: Finding chats for user ${userId} to broadcast online status`);
      const userChats = await Chat.find({ participants: userId });
      console.log(`📋 SocketServer: Found ${userChats.length} chats for user ${userId}`);
      
      // Get unique participants from all user chats
      const chatParticipants = new Set();
      userChats.forEach(chat => {
        chat.participants.forEach(participantId => {
          if (participantId.toString() !== userId) {
            chatParticipants.add(participantId.toString());
          }
        });
      });
      
      console.log(`👥 SocketServer: Broadcasting status to ${chatParticipants.size} unique participants`);
      
      // Emit online status to all relevant users
      for (const participantId of chatParticipants) {
        if (userSockets.has(participantId)) {
          const participantSocketIds = userSockets.get(participantId);
          console.log(`📤 SocketServer: Emitting status to ${participantId} across ${participantSocketIds.size} connections`);
          
          for (const socketId of participantSocketIds) {
            io.to(socketId).emit('user_status_change', {
              userId,
              status: 'online'
            });
          }
        } else {
          console.log(`📝 SocketServer: Participant ${participantId} not currently connected`);
        }
      }
    } catch (error) {
      console.error('❌ SocketServer: Error updating user status:', error);
      console.error('🔍 SocketServer: Error stack:', error.stack);
    }
    
    // Join user's personal room for direct messages
    socket.join(userId);
    console.log(`🔗 SocketServer: User ${userId} joined personal room`);
    
    // Join all chat rooms user is part of
    try {
      console.log(`🔍 SocketServer: Finding chats to join for user ${userId}`);
      const userChats = await Chat.find({ participants: userId });
      console.log(`📋 SocketServer: User will join ${userChats.length} chat rooms`);
      
      userChats.forEach(chat => {
        const roomName = `chat:${chat._id}`;
        socket.join(roomName);
        console.log(`🔗 SocketServer: User ${userId} joined room ${roomName}`);
      });
    } catch (error) {
      console.error('❌ SocketServer: Error joining chat rooms:', error);
      console.error('🔍 SocketServer: Error stack:', error.stack);
    }
    
    // Handle explicit chat room joining
    socket.on('join_chat', async (data) => {
      const { chatId } = data;
      console.log(`📢 SocketServer: User ${userId} requesting to join room chat:${chatId}`);
      
      if (!chatId) {
        console.error('❌ SocketServer: No chat ID provided for join_chat event');
        return;
      }
      
      try {
        // Verify user is part of this chat
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.includes(userId)) {
          console.error(`❌ SocketServer: User ${userId} is not authorized to join chat ${chatId}`);
          socket.emit('error', { message: 'Not authorized to join this chat' });
          return;
        }
        
        const roomName = `chat:${chatId}`;
        socket.join(roomName);
        console.log(`✅ SocketServer: User ${userId} explicitly joined room ${roomName}`);
        
        // Emit a confirmation back to the client
        socket.emit('joined_chat', { 
          chatId, 
          success: true,
          message: `Successfully joined chat ${chatId}`
        });
      } catch (error) {
        console.error(`❌ SocketServer: Error joining chat ${chatId}:`, error);
        socket.emit('error', { message: 'Failed to join chat room' });
      }
    });
    
    // Handle sending messages
    socket.on('send_message', async (data) => {
      console.log(`📨 SocketServer: Message received from ${userId} for chat ${data.chatId}`);
      try {
        const { chatId, content, attachments, replyTo } = data;
        
        // Verify user is part of this chat
        console.log(`🔍 SocketServer: Verifying user ${userId} is part of chat ${chatId}`);
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.includes(userId)) {
          console.error(`❌ SocketServer: User ${userId} is not authorized for chat ${chatId}`);
          socket.emit('error', { message: 'Not authorized to send message to this chat' });
          return;
        }
        
        // Process attachments if any (save files to disk)
        let processedAttachments = [];
        if (attachments && attachments.length > 0) {
          console.log(`🖼️ SocketServer: Processing ${attachments.length} attachments`);
          
          // Import required utils
          const { saveBase64FileForChat, processLocalFileForChat, getChatMediaUrl } = await import('./utils/chatMediaUtils.js');
          
          // Process each attachment
          for (const attachment of attachments) {
            try {
              console.log(`🔍 SocketServer: Processing attachment of type ${attachment.type}`);
              
              // Check if this is a file:// URI from mobile
              if (attachment.url && (attachment.url.startsWith('file://') || 
                                     attachment.url.startsWith('content://'))) {
                // For mobile file URIs, client should provide the entire file content as base64 in a data field
                if (attachment.data) {
                  // File content provided in base64, save it
                  console.log(`💾 SocketServer: Saving base64 file data from mobile URI`);
                  const fileInfo = await saveBase64FileForChat(
                    attachment.data, 
                    chatId, 
                    attachment.name || `file-${Date.now()}`, 
                    attachment.mimeType || 'application/octet-stream'
                  );
                  
                  // Add processed attachment with server URL
                  processedAttachments.push({
                    type: attachment.type,
                    url: fileInfo.url,
                    name: attachment.name || fileInfo.filename,
                    size: fileInfo.size,
                    mimeType: attachment.mimeType
                  });
                  
                  console.log(`✅ SocketServer: File saved to ${fileInfo.url}`);
                } else {
                  console.warn(`⚠️ SocketServer: Mobile file URI provided without file data, using original URI: ${attachment.url.substring(0, 50)}...`);
                  // Just pass through the attachment as-is, client will need to handle display
                  processedAttachments.push(attachment);
                }
              } 
              // Check if it's a base64 data URI
              else if (attachment.data && attachment.data.startsWith('data:')) {
                console.log(`💾 SocketServer: Saving base64 data URI`);
                const fileInfo = await saveBase64FileForChat(
                  attachment.data,
                  chatId,
                  attachment.name || `file-${Date.now()}`,
                  attachment.mimeType || attachment.data.split(';')[0].split(':')[1]
                );
                
                // Add processed attachment with server URL
                processedAttachments.push({
                  type: attachment.type,
                  url: fileInfo.url,
                  name: attachment.name || fileInfo.filename,
                  size: fileInfo.size,
                  mimeType: attachment.mimeType || attachment.data.split(';')[0].split(':')[1]
                });
                
                console.log(`✅ SocketServer: File saved to ${fileInfo.url}`);
              }
              // If it's already a server URL, keep it as is
              else if (attachment.url && (attachment.url.startsWith('/') || 
                                        attachment.url.startsWith('http'))) {
                console.log(`📝 SocketServer: Using existing URL: ${attachment.url}`);
                processedAttachments.push(attachment);
              }
              // For other cases, use the attachment as-is
              else {
                console.log(`📝 SocketServer: Using attachment as-is: ${JSON.stringify(attachment)}`);
                processedAttachments.push(attachment);
              }
            } catch (attachError) {
              console.error(`❌ SocketServer: Error processing attachment:`, attachError);
              // Continue with other attachments even if one fails
            }
          }
          
          console.log(`✅ SocketServer: Processed ${processedAttachments.length} attachments`);
        }
        
        // Create new message with processed attachments
        console.log(`📝 SocketServer: Creating new message in chat ${chatId}`);
        const newMessage = new Message({
          chat: chatId,
          sender: userId,
          senderPostgresId: socket.pgUserId,
          content,
          attachments: processedAttachments,
          replyTo,
          status: 'sent',
          readBy: [userId] // Sender has read their own message
        });
        
        await newMessage.save();
        console.log(`✅ SocketServer: Message saved with ID ${newMessage._id}`);
        
        // Update chat's lastMessage and timestamp
        console.log(`🔄 SocketServer: Updating chat ${chatId} with new last message`);
        await Chat.findByIdAndUpdate(chatId, {
          lastMessage: newMessage._id,
          updatedAt: new Date()
        });
        
        // Update unread counts for other participants
        console.log(`🔄 SocketServer: Incrementing unread counts for other participants`);
        await Chat.updateMany(
          { _id: chatId, 'unreadCounts.user': { $ne: userId } },
          { $inc: { 'unreadCounts.$.count': 1 } }
        );
        
        // Populate sender info for the response
        console.log(`🔍 SocketServer: Populating sender info for message ${newMessage._id}`);
        const populatedMessage = await Message.findById(newMessage._id)
          .populate('sender', 'username avatar postgresId');
        
        // Ensure we have the PostgreSQL user data for avatar
        const pgUser = await User.findByPk(socket.pgUserId);
        if (pgUser && populatedMessage.sender) {
          // Add PostgreSQL user data to the message before emitting
          populatedMessage.sender.postgresId = socket.pgUserId;
          populatedMessage.sender.username = pgUser.username || populatedMessage.sender.username;
          populatedMessage.sender.avatar = pgUser.avatar || null;
          populatedMessage.sender.firstName = pgUser.firstName || null;
          populatedMessage.sender.lastName = pgUser.lastName || null; 
          populatedMessage.sender.fullName = `${pgUser.firstName || ''} ${pgUser.lastName || ''}`.trim() || null;
          
          console.log('🖼️ SocketServer: PostgreSQL user info for avatar:', {
            id: pgUser.id,
            avatar: pgUser.avatar,
            username: pgUser.username
          });
        }
        
        // Emit to all users in the chat room
        console.log(`📡 SocketServer: Broadcasting message to room chat:${chatId}`);
        io.to(`chat:${chatId}`).emit('new_message', populatedMessage);
      } catch (error) {
        console.error('❌ SocketServer: Error sending message:', error);
        console.error('🔍 SocketServer: Error stack:', error.stack);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
    
    // Handle typing indicators
    socket.on('typing', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('typing', { userId, chatId });
    });
    
    // Handle stop typing
    socket.on('stop_typing', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('stop_typing', { userId, chatId });
    });
    
    // Handle marking messages as read
    socket.on('mark_read', async ({ chatId, messageId }) => {
      try {
        // Mark all messages up to this message as read by this user
        await Message.updateMany(
          { 
            chat: chatId,
            _id: { $lte: messageId },
            readBy: { $ne: userId }
          },
          { 
            $addToSet: { readBy: userId },
            $set: { status: 'read' }
          }
        );
        
        // Reset unread count for this user in this chat
        await Chat.updateOne(
          { _id: chatId, 'unreadCounts.user': userId },
          { $set: { 'unreadCounts.$.count': 0 } }
        );
        
        // Notify other participants about read status
        socket.to(`chat:${chatId}`).emit('messages_read', {
          userId,
          chatId,
          messageId
        });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });
    
    // Handle user going offline temporarily (away status)
    socket.on('away', async () => {
      try {
        await MongoUser.findByIdAndUpdate(userId, {
          onlineStatus: 'away',
          lastActive: new Date()
        });
        
        // Broadcast status change to relevant users
        broadcastStatusChange(userId, 'away');
      } catch (error) {
        console.error('Error setting away status:', error);
      }
    });
    
    // Handle heartbeats to detect active users
    socket.on('heartbeat', async () => {
      try {
        await MongoUser.findByIdAndUpdate(userId, {
          lastActive: new Date()
        });
      } catch (error) {
        console.error('Error updating last active time:', error);
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      console.log(`👋 SocketServer: User disconnected: ${userId}, reason: ${reason}, socket.id: ${socket.id}`);
      
      // Remove this socket from user's set of active sockets
      const userSocketSet = userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        console.log(`📊 SocketServer: Removed socket from user ${userId}, remaining connections: ${userSocketSet.size}`);
        
        // If user has no more active connections, mark as offline
        if (userSocketSet.size === 0) {
          userSockets.delete(userId);
          console.log(`📝 SocketServer: User ${userId} has no more connections, marking as offline`);
          
          try {
            await MongoUser.findByIdAndUpdate(userId, {
              onlineStatus: 'offline',
              lastActive: new Date()
            });
            console.log(`✅ SocketServer: Updated ${userId} status to offline`);
            
            // Broadcast offline status to relevant users
            broadcastStatusChange(userId, 'offline');
          } catch (error) {
            console.error('❌ SocketServer: Error updating offline status:', error);
            console.error('🔍 SocketServer: Error stack:', error.stack);
          }
        }
      }
    });
  });
  
  // Listen for server errors
  io.engine.on('connection_error', (err) => {
    console.error('❌ SocketServer: Connection transport error:', err);
    console.error('🔍 SocketServer: Error code:', err.code);
    console.error('🔍 SocketServer: Error message:', err.message);
    console.error('🔍 SocketServer: Error context:', err.context);
  });
  
  console.log('✅ SocketServer: Socket.io server setup complete');
  return io;
}

export default setupSocketServer; 