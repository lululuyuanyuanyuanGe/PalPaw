import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePosts } from '@/context/PostsContext';
import { useUser } from '@/context/UserContext';

const SOCKET_URL = 'http://192.168.2.11:5001';

// Define socket event types
export enum SocketEvents {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  CONNECT_ERROR = 'connect_error',
  AUTHENTICATE = 'authenticate',
  AUTHENTICATED = 'authenticated',
  
  POST_UPDATED = 'post:updated',
  USER_UPDATED = 'user:updated',
  PRODUCT_UPDATED = 'product:updated',
  NEW_NOTIFICATION = 'notification'
}

class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;
  private userId: string | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  async initialize(userId: string) {
    if (this.socket) {
      console.log('Socket already initialized');
      return;
    }

    this.userId = userId;
    
    console.log('Initializing socket connection to', SOCKET_URL);
    
    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.setupEventListeners();
    await this.authenticateSocket();
  }

  private async authenticateSocket() {
    if (!this.socket || !this.userId) return;

    try {
      const token = await AsyncStorage.getItem('token');
      this.socket.emit(SocketEvents.AUTHENTICATE, {
        userId: this.userId,
        token
      });
    } catch (error) {
      console.error('Error during socket authentication:', error);
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on(SocketEvents.CONNECT, () => {
      console.log('Socket connected');
      this.authenticateSocket();
    });

    this.socket.on(SocketEvents.DISCONNECT, () => {
      console.log('Socket disconnected');
    });

    this.socket.on(SocketEvents.CONNECT_ERROR, (error: Error) => {
      console.error('Socket connection error:', error.message);
    });

    // Handle broadcast events
    this.socket.on(SocketEvents.POST_UPDATED, this.handlePostUpdate);
    this.socket.on(SocketEvents.USER_UPDATED, this.handleUserUpdate);
    this.socket.on(SocketEvents.PRODUCT_UPDATED, this.handleProductUpdate);
    this.socket.on(SocketEvents.NEW_NOTIFICATION, this.handleNotification);
  }

  private handlePostUpdate = (data: any) => {
    if (data.senderId === this.userId) return;
    // Call your API refresh functions here
    console.log('Post update received:', data);
  }

  private handleUserUpdate = (data: any) => {
    if (data.senderId === this.userId) return;
    console.log('User update received:', data);
  }

  private handleProductUpdate = (data: any) => {
    if (data.senderId === this.userId) return;
    console.log('Product update received:', data);
  }

  private handleNotification = (data: any) => {
    if (data.senderId === this.userId) return;
    console.log('Notification received:', data);
  }

  broadcastEvent(event: string, data: any): boolean {
    if (!this.socket || !this.socket.connected) {
      console.warn('Cannot broadcast event: socket not connected');
      return false;
    }
    
    try {
      const enhancedData = {
        ...data,
        senderId: this.userId
      };
      
      this.socket.emit(event, enhancedData);
      return true;
    } catch (error) {
      console.error('Error broadcasting event:', error);
      return false;
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default SocketService.getInstance();
