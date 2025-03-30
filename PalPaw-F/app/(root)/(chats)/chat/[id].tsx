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
  Animated,
  Dimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons, FontAwesome5, AntDesign, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, useUser } from '@/context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Mock chat data
interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
  read: boolean;
  isOwnMessage: boolean;
}

// Mock messages for chats
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
  ],
  '2': [
    {
      id: 'm1',
      text: "Hi, I'm interested in the dog collar you posted",
      sender: '2',
      timestamp: '9:10 AM',
      read: true,
      isOwnMessage: false
    },
    {
      id: 'm2',
      text: "It looks perfect for my Golden Retriever",
      sender: '2',
      timestamp: '9:11 AM',
      read: true,
      isOwnMessage: false
    },
    {
      id: 'm3',
      text: "Hello! Yes, it's a high-quality leather collar",
      sender: 'me',
      timestamp: '9:15 AM',
      read: true,
      isOwnMessage: true
    }
  ]
};

// Mock user avatar mapping
const userAvatars: { [key: string]: string } = {
  '1': 'https://randomuser.me/api/portraits/women/44.jpg',
  '2': 'https://randomuser.me/api/portraits/men/32.jpg',
  '3': 'https://randomuser.me/api/portraits/women/65.jpg',
  '4': 'https://randomuser.me/api/portraits/men/22.jpg',
  '5': 'https://randomuser.me/api/portraits/women/28.jpg',
};

// Decorative floating paw component
const FloatingPaw = ({ size, color, duration, delay, startPosition }: { 
  size: number, 
  color: string, 
  duration: number, 
  delay: number, 
  startPosition: { x: number, y: number } 
}) => {
  const position = useRef(new Animated.ValueXY(startPosition)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Create an animation sequence that will repeat
    const animate = () => {
      // Reset values
      position.setValue(startPosition);
      opacity.setValue(0);
      
      // Start animation sequence
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(position, {
            toValue: { 
              x: startPosition.x + (Math.random() * 100 - 50), 
              y: startPosition.y - 200 - (Math.random() * 100) 
            },
            duration: duration,
            useNativeDriver: true
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.3,
              duration: duration * 0.3,
              useNativeDriver: true
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: duration * 0.7,
              useNativeDriver: true
            })
          ])
        ])
      ]).start(() => animate()); // Restart animation when finished
    };
    
    // Start the loop
    animate();
    
    // Cleanup function
    return () => {
      position.stopAnimation();
      opacity.stopAnimation();
    };
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        opacity,
        transform: [
          { translateX: position.x },
          { translateY: position.y },
          { rotate: `${Math.random() * 360}deg` }
        ]
      }}
    >
      <FontAwesome5 name="paw" size={size} color={color} />
    </Animated.View>
  );
};

