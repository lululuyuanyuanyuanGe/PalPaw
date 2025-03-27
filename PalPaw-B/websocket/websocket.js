import { Server } from 'socket.io';
import http from 'http';

// Map to store connected clients by userId
const connectedClients = new Map();

/**
 * Initialize WebSocket server
 * @param {http.Server} httpServer - The HTTP server to attach the WebSocket server to
 * @returns {object} WebSocket utility functions
 */
export const initializeWebSocket = (httpServer) => {
  if (!httpServer) {
    throw new Error('HTTP server is required to initialize WebSocket');
  }

  // Create Socket.IO server with CORS configuration
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "*", // In production, limit to your frontend domain
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Handle new connections
  io.on('connection', (socket) => {
    console.log(`WebSocket client connected: ${socket.id}`);

    // Authenticate user and associate socket with userId
    socket.on('authenticate', (data) => {
      try {
        const { userId, token } = data;
        
        // Here you would verify the token
        // This is a simplified example - in production, validate the JWT
        if (userId) {
          // Associate this socket with the user
          socket.userId = userId;
          
          // Store in our connected clients map
          if (!connectedClients.has(userId)) {
            connectedClients.set(userId, new Set());
          }
          connectedClients.get(userId).add(socket);
          
          console.log(`User ${userId} authenticated on socket ${socket.id}`);
          
          // Confirm successful authentication
          socket.emit('authenticated', { 
            success: true, 
            message: 'Successfully connected to real-time updates'
          });
          
          // No rooms needed - we'll broadcast to everyone
        } else {
          throw new Error('User ID is required for authentication');
        }
      } catch (error) {
        console.error('WebSocket authentication error:', error);
        socket.emit('authenticated', { 
          success: false, 
          message: 'Authentication failed',
          error: error.message 
        });
      }
    });
    
    // Handle client disconnection
    socket.on('disconnect', () => {
      console.log(`WebSocket client disconnected: ${socket.id}`);
      
      // Clean up the client's entry in our map
      if (socket.userId && connectedClients.has(socket.userId)) {
        connectedClients.get(socket.userId).delete(socket);
        
        // Remove the set if it's empty
        if (connectedClients.get(socket.userId).size === 0) {
          connectedClients.delete(socket.userId);
        }
        
        console.log(`Removed socket for user ${socket.userId}`);
      }
    });
  });

  /**
   * Send update to all connected clients (broadcast)
   * @param {string} event - Event name/type
   * @param {any} data - Data to send
   */
  const sendUpdate = (event, data) => {
    try {
      // Add timestamp to all messages
      const payload = {
        ...data,
        timestamp: new Date().toISOString()
      };
      
      // Always broadcast to all users
      io.emit(event, payload);
      console.log(`Broadcast '${event}' to all users:`, 
        JSON.stringify(payload).substring(0, 100) + 
        (JSON.stringify(payload).length > 100 ? '...' : ''));
      
    } catch (error) {
      console.error(`Error broadcasting '${event}' update:`, error);
    }
  };

  /**
   * Check if a user is online
   * @param {string} userId - The user ID to check
   * @returns {boolean} Whether the user is connected
   */
  const isUserOnline = (userId) => {
    return connectedClients.has(userId) && connectedClients.get(userId).size > 0;
  };

  /**
   * Get count of online users
   * @returns {number} Number of unique users connected
   */
  const getOnlineUsersCount = () => {
    return connectedClients.size;
  };

  /**
   * Get all connected user IDs
   * @returns {string[]} Array of user IDs
   */
  const getOnlineUserIds = () => {
    return Array.from(connectedClients.keys());
  };

  // Return utility functions to be used in controllers
  return {
    io,
    sendUpdate,
    isUserOnline,
    getOnlineUsersCount,
    getOnlineUserIds
  };
};

// Export a function to create a WebSocket instance
export default initializeWebSocket;
