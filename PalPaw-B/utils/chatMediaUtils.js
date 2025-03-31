import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Save a base64 encoded file to the appropriate chat media directory
 * @param {string} base64Data - Base64 encoded file data (with or without data URI prefix)
 * @param {string} chatId - Chat ID to determine the storage folder
 * @param {string} filename - Original filename to preserve extension
 * @param {string} mimeType - MIME type of the file
 * @returns {Object} - Object containing the saved file information
 */
export const saveBase64FileForChat = async (base64Data, chatId, filename, mimeType) => {
  try {
    // Make sure the messages directory exists
    const messagesDir = path.join(process.cwd(), 'messages');
    if (!fs.existsSync(messagesDir)) {
      fs.mkdirSync(messagesDir, { recursive: true });
    }

    // Create chat-specific directory
    const chatDir = path.join(messagesDir, chatId);
    if (!fs.existsSync(chatDir)) {
      fs.mkdirSync(chatDir, { recursive: true });
    }

    // Remove the data URI prefix if present
    let cleanBase64 = base64Data;
    if (base64Data.includes(';base64,')) {
      cleanBase64 = base64Data.split(';base64,').pop();
    }

    // Get file extension from mime type or original filename
    let extension = '';
    if (filename && filename.includes('.')) {
      extension = path.extname(filename);
    } else if (mimeType) {
      // Extract extension from MIME type
      const mimeExtMap = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'video/mp4': '.mp4',
        'audio/mpeg': '.mp3',
        'audio/mp3': '.mp3',
        'application/pdf': '.pdf'
      };
      extension = mimeExtMap[mimeType] || '';
    }

    // Generate unique filename
    const uniqueFilename = `${uuidv4()}${extension}`;
    const filePath = path.join(chatDir, uniqueFilename);

    // Convert base64 to buffer and save
    const fileBuffer = Buffer.from(cleanBase64, 'base64');
    fs.writeFileSync(filePath, fileBuffer);

    // Calculate file size in bytes
    const fileSize = Buffer.byteLength(fileBuffer);

    // Generate URL path for the file
    const fileUrl = `/messages/${chatId}/${uniqueFilename}`;

    return {
      url: fileUrl,
      path: filePath,
      size: fileSize,
      filename: uniqueFilename
    };
  } catch (error) {
    console.error('Error saving chat media file:', error);
    throw error;
  }
};

/**
 * Save a file from a local path to the chat media directory
 * This is useful for mobile apps that provide file:// URIs
 * In a real-world scenario, you would need to use react-native-fetch-blob or similar
 * to extract the file data from the device and send it to the server
 * 
 * @param {string} localPath - Local file path or URI
 * @param {string} chatId - Chat ID to determine the storage folder
 * @param {string} filename - Original filename
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<Object>} - Object containing the saved file information
 */
export const processLocalFileForChat = async (attachment) => {
  const { url, name, mimeType, type, size } = attachment;
  
  // For now, just return the local file information
  // This would need to be modified to actually process files from mobile
  return {
    originalUrl: url,
    url: url,  // We're not actually processing the file yet
    name: name || 'file',
    size: size || 0,
    mimeType: mimeType,
    type: type
  };
};

/**
 * Generate a public URL for a chat media file
 * @param {string} fileUrl - Relative path to the file
 * @returns {string} - Complete URL for the file
 */
export const getChatMediaUrl = (fileUrl) => {
  // Check if it's already a complete URL
  if (fileUrl && (fileUrl.startsWith('http://') || fileUrl.startsWith('https://'))) {
    return fileUrl;
  }
  
  // Make sure the fileUrl starts with a slash
  const normalizedUrl = fileUrl && !fileUrl.startsWith('/') ? `/${fileUrl}` : fileUrl;
  
  // Return the complete URL
  const baseUrl = process.env.BASE_URL || 'http://192.168.2.11:5001';
  return normalizedUrl ? `${baseUrl}${normalizedUrl}` : null;
}; 