const ChatDetail: React.FC = () => {
  const router = useRouter();
  const { id, chatName } = useLocalSearchParams();
  const { state: authState } = useAuth();
  const { state: userState } = useUser();
  const [messageText, setMessageText] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const messageListRef = useRef<FlatList>(null);
  const currentChatId = id as string;
  const [pawsConfig, setPawsConfig] = useState<Array<{
    id: number;
    size: number;
    delay: number;
    duration: number;
    startPosition: { x: number; y: number };
  }>>([]);

  // Generate random timestamps for "active X hours ago"
  const lastActiveDuration = Math.floor(Math.random() * 24) + 1;
  
  // Get specific chat messages when chat ID changes
  useEffect(() => {
    if (currentChatId) {
      setLoading(true);
      // Simulate loading messages
      setTimeout(() => {
        setChatMessages(mockMessages[currentChatId] || []);
        setLoading(false);
        
        // Scroll to bottom of messages
        if (messageListRef.current) {
          messageListRef.current.scrollToEnd({ animated: false });
        }
      }, 500);
    } else {
      setChatMessages([]);
    }
  }, [currentChatId]);

  // Handle typing indicator
  useEffect(() => {
    if (messageText.length > 0) {
      setIsTyping(true);
    } else {
      setIsTyping(false);
    }
  }, [messageText]);

  // Handle navigation back
  const handleGoBack = () => {
    router.back();
  };

  // Handle sending a message
  const handleSendMessage = () => {
    if (!messageText.trim() || !currentChatId) return;
    
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
    
    // Hide emoji panel if open
    if (showEmoji) {
      setShowEmoji(false);
    }
  };

  // Toggle emoji panel
  const toggleEmojiPanel = () => {
    setShowEmoji(!showEmoji);
  };

  // Format timestamp relative to current day
  const formatMessageDate = (timestamp: string) => {
    if (timestamp.includes('AM') || timestamp.includes('PM')) {
      return timestamp;
    }
    if (timestamp === 'Yesterday') {
      return 'Yesterday';
    }
    return timestamp;
  };

  // Get avatar for current chat
  const getAvatar = () => {
    return userAvatars[currentChatId] || 'https://randomuser.me/api/portraits/lego/1.jpg';
  };

  // Initialize paws and set up timer for continuous spawning
  useEffect(() => {
    // Create initial paws
    const initialPaws = Array(5).fill(0).map((_, i) => ({
      id: i,
      size: 10 + Math.random() * 15,
      delay: i * 500,
      duration: 3000 + Math.random() * 2000,
      startPosition: {
        x: Math.random() * SCREEN_WIDTH,
        y: 400 + Math.random() * 300
      }
    }));
    
    setPawsConfig(initialPaws);
    
    // Set up interval to add new paws periodically
    const interval = setInterval(() => {
      setPawsConfig(prev => {
        // Keep only the latest 8 paws to avoid performance issues
        const currentPaws = prev.slice(-7);
        
        // Add a new paw with a unique ID
        return [...currentPaws, {
          id: Date.now(),
          size: 10 + Math.random() * 15,
          delay: 0, // No delay for new paws
          duration: 3000 + Math.random() * 2000,
          startPosition: {
            x: Math.random() * SCREEN_WIDTH,
            y: 400 + Math.random() * 300
          }
        }];
      });
    }, 2000); // Add a new paw every 2 seconds
    
    // Cleanup
    return () => clearInterval(interval);
  }, []);

  // Render a message in the chat
  const renderMessageItem = ({ item, index }: { item: ChatMessage, index: number }) => {
    // Check if this is the first message or if the previous message was from a different sender
    const isFirstMessageFromSender = index === 0 || 
      chatMessages[index - 1].isOwnMessage !== item.isOwnMessage;
    
    // Determine if we should show the avatar
    const showAvatar = !item.isOwnMessage && isFirstMessageFromSender;
    
    // Determine bubble style based on position in conversation
    let bubbleStyle = '';
    if (item.isOwnMessage) {
      bubbleStyle = 'self-end bg-purple-600 text-white rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl';
      if (index > 0 && chatMessages[index - 1].isOwnMessage) {
        bubbleStyle = 'self-end bg-purple-600 text-white rounded-tl-2xl rounded-bl-2xl';
      }
    } else {
      bubbleStyle = 'self-start bg-white text-gray-800 rounded-tl-2xl rounded-tr-2xl rounded-br-2xl';
      if (index > 0 && !chatMessages[index - 1].isOwnMessage) {
        bubbleStyle = 'self-start bg-white text-gray-800 rounded-tr-2xl rounded-br-2xl';
      }
    }
    
    return (
      <View className={`px-3 ${!item.isOwnMessage && 'ml-2'} ${item.isOwnMessage && 'mr-2'}`}>
        {/* Date separator if needed */}
        {index === 0 && (
          <View className="my-2 items-center">
            <View className="bg-gray-200 px-3 py-1 rounded-full">
              <Text className="text-gray-600 text-xs font-medium">Today</Text>
            </View>
          </View>
        )}
        
        <View className={`flex-row items-end mb-1 ${item.isOwnMessage ? 'justify-end' : 'justify-start'}`}>
          {/* Avatar for incoming messages */}
          {showAvatar ? (
            <Image 
              source={{ uri: getAvatar() }}
              className="w-8 h-8 rounded-full mr-1 mb-1"
            />
          ) : (
            !item.isOwnMessage && <View style={{ width: 32, marginRight: 4 }} />
          )}
          
          {/* Message bubble */}
          <View 
            className={`px-3 py-2 ${bubbleStyle}`}
            style={{
              maxWidth: '75%',
              shadowColor: '#00000020',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.2,
              shadowRadius: 1,
              elevation: 1,
            }}
          >
            <Text className={`${item.isOwnMessage ? 'text-white' : 'text-gray-800'} text-base`}>
              {item.text}
            </Text>
          </View>
        </View>
        
        {/* Timestamp and read status */}
        <View className={`flex-row items-center mb-3 ${item.isOwnMessage ? 'justify-end mr-2' : 'justify-start ml-10'}`}>
          <Text className="text-xs text-gray-500 mr-1">{formatMessageDate(item.timestamp)}</Text>
          {item.isOwnMessage && (
            item.read ? (
              <MaterialCommunityIcons name="check-all" size={14} color="#9333EA" />
            ) : (
              <MaterialCommunityIcons name="check" size={14} color="#9CA3AF" />
            )
          )}
        </View>
      </View>
    );
  };

  // Render the message list header with user info
  const renderListHeader = () => (
    <View className="pt-2 pb-4">
      <View className="items-center">
        <Image 
          source={{ uri: getAvatar() }}
          className="w-16 h-16 rounded-full border-2 border-white"
          style={{ 
            shadowColor: '#000', 
            shadowOffset: { width: 0, height: 2 }, 
            shadowOpacity: 0.1, 
            shadowRadius: 4 
          }}
        />
        <View className="flex-row items-center mt-2">
          <View className={`w-2.5 h-2.5 rounded-full ${currentChatId === '2' || currentChatId === '5' ? 'bg-green-500' : 'bg-gray-400'} mr-1.5`} />
          <Text className="text-gray-600 text-sm">
            {currentChatId === '2' || currentChatId === '5' ? 'Active now' : `Active ${lastActiveDuration}h ago`}
          </Text>
        </View>
      </View>
    </View>
  );

  // Create floating paws (decorative elements)
  const renderFloatingPaws = () => {
    return pawsConfig.map(paw => (
      <FloatingPaw
        key={paw.id}
        size={paw.size}
        color="#9333EA"
        duration={paw.duration}
        delay={paw.delay}
        startPosition={paw.startPosition}
      />
    ));
  };

  return (
    <SafeAreaView className="flex-1">
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      
      {/* Background Gradient and Patterns */}
      <View style={{ position: 'absolute', width: '100%', height: '100%' }}>
        <LinearGradient
          colors={['#f0f4ff', '#edf2fe', '#e6eeff']}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
        />
        
        {/* Subtle Pattern Overlay */}
        <View style={{ 
          position: 'absolute', 
          width: '100%', 
          height: '100%', 
          opacity: 0.05,
          backgroundColor: '#9333EA',
          transform: [{ rotate: '10deg' }]
        }}>
          {Array(6).fill(0).map((_, i) => (
            <View 
              key={`pattern-${i}`} 
              style={{
                position: 'absolute',
                top: 100 + (i * 140),
                left: i % 2 === 0 ? -20 : 'auto',
                right: i % 2 === 1 ? -20 : 'auto',
                width: SCREEN_WIDTH * 0.7,
                height: 14,
                borderRadius: 7,
                backgroundColor: '#9333EA',
                opacity: 0.3,
              }}
            />
          ))}
        </View>
        
        {/* Fixed Paw Decorations */}
        <View style={{ position: 'absolute', top: '25%', left: '5%', transform: [{ rotate: '30deg' }], opacity: 0.07 }}>
          <FontAwesome5 name="paw" size={60} color="#9333EA" />
        </View>
        <View style={{ position: 'absolute', top: '65%', right: '8%', transform: [{ rotate: '-20deg' }], opacity: 0.05 }}>
          <FontAwesome5 name="paw" size={80} color="#9333EA" />
        </View>
      </View>
      
      {/* Decorative Floating Paws */}
      {renderFloatingPaws()}
      
      {/* Header with gradient */}
      <LinearGradient
        colors={['#9333EA', '#A855F7', '#C084FC']}
        className="w-full pt-10 pb-4"
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Decorative Header Paws */}
        <View style={{ position: 'absolute', right: 20, top: 15, opacity: 0.3 }}>
          <FontAwesome5 name="paw" size={45} color="#ffffff" />
        </View>
        <View style={{ position: 'absolute', left: 30, bottom: 15, opacity: 0.25 }}>
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
          
          {/* User Info in Header */}
          <TouchableOpacity className="flex-row items-center">
            <Image 
              source={{ uri: getAvatar() }}
              className="w-9 h-9 rounded-full border-2 border-white mr-2"
            />
            <View>
              <Text className="text-white font-bold text-lg">
                {chatName || 'Chat'}
              </Text>
              {(currentChatId === '2' || currentChatId === '5') && (
                <Text className="text-white text-opacity-90 text-xs">Online</Text>
              )}
            </View>
          </TouchableOpacity>
          
          {/* Call Button */}
          <TouchableOpacity 
            className="bg-white rounded-full w-10 h-10 items-center justify-center" 
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
              elevation: 3,
            }}
          >
            <Feather name="more-horizontal" size={22} color="#9333EA" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Content Area with improved styling */}
      <View className="flex-1">
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
                ListHeaderComponent={renderListHeader}
                ListFooterComponent={
                  <View style={{ height: 10 }} />
                }
                style={{ backgroundColor: 'transparent' }}
              />
              
              {/* Typing indicator */}
              {isTyping && (
                <View className="pl-5 pb-1">
                  <Text className="text-gray-500 text-xs italic">You are typing...</Text>
                </View>
              )}
              
              {/* Message Input with enhanced styling */}
              <View className="px-3 pb-4 pt-2 bg-white border-t border-gray-200" style={{
                shadowColor: '#9333EA',
                shadowOffset: { width: 0, height: -3 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 5,
              }}>
                <View className="flex-row items-center bg-gray-100 rounded-2xl px-3 py-2">
                  <TouchableOpacity className="mr-2">
                    <Feather name="smile" size={22} color="#9333EA" />
                  </TouchableOpacity>
                  
                  <TextInput
                    className="flex-1 text-gray-800 min-h-[36px] max-h-[80px]"
                    placeholder="Type a message..."
                    value={messageText}
                    onChangeText={setMessageText}
                    multiline
                    style={{ fontSize: 16 }}
                    placeholderTextColor="#9CA3AF"
                  />
                  
                  <View className="flex-row items-center">
                    <TouchableOpacity className="mr-3 p-1">
                      <Feather name="image" size={22} color="#9333EA" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      className={`${messageText.trim() ? 'bg-purple-600' : 'bg-gray-300'} rounded-full p-2 items-center justify-center`}
                      onPress={handleSendMessage}
                      disabled={!messageText.trim()}
                      style={messageText.trim() ? {
                        shadowColor: '#9333EA',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 2,
                        elevation: 3,
                      } : {}}
                    >
                      <Ionicons name="send" size={18} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

export default ChatDetail; 