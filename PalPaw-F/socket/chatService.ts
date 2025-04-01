import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import api from '../utils/apiClient';
import { uploadMediaFile } from '../utils/mediaUtils';
import { Alert } from 'react-native';

// Define types for message and events
interface Message {
  _id: string;
  chat: string;
  sender: {
    _id: string;
    postgresId?: string;
    username: string;
    avatar?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    bio?: string;
  };
  content: string;
  attachments?: any[];
  createdAt: string;
  readBy: string[];
  status: 'sent' | 'delivered' | 'read';
  replyTo?: string;
}

// Define MediaAttachment type
interface MediaAttachment {
  type: string;
  url: string;
  name?: string;
  size: number;
  mimeType: string;
  data?: string; // Base64 data
}

interface UserStatusData {
  userId: string;
  status: 'online' | 'offline' | 'away';
}

interface TypingData {
  userId: string;
  chatId: string;
}

interface MessageReadData {
  userId: string;
  chatId: string;
  messageId: string;
}

interface Listeners {
  onNewMessage?: (message: Message) => void;
  onTyping?: (userId: string, chatId: string) => void;
  onStopTyping?: (userId: string, chatId: string) => void;
  onMessagesRead?: (userId: string, chatId: string, messageId: string) => void;
  onUserStatusChange?: (userId: string, status: string) => void;
  [key: string]: ((...args: any[]) => void) | undefined;
}

// File size threshold for socket.io (0.9MB)
const FILE_SIZE_THRESHOLD = 500 * 1024; // 900KB in bytes

/**
 * Converts a file:// URI to base64 encoded data
 * @param fileUri Local file URI to convert
 */
const fileToBase64 = async (fileUri: string): Promise<string | null> => {
  try {
    // Only process file:// URIs, which are local files
    if (!fileUri.startsWith('file://')) {
      console.log('ChatService: Not a file URI, skipping base64 conversion');
      return null;
    }

    // Normalize the file URI to prevent double slashes
    const normalizedUri = fileUri.replace(/file:\/\/\/+/g, 'file:///');
    console.log(`ChatService: Normalized URI: ${normalizedUri.substring(0, 30)}...`);
    
    // Read the file as base64
    console.log(`ChatService: Reading file as base64: ${normalizedUri.substring(0, 30)}...`);
    const base64 = await FileSystem.readAsStringAsync(normalizedUri, {
      encoding: FileSystem.EncodingType.Base64
    });

    // Return base64 data
    return base64;
  } catch (error) {
    console.error('Error converting file to base64:', error);
    return null;
  }
};

/**
 * Prepares attachments for sending to server by adding base64 data for local files
 * @param attachments Array of media attachments
 */
const prepareAttachmentsForSending = async (attachments: MediaAttachment[]): Promise<MediaAttachment[]> => {
  if (!attachments || attachments.length === 0) {
    return [];
  }

  console.log(`ChatService: Preparing ${attachments.length} attachments for sending`);
  
  const preparedAttachments = await Promise.all(
    attachments.map(async (attachment) => {
      // Skip if not a local file or already has base64 data
      if (!attachment.url.startsWith('file://') || attachment.data) {
        return attachment;
      }

      try {
        const base64Data = await fileToBase64(attachment.url);
        if (base64Data) {
          // Return a new object with all existing properties plus the base64 data
          return {
            ...attachment,
            data: base64Data
          };
        }
      } catch (error) {
        console.error(`ChatService: Error processing attachment ${attachment.url}:`, error);
      }

      // If conversion fails, return the original attachment
      return attachment;
    })
  );

  console.log(`ChatService: Finished preparing attachments, ${preparedAttachments.length} prepared`);
  return preparedAttachments;
};

class ChatService {
  private socket: Socket | null = null;
  private listeners: Listeners = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000; // 3 seconds
  private isConnecting: boolean = false;
  private messageListeners: Array<(message: any) => void> = [];
  private statusListeners: Array<(data: any) => void> = [];
  private connectionStatusListeners: Array<(status: boolean) => void> = [];
  
  // API URL - replace with your actual server URL
  private apiUrl = 'http://192.168.2.11:5001'

  // Singleton instance
  private static instance: ChatService;
  
