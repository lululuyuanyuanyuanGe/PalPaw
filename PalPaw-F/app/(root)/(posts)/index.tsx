import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions, 
  TextInput,
  Platform,
  ActivityIndicator 
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { PostItem } from '../(tabs)/(profile)/types';
import { BlurView } from 'expo-blur';
import { formatImageUrl } from '../(tabs)/(profile)/renderService';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';

// Utility function to format the date/time
const formatTimeAgo = (date: string | Date) => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  
  // Convert to seconds
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec} sec ago`;
  
  // Convert to minutes
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  
  // Convert to hours
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
  
  // Convert to days
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
  
  // Convert to weeks
  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 4) return `${diffWeek} week${diffWeek !== 1 ? 's' : ''} ago`;
  
  // Format date if older
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  return past.toLocaleDateString(undefined, options);
};

// Comment component with proper timestamp
interface CommentProps {
  author: string;
  content: string;
  timestamp: string | Date;
  avatarUri: string;
  likes?: number;
}

const Comment: React.FC<CommentProps> = ({ author, content, timestamp, avatarUri, likes = 0 }) => {
  return (
    <View className="bg-white p-4 rounded-xl mb-3 shadow-sm border border-gray-50">
      <View className="flex-row items-center mb-3">
        <Image
          source={{ uri: avatarUri }}
          className="w-9 h-9 rounded-full border-2 border-purple-100"
        />
        <View className="ml-3 flex-1">
          <Text className="font-rubik-semibold text-gray-800">{author}</Text>
          <Text className="font-rubik text-xs text-gray-500">{formatTimeAgo(timestamp)}</Text>
        </View>
      </View>
      <Text className="font-rubik text-gray-700 leading-5 mb-2">{content}</Text>
      <View className="flex-row items-center mt-1">
        <TouchableOpacity className="flex-row items-center mr-4">
          <Ionicons name="heart-outline" size={16} color="#9CA3AF" />
          <Text className="ml-1 text-xs text-gray-500 font-rubik">{likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-row items-center">
          <Ionicons name="chatbubble-outline" size={14} color="#9CA3AF" />
          <Text className="ml-1 text-xs text-gray-500 font-rubik">Reply</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Create a local interface extending PostItem with createdAt
interface ExtendedPostItem extends PostItem {
  createdAt?: Date;
}

const PostDetail = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [comments, setComments] = useState<Array<{
    id: string;
    author: string;
    content: string;
    timestamp: Date;
    avatarUri: string;
    likes: number;
  }>>([]);
  const videoRef = useRef<Video>(null);
  const scrollY = useSharedValue(0);
  const { width } = Dimensions.get('window');
  
  // Parse allMedia if it exists
  const allMedia = params.allMedia ? JSON.parse(params.allMedia as string) : [];
  
  // Animation for the like button
  const likeScale = useSharedValue(1);
  const likeAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: likeScale.value }]
    };
  });

  // Animated header style based on scroll position
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 100],
      [0, 1],
      Extrapolate.CLAMP
    );
    
    return {
      opacity,
      backgroundColor: `rgba(255, 255, 255, ${opacity})`,
      borderBottomWidth: opacity > 0.5 ? 1 : 0,
      borderBottomColor: `rgba(229, 231, 235, ${opacity})`
    };
  });
  
  // Mock data using the params passed from the profile page
  const post: ExtendedPostItem = {
    id: params.id as string,
    title: params.title as string || "Adorable pets at the park today! 🐶",
    content: params.content as string || "Had an amazing time at the dog park today. Met so many cute pets and their owners. It's incredible how social and playful the dogs become when they're around each other. Looking forward to our next visit! #PetLovers #DogPark #WeekendFun",
    likes: parseInt(params.likes as string) || 143,
    mediaType: params.mediaType as 'image' | 'video' || 'image',
    mediaUrl: params.mediaUrl as string || "https://images.unsplash.com/photo-1560743641-3914f2c45636",
    thumbnailUri: params.thumbnailUri as string || "",
    image: { uri: params.imageUri as string || "https://images.unsplash.com/photo-1560743641-3914f2c45636" },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    allMedia: allMedia
  };

  // Extract hashtags from the post content
  const extractTags = (content: string) => {
    const tagRegex = /#(\w+)/g;
    const matches = content.match(tagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
  };
  
  // The tags from the post content
  const tags = extractTags(post.content || '');
  
  // Generate dynamic comments based on the post content
  useEffect(() => {
    // Only create comments if we don't already have them
    if (comments.length === 0) {
      const postContent = post.content || '';
      const mediaType = post.mediaType || 'image';
      
      // Generate comments relevant to the post content
      const generatedComments = [];
      
      // If post mentions pets/animals
      if (postContent.toLowerCase().includes('pet') || 
          postContent.toLowerCase().includes('dog') || 
          postContent.toLowerCase().includes('cat')) {
        generatedComments.push({
          id: '1',
          author: 'Jane Smith',
          content: 'Such adorable pets! I love bringing my golden retriever to that park too. Maybe we will run into each other sometime! 🐕',
          timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          avatarUri: 'https://robohash.org/user456?set=set4',
          likes: 12
        });
      }
      
      // If it's a video post
      if (mediaType === 'video') {
        generatedComments.push({
          id: '2',
          author: 'Mark Thompson',
          content: 'Great video quality! Which camera did you use to record this?',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          avatarUri: 'https://robohash.org/user789?set=set4',
          likes: 5
        });
      }
      
      // Add a generic comment
      generatedComments.push({
        id: generatedComments.length + 1 + '',
        author: 'Samantha Lee',
        content: postContent.length > 100 
          ? 'I love the detailed description! Thanks for sharing this wonderful moment with us.' 
          : 'Great post! Thanks for sharing.',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        avatarUri: 'https://robohash.org/user101?set=set4',
        likes: 8
      });
      
      setComments(generatedComments);
    }
  }, [post.content, post.mediaType, comments.length]);
  
  // Handle video playback
  const handlePlayPress = () => {
    if (isPlaying) {
      videoRef.current?.pauseAsync();
    } else {
      videoRef.current?.playAsync();
    }
    setIsPlaying(!isPlaying);
  };
  
  // Handle video status update
  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setLoading(false);
      // Update playing state based on video status
      setIsPlaying(status.isPlaying);
    }
  };
  
  // Handle like press with animation
  const handleLikePress = () => {
    likeScale.value = withSpring(1.3, { damping: 10 }, () => {
      likeScale.value = withSpring(1);
    });
    setLiked(!liked);
  };
  
  // Handle mute toggle
  const handleMutePress = () => {
    if (videoRef.current) {
      videoRef.current.setIsMutedAsync(!isMuted);
      setIsMuted(!isMuted);
    }
  };
  
  // Add a new comment
  const [newComment, setNewComment] = useState('');
  
  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment = {
        id: (comments.length + 1).toString(),
        author: 'You',
        content: newComment.trim(),
        timestamp: new Date(),
        avatarUri: 'https://robohash.org/myavatar?set=set4',
        likes: 0
      };
      
      setComments([comment, ...comments]);
      setNewComment('');
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      {/* Animated Header */}
      <Animated.View 
        className="absolute top-0 left-0 right-0 z-10 flex-row items-center px-4 pt-12 pb-4"
        style={headerAnimatedStyle}
      >
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-rubik-medium text-gray-800 ml-2">{post.title?.substring(0, 20)}...</Text>
      </Animated.View>
      
      <ScrollView 
        className="flex-1 bg-gray-50"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(event) => {
          scrollY.value = event.nativeEvent.contentOffset.y;
        }}
      >
        {/* Custom Header - For the top of the screen only */}
        <View className="bg-white shadow-sm">
          <View className="flex-row items-center px-4 pt-12 pb-4">
            <TouchableOpacity onPress={() => router.back()} className="p-2">
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="flex-1 text-lg font-rubik-medium text-gray-800 ml-2">Post Details</Text>
          </View>
        </View>

        {/* Media Content with Enhanced Display */}
        <View className="w-full aspect-square">
          {post.mediaType === 'video' ? (
            <View className="w-full h-full bg-black">
              {loading && (
                <View className="absolute inset-0 items-center justify-center bg-black">
                  <ActivityIndicator size="large" color="#9333EA" />
                </View>
              )}
              
              <Video
                ref={videoRef}
                source={{ uri: post.mediaUrl || '' }}
                resizeMode={ResizeMode.COVER}
                style={{ width: '100%', height: '100%' }}
                shouldPlay={false}
                isLooping
                onPlaybackStatusUpdate={onPlaybackStatusUpdate}
                useNativeControls={isPlaying}
              />
              
              {!isPlaying && (
                <View className="absolute inset-0">
                  <Image
                    source={{ uri: post.thumbnailUri || post.mediaUrl || '' }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)']}
                    className="absolute inset-0"
                  />
                  <TouchableOpacity
                    onPress={handlePlayPress}
                    className="absolute inset-0 items-center justify-center"
                  >
                    <LinearGradient
                      colors={['rgba(147,51,234,0.8)', 'rgba(192,132,252,0.8)']}
                      className="w-16 h-16 rounded-full items-center justify-center shadow-lg"
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="play" size={36} color="white" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Video Controls Overlay */}
              {isPlaying && (
                <View className="absolute bottom-4 right-4 flex-row">
                  <TouchableOpacity 
                    className="bg-black/60 rounded-full p-2 mr-2"
                    onPress={handleMutePress}
                  >
                    <Ionicons name={isMuted ? "volume-mute" : "volume-medium"} size={20} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    className="bg-black/60 rounded-full p-2"
                    onPress={handlePlayPress}
                  >
                    <Ionicons name="pause" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Video indicator */}
              <View className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-full flex-row items-center">
                <Ionicons name="videocam" size={12} color="white" />
                <Text className="text-white text-xs ml-1 font-rubik">Video</Text>
              </View>
            </View>
          ) : (
            <View className="w-full h-full">
              <Image
                source={{ uri: post.image?.uri || post.mediaUrl }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
              {/* Image indicator */}
              <View className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-full flex-row items-center">
                <Ionicons name="image" size={12} color="white" />
                <Text className="text-white text-xs ml-1 font-rubik">Photo</Text>
              </View>
            </View>
          )}
        </View>

        {/* User Info with Enhanced Design */}
        <View className="p-4 bg-white shadow-sm">
          <View className="flex-row items-center">
            <Image
              source={{ uri: 'https://robohash.org/user123?set=set4' }}
              className="w-12 h-12 rounded-full border-2 border-purple-100"
            />
            <View className="ml-3 flex-1">
              <Text className="font-rubik-semibold text-gray-800">John Doe</Text>
              <Text className="text-xs text-gray-500 font-rubik">{formatTimeAgo(post.createdAt || new Date())}</Text>
            </View>
            <TouchableOpacity className="bg-purple-100 px-4 py-2 rounded-full">
              <Text className="text-purple-600 font-rubik-medium">Follow</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Post Content with Enhanced Typography */}
        <View className="p-4 bg-white mt-2 shadow-sm">
          {post.title && (
            <Text className="text-xl font-rubik-semibold text-gray-800 mb-2">{post.title}</Text>
          )}
          <Text className="text-gray-700 leading-6 font-rubik">{post.content}</Text>
          
          {/* Tags */}
          <View className="flex-row flex-wrap mt-4">
            {tags.length > 0 ? (
              tags.map((tag, index) => (
                <View key={index} className="bg-purple-50 px-3 py-1 rounded-full mr-2 mb-2">
                  <Text className="text-purple-600 text-xs font-rubik-medium">#{tag}</Text>
                </View>
              ))
            ) : (
              <>
                <View className="bg-purple-50 px-3 py-1 rounded-full mr-2 mb-2">
                  <Text className="text-purple-600 text-xs font-rubik-medium">#PetLovers</Text>
                </View>
                <View className="bg-purple-50 px-3 py-1 rounded-full mr-2 mb-2">
                  <Text className="text-purple-600 text-xs font-rubik-medium">#DogPark</Text>
                </View>
                <View className="bg-purple-50 px-3 py-1 rounded-full mr-2 mb-2">
                  <Text className="text-purple-600 text-xs font-rubik-medium">#WeekendFun</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Interaction Buttons with Enhanced Styling */}
        <View className="flex-row items-center justify-between px-4 py-4 bg-white mt-2 shadow-sm">
          <View className="flex-row items-center">
            <TouchableOpacity 
              className="flex-row items-center mr-6" 
              onPress={handleLikePress}
              activeOpacity={0.7}
            >
              <Animated.View style={likeAnimatedStyle}>
                <Ionicons 
                  name={liked ? "heart" : "heart-outline"} 
                  size={24} 
                  color={liked ? "#F43F5E" : "#374151"} 
                />
              </Animated.View>
              <Text className="ml-2 text-gray-600 font-rubik-medium">{liked ? (post.likes || 0) + 1 : (post.likes || 0)}</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center mr-6">
              <Ionicons name="chatbubble-outline" size={22} color="#374151" />
              <Text className="ml-2 text-gray-600 font-rubik-medium">{comments.length}</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center">
              <Ionicons name="bookmark-outline" size={22} color="#374151" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity className="flex-row items-center">
            <LinearGradient
              colors={['#9333EA', '#C084FC']}
              className="rounded-full p-2"
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="share-social-outline" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Comments Section with Enhanced Design */}
        <View className="p-4 bg-white mt-2 mb-2 shadow-sm">
          <Text className="font-rubik-semibold text-gray-800 mb-4 text-lg">Comments</Text>
          
          {comments.map((comment) => (
            <Comment 
              key={comment.id}
              author={comment.author}
              content={comment.content}
              timestamp={comment.timestamp}
              avatarUri={comment.avatarUri}
              likes={comment.likes}
            />
          ))}
        </View>
        
        {/* Bottom padding for comment input */}
        <View className="h-20" />
      </ScrollView>

      {/* Comment Input with Enhanced UI */}
      <View className="bg-white border-t border-gray-100 px-4 py-3 absolute bottom-0 left-0 right-0 shadow-up">
        <View className="flex-row items-center">
          <Image
            source={{ uri: 'https://robohash.org/myavatar?set=set4' }}
            className="w-8 h-8 rounded-full mr-3"
          />
          <View className="flex-1 flex-row items-center bg-gray-100 rounded-full px-4 py-2">
            <TextInput
              placeholder="Add a comment..."
              className="flex-1 text-gray-700 font-rubik"
              placeholderTextColor="#9CA3AF"
              value={newComment}
              onChangeText={setNewComment}
            />
            <TouchableOpacity onPress={handleAddComment}>
              <Ionicons name="send" size={20} color="#9333EA" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </>
  );
};

export default PostDetail;
