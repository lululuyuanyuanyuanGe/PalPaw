import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  StatusBar,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ViewStyle
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons, FontAwesome5, AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, useUser } from '@/context';
import Constants from 'expo-constants';

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

// Mock chat data
interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
  read: boolean;
  isOwnMessage: boolean;
}

interface ChatContact {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  online: boolean;
}

const mockChats: ChatContact[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    lastMessage: 'Is the cat bed still available?',
    lastMessageTime: '10:30 AM',
    unreadCount: 2,
    online: true
  },
  {
    id: '2',
    name: 'Michael Smith',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    lastMessage: "I'm interested in the dog collar",
    lastMessageTime: '9:15 AM',
    unreadCount: 0,
    online: true
  },
  {
    id: '3',
    name: 'Jessica Lee',
    avatar: 'https://randomuser.me/api/portraits/women/65.jpg',
    lastMessage: 'Would you take $40 for it?',
    lastMessageTime: 'Yesterday',
    unreadCount: 0,
    online: false
  },
  {
    id: '4',
    name: 'David Wilson',
    avatar: 'https://randomuser.me/api/portraits/men/22.jpg',
    lastMessage: 'Thanks for the quick response!',
    lastMessageTime: 'Yesterday',
    unreadCount: 0,
    online: false
  },
  {
    id: '5',
    name: 'Emma Thompson',
    avatar: 'https://randomuser.me/api/portraits/women/28.jpg',
    lastMessage: "Perfect! I'll pick it up tomorrow",
    lastMessageTime: 'Wed',
    unreadCount: 1,
    online: true
  }
];

// Specific chat messages for a selected conversation
const mockMessages: { [key: string]: ChatMessage[] } = {
  '1': [
    {
      id: 'm1',
      text: 'Hi there! I saw your luxury cat bed listing',
      sender: '1',
      timestamp: '10:25 AM',
      read: true,
      isOwnMessage: false
    },
    {
      id: 'm2',
      text: 'Is it still available?',
      sender: '1',
      timestamp: '10:26 AM',
      read: true,
      isOwnMessage: false
    },
    {
      id: 'm3',
      text: "Hello! Yes, it's still available",
      sender: 'me',
      timestamp: '10:28 AM',
      read: true,
      isOwnMessage: true
    },
    {
      id: 'm4',
      text: 'Great! Does it come with the cushion shown in the photos?',
      sender: '1',
      timestamp: '10:29 AM',
      read: true,
      isOwnMessage: false
    },
    {
      id: 'm5',
      text: 'And is the price negotiable?',
      sender: '1',
      timestamp: '10:30 AM',
      read: false,
      isOwnMessage: false
    }
  ]
};

