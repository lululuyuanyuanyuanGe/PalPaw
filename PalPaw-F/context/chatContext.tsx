import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import chatService from '../socket/chatService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/apiClient';
import { useAuth } from './index';
import { formatImageUrl } from '@/utils/mediaUtils';

// Define required types
export interface Participant {
  _id: string;          // MongoDB ID
  postgresId: string;   // PostgreSQL ID reference
  username: string;     // From PostgreSQL (populated client-side)
  avatar?: string;      // From PostgreSQL (populated client-side)
  firstName?: string;   // From PostgreSQL
  lastName?: string;    // From PostgreSQL
  fullName?: string;    // Computed from firstName and lastName
  bio?: string;         // From PostgreSQL
  onlineStatus?: 'online' | 'offline';
  lastActive?: string;
}

export interface Chat {
  _id: string;
  chatId: string;
  type: 'direct' | 'group';
  name?: string;
  participants: Participant[];
  lastMessage?: {
    content: string;
    timestamp: string;
  };
  updatedAt: string;
  unreadCount: number;
}

export interface Message {
  _id: string;
  chat: string;
  sender: {
    _id: string;        // MongoDB ID
    postgresId: string; // PostgreSQL ID reference
    username: string;   // From PostgreSQL (populated client-side)
    avatar?: string;    // From PostgreSQL (populated client-side) 
    firstName?: string; // From PostgreSQL
    lastName?: string;  // From PostgreSQL
    fullName?: string;  // Computed from firstName and lastName
    bio?: string;       // From PostgreSQL
  };
  content: string;
  attachments?: any[];
  createdAt: string;
  readBy: string[];
  status: 'sent' | 'delivered' | 'read';
  replyTo?: string;
}

// Define your context state types
export interface ChatState {
  chats: Chat[];
  activeChat: string | null;
  messages: { [chatId: string]: Message[] };
  typingUsers: { [chatId: string]: string[] };
  isConnected: boolean;
  isLoadingMessages: boolean;
  error: string | null;
}

