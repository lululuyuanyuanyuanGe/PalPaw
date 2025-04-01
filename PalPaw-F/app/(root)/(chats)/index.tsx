import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  ViewStyle,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather, MaterialCommunityIcons, FontAwesome5, AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context';
import { useChat } from '@/context/chatContext';
import type { Chat, Participant } from '@/context/chatContext';
import { formatImageUrl } from '@/utils/mediaUtils';
import api from '@/utils/apiClient';

// Decorative Paw Component
const DecorativePaw = ({ style, size = 24, color = '#9333EA', opacity = 0.2, rotation = '0deg' }: { 
  style: ViewStyle, 
  size?: number, 
  color?: string, 
  opacity?: number, 
  rotation?: string 
}) => {
  return (
    <View
      style={[
        {
          position: 'absolute',
          opacity,
          transform: [{ rotate: rotation }],
        },
        style
      ]}
    >
      <FontAwesome5 name="paw" size={size} color={color} />
    </View>
  );
};

const Chats: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string }>();
  const { state: authState } = useAuth();
  const { state: chatState, loadMessages, refreshChats, createChat, markAsRead } = useChat();
  const [refreshing, setRefreshing] = React.useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Handle contact from user profile
  useEffect(() => {
    const handleContactUser = async () => {
      // If there's a userId parameter and we're authenticated, create a chat
      if (params.userId && authState.isAuthenticated && !creatingChat) {
        try {
          console.log(`Creating chat with user: ${params.userId}`);
          setCreatingChat(true);
          const chatId = await createChat(params.userId);
          if (chatId) {
            console.log(`Chat created, navigating to: ${chatId}`);
            // Navigate to the chat detail screen
            router.replace({
              pathname: "/(root)/(chats)/chat/[id]",
              params: { id: chatId }
            });
          } else {
            console.error('Failed to create chat');
          }
        } catch (error) {
          console.error('Error creating chat:', error);
        } finally {
          setCreatingChat(false);
        }
      }
    };
    
    handleContactUser();
  }, [params.userId, authState.isAuthenticated]);

  // Fetch chats on component mount
  useEffect(() => {
    if (authState.isAuthenticated && !chatState.chats.length) {
      refreshChats();
    }
  }, [authState.isAuthenticated]);

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await refreshChats();
    setRefreshing(false);
  };

  // Navigate to specific chat screen
  const handleOpenChat = (chatId: string, chatName: string) => {
    // Load messages for this chat
    loadMessages(chatId);
    
    // Find the chat in state
    const chat = chatState.chats.find(c => c._id === chatId);
    
    // Mark messages as read if there are unread messages
    if (chat && chat.unreadCount > 0) {
      // Find the latest message to mark as read
      const messages = chatState.messages[chatId] || [];
      if (messages.length > 0) {
        const latestMessage = messages.reduce(
          (latest, current) => new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest,
          messages[0]
        );
        markAsRead(chatId, latestMessage._id);
      }
    }
    
    router.push({
      pathname: "/(root)/(chats)/chat/[id]",
      params: { id: chatId, chatName }
    });
  };

  // Handle navigation back
  const handleGoBack = () => {
    router.back();
  };

  // Handle user synchronization with MongoDB
  const handleSyncUser = async () => {
    if (!authState.isAuthenticated || syncing) return;
    
    try {
      setSyncing(true);
      console.log('Syncing user data with MongoDB...');
      
      const response = await api.post('/mongo/users/sync');
      
      if (response.data && response.data.success) {
        console.log('User data synced successfully:', response.data);
        // Refresh chats to get updated data
        await refreshChats();
      } else {
        console.error('Failed to sync user data:', response.data);
      }
    } catch (error) {
      console.error('Error syncing user data:', error);
    } finally {
      setSyncing(false);
    }
  };

  // Render a chat contact in the list
  const renderChatItem = ({ item }: { item: Chat }) => {
    // Get the participant (other than current user)
    const otherParticipant = item.participants?.find(
      (p: Participant) => p.postgresId !== authState.user?.id
    ) || {
      _id: 'unknown',
      postgresId: 'unknown',
      username: 'User',
      avatar: 'https://via.placeholder.com/150',
      onlineStatus: 'offline' as const
    };
    
    // Log avatar info for debugging
    console.log(`Chat ${item._id} avatar info:`, {
      username: otherParticipant.username,
      avatar: otherParticipant.avatar,
      postgresId: otherParticipant.postgresId
    });
    
    return (
      <TouchableOpacity
        onPress={() => handleOpenChat(item._id, otherParticipant.username || 'Chat')}
        className="bg-white mx-4 my-2 p-3 rounded-2xl"
        style={{
          shadowColor: '#9333EA40',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 3,
          elevation: 2,
          borderWidth: 2,
          borderColor: '#E9D5FF',
        }}
      >
        <View className="flex-row items-center">
          {/* Avatar with online indicator */}
          <View className="relative mr-3">
            <Image
              source={{ uri: getAvatarUri(otherParticipant) }}
              className="w-14 h-14 rounded-full"
            />
            {otherParticipant.onlineStatus === 'online' && (
              <View className="absolute bottom-0 right-0 bg-green-500 w-4 h-4 rounded-full border-2 border-white" />
            )}
          </View>
          
          {/* Chat details */}
          <View className="flex-1">
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-800 font-bold text-base">
                {otherParticipant.fullName || otherParticipant.username || 'User'}
              </Text>
              <Text className="text-gray-500 text-xs">
                {formatTimestamp(item.updatedAt)}
              </Text>
            </View>
            
            <View className="flex-row justify-between items-center mt-1">
              <Text className="text-gray-600 text-sm" numberOfLines={1}>
                {item.lastMessage?.hasAttachments 
                  ? `📎 ${item.lastMessage.attachmentType === 'image' 
                      ? 'Photo' 
                      : item.lastMessage.attachmentType === 'video' 
                        ? 'Video' 
                        : 'Attachment'}`
                  : (item.lastMessage?.content && item.lastMessage.content !== "[Media]" 
                    ? item.lastMessage.content 
                    : 'No messages yet')}
              </Text>
              
              {item.unreadCount > 0 && (
                <View className="bg-purple-600 rounded-full w-5 h-5 items-center justify-center">
                  <Text className="text-white text-xs font-bold">{item.unreadCount}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Format timestamp into a user-friendly format
  const formatTimestamp = (timestamp: string): string => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Today, show time
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return days[date.getDay()];
    } else {
      // More than a week ago
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  };

  // Get avatar URI with proper fallback
  const getAvatarUri = (participant: Participant): string => {
    console.log('Getting avatar for:', participant.username, {
      avatar: participant.avatar,
      postgresId: participant.postgresId,
      fullName: participant.fullName
    });
    
    // Use provided avatar if available and properly formatted
    if (participant.avatar && (
      participant.avatar.startsWith('http://') || 
      participant.avatar.startsWith('https://') || 
      participant.avatar.startsWith('/uploads/')
    )) {
      return participant.avatar;
    }
    
    // Generate initials for avatar if name is available
    const getInitials = (): string => {
      if (participant.firstName && participant.lastName) {
        return `${participant.firstName.charAt(0)}${participant.lastName.charAt(0)}`;
      } else if (participant.username) {
        return participant.username.substring(0, 2).toUpperCase();
      }
      return 'U';
    };
    
    // Use Robohash as fallback with consistent seed for the same user
    // Add initials as a parameter to make the avatar more personalized
    const initials = getInitials();
    return `https://robohash.org/${participant.postgresId || initials}?set=set4&bgset=bg1`;
  };

  return (
    <SafeAreaView className="flex-1 bg-blue-50">
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      
      {/* Decorative Paws - Static */}
      <DecorativePaw style={{ top: 120, left: 20 }} size={30} opacity={0.15} rotation="-15deg" />
      <DecorativePaw style={{ top: 180, right: 30 }} size={24} opacity={0.12} rotation="20deg" />
      <DecorativePaw style={{ bottom: 300, left: 40 }} size={28} opacity={0.13} rotation="10deg" />
      <DecorativePaw style={{ bottom: 200, right: 25 }} size={36} opacity={0.08} rotation="-5deg" />
      <DecorativePaw style={{ bottom: 100, left: 60 }} size={20} opacity={0.1} rotation="25deg" />
      
      {/* Header with gradient */}
      <LinearGradient
        colors={['#9333EA', '#A855F7', '#C084FC']}
        className="w-full pt-10 pb-6"
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Decorative Header Paws */}
        <View style={{ position: 'absolute', right: 20, top: 15, opacity: 0.3 }}>
          <FontAwesome5 name="paw" size={45} color="#ffffff" />
        </View>
        <View style={{ position: 'absolute', left: 30, bottom: 20, opacity: 0.25 }}>
          <FontAwesome5 name="paw" size={30} color="#ffffff" />
        </View>
        
        <View className="flex-row items-center justify-between px-4 pt-2">
          {/* Back Button */}
          <TouchableOpacity 
            className="bg-white rounded-full w-10 h-10 items-center justify-center" 
            onPress={handleGoBack}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
              elevation: 3,
            }}
          >
            <AntDesign name="arrowleft" size={22} color="#9333EA" />
          </TouchableOpacity>
          
          <View className="items-center">
            <Text className="text-white font-bold text-xl">Messages</Text>
            <View className="flex-row items-center mt-1">
              <FontAwesome5 name="paw" size={12} color="#FFF" style={{ opacity: 0.8, marginRight: 4 }} />
              <Text className="text-white text-opacity-90 text-xs">
                {Array.isArray(chatState?.chats) ? chatState.chats.filter(chat => chat?.unreadCount > 0).length : 0} unread chats
              </Text>
            </View>
          </View>
          
          {/* Sync button */}
          <TouchableOpacity 
            className="bg-white rounded-full w-10 h-10 items-center justify-center" 
            onPress={handleSyncUser}
            disabled={syncing}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
              elevation: 3,
              opacity: syncing ? 0.7 : 1
            }}
          >
            {syncing ? (
              <ActivityIndicator size="small" color="#9333EA" />
            ) : (
              <MaterialCommunityIcons name="sync" size={22} color="#9333EA" />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Chat List */}
      <View className="flex-1">
        {!chatState?.isConnected ? (
          <View className="py-16 items-center justify-center">
            <ActivityIndicator size="large" color="#9333EA" />
            <Text className="text-gray-600 mt-4">Connecting to chat server...</Text>
          </View>
        ) : (
          <FlatList
            data={Array.isArray(chatState?.chats) ? chatState.chats : []}
            renderItem={renderChatItem}
            keyExtractor={(item, index) => item?._id ? `chat-${item._id}` : `unknown-${index}`}
            contentContainerStyle={{ 
              paddingVertical: 12, 
              paddingBottom: 40 
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#9333EA']}
                tintColor="#9333EA"
              />
            }
            ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
            ListEmptyComponent={
              <View className="py-16 items-center justify-center">
                <View className="items-center px-5">
                  <View className="relative">
                    <MaterialCommunityIcons name="chat-outline" size={80} color="#C084FC" style={{ opacity: 0.7 }} />
                    <FontAwesome5 name="paw" size={24} color="#9333EA" style={{ position: 'absolute', top: 15, right: -10, opacity: 0.3 }} />
                  </View>
                  <Text className="text-gray-700 text-lg font-medium mt-6 text-center">
                    No messages yet
                  </Text>
                  <Text className="text-gray-500 text-sm mt-2 mb-6 text-center">
                    When you contact other pet owners, your conversations will appear here.
                  </Text>
                </View>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default Chats;