  private constructor() {
    console.log('📱 ChatService: Constructor called - initializing service');
  }
  
  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
      console.log('📱 ChatService: Created new singleton instance');
    }
    return ChatService.instance;
  }
  
  /**
   * Connect to the socket server with JWT auth
   */
  public async connect(): Promise<boolean> {
    console.log('🔄 ChatService: Connection attempt started');
    
    if (this.socket?.connected) {
      console.log('✅ ChatService: Already connected, returning true');
      return true;
    }
    
    if (this.isConnecting) {
      console.log('⏱️ ChatService: Connection already in progress, returning');
      return false;
    }
    
    this.isConnecting = true;
    
    try {
      console.log('🔑 ChatService: Getting authentication token');
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.error('❌ ChatService: No auth token available - cannot connect');
        this.isConnecting = false;
        return false;
      }
      
      console.log('🔍 ChatService: Token retrieved, length:', token.length);
      
      const connectionOptions = {
        auth: { token },
        query: { token }, // Fallback for servers that check query param
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000
      };
      
      console.log(`🔌 ChatService: Connecting to socket server at ${this.apiUrl} with options:`, {
        reconnection: connectionOptions.reconnection,
        reconnectionAttempts: connectionOptions.reconnectionAttempts,
        timeout: connectionOptions.timeout
      });
      
      this.socket = io(this.apiUrl, connectionOptions);
      
      return new Promise((resolve, reject) => {
        // Set a timeout in case connection hangs
        const connectionTimeout = setTimeout(() => {
          console.error('⏱️ ChatService: Connection timed out after 10 seconds');
          this.isConnecting = false;
          
          if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
          }
          
          resolve(false);
        }, 10000);
        
        // Connection established
        this.socket?.on('connect', () => {
          console.log('🎉 ChatService: Socket connected successfully, id:', this.socket?.id);
          this.isConnecting = false;
          clearTimeout(connectionTimeout);
          
          this.notifyConnectionStatus(true);
          
          // Set up reconnection handling
          this.setupReconnection();
          
          // Set up event listeners
          this.setupEventListeners();
          
          resolve(true);
        });
        
        // Connection error
        this.socket?.on('connect_error', (error) => {
          console.error('❌ ChatService: Connection error:', error.message);
          console.error('🔍 ChatService: Error details:', error);
          
          this.isConnecting = false;
          clearTimeout(connectionTimeout);
          
          // Check if it's an auth error
          if (error.message.includes('auth')) {
            console.error('🔒 ChatService: Authentication error - token may be invalid');
          }
          
          this.notifyConnectionStatus(false);
          reject(error);
        });
      });
    } catch (error) {
      console.error('❌ ChatService: Error during connection setup:', error);
      this.isConnecting = false;
      return false;
    }
  }
  
  private setupReconnection(): void {
    console.log('🔄 ChatService: Setting up reconnection handling');
    
    this.socket?.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 ChatService: Reconnection attempt #${attemptNumber}`);
    });
    
    this.socket?.on('reconnect', (attemptNumber) => {
      console.log(`✅ ChatService: Reconnected after ${attemptNumber} attempts`);
      this.notifyConnectionStatus(true);
    });
    
    this.socket?.on('reconnect_error', (error) => {
      console.error('❌ ChatService: Reconnection error:', error);
    });
    
    this.socket?.on('reconnect_failed', () => {
      console.error('❌ ChatService: Failed to reconnect after maximum attempts');
      this.notifyConnectionStatus(false);
    });
  }
  
  private setupEventListeners(): void {
    console.log('🎧 ChatService: Setting up event listeners');
    
    // Receive new messages
    this.socket?.on('new_message', (message) => {
      console.log('📨 ChatService: Received new message:', { 
        chatId: message.chat,
        messageId: message._id,
        senderId: message.sender?._id || 'unknown',
        senderUsername: message.sender?.username || 'unknown',
        senderPostgresId: message.sender?.postgresId || 'unknown',
        hasAvatar: !!message.sender?.avatar,
        avatarUrl: message.sender?.avatar?.substring(0, 30) + (message.sender?.avatar?.length > 30 ? '...' : ''),
        content: message.content.substring(0, 20) + (message.content.length > 20 ? '...' : '')
      });
      
      this.messageListeners.forEach(listener => listener(message));
    });
    
    // User status changes
    this.socket?.on('user_status_change', (data) => {
      console.log('👤 ChatService: User status change:', data);
      this.statusListeners.forEach(listener => listener(data));
    });
    
    // Handle typing indicators
    this.socket?.on('typing', (data) => {
      console.log('✏️ ChatService: User typing:', data);
      if (this.listeners.onTyping) {
        this.listeners.onTyping(data.userId, data.chatId);
      }
    });
    
    // Handle stop typing
    this.socket?.on('stop_typing', (data) => {
      console.log('✏️ ChatService: User stopped typing:', data);
      if (this.listeners.onStopTyping) {
        this.listeners.onStopTyping(data.userId, data.chatId);
      }
    });
    
    // Handle messages read
    this.socket?.on('messages_read', (data) => {
      console.log('👁️ ChatService: Messages marked as read:', data);
      if (this.listeners.onMessagesRead) {
        this.listeners.onMessagesRead(data.userId, data.chatId, data.messageId);
      }
    });
    
    // Handle server errors
    this.socket?.on('error', (error) => {
      console.error('❌ ChatService: Server error:', error);
    });
    
    // Handle joined chat confirmation
    this.socket?.on('joined_chat', (data) => {
      console.log('🔗 ChatService: Joined chat confirmation:', data);
    });
    
    // Disconnection
    this.socket?.on('disconnect', (reason) => {
      console.log(`❌ ChatService: Disconnected, reason: ${reason}`);
      
      if (reason === 'io server disconnect') {
        // Server disconnected us, need to reconnect manually
        console.log('🔌 ChatService: Server initiated disconnect, attempting manual reconnect');
        this.connect();
      }
      
      this.notifyConnectionStatus(false);
    });
  }
  
  /**
   * Send a message to a chat
   */
  public async sendMessage(chatId: string, content: string, attachments: MediaAttachment[] = [], replyTo?: string): Promise<void> {
    console.log('📤 ChatService: Sending message to chat:', chatId);
    
    if (!this.socket?.connected) {
      console.error('❌ ChatService: Cannot send message - not connected');
      this.tryReconnect();
      return;
    }
    
    try {
      // Log what the client is sending
      console.log(`ChatService: Attachments before processing:`, attachments.map(a => ({
        type: a.type,
        url: a.url.substring(0, 30) + (a.url.length > 30 ? '...' : ''),
        name: a.name,
        size: a.size,
        mimeType: a.mimeType,
        hasData: !!a.data
      })));
      
      // Check for large files that need to be uploaded via HTTP
      const largeAttachments = attachments.filter(a => a.size > FILE_SIZE_THRESHOLD);
      const standardAttachments = attachments.filter(a => a.size <= FILE_SIZE_THRESHOLD);
      
      // Upload large files via HTTP first
      const processedAttachments = [...await this.handleLargeAttachments(largeAttachments, chatId)];
      
      // Process standard attachments through socket
      if (standardAttachments.length > 0) {
        const standardProcessed = await prepareAttachmentsForSending(standardAttachments);
        processedAttachments.push(...standardProcessed);
      }
      
      console.log(`ChatService: Attachments after processing:`, processedAttachments.map(a => ({
        type: a.type,
        url: a.url.substring(0, 30) + (a.url.length > 30 ? '...' : ''),
        name: a.name,
        size: a.size,
        mimeType: a.mimeType,
        hasData: !!a.data,
        dataLength: a.data ? `${a.data.length} chars` : 'none'
      })));
      
      const messageData = {
        chatId,
        content,
        attachments: processedAttachments,
        replyTo
      };
      
      this.socket.emit('send_message', messageData, (response: any) => {
        if (response && response.error) {
          console.error('❌ ChatService: Error sending message:', response.error);
        } else {
          console.log('✅ ChatService: Message sent successfully');
        }
      });
    } catch (error) {
      console.error('❌ ChatService: Error preparing attachments:', error);
    }
  }
  
  /**
   * Handle large media attachments by uploading them via HTTP
   * @param attachments Array of large media attachments
   * @param chatId The ID of the chat the attachments are for
   * @returns Updated attachments with server URLs
   */
  private async handleLargeAttachments(attachments: MediaAttachment[], chatId: string): Promise<MediaAttachment[]> {
    if (attachments.length === 0) return [];
    
    console.log(`ChatService: Processing ${attachments.length} large attachments via HTTP upload`);
    
    const results = await Promise.all(
      attachments.map(async (attachment) => {
        try {
          // Only process local files
          if (!attachment.url.startsWith('file://')) {
            return attachment;
          }
          
          console.log(`ChatService: Uploading large file (${Math.round(attachment.size/1024)}KB): ${attachment.name}`);
          
          // Upload via HTTP using the mediaUtils uploadMediaFile function
          const uploadResult = await uploadMediaFile({
            uri: attachment.url,
            type: attachment.mimeType,
            name: attachment.name || `file-${Date.now()}`
          }, chatId);
          
          console.log('ChatService: HTTP upload successful, server path:', uploadResult.path);
          
          // Return attachment with server URL instead of local file
          return {
            ...attachment,
            url: uploadResult.path,
            data: undefined, // Remove base64 data since we uploaded the file
            originalUrl: attachment.url, // Keep original URL for reference
            thumbnailUrl: uploadResult.thumbnail // Include thumbnail URL for videos if available
          };
        } catch (error) {
          console.error(`ChatService: Error uploading file ${attachment.name}:`, error);
          
          // Show an alert to the user
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          Alert.alert(
            "Upload Failed",
            `There was an error uploading your file: ${errorMessage}`,
            [{ text: "OK" }]
          );
          
          // Return original attachment if upload fails
          return attachment;
        }
      })
    );
    
    console.log(`ChatService: Finished processing large attachments, ${results.length} processed`);
    return results;
  }
  
  /**
   * Add listener for new messages
   */
  public onNewMessage(listener: (message: any) => void): void {
    this.messageListeners.push(listener);
    console.log('🔔 ChatService: Added new message listener, total:', this.messageListeners.length);
  }
  
  /**
   * Remove message listener
   */
  public removeMessageListener(listener: (message: any) => void): void {
    this.messageListeners = this.messageListeners.filter(l => l !== listener);
    console.log('🔕 ChatService: Removed message listener, remaining:', this.messageListeners.length);
  }
  
  /**
   * Add listener for user status changes
   */
  public onStatusChange(listener: (data: any) => void): void {
    this.statusListeners.push(listener);
    console.log('🔔 ChatService: Added status change listener, total:', this.statusListeners.length);
  }
  
  /**
   * Remove status change listener
   */
  public removeStatusListener(listener: (data: any) => void): void {
    this.statusListeners = this.statusListeners.filter(l => l !== listener);
    console.log('🔕 ChatService: Removed status listener, remaining:', this.statusListeners.length);
  }
  
  /**
   * Add connection status listener
   */
  public onConnectionStatusChange(listener: (status: boolean) => void): void {
    this.connectionStatusListeners.push(listener);
    
    // If we already have a socket, immediately notify of its current state
    if (this.socket) {
      listener(this.socket.connected);
    }
    
    console.log('🔔 ChatService: Added connection status listener, total:', this.connectionStatusListeners.length);
  }
  
  /**
   * Remove connection status listener
   */
  public removeConnectionStatusListener(listener: (status: boolean) => void): void {
    this.connectionStatusListeners = this.connectionStatusListeners.filter(l => l !== listener);
    console.log('🔕 ChatService: Removed connection status listener, remaining:', this.connectionStatusListeners.length);
  }
  
  /**
   * Notify all connection status listeners
   */
  private notifyConnectionStatus(status: boolean): void {
    console.log(`📢 ChatService: Notifying ${this.connectionStatusListeners.length} listeners of connection status: ${status}`);
    this.connectionStatusListeners.forEach(listener => listener(status));
  }
  
  /**
   * Check if socket is connected
   */
  public isConnected(): boolean {
    const connected = this.socket?.connected || false;
    console.log(`🔍 ChatService: Connection status check: ${connected ? 'connected' : 'disconnected'}`);
    return connected;
  }
  
  /**
   * Try to reconnect if not already connected
   */
  private tryReconnect(): void {
    if (!this.socket?.connected && !this.isConnecting) {
      console.log('🔄 ChatService: Attempting to reconnect');
      this.connect();
    }
  }
  
  /**
   * Set typing status in a chat
   */
  public setTyping(chatId: string, isTyping: boolean): void {
    console.log(`🔤 ChatService: Setting typing status in chat ${chatId} to ${isTyping}`);
    
    if (!this.socket?.connected) {
      console.error('❌ ChatService: Cannot set typing status - not connected');
      return;
    }
    
    // Use the correct event name as expected by the server
    if (isTyping) {
      this.socket.emit('typing', { chatId });
      console.log(`📤 ChatService: Emitted typing event for chat ${chatId}`);
    } else {
      this.socket.emit('stop_typing', { chatId });
      console.log(`📤 ChatService: Emitted stop_typing event for chat ${chatId}`);
    }
  }
  
  /**
   * Mark messages as read
   */
  public markMessagesRead(chatId: string): void {
    console.log(`👁️ ChatService: Marking messages as read in chat ${chatId}`);
    
    if (!this.socket?.connected) {
      console.error('❌ ChatService: Cannot mark messages as read - not connected');
      return;
    }
    
    this.socket.emit('mark_read', { chatId });
  }
  
  /**
   * Disconnect the socket
   */
  public disconnect(): void {
    console.log('👋 ChatService: Disconnecting socket');
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.notifyConnectionStatus(false);
  }
  
  /**
   * For testing only - get the raw socket
   */
  public getRawSocket(): Socket | null {
    return this.socket;
  }
}

// Export singleton instance
export default ChatService.getInstance();