interface ChatContextType {
  state: ChatState;
  sendMessage: (chatId: string, content: string, attachments?: any[]) => void;
  markAsRead: (chatId: string, messageId: string) => void;
  setTyping: (chatId: string, isTyping: boolean) => void;
  loadMessages: (chatId: string) => Promise<void>;
  createChat: (participantId: string) => Promise<string | null>;
  refreshChats: () => Promise<void>;
  joinChatRoom: (chatId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { state: authState } = useAuth();
  
  // State management for chats and messages
  const [state, setState] = useState<ChatState>({
    chats: [],
    activeChat: null,
    messages: {},
    typingUsers: {},
    isConnected: false,
    isLoadingMessages: false,
    error: null
  });

  // Initialize socket connection
  const initializeConnection = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        setState(prev => ({ ...prev, error: null }));
        const connected = await chatService.connect();
        setState(prev => ({ ...prev, isConnected: connected }));
        if (connected) {
          // Load initial chats if connected
          await fetchChats();
        }
      }
    } catch (error) {
      console.error('Failed to initialize chat connection:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to connect to chat server. Please try again.'
      }));
    }
  };

  // Fetch chats from the API
  const fetchChats = async () => {
    try {
      const response = await api.get('/chats');
      
      if (response.data && response.data.success) {
        // Transform chat data to match our frontend structure
        const transformedChats = response.data.chats.map((chat: any) => {
          // Transform lastMessage format 
          let transformedLastMessage;
          if (chat.lastMessage) {
            transformedLastMessage = {
              content: chat.lastMessage.content || '',
              timestamp: chat.lastMessage.createdAt || chat.updatedAt
            };
          }
          
          // Transform participants to include postgresId
          const transformedParticipants = chat.participants.map((participant: any) => {
            // Compute fullName from firstName and lastName if available
            const computedFullName = participant.firstName && participant.lastName
              ? `${participant.firstName} ${participant.lastName}`.trim()
              : participant.firstName || participant.lastName || '';
              
            return {
              _id: participant._id,
              postgresId: participant.postgresId || participant._id, // Fallback if not available
              username: participant.username || 'User',
              avatar: formatImageUrl(participant.avatar), // Apply formatImageUrl to avatar
              firstName: participant.firstName || '',
              lastName: participant.lastName || '',
              fullName: participant.username || participant.fullName || computedFullName || 'User', // Prioritize username
              bio: participant.bio || '',
              onlineStatus: participant.onlineStatus || 'offline',
              lastActive: participant.lastActive || new Date().toISOString()
            };
          });
          
          return {
            ...chat,
            lastMessage: transformedLastMessage,
            participants: transformedParticipants,
            unreadCount: chat.unreadCounts?.find((count: any) => 
              count?.user?.toString() === chat.participants.find((p: any) => 
                p._id !== authState.user?.id
              )?._id
            )?.count || 0
          };
        });
        
        setState(prev => ({ ...prev, chats: transformedChats, error: null }));
        
        // Ensure we join all chat rooms
        transformedChats.forEach((chat: Chat) => {
          joinChatRoom(chat._id);
        });
        
      } else {
        throw new Error('Invalid chat data received');
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to load chats. Please try again.'
      }));
    }
  };

  // Public method to refresh chats
  const refreshChats = async () => {
    await fetchChats();
  };

  // Create a new chat with another user
  const createChat = async (participantId: string): Promise<string | null> => {
    try {
      console.log('Creating chat with participant:', participantId);
      const response = await api.post('/chats', {
        participantId,
        type: 'direct'
      });
      
      console.log('Chat creation response:', response.data);
      
      if (response.data && response.data.success) {
        const chat = response.data.chat;
        // Add the new chat to state
        setState(prev => ({
          ...prev,
          chats: [chat, ...prev.chats]
        }));
        
        // Join the chat room explicitly
        joinChatRoom(chat._id);
        
        return chat._id;
      }
      console.error('Invalid chat creation response format:', response.data);
      return null;
    } catch (error) {
      console.error('Failed to create chat:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to create chat. Please try again.'
      }));
      return null;
    }
  };

  // Handle app state changes
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App has come to the foreground
      initializeConnection();
    } else if (nextAppState === 'background') {
      // App has gone to the background
      // You may want to disconnect after a timeout in production
      // For now, we'll keep the connection to simplify
    }
  };

  // Handle new message received
  const handleNewMessage = (message: any) => {
    console.log('Handling new message:', { 
      chatId: message.chat,
      messageId: message._id,
      content: message.content.substring(0, 20) + '...',
      sender: {
        id: message.sender?._id,
        postgresId: message.sender?.postgresId,
        username: message.sender?.username,
        hasAvatar: !!message.sender?.avatar
      }
    });

    // Find the chat that this message belongs to
    const chat = state.chats.find(c => c._id === message.chat);
    
    if (chat) {
      // Log all participants for debugging
      console.log(`Chat ${chat._id} participants:`, chat.participants.map(p => ({
        _id: p._id,
        postgresId: p.postgresId,
        username: p.username,
        hasAvatar: !!p.avatar
      })));
    }
    
    // Find the message sender in the chat participants using either MongoDB ID or Postgres ID
    let matchingParticipant = undefined;
    if (chat) {
      console.log(`Looking for sender with ID: ${message.sender?._id} or postgres ID: ${message.sender?.postgresId || message.senderPostgresId} in chat ${chat._id}`);
      
      matchingParticipant = chat.participants.find(p => 
        p._id === message.sender._id || 
        p.postgresId === message.sender.postgresId ||
        p.postgresId === message.senderPostgresId // Some messages include this field
      );
      
      if (matchingParticipant) {
        console.log(`Found matching participant for message sender:`, {
          _id: matchingParticipant._id,
          postgresId: matchingParticipant.postgresId,
          username: matchingParticipant.username,
          hasAvatar: !!matchingParticipant.avatar,
          avatarUrl: matchingParticipant.avatar?.substring(0, 30)
        });
      } else {
        console.log(`No matching participant found for sender ID: ${message.sender._id} or postgres ID: ${message.sender.postgresId || message.senderPostgresId}`);
      }
    }
    
    // Enhance the sender information with data from matching participant
    const enhancedSender = {
      _id: message.sender._id,
      postgresId: message.sender.postgresId || message.senderPostgresId || message.sender._id,
      username: message.sender.username || (matchingParticipant?.username) || 'User',
      avatar: formatImageUrl(message.sender.avatar || (matchingParticipant?.avatar)),
      firstName: message.sender.firstName || (matchingParticipant?.firstName) || '',
      lastName: message.sender.lastName || (matchingParticipant?.lastName) || '',
      fullName: message.sender.username || (matchingParticipant?.username) || 'User',
      bio: message.sender.bio || (matchingParticipant?.bio) || '',
    };

    // First transform the message to match our frontend structure
    const transformedMessage: Message = {
      ...message,
      sender: enhancedSender
    };

    setState(prev => {
      // Get existing messages for this chat
      const existingMessages = prev.messages[transformedMessage.chat] || [];
      
      // Check if this is a server-confirmed message for a temporary one we already have
      const isDuplicate = existingMessages.some(existing => {
        // If it's the same message ID, it's definitely a duplicate
        if (existing._id === transformedMessage._id && !existing._id.startsWith('temp-')) {
          return true;
        }
        
        // Check if it's a confirmed version of a temporary message
        if (existing._id.startsWith('temp-')) {
          // Check if content matches
          const contentMatches = existing.content === transformedMessage.content;
          
          // Check if the sender is the same
          const senderMatches = (
            existing.sender.postgresId === transformedMessage.sender.postgresId ||
            existing.sender._id === transformedMessage.sender._id
          );
          
          // Check if timestamps are close (within 10 seconds)
          const existingTime = new Date(existing.createdAt).getTime();
          const newTime = new Date(transformedMessage.createdAt).getTime();
          const timeWithinRange = Math.abs(existingTime - newTime) < 10000; // 10 seconds
          
          return contentMatches && senderMatches && timeWithinRange;
        }
        
        return false;
      });
      
      console.log(`Message ${transformedMessage._id} isDuplicate:`, isDuplicate);
      
      // If it's a duplicate, replace the temporary message with the confirmed one
      let chatMessages = [];
      if (isDuplicate) {
        chatMessages = existingMessages.map(existing => {
          // If this is the temporary message that matches our criteria, replace it
          if (
            existing._id.startsWith('temp-') && 
            existing.content === transformedMessage.content && 
            (existing.sender.postgresId === transformedMessage.sender.postgresId || 
             existing.sender._id === transformedMessage.sender._id)
          ) {
            console.log(`Replacing temporary message ${existing._id} with confirmed message ${transformedMessage._id}`);
            return transformedMessage;
          }
          return existing;
        });
      } else {
        // Not a duplicate, append the new message
        chatMessages = [...existingMessages, transformedMessage];
        console.log(`Added new message ${transformedMessage._id} to chat ${transformedMessage.chat}`);
      }
      
      // Update chats with the new message
      const updatedChats = prev.chats.map(chat => {
        if (chat._id === transformedMessage.chat) {
          return {
            ...chat,
            lastMessage: { 
              content: transformedMessage.content,
              timestamp: transformedMessage.createdAt
            },
            updatedAt: transformedMessage.createdAt,
            unreadCount: prev.activeChat === transformedMessage.chat ? 0 : chat.unreadCount + 1
          };
        }
        return chat;
      });
      
      // Sort chats by most recent message
      const sortedChats = [...updatedChats].sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      
      return {
        ...prev,
        messages: { ...prev.messages, [transformedMessage.chat]: chatMessages },
        chats: sortedChats
      };
    });
  };

  // Handle typing indicator
  const handleTyping = (userId: string, chatId: string) => {
    setState(prev => {
      const chatTypingUsers = [...(prev.typingUsers[chatId] || [])];
      if (!chatTypingUsers.includes(userId)) {
        chatTypingUsers.push(userId);
      }
      return {
        ...prev,
        typingUsers: { ...prev.typingUsers, [chatId]: chatTypingUsers }
      };
    });
  };

  // Handle stop typing
  const handleStopTyping = (userId: string, chatId: string) => {
    setState(prev => {
      const chatTypingUsers = (prev.typingUsers[chatId] || []).filter(id => id !== userId);
      return {
        ...prev,
        typingUsers: { ...prev.typingUsers, [chatId]: chatTypingUsers }
      };
    });
  };

  // Handle messages read
  const handleMessagesRead = (userId: string, chatId: string, messageId: string) => {
    setState(prev => {
      // Update message read status
      const chatMessages = prev.messages[chatId]?.map(msg => {
        if (msg._id === messageId || new Date(msg.createdAt) <= new Date(prev.messages[chatId]?.find(m => m._id === messageId)?.createdAt || '')) {
          return {
            ...msg,
            readBy: [...(msg.readBy || []), userId],
            status: 'read' as const
          };
        }
        return msg;
      });
      
      return {
        ...prev,
        messages: { ...prev.messages, [chatId]: chatMessages || [] }
      };
    });
  };

  // Handle user status changes
  const handleUserStatusChange = (userId: string, status: 'online' | 'offline') => {
    setState(prev => {
      // Update all chats with this user
      const updatedChats = prev.chats.map(chat => {
        const participantIndex = chat.participants.findIndex(p => p._id === userId);
        if (participantIndex !== -1) {
          const updatedParticipants = [...chat.participants];
          updatedParticipants[participantIndex] = {
            ...updatedParticipants[participantIndex],
            onlineStatus: status,
            lastActive: status === 'offline' ? new Date().toISOString() : updatedParticipants[participantIndex].lastActive
          };
          
          return {
            ...chat,
            participants: updatedParticipants
          };
        }
        return chat;
      });
      
      return {
        ...prev,
        chats: updatedChats
      };
    });
  };

  // Send a message
  const sendMessage = (chatId: string, content: string, attachments: any[] = []) => {
    // Send via socket
    chatService.sendMessage(chatId, content, attachments);
    
    // Get current user ID - use the correct property name from AuthContext's User interface
    const currentUserId = authState.user?.id || 'me';
    
    // Make sure avatar URL is correctly formatted
    const formattedAvatar = formatImageUrl(authState.user?.avatar);
    
    // Log avatar info for debugging
    console.log('Sending message with user avatar:', {
      hasAvatar: !!authState.user?.avatar,
      avatarValue: authState.user?.avatar?.substring(0, 30),
      formattedAvatar: formattedAvatar?.substring(0, 30),
      userId: currentUserId
    });
    
    // Optimistically add to UI (will be replaced when server confirms)
    const tempId = `temp-${Date.now()}`;
    const tempMessage: Message = {
      _id: tempId,
      chat: chatId,
      sender: {
        _id: currentUserId, // Using the PostgreSQL id as MongoDB id for now
        postgresId: authState.user?.id || 'me',
        username: authState.user?.username || 'me', 
        avatar: formattedAvatar,
        firstName: authState.user?.firstName || '',
        lastName: authState.user?.lastName || '',
        fullName: authState.user?.username || 
          (authState.user?.firstName && authState.user?.lastName
            ? `${authState.user.firstName} ${authState.user.lastName}`.trim()
            : authState.user?.firstName || authState.user?.lastName || 'me'),
        bio: '',
      },
      content,
      attachments: attachments || [],
      createdAt: new Date().toISOString(),
      readBy: [currentUserId],
      status: 'sent'
    };
    
    // Add to state
    handleNewMessage(tempMessage);
  };

  // Mark message as read
  const markAsRead = (chatId: string, messageId: string) => {
    chatService.markMessagesRead(chatId);
    
    // Update local state (optimistic)
    setState(prev => {
      const updatedChats = prev.chats.map(chat => {
        if (chat._id === chatId) {
          return { ...chat, unreadCount: 0 };
        }
        return chat;
      });
      
      return {
        ...prev,
        chats: updatedChats
      };
    });
  };

  // Set typing status
  const setTyping = (chatId: string, isTyping: boolean) => {
    chatService.setTyping(chatId, isTyping);
  };

  // Load messages for a specific chat
  const loadMessages = async (chatId: string) => {
    try {
      // Set active chat and loading state
      setState(prev => ({ 
        ...prev, 
        activeChat: chatId,
        isLoadingMessages: true,
        error: null
      }));
      
      // Check if we already have messages for this chat
      if (state.messages[chatId] && state.messages[chatId].length > 0) {
        setState(prev => ({ ...prev, isLoadingMessages: false }));
        return; // Already loaded
      }
      
      const response = await api.get(`/chats/${chatId}/messages`);
      
      if (response.data && response.data.success) {
        // Transform messages to match our frontend structure
        const transformedMessages = response.data.messages.map((message: any) => {
          // Compute fullName from firstName and lastName if available
          const computedFullName = message.sender.firstName && message.sender.lastName
            ? `${message.sender.firstName} ${message.sender.lastName}`.trim()
            : message.sender.firstName || message.sender.lastName || '';
            
          return {
            ...message,
            sender: {
              _id: message.sender._id,
              postgresId: message.sender.postgresId || message.sender._id, // Fallback
              username: message.sender.username || 'User',
              avatar: formatImageUrl(message.sender.avatar), // Apply formatImageUrl to avatar
              firstName: message.sender.firstName || '',
              lastName: message.sender.lastName || '',
              fullName: message.sender.username || message.sender.fullName || computedFullName || 'User', // Prioritize username
              bio: message.sender.bio || ''
            }
          };
        });
        
        setState(prev => ({
          ...prev,
          messages: { ...prev.messages, [chatId]: transformedMessages },
          isLoadingMessages: false
        }));
        
        // Mark the latest message as read
        if (transformedMessages.length > 0) {
          markAsRead(chatId, transformedMessages[transformedMessages.length - 1]._id);
        }
      } else {
        throw new Error('Invalid message data received');
      }
    } catch (error) {
      console.error(`Failed to load messages for chat ${chatId}:`, error);
      setState(prev => ({ 
        ...prev, 
        error: `Failed to load messages. Please try again.`,
        isLoadingMessages: false
      }));
    }
  };

  // Add a function to join a chat room explicitly
  const joinChatRoom = (chatId: string) => {
    console.log(`Joining chat room for chat ID: ${chatId}`);
    if (chatService.getRawSocket()) {
      chatService.getRawSocket()?.emit('join_chat', { chatId });
      console.log(`Emitted join_chat event for ${chatId}`);
    } else {
      console.warn(`Failed to join chat room - socket not available`);
    }
  };

  // Initialize connection & handle app state changes
  useEffect(() => {
    // Connect on mount if user is logged in
    if (authState.isAuthenticated) {
      initializeConnection();
    }

    // Handle app going to background/foreground
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      chatService.disconnect();
    };
  }, [authState.isAuthenticated]);

  // Set up event listeners
  useEffect(() => {
    // Define the status handler function that matches the expected signature
    const statusChangeHandler = (data: any) => {
      console.log('User status changed:', data);
      if (data && data.userId && data.status) {
        handleUserStatusChange(data.userId, data.status);
      }
    };
    
    // Define handlers for typing events
    const typingHandler = (data: any) => {
      console.log('Typing event received:', data);
      if (data && data.userId && data.chatId) {
        handleTyping(data.userId, data.chatId);
      }
    };
    
    const stopTypingHandler = (data: any) => {
      console.log('Stop typing event received:', data);
      if (data && data.userId && data.chatId) {
        handleStopTyping(data.userId, data.chatId);
      }
    };
    
    const messagesReadHandler = (data: any) => {
      console.log('Messages read event received:', data);
      if (data && data.userId && data.chatId && data.messageId) {
        handleMessagesRead(data.userId, data.chatId, data.messageId);
      }
    };

    // Use the listener methods available in the chat service
    chatService.onNewMessage((message: any) => {
      console.log('Received new message in context:', message);
      handleNewMessage(message);
    });
    
    chatService.onStatusChange(statusChangeHandler);
    
    // Add custom event listeners
    if (chatService.getRawSocket()) {
      const socket = chatService.getRawSocket();
      
      // Set up typing event handlers
      socket?.on('typing', typingHandler);
      socket?.on('stop_typing', stopTypingHandler);
      socket?.on('messages_read', messagesReadHandler);
    }
    
    // Set up connection status change listener
    chatService.onConnectionStatusChange((isConnected: boolean) => {
      setState(prev => ({ ...prev, isConnected }));
    });

    return () => {
      // Remove listeners on cleanup
      chatService.removeMessageListener(handleNewMessage);
      chatService.removeStatusListener(statusChangeHandler);
      
      // Remove custom event listeners
      if (chatService.getRawSocket()) {
        const socket = chatService.getRawSocket();
        socket?.off('typing', typingHandler);
        socket?.off('stop_typing', stopTypingHandler);
        socket?.off('messages_read', messagesReadHandler);
      }
    };
  }, []);

  return (
    <ChatContext.Provider value={{ 
      state, 
      sendMessage, 
      markAsRead, 
      setTyping, 
      loadMessages,
      createChat,
      refreshChats,
      joinChatRoom
    }}>
      {children}
    </ChatContext.Provider>
  );
};

// Custom hook for using the chat context
export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
