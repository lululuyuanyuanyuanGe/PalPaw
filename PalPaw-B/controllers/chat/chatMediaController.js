import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Chat, Message, User } from '../../models/index.js';
import { generateVideoThumbnail } from '../../utils/videoThumbnail.js';

/**
 * Uploads chat message attachments for large files
 * @route POST /api/chats/:chatId/upload
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const uploadChatAttachments = async (req, res) => {
  try {
    console.log('=== uploadChatAttachments called ===');
    console.log('Request method:', req.method);
    console.log('Content type:', req.headers['content-type']);
    console.log('Request has body:', !!req.body);
    console.log('Request has files:', !!req.files);
    console.log('Files array length:', req.files?.length || 0);
    console.log('Body keys:', Object.keys(req.body || {}));
    
    const chatId = req.params.chatId;
    const { content } = req.body;
    
    console.log(`Processing upload for chat ${chatId} with content: ${content || 'none'}`);
    
    // Check if files exist
    if (!req.files || req.files.length === 0) {
      console.error('❌ No files received in the request');
      console.error('Headers:', req.headers);
      return res.status(400).json({
        success: false,
        message: 'No files uploaded.'
      });
    }
    
    console.log(`Received ${req.files.length} files for chat ${chatId}`);
    
    // Get user ID from authenticated request
    const userId = req.user?.id;
    const mongoUserId = req.mongoUserId; // This should be set by the getMongoUserId middleware
    
    if (!userId || !mongoUserId) {
      return res.status(401).json({
        success: false,
        message: 'User ID not available for file upload'
      });
    }
    
    // Process files
    const attachments = [];
    
    // Create directory structure for chat attachments
    const chatMediaDir = path.join(process.cwd(), 'uploads', 'messages', chatId);
    if (!fs.existsSync(chatMediaDir)) {
      fs.mkdirSync(chatMediaDir, { recursive: true });
    }
    
    // Create thumbnails directory
    const thumbnailDir = path.join(process.cwd(), 'uploads', 'messages', chatId, 'thumbnails');
    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
    }
    
    // Process each file
    for (const file of req.files) {
      console.log(`Processing file: ${file.originalname}, size: ${Math.round(file.size / 1024)}KB, type: ${file.mimetype}`);
      
      // Get corresponding metadata
      const metadataKey = Object.keys(req.body).find(key => key.startsWith('fileMetadata') && key.replace('fileMetadata', '') === file.fieldname.replace('file', ''));
      const metadataStr = metadataKey ? req.body[metadataKey] : null;
      let metadata = {};
      
      if (metadataStr) {
        try {
          metadata = JSON.parse(metadataStr);
          console.log(`Metadata for file ${file.fieldname}:`, metadata);
        } catch (e) {
          console.error('Error parsing file metadata:', e);
        }
      }
      
      // Generate unique filename - make sure it has a proper extension
      let fileExtension = '';
      if (file.originalname && file.originalname.includes('.')) {
        fileExtension = file.originalname.split('.').pop();
      } else if (file.mimetype === 'image/jpeg') {
        fileExtension = 'jpg';
      } else if (file.mimetype === 'image/png') {
        fileExtension = 'png';
      } else if (file.mimetype === 'video/mp4') {
        fileExtension = 'mp4';
      }
      
      const uniqueFileName = `${uuidv4()}${fileExtension ? '.' + fileExtension : ''}`;
      const filePath = path.join(chatMediaDir, uniqueFileName);
      
      console.log(`Saving file to: ${filePath}`);
      
      // Write file to disk
      fs.writeFileSync(filePath, file.buffer);
      
      // Get the type from metadata or deduce from mimetype
      const fileType = metadata.type || 
        (file.mimetype.startsWith('image/') ? 'image' : 
         file.mimetype.startsWith('video/') ? 'video' : 'file');
      
      // Create URL for the file - this is what will be sent back to clients
      const fileUrl = `/uploads/messages/${chatId}/${uniqueFileName}`;
      
      console.log(`File saved successfully, URL: ${fileUrl}`);
      
      // Create the attachment object
      const attachment = {
        type: fileType,
        url: fileUrl,  // This is a server URL that will be publicly accessible
        originalUrl: fileUrl, // Keep a copy of the original URL
        name: file.originalname || uniqueFileName,
        size: file.size,
        mimeType: file.mimetype
      };
      
      // Validate fileType matches schema enum
      if (!['image', 'video', 'audio', 'file'].includes(fileType)) {
        attachment.type = 'file'; // Default to 'file' if unknown type
      }
      
      // Generate thumbnail for video files
      if (fileType === 'video') {
        try {
          // Generate unique thumbnail filename
          const thumbnailFilename = `thumbnail_${uuidv4()}.jpg`;
          const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);
          
          // Generate thumbnail (at 0 seconds into the video)
          await generateVideoThumbnail(filePath, thumbnailPath, 0, '320x240');
          
          // Add thumbnail URL to the attachment object using the correct field name
          attachment.thumbnailUrl = `/uploads/messages/${chatId}/thumbnails/${thumbnailFilename}`;
          console.log(`Created thumbnail at ${thumbnailPath} for video ${uniqueFileName}`);
        } catch (thumbnailError) {
          console.error('Error generating thumbnail:', thumbnailError);
          // Continue without thumbnail if generation fails
        }
      }
      
      // Add attachment to the array
      attachments.push(attachment);
      
      console.log(`Added attachment to message: type=${fileType}, url=${fileUrl}`);
    }
    
    // Get the socket.io instance from the Express app
    const io = req.app.get('socketio');
    
    if (!io) {
      console.error('Socket.io instance not available in uploadChatAttachments');
      return res.status(500).json({
        success: false,
        message: 'Error sending message: Socket.io not available'
      });
    }
    
    console.log('Socket.io instance successfully retrieved');
    
    // Get the user object from PostgreSQL for the message
    const pgUser = await User.findByPk(userId);
    
    // Create a new message
    const newMessage = new Message({
      chat: chatId,
      sender: mongoUserId,
      senderPostgresId: userId,
      content: content || '',
      attachments,
      status: 'sent',
      readBy: [mongoUserId] // Sender has read their own message
    });
    
    await newMessage.save();
    console.log(`Message saved with ID ${newMessage._id}`);
    
    // Update chat's lastMessage and timestamp
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: newMessage._id,
      updatedAt: new Date()
    });
    
    // Update unread counts for other participants
    await Chat.updateMany(
      { _id: chatId, 'unreadCounts.user': { $ne: mongoUserId } },
      { $inc: { 'unreadCounts.$.count': 1 } }
    );
    
    // Populate sender info for the response
    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'username avatar postgresId');
    
    // Ensure we have the PostgreSQL user data for avatar
    if (pgUser && populatedMessage.sender) {
      // Add PostgreSQL user data to the message before emitting
      populatedMessage.sender.postgresId = userId;
      populatedMessage.sender.username = pgUser.username || populatedMessage.sender.username;
      populatedMessage.sender.avatar = pgUser.avatar || null;
      populatedMessage.sender.firstName = pgUser.firstName || null;
      populatedMessage.sender.lastName = pgUser.lastName || null; 
      populatedMessage.sender.fullName = `${pgUser.firstName || ''} ${pgUser.lastName || ''}`.trim() || null;
      
      console.log('Populated sender info for message:', {
        id: populatedMessage.sender._id,
        postgresId: populatedMessage.sender.postgresId,
        username: populatedMessage.sender.username
      });
    }
    
    // Emit to all users in the chat room
    const roomName = `chat:${chatId}`;
    console.log(`Emitting new_message event to room ${roomName}`);
    io.to(roomName).emit('new_message', populatedMessage);
    
    // Return success response
    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      messageId: newMessage._id,
      attachments
    });
    
  } catch (error) {
    console.error('Error in uploadChatAttachments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading attachments',
      error: error.message
    });
  }
}; 