const Chats: React.FC = () => {
  const router = useRouter();
  const { state: authState } = useAuth();
  const { state: userState } = useUser();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const messageListRef = useRef<FlatList>(null);

  // Get specific chat messages when a chat is selected
  useEffect(() => {
    if (selectedChat) {
      setLoading(true);
      // Simulate loading messages
      setTimeout(() => {
        setChatMessages(mockMessages[selectedChat] || []);
        setLoading(false);
        
        // Scroll to bottom of messages
        if (messageListRef.current) {
          messageListRef.current.scrollToEnd({ animated: false });
        }
      }, 500);
    } else {
      setChatMessages([]);
    }
  }, [selectedChat]);

  // Handle navigation back
  const handleGoBack = () => {
    if (selectedChat) {
      setSelectedChat(null);
    } else {
      router.back();
    }
  };

  // Handle sending a message
  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedChat) return;
    
    const newMessage: ChatMessage = {
      id: `m${Date.now()}`,
      text: messageText.trim(),
      sender: 'me',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
      isOwnMessage: true
    };
    
    setChatMessages([...chatMessages, newMessage]);
    setMessageText('');
    
    // Scroll to the new message
    setTimeout(() => {
      messageListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Open chat conversation
  const handleOpenChat = (chatId: string) => {
    setSelectedChat(chatId);
  };

  // Render a chat contact in the list
  const renderChatItem = ({ item }: { item: ChatContact }) => (
    <TouchableOpacity
      onPress={() => handleOpenChat(item.id)}
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
            source={{ uri: item.avatar }}
            className="w-14 h-14 rounded-full"
          />
          {item.online && (
            <View className="absolute bottom-0 right-0 bg-green-500 w-4 h-4 rounded-full border-2 border-white" />
          )}
        </View>
        
        {/* Chat details */}
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-gray-800 font-bold text-base">{item.name}</Text>
            <Text className="text-gray-500 text-xs">{item.lastMessageTime}</Text>
          </View>
          
          <View className="flex-row justify-between items-center mt-1">
            <Text className="text-gray-600 text-sm" numberOfLines={1}>
              {item.lastMessage}
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

  // Render a message in the conversation
  const renderMessageItem = ({ item }: { item: ChatMessage }) => (
    <View className={`max-w-[80%] my-1 mx-3 ${item.isOwnMessage ? 'self-end' : 'self-start'}`}>
      <View 
        className={`p-3 rounded-2xl ${
          item.isOwnMessage 
            ? 'bg-purple-600 rounded-br-none' 
            : 'bg-gray-100 rounded-bl-none'
        }`}
      >
        <Text 
          className={`text-${item.isOwnMessage ? 'white' : 'gray-800'}`}
        >
          {item.text}
        </Text>
      </View>
      <View className={`flex-row items-center mt-1 ${item.isOwnMessage ? 'justify-end' : 'justify-start'}`}>
        <Text className="text-gray-500 text-xs mr-1">{item.timestamp}</Text>
        {item.isOwnMessage && (
          <MaterialCommunityIcons
            name={item.read ? 'check-all' : 'check'}
            size={14}
            color={item.read ? '#9333EA' : '#9CA3AF'}
          />
        )}
      </View>
    </View>
  );

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
            <Text className="text-white font-bold text-xl">
              {selectedChat 
                ? mockChats.find(chat => chat.id === selectedChat)?.name || 'Chat' 
                : 'Messages'
              }
            </Text>
            {!selectedChat && (
              <View className="flex-row items-center mt-1">
                <FontAwesome5 name="paw" size={12} color="#FFF" style={{ opacity: 0.8, marginRight: 4 }} />
                <Text className="text-white text-opacity-90 text-xs">
                  {mockChats.filter(chat => chat.unreadCount > 0).length} unread chats
                </Text>
              </View>
            )}
          </View>
          
          {/* Right side element */}
          <TouchableOpacity className="w-10 h-10 items-center justify-center">
            {selectedChat ? (
              <MaterialCommunityIcons name="dots-vertical" size={24} color="#ffffff" />
            ) : (
              <View style={{ width: 40, height: 40 }} />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>
      
      {/* Content Area */}
      <View className="flex-1">
        {selectedChat ? (
          // Chat conversation view
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
            keyboardVerticalOffset={100}
          >
            {loading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#9333EA" />
              </View>
            ) : (
              <>
                <FlatList
                  ref={messageListRef}
                  data={chatMessages}
                  renderItem={renderMessageItem}
                  keyExtractor={item => item.id}
                  contentContainerStyle={{ 
                    paddingVertical: 15, 
                    flexGrow: 1,
                  }}
                  inverted={false}
                />
                
                {/* Message Input */}
                <View className="p-3 bg-white border-t border-gray-200">
                  <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-2">
                    <TouchableOpacity className="mr-2">
                      <Feather name="smile" size={22} color="#9333EA" />
                    </TouchableOpacity>
                    
                    <TextInput
                      className="flex-1 text-gray-800 min-h-[40px]"
                      placeholder="Type a message..."
                      value={messageText}
                      onChangeText={setMessageText}
                      multiline
                    />
                    
                    <View className="flex-row">
                      <TouchableOpacity className="ml-2">
                        <Feather name="paperclip" size={22} color="#9333EA" />
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        className="ml-3 bg-purple-600 w-9 h-9 rounded-full items-center justify-center"
                        onPress={handleSendMessage}
                        disabled={!messageText.trim()}
                      >
                        <Feather name="send" size={18} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </>
            )}
          </KeyboardAvoidingView>
        ) : (
          // Chat list view
          <FlatList
            data={mockChats}
            renderItem={renderChatItem}
            keyExtractor={item => item.id}
            contentContainerStyle={{ 
              paddingVertical: 12, 
              paddingBottom: 40 
            }}
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
                    Start a conversation with another PalPaw user
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
