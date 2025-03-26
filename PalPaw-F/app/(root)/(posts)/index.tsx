import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions, 
  TextInput,
  ActivityIndicator 
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { usePosts } from '../../../context';
import MediaCarousel from '../../components/MediaCarousel';

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

const PostDetail = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [newComment, setNewComment] = useState('');
  const scrollY = useSharedValue(0);
  const { width } = Dimensions.get('window');
  
  // Get posts context
  const { state: postsState, likePost, unlikePost, addComment, fetchPostById, isPostLiked } = usePosts();
  const { currentPost } = postsState;
  
  // Animation for the like button
  const likeScale = useSharedValue(1);
  const likeAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: likeScale.value }]
    };
  });
  
  // Fetch post if not already in context
  useEffect(() => {
    const postId = params.id as string;
    
    // If we don't have the current post or it's a different post than the one we want to view
    if (!currentPost || currentPost.id !== postId) {
      // Fetch the post by ID
      fetchPostById(postId);
    }
  }, [params.id, currentPost, fetchPostById]);
  
  // If post is not loaded yet, show loading
  if (!currentPost) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#9333EA" />
        <Text className="mt-4 font-rubik-medium">Loading post...</Text>
      </View>
    );
  }

  // Extract tags from post
  const tags = currentPost.tags || [];
  
  // Now we can use currentPost directly from context
  const post = currentPost;

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
  
  // Handle adding a new comment
  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment = {
        id: `comment-${Date.now()}`, // Use timestamp for unique ID
        author: 'You',
        content: newComment.trim(),
        timestamp: new Date(),
        avatarUri: 'https://robohash.org/myavatar?set=set4',
        likes: 0
      };
      
      // Update global state through context
      addComment(post.id, comment);
      
      // Clear input
      setNewComment('');
    }
  };

  // Handle interactions
  const handleLikeToggle = async () => {
    // Animate like button
    likeScale.value = withSpring(1.3, { damping: 10 }, () => {
      likeScale.value = withSpring(1);
    });
    
    // Toggle like state using context
    if (isPostLiked(post.id)) {
      const success = await unlikePost(post.id);
      if (!success) {
        console.error('Failed to unlike post');
      }
    } else {
      const success = await likePost(post.id);
      if (!success) {
        console.error('Failed to like post');
      }
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

        {/* Media Content with Enhanced Display - Using MediaCarousel */}
        <MediaCarousel media={post.allMedia || []} />

        {/* User Info with Enhanced Design */}
        <View className="p-4 bg-white shadow-sm">
          <View className="flex-row items-center">
            <Image
              source={{ uri: post.authorData?.avatar || 'https://robohash.org/user123?set=set4' }}
              className="w-12 h-12 rounded-full border-2 border-purple-100"
            />
            <View className="ml-3 flex-1">
              <Text className="font-rubik-semibold text-gray-800">{post.authorData?.username || 'Unknown User'}</Text>
              <Text className="text-xs text-gray-500 font-rubik">{formatTimeAgo(post.createdAt || new Date())}</Text>
            </View>
            <TouchableOpacity className="bg-purple-100 px-4 py-2 rounded-full">
              <Text className="text-purple-600 font-rubik-medium">Follow</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Location information - beautiful design */}
        {post.location && (
          <View className="mt-2 bg-white p-4 shadow-sm">
            <LinearGradient
              colors={['rgba(147,51,234,0.05)', 'rgba(192,132,252,0.1)']}
              className="p-3 rounded-xl flex-row items-center"
            >
              <View className="bg-purple-100 p-2 rounded-full mr-3">
                <Ionicons name="location" size={20} color="#9333EA" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-purple-600 font-rubik-medium mb-1">LOCATION</Text>
                <Text className="text-sm text-gray-800 font-rubik">{post.location}</Text>
              </View>
              <TouchableOpacity className="bg-white p-2 rounded-full shadow-sm">
                <Ionicons name="navigate-outline" size={20} color="#9333EA" />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        {/* Post Content with Enhanced Typography */}
        <View className="p-4 bg-white mt-2 shadow-sm">
          {post.title && (
            <Text className="text-xl font-rubik-semibold text-gray-800 mb-2">{post.title}</Text>
          )}
          <Text className="text-gray-700 leading-6 font-rubik">{post.content}</Text>
          
          {/* Tags */}
          <View className="flex-row flex-wrap mt-4">
            {tags.length > 0 ? (
              tags.map((tag: string, index: number) => (
                <View key={index} className="bg-purple-50 px-3 py-1 rounded-full mr-2 mb-2">
                  <Text className="text-purple-600 text-xs font-rubik-medium">#{tag}</Text>
                </View>
              ))
            ) : (
              <View className="bg-purple-50 px-3 py-1 rounded-full mr-2 mb-2">
                <Text className="text-purple-600 text-xs font-rubik-medium">#NoTags</Text>
              </View>
            )}
          </View>
        </View>

        {/* Interaction Buttons with Enhanced Styling */}
        <View className="flex-row items-center justify-between px-4 py-4 bg-white mt-2 shadow-sm">
          <View className="flex-row items-center">
            <TouchableOpacity 
              className="flex-row items-center mr-6" 
              onPress={handleLikeToggle}
              activeOpacity={0.7}
            >
              <Animated.View style={likeAnimatedStyle}>
                <Ionicons 
                  name={isPostLiked(post.id) ? "heart" : "heart-outline"} 
                  size={24} 
                  color={isPostLiked(post.id) ? "#F43F5E" : "#374151"} 
                />
              </Animated.View>
              <Text className="ml-2 text-gray-600 font-rubik-medium">{Math.max(0, post.likes || 0)}</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center mr-6">
              <Ionicons name="chatbubble-outline" size={22} color="#374151" />
              <Text className="ml-2 text-gray-600 font-rubik-medium">{post.comments?.length || 0}</Text>
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
          
          {post.comments && post.comments.length > 0 ? (
            post.comments.map((comment) => (
              <Comment 
                key={comment.id}
                author={comment.author}
                content={comment.content}
                timestamp={comment.timestamp}
                avatarUri={comment.avatarUri}
                likes={comment.likes}
              />
            ))
          ) : (
            <Text className="text-center text-gray-500 py-4 font-rubik">No comments yet. Be the first to comment!</Text>
          )}
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
