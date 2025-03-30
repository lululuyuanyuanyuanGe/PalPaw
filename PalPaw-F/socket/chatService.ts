import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define types for message and events
interface Message {
  _id: string;
  chat: string;
  sender: {
    _id: string;
    username: string;
    avatar?: string;
  };
  content: string;
  attachments?: any[];
  createdAt: string;
  readBy: string[];
  status: 'sent' | 'delivered' | 'read';
  replyTo?: string;
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
        senderId: message.sender?._id || message.sender,
        content: message.content.substring(0, 20) + (message.content.length > 20 ? '...' : '')
      });
      
      this.messageListeners.forEach(listener => listener(message));
    });
    
    // User status changes
    this.socket?.on('user_status_change', (data) => {
      console.log('👤 ChatService: User status change:', data);
      this.statusListeners.forEach(listener => listener(data));
    });
    
    // Handle server errors
    this.socket?.on('error', (error) => {
      console.error('❌ ChatService: Server error:', error);
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
  public sendMessage(chatId: string, content: string, attachments: any[] = [], replyTo?: string): void {
    console.log('📤 ChatService: Sending message to chat:', chatId);
    
    if (!this.socket?.connected) {
      console.error('❌ ChatService: Cannot send message - not connected');
      this.tryReconnect();
      return;
    }
    
    const messageData = {
      chatId,
      content,
      attachments,
      replyTo
    };
    
    this.socket.emit('send_message', messageData, (response: any) => {
      if (response && response.error) {
        console.error('❌ ChatService: Error sending message:', response.error);
      } else {
        console.log('✅ ChatService: Message sent successfully');
      }
    });
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
    
    this.socket.emit('typing', { chatId, isTyping });
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
