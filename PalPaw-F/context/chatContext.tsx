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
  sendMessage: (chatId: string, content: string, attachments?: any[], replyTo?: string) => void;
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
            // Check if content is empty but there are attachments - this indicates a media message
            const hasAttachments = chat.lastMessage.attachments && 
                                    Array.isArray(chat.lastMessage.attachments) && 
                                    chat.lastMessage.attachments.length > 0;
            const contentIsEmpty = !chat.lastMessage.content || chat.lastMessage.content.trim() === '';
            
            transformedLastMessage = {
              // Use a placeholder for content if it's empty but has attachments
              content: contentIsEmpty && hasAttachments ? "[Media]" : (chat.lastMessage.content || ''),
              timestamp: chat.lastMessage.createdAt || chat.updatedAt,
              hasAttachments: hasAttachments || false,
              attachmentType: hasAttachments && chat.lastMessage.attachments && chat.lastMessage.attachments.length > 0
                ? chat.lastMessage.attachments[0].type 
                : undefined
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
              count?.user?.toString() === authState.user?.id
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
      postgresId: matchingParticipant?.postgresId || message.sender.postgresId || message.sender._id,
      username: matchingParticipant?.username || message.sender.username || 'User',
      avatar: formatImageUrl(matchingParticipant?.avatar || message.sender.avatar),
      firstName: matchingParticipant?.firstName || message.sender.firstName || '',
      lastName: matchingParticipant?.lastName || message.sender.lastName || '',
      fullName: matchingParticipant?.fullName || message.sender.fullName || `${matchingParticipant?.firstName || ''} ${matchingParticipant?.lastName || ''}`.trim() || matchingParticipant?.username || 'User',
      bio: matchingParticipant?.bio || message.sender.bio || ''
    };

    // First transform the message to match our frontend structure
    const transformedMessage: Message = {
      ...message,
      sender: enhancedSender,
      attachments: message.attachments || []
    };

    // Log the message being processed
    console.log(`handleNewMessage: Processing message ID ${transformedMessage._id} (temp: ${transformedMessage._id.startsWith('temp-')}) for chat ${transformedMessage.chat}`);
    console.log(`handleNewMessage: Sender details - mongoId: ${transformedMessage.sender._id}, pgId: ${transformedMessage.sender.postgresId}`);

    setState(prev => {
      const existingMessages = prev.messages[transformedMessage.chat] || [];
      let isReplacement = false;

      // Fix: Check for temporary messages by comparing content and sender ID
      // instead of relying on tempId
      if (transformedMessage._id && !transformedMessage._id.startsWith('temp-')) {
        // This is a server-confirmed message, look for temp message to replace
        const tempMessage = existingMessages.find(existing => 
          existing._id.startsWith('temp-') && 
          existing.content === transformedMessage.content &&
          (existing.sender.postgresId === transformedMessage.sender.postgresId ||
           existing.sender._id === transformedMessage.sender._id)
        );
        
        if (tempMessage) {
          isReplacement = true;
          console.log(`Replacement check: Found matching temporary message ${tempMessage._id} to replace with confirmed message ${transformedMessage._id}`);
        }
      }

      // Check for exact ID duplicates (if not a replacement)
      const isDuplicate = !isReplacement && existingMessages.some(existing =>
          existing._id === transformedMessage._id && !existing._id.startsWith('temp-')
      );
      if (!isReplacement && isDuplicate) {
           console.log(`Duplicate check: Confirmed message ${transformedMessage._id} already exists by ID.`);
      }


      console.log(`Message ${transformedMessage._id} - isDuplicate (already exists by ID): ${isDuplicate}, isReplacement (will replace temp): ${isReplacement}`);

      let chatMessages = existingMessages;

      if (isReplacement) {
        // Replace the temporary message with the confirmed one
        chatMessages = existingMessages.map(existing => {
          if (existing._id.startsWith('temp-') && 
              existing.content === transformedMessage.content &&
              (existing.sender.postgresId === transformedMessage.sender.postgresId ||
               existing.sender._id === transformedMessage.sender._id)) {
            return transformedMessage;
          }
          return existing;
        });
        console.log(`Replacing temporary message with confirmed message ${transformedMessage._id}`);
      } else if (!existingMessages.some(msg => msg._id === transformedMessage._id)) {
        // Not a duplicate, append new message
        chatMessages = [...existingMessages, transformedMessage];
        console.log(`Added new message ${transformedMessage._id} to chat ${transformedMessage.chat}`);
      } else {
        // Exact duplicate, do nothing
        console.log(`Message ${transformedMessage._id} is an exact duplicate, not modifying message list.`);
      }

      // Ensure no *actual* duplicates exist by ID after map/append operations (safety net)
      const finalChatMessages = chatMessages.filter((msg, index, self) =>
         index === self.findIndex((m) => m._id === msg._id)
      );
      if (finalChatMessages.length !== chatMessages.length) {
         console.warn("Duplicate messages detected and removed after processing.");
      }


      // Update the chats array (list of conversations)
      const updatedChats = prev.chats.map(chat => {
        if (chat._id === transformedMessage.chat) {
          // Find the actual latest message in the potentially updated array
          const latestMessageInChat = finalChatMessages.length > 0
            ? finalChatMessages.reduce((latest, current) => new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest)
            : null;

          // Only increment unread count if:
          // 1. Message is from someone else (not the current user)
          // 2. User is not currently viewing this chat
          // 3. It's not a replacement message
          const isFromCurrentUser = transformedMessage.sender.postgresId === authState.user?.id;
          const shouldIncrementUnread = !isFromCurrentUser && prev.activeChat !== transformedMessage.chat && !isReplacement;

          // Check if latest message has attachments but empty content
          const hasAttachments = latestMessageInChat && 
                                  latestMessageInChat.attachments && 
                                  Array.isArray(latestMessageInChat.attachments) && 
                                  latestMessageInChat.attachments.length > 0;
          const contentIsEmpty = latestMessageInChat && 
                                  (!latestMessageInChat.content || latestMessageInChat.content.trim() === '');

          return {
            ...chat,
            // Update lastMessage based on the actual latest message
            lastMessage: latestMessageInChat ? {
              // Use placeholder for content if it's empty but has attachments
              content: contentIsEmpty && hasAttachments ? "[Media]" : (latestMessageInChat.content || ''),
              timestamp: latestMessageInChat.createdAt,
              hasAttachments: hasAttachments || false,
              attachmentType: hasAttachments && latestMessageInChat.attachments && latestMessageInChat.attachments.length > 0 
                ? latestMessageInChat.attachments[0].type 
                : undefined
            } : chat.lastMessage, // Keep old if chat becomes empty
            updatedAt: latestMessageInChat ? latestMessageInChat.createdAt : chat.updatedAt,
            // Only increment if all conditions are met
            unreadCount: shouldIncrementUnread ? chat.unreadCount + 1 : (prev.activeChat === transformedMessage.chat ? 0 : chat.unreadCount)
          };
        }
        return chat;
      });

      // Sort chats by the timestamp of their actual last message or update time
      const sortedChats = [...updatedChats].sort((a, b) =>
        new Date(b.lastMessage?.timestamp || b.updatedAt).getTime() - new Date(a.lastMessage?.timestamp || a.updatedAt).getTime()
      );

      // Return the new state
      return {
        ...prev,
        messages: {
          ...prev.messages,
          [transformedMessage.chat]: finalChatMessages // Use the filtered array
        },
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
  const sendMessage = (chatId: string, content: string, attachments?: any[], replyTo?: string) => {
    if (!authState.isAuthenticated || !authState.user) {
      console.error('Cannot send message: user not authenticated');
      return;
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const tempMessage: Message = {
      _id: tempId,
      chat: chatId,
      sender: {
        _id: authState.user.id,
        postgresId: authState.user.id,
        username: authState.user.username,
        avatar: formatImageUrl(authState.user.avatar),
        firstName: authState.user.firstName || '',
        lastName: authState.user.lastName || '',
        fullName: authState.user.firstName && authState.user.lastName 
          ? `${authState.user.firstName} ${authState.user.lastName}`.trim() 
          : authState.user.username,
        bio: '',
      },
      content: content,
      attachments: attachments?.map(att => ({
        type: att.type,
        url: att.url,
        name: att.name,
        size: att.size,
        mimeType: att.mimeType,
      })) || [],
      createdAt: new Date().toISOString(),
      readBy: [authState.user.id],
      status: 'sent',
      replyTo: replyTo,
    };

    // Log the temp message
    console.log(`sendMessage: Created tempMessage`, {
      _id: tempMessage._id,
      chat: tempMessage.chat,
      content: tempMessage.content,
      createdAt: tempMessage.createdAt,
      sender_id: tempMessage.sender._id,
      sender_postgresId: tempMessage.sender.postgresId,
      sender_username: tempMessage.sender.username,
      attachments_count: tempMessage.attachments?.length || 0,
      first_attachment_url: tempMessage.attachments?.[0]?.url
    });

    // Optimistically update UI
    handleNewMessage(tempMessage);

    // Send message via service - Pass tempId along
    chatService.sendMessage(chatId, content, attachments, replyTo);

    // Clear typing status after sending
    setTyping(chatId, false);
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
      
      // Remove the check that prevents loading messages if they already exist
      // Always fetch messages from the API to ensure we have complete history
      
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
        
        setState(prev => {
          // Get any existing real-time messages that might be in state
          const existingMessages = prev.messages[chatId] || [];
          
          // Create a Map for quick message lookup by ID
          const messageMap = new Map<string, Message>();
          
          // First add all messages from API to ensure we have the complete history
          transformedMessages.forEach((msg: Message) => messageMap.set(msg._id, msg));
          
          // Then add any real-time messages that aren't duplicates
          existingMessages.forEach((msg: Message) => {
            if (!messageMap.has(msg._id) && !msg._id.startsWith('temp-')) {
              messageMap.set(msg._id, msg);
            }
          });
          
          // Convert map back to array and sort by timestamp
          const mergedMessages = Array.from(messageMap.values())
            .sort((a: Message, b: Message) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          
          console.log(`loadMessages: Merged ${transformedMessages.length} API messages with ${existingMessages.length} existing messages, resulting in ${mergedMessages.length} total messages for chat ${chatId}`);
          
          return {
            ...prev,
            messages: { ...prev.messages, [chatId]: mergedMessages },
            isLoadingMessages: false
          };
        });
        
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
