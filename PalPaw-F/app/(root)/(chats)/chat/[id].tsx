import React, { useState, useEffect, useRef, useContext, createContext } from 'react';
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
  Dimensions,
  Modal,
  ScrollView,
  Alert,
  Linking
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons, FontAwesome5, AntDesign, Ionicons, Entypo } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@/context';
import { useChat } from '@/context/chatContext';
import type { Message, Participant } from '@/context/chatContext';
import { formatImageUrl } from '@/utils/mediaUtils';
import * as FileSystem from 'expo-file-system';
import { Video, ResizeMode } from 'expo-av';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Helper function to format last active time
const formatLastActive = (lastActive: string) => {
  if (!lastActive) return '';
  
  const lastActiveDate = new Date(lastActive);
  const now = new Date();
  const diffMs = now.getTime() - lastActiveDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return lastActiveDate.toLocaleDateString();
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

// Date separator component
const DateSeparator = ({ date }: { date: string }) => {
  const formattedDate = formatDateSeparator(date);
  
  return (
    <View className="flex-row items-center justify-center my-4">
      <View className="flex-1 h-px bg-gray-200" />
      <View className="px-4 py-1 mx-2 bg-purple-100 rounded-full">
        <Text className="text-xs text-purple-700 font-medium">{formattedDate}</Text>
      </View>
      <View className="flex-1 h-px bg-gray-200" />
    </View>
  );
};

// Format date for the separator
const formatDateSeparator = (date: string) => {
  const messageDate = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (messageDate.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (messageDate.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return messageDate.toLocaleDateString(undefined, { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  }
};

// Helper function to check if two dates are the same day
const isSameDay = (date1: Date, date2: Date) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// Video message component as a separate component to avoid hook errors
const VideoMessage = ({ videoUri }: { videoUri: string }) => {
  const videoRef = useRef(null);
  const [videoStatus, setVideoStatus] = useState({});
  
  // Get the ChatDetail component instance context
  const { openVideoPreview } = React.useContext(VideoPreviewContext);
  
  return (
    <View className="relative rounded-lg overflow-hidden">
      <Video
        ref={videoRef}
        source={{ uri: videoUri }}
        style={{ width: 200, height: 150, borderRadius: 8 }}
        resizeMode={ResizeMode.CONTAIN}
        useNativeControls={false}
        isLooping={false}
        onPlaybackStatusUpdate={status => setVideoStatus(() => status)}
        posterSource={{ uri: 'https://via.placeholder.com/200x150/6B46C1/FFFFFF?text=Video' }}
        usePoster={true}
      />
      
      {/* Play button overlay */}
      <TouchableOpacity 
        className="absolute inset-0 items-center justify-center"
        onPress={() => openVideoPreview(videoUri)}
      >
        {!(videoStatus as any).isPlaying && (
          <View className="w-12 h-12 rounded-full bg-black bg-opacity-40 items-center justify-center">
            <Feather name="play" size={24} color="#ffffff" />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

// Create a context for video preview functionality
const VideoPreviewContext = createContext<{
  openVideoPreview: (videoUrl: string) => void;
}>({
  openVideoPreview: () => {},
});

const ChatDetail: React.FC = () => {
  const router = useRouter();
  const { id, chatName } = useLocalSearchParams();
  const { state: authState } = useAuth();
  const { state: chatState, sendMessage, markAsRead, setTyping, loadMessages, joinChatRoom } = useChat();
  
  const [messageText, setMessageText] = useState('');
  const [isTypingLocal, setIsTypingLocal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Array<{type: string, url: string, name?: string, mimeType: string, size: number}>>([]);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const messageListRef = useRef<FlatList>(null);
  const currentChatId = id as string;
  const [pawsConfig, setPawsConfig] = useState<Array<{
    id: number;
    size: number;
    delay: number;
    duration: number;
    startPosition: { x: number; y: number };
  }>>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const videoModalRef = useRef(null);
  
  // Add robust null checks with default values
  const messages = chatState?.messages && currentChatId && chatState.messages[currentChatId] ? 
    chatState.messages[currentChatId] : [];
  const typingUsers = chatState?.typingUsers && currentChatId && chatState.typingUsers[currentChatId] ? 
    chatState.typingUsers[currentChatId] : [];
  const activeChat = chatState?.chats && Array.isArray(chatState.chats) ? 
    chatState.chats.find(chat => chat?._id === currentChatId) : undefined;
  const otherParticipant = activeChat?.participants && Array.isArray(activeChat.participants) ? 
    activeChat.participants.find(p => p?.postgresId !== authState.user?.id) : undefined;
  
  // For debugging
  useEffect(() => {
    console.log("ChatState:", JSON.stringify({
      isConnected: chatState?.isConnected,
      chatsArray: Array.isArray(chatState?.chats),
      chatsLength: chatState?.chats?.length,
      messagesForChat: Boolean(chatState?.messages?.[currentChatId])
    }));
  }, [chatState]);
  
  // Generate floating paws configuration on mount
  useEffect(() => {
    const newPawsConfig = [];
    const pawCount = 8;
    
    for (let i = 0; i < pawCount; i++) {
      newPawsConfig.push({
        id: i,
        size: Math.floor(Math.random() * 15) + 10,
        delay: Math.random() * 2000,
        duration: Math.random() * 5000 + 8000,
        startPosition: {
          x: Math.random() * SCREEN_WIDTH,
          y: Math.random() * 400 + 400
        }
      });
    }
    
    setPawsConfig(newPawsConfig);
  }, []);
  
  // Get specific chat messages when chat ID changes
  useEffect(() => {
    if (currentChatId) {
      loadMessages(currentChatId);
      
      // Explicitly join this chat room
      joinChatRoom(currentChatId);
      
      console.log(`ChatDetail: Opening chat ${currentChatId}, joining room`);
    }
  }, [currentChatId]);

  // Scroll to bottom of messages when they change
  useEffect(() => {
    if (messageListRef.current && messages.length > 0) {
      setTimeout(() => {
        messageListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Handle typing indicator
  useEffect(() => {
    let typingTimeout: NodeJS.Timeout;
    
    if (messageText.length > 0 && !isTypingLocal) {
      setIsTypingLocal(true);
      setTyping(currentChatId, true);
    } else if (messageText.length === 0 && isTypingLocal) {
      setIsTypingLocal(false);
      setTyping(currentChatId, false);
    }
    
    // Clear typing indicator after 5 seconds of inactivity
    typingTimeout = setTimeout(() => {
      if (isTypingLocal) {
        setIsTypingLocal(false);
        setTyping(currentChatId, false);
      }
    }, 5000);
    
    return () => {
      clearTimeout(typingTimeout);
    };
  }, [messageText, isTypingLocal, currentChatId]);

  // Debug function to log chat and participant information
  useEffect(() => {
    if (activeChat && otherParticipant) {
      console.log(`Active chat info: ${activeChat._id}`, {
        participantCount: activeChat.participants.length,
        otherParticipantId: otherParticipant.postgresId,
        otherParticipantAvatar: otherParticipant.avatar
      });
    }
  }, [activeChat, otherParticipant]);

  // Helper to get avatar for a specific postgresId from participants
  const getParticipantAvatar = (postgresId: string) => {
    if (!activeChat) return null;
    
    const participant = activeChat.participants.find(p => p.postgresId === postgresId);
    if (participant?.avatar) {
      return { uri: participant.avatar };
    }
    return null;
  };

  // Handle navigation back
  const handleGoBack = () => {
    router.back();
  };

  // Handle picking an image from the device
  const handlePickImage = async () => {
    try {
      // Request permission first
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        alert("You need to allow access to your photos to send media files.");
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 5,
      });
      
      if (!result.canceled && result.assets.length > 0) {
        // Log the image assets received from the picker
        console.log('Image picker returned assets:', result.assets.map(a => ({
          uri: a.uri.substring(0, 30) + (a.uri.length > 30 ? '...' : ''),
          fileSize: a.fileSize,
          fileName: a.uri.split('/').pop()
        })));
        
        const newMedia = result.assets.map(asset => {
          // Get the full URI for the image - preserve the original URI exactly as-is
          // Don't use formatImageUrl here since we want to keep the original URI 
          // for uploading. The formatImageUrl will be applied when displaying.
          const imageUri = asset.uri;
          
          // Log the URI processing
          console.log(`Processing image URI: ${imageUri.substring(0, 30)}${imageUri.length > 30 ? '...' : ''}`);
          
          return {
            type: 'image' as const,
            url: imageUri, // Keep the original URI for upload
            name: asset.uri.split('/').pop() || `image-${Date.now()}.jpg`,
            mimeType: 'image/jpeg',
            size: asset.fileSize || 0
          };
        });
        
        // Log the processed media objects
        console.log('Created media objects:', newMedia.map(m => ({
          type: m.type,
          url: m.url.substring(0, 30) + (m.url.length > 30 ? '...' : ''),
          name: m.name,
          size: Math.round(m.size / 1024) + 'KB'
        })));
        
        setSelectedMedia([...selectedMedia, ...newMedia]);
        setShowAttachmentOptions(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert('Failed to select image. Please try again.');
    }
  };
  
  // Handle taking a photo with the camera
  const handleTakePhoto = async () => {
    try {
      // Request permission first
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        alert("You need to allow access to your camera to take photos.");
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets.length > 0) {
        // Log the camera asset information
        console.log('Camera returned asset:', {
          uri: result.assets[0].uri.substring(0, 30) + (result.assets[0].uri.length > 30 ? '...' : ''),
          fileSize: result.assets[0].fileSize,
          fileName: result.assets[0].uri.split('/').pop()
        });
        
        // Process the image URI - preserve the original URI exactly as-is
        // Don't use formatImageUrl here since we want to keep the original URI
        // for uploading. The formatImageUrl will be applied when displaying.
        const imageUri = result.assets[0].uri;
        console.log(`Processing camera image URI: ${imageUri.substring(0, 30)}${imageUri.length > 30 ? '...' : ''}`);
        
        const newMedia = {
          type: 'image' as const,
          url: imageUri, // Keep the original URI for upload
          name: result.assets[0].uri.split('/').pop() || `camera-${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          size: result.assets[0].fileSize || 0
        };
        
        // Log the created media object
        console.log('Created camera media object:', {
          type: newMedia.type,
          url: newMedia.url.substring(0, 30) + (newMedia.url.length > 30 ? '...' : ''),
          name: newMedia.name,
          size: Math.round(newMedia.size / 1024) + 'KB'
        });
        
        setSelectedMedia([...selectedMedia, newMedia]);
        setShowAttachmentOptions(false);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      alert('Failed to take photo. Please try again.');
    }
  };
  
  // Handle picking a video from the device
  const handlePickVideo = async () => {
    try {
      // Request permission first
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        alert("You need to allow access to your photos to send videos.");
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: false, // Only one video at a time
        videoMaxDuration: 60, // Limit to 60 seconds
      });
      
      if (!result.canceled && result.assets.length > 0) {
        const videoUri = result.assets[0].uri;
        
        // Get file info to check size
        const fileInfo = await FileSystem.getInfoAsync(videoUri);
        const fileSize = fileInfo.exists ? (fileInfo as any).size || 0 : result.assets[0].fileSize || 0;
        
        // Check for very large files (>25MB)
        if (fileSize > 25 * 1024 * 1024) {
          Alert.alert(
            "File Too Large",
            "Videos must be smaller than 25MB. Please select a smaller video.",
            [{ text: "OK" }]
          );
          return;
        }
        
        // Warn about large files that will be uploaded via HTTP
        // The threshold in chatService is 900KB, so we'll warn at 1MB for simplicity
        if (fileSize > 1 * 1024 * 1024) {
          Alert.alert(
            "Large Video",
            `This video is ${(fileSize / (1024 * 1024)).toFixed(1)}MB and may take longer to send.`,
            [
              { 
                text: "Cancel",
                style: "cancel" 
              },
              { 
                text: "Send Anyway",
                onPress: () => {
                  // Create the media object
                  const newMedia = {
                    type: 'video' as const,
                    url: videoUri,
                    name: videoUri.split('/').pop() || `video-${Date.now()}.mp4`,
                    mimeType: 'video/mp4',
                    size: fileSize
                  };
                  
                  console.log(`Selected large video: ${(fileSize / (1024 * 1024)).toFixed(1)}MB`);
                  setSelectedMedia([...selectedMedia, newMedia]);
                  setShowAttachmentOptions(false);
                }
              }
            ]
          );
        } else {
          // Standard size video, add directly
          const newMedia = {
            type: 'video' as const,
            url: videoUri,
            name: videoUri.split('/').pop() || `video-${Date.now()}.mp4`,
            mimeType: 'video/mp4',
            size: fileSize
          };
          
          console.log(`Selected video: ${(fileSize / (1024)).toFixed(1)}KB`);
          setSelectedMedia([...selectedMedia, newMedia]);
          setShowAttachmentOptions(false);
        }
      }
    } catch (error) {
      console.error('Error picking video:', error);
      alert('Failed to select video. Please try again.');
    }
  };
  
  // Remove a selected media item
  const removeSelectedMedia = (index: number) => {
    const updatedMedia = [...selectedMedia];
    updatedMedia.splice(index, 1);
    setSelectedMedia(updatedMedia);
  };

  // Handle sending a message with attachments
  const handleSendMessage = () => {
    if ((!messageText.trim() && selectedMedia.length === 0) || !currentChatId) return;
    
    console.log(`ChatDetail: Sending message to chat ${currentChatId} with ${selectedMedia.length} attachments`);
    sendMessage(currentChatId, messageText.trim(), selectedMedia);
    console.log(`ChatDetail: Message sent, should display as temp message until confirmed`);
    setMessageText('');
    setSelectedMedia([]);
  };

  // Format date for messages
  const formatMessageDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get avatar for message sender
  const getSenderAvatar = (sender: Message['sender']) => {
    if (!sender) {
      return { uri: `https://robohash.org/user?set=set4` };
    }
    
    // Generate initials for avatar fallback
    const getInitials = (): string => {
      if (sender.firstName && sender.lastName) {
        return `${sender.firstName.charAt(0)}${sender.lastName.charAt(0)}`;
      } else if (sender.username) {
        return sender.username.substring(0, 2).toUpperCase();
      }
      return 'U';
    };
    
    // Use avatar if available and properly formatted
    if (sender.avatar && (
      sender.avatar.startsWith('http://') || 
      sender.avatar.startsWith('https://') || 
      sender.avatar.startsWith('/uploads/')
    )) {
      return { uri: sender.avatar };
    }
    
    // Use Robohash as fallback
    const initials = getInitials();
    return { uri: `https://robohash.org/${sender.postgresId || initials}?set=set4&bgset=bg1` };
  };

  // Handle message press (for future features like reply, etc)
  const handleMessagePress = (messageId: string) => {
    // Mark message as read
    if (currentChatId) {
      markAsRead(currentChatId, messageId);
    }
  };

  // Process messages to include date separators
  const processedMessages = React.useMemo(() => {
    const result: (Message | { _id: string; type: 'dateSeparator'; date: string })[] = [];
    let previousDate: Date | null = null;
    
    messages.forEach(message => {
      const messageDate = new Date(message.createdAt);
      
      if (!previousDate || !isSameDay(messageDate, previousDate)) {
        result.push({
          _id: `date-${message.createdAt}`,
          type: 'dateSeparator',
          date: message.createdAt
        });
      }
      
      result.push(message);
      previousDate = messageDate;
    });
    
    return result;
  }, [messages]);
  
  // Render a message or date separator
  const renderItem = ({ item }: { item: Message | { _id: string; type: 'dateSeparator'; date: string } }) => {
    if ('type' in item && item.type === 'dateSeparator') {
      return <DateSeparator date={item.date} />;
    }
    
    // Cast item to Message type and pass it to the existing renderMessageItem
    return renderMessageItem({ item: item as Message });
  };

  // Render a message item
  const renderMessageItem = ({ item }: { item: Message }) => {
    const isCurrentUser = item.sender.postgresId === authState.user?.id;
    
    // Prioritize using participant data for avatar over message sender data
    let messageAvatar;
    
    if (!isCurrentUser) {
      // First try to find the participant by PostgresID
      const participantAvatar = getParticipantAvatar(item.sender.postgresId);
      
      if (participantAvatar) {
        messageAvatar = participantAvatar;
        console.log(`Using participant avatar for message ${item._id.substring(0, 8)}`);
      } else {
        // Fallback to sender avatar or default
        messageAvatar = getSenderAvatar(item.sender);
        console.log(`Using sender avatar for message ${item._id.substring(0, 8)}`);
      }
    } else {
      // For current user
      messageAvatar = getSenderAvatar(item.sender);
    }
    
    // Check if message contains only video and no text
    const hasOnlyVideo = item.content.trim() === '' && 
                        item.attachments && 
                        item.attachments.length === 1 && 
                        item.attachments[0].type === 'video';
    
    return (
      <View className={`mb-3 flex-row ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
        {/* Avatar for other user's messages */}
        {!isCurrentUser && (
          <View className="mr-2 mb-1">
            <Image 
              source={messageAvatar} 
              className="w-8 h-8 rounded-full"
            />
          </View>
        )}
        
        <View
          style={{
            backgroundColor: isCurrentUser ? '#9333EA' : '#F3E8FF',
            borderRadius: 16,
            borderTopLeftRadius: isCurrentUser ? 16 : 2,
            borderTopRightRadius: isCurrentUser ? 2 : 16,
            padding: hasOnlyVideo ? 0 : 12, // No padding for video-only messages
            paddingBottom: hasOnlyVideo ? 0 : 8,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 1,
            },
            shadowOpacity: 0.18,
            shadowRadius: 1.0,
            elevation: 1,
            maxWidth: '80%',
            overflow: hasOnlyVideo ? 'hidden' : 'visible'
          }}
        >
          {/* Message text - only show if there is content */}
          {item.content.trim() !== '' && (
            <Text
              style={{
                color: isCurrentUser ? '#fff' : '#4B5563',
                fontSize: 16,
              }}
            >
              {item.content}
            </Text>
          )}
          
          {/* Message attachments */}
          {item.attachments && item.attachments.length > 0 && (
            <View className={hasOnlyVideo ? "" : "mt-2"}>
              {item.attachments.map((attachment, index) => {
                // Handle different attachment types
                if (attachment.type === 'image') {
                  // Use formatImageUrl to properly format the image URL
                  const imageUri = (() => {
                    // Check if we have a URL to work with
                    if (!attachment.url) {
                      console.log(`Missing URL for image attachment in message ${item._id}`);
                      return null;
                    }
                    
                    // Fix for file:// paths to prevent double slashes
                    if (attachment.url.startsWith('file://')) {
                      // Normalize the path to ensure no double slashes
                      return attachment.url.replace(/file:\/\/\/+/g, 'file:///');
                    }
                    
                    // Use formatImageUrl for server-stored images
                    return formatImageUrl(attachment.url);
                  })();
                  
                  // Log the processed image URI for debugging
                  console.log(`Processed image URI for message ${item._id}:`, imageUri);
                  
                  return imageUri ? (
                    <TouchableOpacity 
                      key={`${item._id}-attachment-${index}`} 
                      className="mt-1"
                      onPress={() => openImagePreview(imageUri)}
                      activeOpacity={0.8}
                    >
                      <Image 
                        source={{ uri: imageUri }}
                        className="rounded-lg"
                        style={{ width: 200, height: 150, resizeMode: 'cover' }}
                        onError={(e) => console.error(`Failed to load image: ${e.nativeEvent.error}`)}
                        onLoad={() => console.log(`Image loaded successfully for ${item._id}`)}
                      />
                    </TouchableOpacity>
                  ) : (
                    <View 
                      key={`${item._id}-attachment-${index}`}
                      className="bg-gray-200 rounded-lg mt-1 items-center justify-center"
                      style={{ width: 200, height: 150 }}
                    >
                      <Feather name="image" size={32} color="#9333EA" />
                      <Text className="text-purple-700 mt-2">Image not available</Text>
                    </View>
                  );
                } else if (attachment.type === 'video') {
                  // Video handling
                  const videoUri = (() => {
                    // If it's a local file URI, use it directly
                    if (attachment.url.startsWith('file://')) {
                      return attachment.url;
                    }
                    // Otherwise format as remote URL
                    return formatImageUrl(attachment.url);
                  })();
                  
                  return videoUri ? (
                    <VideoMessage key={`${item._id}-attachment-${index}`} videoUri={videoUri} />
                  ) : (
                    <View 
                      key={`${item._id}-attachment-${index}`}
                      className="bg-gray-200 rounded-lg mt-1 items-center justify-center"
                      style={{ width: 200, height: 150 }}
                    >
                      <Feather name="video" size={32} color="#9333EA" />
                      <Text className="text-purple-700 mt-2">Video not available</Text>
                    </View>
                  );
                }
                // Remove audio and file attachment types as they're no longer needed
                return null;
              })}
            </View>
          )}
          
          {/* Timestamp and read status */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
              marginTop: 4,
              padding: hasOnlyVideo ? 4 : 0,
              backgroundColor: hasOnlyVideo ? 'rgba(0,0,0,0.3)' : 'transparent',
              position: hasOnlyVideo ? 'absolute' : 'relative',
              bottom: hasOnlyVideo ? 0 : undefined,
              right: hasOnlyVideo ? 0 : undefined,
              left: hasOnlyVideo ? 0 : undefined,
            }}
          >
            <Text
              style={{
                color: isCurrentUser || hasOnlyVideo ? 'rgba(255,255,255,0.7)' : '#9CA3AF',
                fontSize: 11,
                marginRight: 4,
              }}
            >
              {formatMessageDate(item.createdAt)}
            </Text>
            
            {isCurrentUser && (
              <Ionicons
                name={item.status === 'read' ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={item.status === 'read' ? '#10B981' : 'rgba(255,255,255,0.7)'}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  // Render header component for FlatList
  const renderListHeader = () => (
    <View style={{ padding: 16, alignItems: 'center' }}>
      <View
        style={{
          backgroundColor: 'rgba(147, 51, 234, 0.12)',
          padding: 8,
          borderRadius: 12,
          maxWidth: '80%',
        }}
      >
        <Text style={{ color: '#6B46C1', textAlign: 'center', fontSize: 12 }}>
          Your messages are private between you and {otherParticipant?.username || 'this user'}
        </Text>
        <Text style={{ color: '#6B46C1', textAlign: 'center', fontSize: 12, marginTop: 4 }}>
          Be paw-sitive and respectful in your conversations! 🐾
        </Text>
      </View>
    </View>
  );

  // Render floating paws in the background
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

  // Render media attachment options
  const renderAttachmentOptions = () => {
    if (!showAttachmentOptions) return null;
    
    return (
      <View className="bg-white p-4 rounded-lg border border-gray-200 absolute left-0 right-0 z-30 mx-4"
        style={{
          bottom: Platform.OS === 'ios' ? 130 : 120, // Positioned higher to avoid overlap
        }}
      >
        <View className="flex-row justify-between mb-4">
          <Text className="text-purple-900 font-medium">Attach Media</Text>
          <TouchableOpacity onPress={() => setShowAttachmentOptions(false)}>
            <AntDesign name="close" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
        
        <View className="flex-row justify-around">
          <TouchableOpacity 
            className="items-center"
            onPress={handlePickImage}
          >
            <View className="w-12 h-12 bg-purple-100 rounded-full items-center justify-center mb-1">
              <Feather name="image" size={22} color="#9333EA" />
            </View>
            <Text className="text-xs text-gray-600">Gallery</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="items-center"
            onPress={handleTakePhoto}
          >
            <View className="w-12 h-12 bg-purple-100 rounded-full items-center justify-center mb-1">
              <Feather name="camera" size={22} color="#9333EA" />
            </View>
            <Text className="text-xs text-gray-600">Camera</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="items-center"
            onPress={handlePickVideo}
          >
            <View className="w-12 h-12 bg-purple-100 rounded-full items-center justify-center mb-1">
              <Feather name="video" size={22} color="#9333EA" />
            </View>
            <Text className="text-xs text-gray-600">Video</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render selected media preview
  const renderSelectedMediaPreview = () => {
    if (selectedMedia.length === 0) return null;
    
    return (
      <View className="px-2">
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 10 }}
        >
          {selectedMedia.map((media, index) => (
            <View key={`media-${index}`} className="mr-3 relative">
              {media.type === 'image' ? (
                <Image 
                  source={{ uri: media.url }} 
                  className="w-24 h-24 rounded-lg" 
                  resizeMode="cover"
                />
              ) : media.type === 'video' ? (
                <View className="w-24 h-24 rounded-lg overflow-hidden relative">
                  {/* Use exact same structure as in createPosts.tsx */}
                  <View className="w-full h-full items-center justify-center bg-black">
                    <View className="w-full h-full">
                      <Image 
                        source={{ uri: media.url }} 
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    </View>
                    {/* Play button overlay */}
                    <View className="absolute inset-0 items-center justify-center bg-black/30">
                      <View className="bg-black/50 rounded-full w-8 h-8 items-center justify-center">
                        <Feather name="play" size={16} color="white" />
                      </View>
                    </View>
                    {/* Video indicator */}
                    <View className="absolute top-1 left-1 bg-black/60 px-2 py-0.5 rounded-full flex-row items-center">
                      <Ionicons name="videocam" size={10} color="white" />
                      <Text className="text-white text-xs ml-0.5">Video</Text>
                    </View>
                  </View>
                  
                  {/* File size indicator */}
                  <View className="absolute bottom-1 right-1 bg-purple-600 rounded-full px-1 z-10">
                    <Text className="text-white text-xs">
                      {media.size > 1024 * 1024 
                        ? `${(media.size / (1024 * 1024)).toFixed(1)}MB` 
                        : `${(media.size / 1024).toFixed(0)}KB`}
                    </Text>
                  </View>
                </View>
              ) : null}
              
              <TouchableOpacity
                className="absolute -top-2 -right-2 bg-red-500 rounded-full w-5 h-5 items-center justify-center"
                onPress={() => removeSelectedMedia(index)}
              >
                <Feather name="x" size={12} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Add this function to handle opening the image preview
  const openImagePreview = (imageUrl: string) => {
    setPreviewImage(imageUrl);
    setShowImagePreview(true);
  };

  // Add this function to handle opening the video preview
  const openVideoPreview = (videoUrl: string) => {
    setPreviewVideo(videoUrl);
    setShowVideoPreview(true);
  };

  return (
    <VideoPreviewContext.Provider value={{ openVideoPreview }}>
      <SafeAreaView className="flex-1 bg-blue-50">
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        
        {/* Animated floating paws in background */}
        {renderFloatingPaws()}
        
        {/* Header with gradient */}
        <LinearGradient
          colors={['#9333EA', '#A855F7', '#C084FC']}
          className="w-full pt-12 pb-4"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View className="flex-row items-center px-4">
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
            
            <View className="flex-row items-center flex-1 ml-3">
              <View className="relative">
                <Image
                  source={otherParticipant?.avatar ? { uri: otherParticipant.avatar } : { uri: `https://robohash.org/user?set=set4` }}
                  className="w-10 h-10 rounded-full"
                />
                {otherParticipant?.onlineStatus === 'online' && (
                  <View className="absolute bottom-0 right-0 bg-green-500 w-3 h-3 rounded-full border-2 border-white" />
                )}
              </View>
              
              <View className="ml-3">
                <View>
                  <Text className="text-white font-bold text-lg line-clamp-1">
                    {otherParticipant?.username || chatName || 'Chat'}
                  </Text>
                  <View className="flex-row items-center">
                    <View className={`w-2 h-2 rounded-full mr-1 ${otherParticipant?.onlineStatus === 'online' ? 'bg-green-400' : 'bg-gray-400'}`} />
                    <Text className="text-white text-opacity-90 text-xs">
                      {otherParticipant?.onlineStatus === 'online' 
                        ? 'Online now' 
                        : otherParticipant?.lastActive 
                          ? `Last seen ${formatLastActive(otherParticipant.lastActive)}` 
                          : 'Offline'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            
            <TouchableOpacity className="w-10 h-10 items-center justify-center">
              <MaterialCommunityIcons name="dots-vertical" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Main chat area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {/* Messages */}
          <View className="flex-1">
            {!chatState.isConnected ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#9333EA" />
                <Text className="text-gray-600 mt-4">Connecting to chat server...</Text>
              </View>
            ) : messages.length === 0 ? (
              <View className="flex-1 items-center justify-center p-6">
                <FontAwesome5 name="comment-dots" size={60} color="#C084FC" style={{ opacity: 0.7 }} />
                <Text className="text-gray-700 text-lg font-medium mt-6 text-center">
                  No messages yet
                </Text>
                <Text className="text-gray-500 text-sm mt-2 text-center">
                  Say hello to {otherParticipant?.username || 'your new friend'} to start the conversation!
                </Text>
              </View>
            ) : (
              <FlatList
                ref={messageListRef}
                data={processedMessages}
                renderItem={renderItem}
                keyExtractor={(item) => `${item._id}`}
                contentContainerStyle={{ 
                  paddingVertical: 12,
                  paddingBottom: 40
                }}
                ListHeaderComponent={renderListHeader()}
                inverted={false}
                onEndReachedThreshold={0.1}
              />
            )}
            
            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <View className="flex-row items-center px-4 py-2">
                <View className="flex-row justify-center items-center bg-purple-100 px-4 py-2 rounded-full">
                  <View className="flex-row items-center mr-2">
                    <View className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ marginRight: 2 }} />
                    <View className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ marginRight: 2, animationDelay: '0.2s' }} />
                    <View className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </View>
                  <Text className="text-purple-700 text-sm font-medium">
                    {otherParticipant?.username || 'User'} is typing...
                  </Text>
                </View>
              </View>
            )}
          </View>
          
          {/* Attachment options overlay */}
          {renderAttachmentOptions()}
          
          {/* Selected media preview - Moved outside and above the input container */}
          <View style={{
            position: 'absolute',
            bottom: Platform.OS === 'ios' ? 90 : 80,
            left: 0,
            right: 0,
            zIndex: 20
          }}>
            {renderSelectedMediaPreview()}
          </View>
          
          {/* Move the input area up by using absolute positioning */}
          <View 
            className="bg-white border-t border-gray-200 px-4 py-3"
            style={{
              position: 'absolute',
              bottom: Platform.OS === 'ios' ? 30 : 20,
              left: 0,
              right: 0,
              zIndex: 10
            }}
          >
            <View className="flex-row items-center">
              {/* Input field and buttons */}
              <View className="flex-1 bg-gray-100 rounded-full px-4 py-2 flex-row items-center">
                <TextInput
                  className="flex-1 text-base text-gray-800"
                  placeholder="Type a message..."
                  placeholderTextColor="#9CA3AF"
                  value={messageText}
                  onChangeText={setMessageText}
                  multiline
                  maxLength={500}
                />
                
                <TouchableOpacity 
                  className="ml-2"
                  onPress={() => {
                    setShowAttachmentOptions(!showAttachmentOptions);
                  }}
                >
                  <Feather name="paperclip" size={20} color="#9333EA" />
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                className="bg-purple-600 w-10 h-10 rounded-full items-center justify-center ml-2"
                onPress={handleSendMessage}
                disabled={!messageText.trim() && selectedMedia.length === 0}
                style={{
                  opacity: (messageText.trim() || selectedMedia.length > 0) ? 1 : 0.5
                }}
              >
                <Feather name="send" size={18} color="white" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Add a spacer at the bottom to prevent FlatList content from being hidden behind the input */}
          <View style={{ height: 80 }} />
        </KeyboardAvoidingView>

        {/* Image Preview Modal */}
        <Modal
          visible={showImagePreview}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowImagePreview(false)}
        >
          <View className="flex-1 bg-black/80 justify-center items-center">
            <TouchableOpacity 
              className="absolute top-12 right-5 z-10 bg-black/50 rounded-full p-2"
              onPress={() => setShowImagePreview(false)}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            
            {previewImage && (
              <View className="w-full h-full justify-center items-center px-2">
                <Image
                  source={{ uri: previewImage }}
                  style={{ width: '100%', height: '80%' }}
                  resizeMode="contain"
                />
              </View>
            )}
            
            {/* Optional: Add pinch to zoom functionality later */}
          </View>
        </Modal>

        {/* Video Preview Modal */}
        <Modal
          visible={showVideoPreview}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowVideoPreview(false)}
        >
          <View className="flex-1 bg-black/90 justify-center items-center">
            <TouchableOpacity 
              className="absolute top-12 right-5 z-10 bg-black/50 rounded-full p-2"
              onPress={() => setShowVideoPreview(false)}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            
            {previewVideo && (
              <View className="w-full h-full justify-center items-center px-2">
                <Video
                  ref={videoModalRef}
                  source={{ uri: previewVideo }}
                  style={{ width: '100%', height: '80%' }}
                  resizeMode={ResizeMode.CONTAIN}
                  useNativeControls={true}
                  isLooping={false}
                  shouldPlay={true}
                  onPlaybackStatusUpdate={(status: any) => {
                    if (status && 'didJustFinish' in status && status.didJustFinish) {
                      console.log('Video finished playing');
                    }
                  }}
                />
              </View>
            )}
            
            <View className="absolute bottom-10 left-0 right-0 flex-row justify-center">
              <TouchableOpacity 
                className="bg-white/20 rounded-full p-3 mx-2"
                onPress={() => {
                  if (videoModalRef.current) {
                    (videoModalRef.current as any).presentFullscreenPlayer();
                  }
                }}
              >
                <Feather name="maximize" size={22} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </VideoPreviewContext.Provider>
  );
};

export default ChatDetail; 