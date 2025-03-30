import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import chatService from '../socket/chatService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/apiClient';

// Define required types
interface Chat {
  _id: string;
  chatId: string;
  type: 'direct' | 'group';
  name?: string;
  participants: string[];
  lastMessage?: string;
  updatedAt: string;
  unreadCount: number;
}

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

// Define your context state types
interface ChatState {
  chats: Chat[];
  activeChat: string | null;
  messages: { [chatId: string]: Message[] };
  typingUsers: { [chatId: string]: string[] };
  isConnected: boolean;
}

interface ChatContextType {
  state: ChatState;
  sendMessage: (chatId: string, content: string, attachments?: any[]) => void;
  markAsRead: (chatId: string, messageId: string) => void;
  setTyping: (chatId: string, isTyping: boolean) => void;
  loadMessages: (chatId: string) => Promise<void>;
  // Other methods as needed
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State management for chats and messages
  const [state, setState] = useState<ChatState>({
    chats: [],
    activeChat: null,
    messages: {},
    typingUsers: {},
    isConnected: false
  });

  // Initialize socket connection
  const initializeConnection = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const connected = await chatService.connect();
        setState(prev => ({ ...prev, isConnected: connected }));
        if (connected) {
          // Load initial chats if connected
          fetchChats();
        }
      }
    } catch (error) {
      console.error('Failed to initialize chat connection:', error);
    }
  };

  // Fetch chats from the API
  const fetchChats = async () => {
    try {
      const response = await api.get('/chats');
      
      if (response.data) {
        setState(prev => ({ ...prev, chats: response.data }));
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error);
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
  const handleNewMessage = (message: Message) => {
    setState(prev => {
      // Add message to the appropriate chat
      const chatMessages = [...(prev.messages[message.chat] || []), message];
      
      // Update chats with the new message
      const updatedChats = prev.chats.map(chat => {
        if (chat._id === message.chat) {
          return {
            ...chat,
            lastMessage: message.content,
            updatedAt: message.createdAt,
            unreadCount: prev.activeChat === message.chat ? 0 : chat.unreadCount + 1
          };
        }
        return chat;
      });
      
      return {
        ...prev,
        messages: { ...prev.messages, [message.chat]: chatMessages },
        chats: updatedChats
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
            readBy: [...msg.readBy, userId],
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

  // Send a message
  const sendMessage = (chatId: string, content: string, attachments: any[] = []) => {
    // Send via socket
    chatService.sendMessage(chatId, content, attachments);
    
    // Optimistically add to UI (will be replaced when server confirms)
    const tempId = `temp-${Date.now()}`;
    const tempMessage: Message = {
      _id: tempId,
      chat: chatId,
      sender: {
        _id: 'me', // Replace with actual user ID
        username: 'me' // Replace with actual username
      },
      content,
      attachments: attachments || [],
      createdAt: new Date().toISOString(),
      readBy: [],
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
      // Set active chat
      setState(prev => ({ ...prev, activeChat: chatId }));
      
      // Check if we already have messages for this chat
      if (state.messages[chatId] && state.messages[chatId].length > 0) {
        return; // Already loaded
      }
      
      const response = await api.get(`/chats/${chatId}/messages`);
      
      if (response.data) {
        setState(prev => ({
          ...prev,
          messages: { ...prev.messages, [chatId]: response.data }
        }));
        
        // Mark the latest message as read
        if (response.data.length > 0) {
          markAsRead(chatId, response.data[response.data.length - 1]._id);
        }
      }
    } catch (error) {
      console.error(`Failed to load messages for chat ${chatId}:`, error);
    }
  };

  // Initialize connection & handle app state changes
  useEffect(() => {
    // Connect on mount if user is logged in
    initializeConnection();

    // Handle app going to background/foreground
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      chatService.disconnect();
    };
  }, []);

  // Set up event listeners
  useEffect(() => {
    // Use the new listener methods
    chatService.onNewMessage(handleNewMessage);
    chatService.onStatusChange((data) => {
      // Handle status changes if needed
    });

    return () => {
      // Remove listeners on cleanup
      chatService.removeMessageListener(handleNewMessage);
      // Remove other listeners as needed
    };
  }, []);

  return (
    <ChatContext.Provider value={{ state, sendMessage, markAsRead, setTyping, loadMessages }}>
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
