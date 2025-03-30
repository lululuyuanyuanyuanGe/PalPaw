import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  TextInput,
  ActivityIndicator 
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { usePosts, useUser } from '@/context';
import MediaCarousel from '@/app/components/MediaCarousel';
import { useAuth } from '@/context';
import { FontAwesome5 } from '@expo/vector-icons';
import { formatImageUrl } from '@/utils/mediaUtils';

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
  author: string | { id: string; username: string; avatar: string };
  content: string;
  timestamp: string | Date;
  avatarUri: string;
  likes?: number;
}

const Comment: React.FC<CommentProps> = ({ author, content, timestamp, avatarUri, likes = 0 }) => {
  // Get auth context to check if the comment author is the current user
  const { state: authState } = useAuth();
  const router = useRouter();
  
  // Extract author name based on whether it's a string or object
  const authorName = typeof author === 'string' ? author : author?.username || 'Unknown';
  
  // Extract author ID if author is an object
  const authorId = typeof author === 'object' && author?.id ? author.id : null;
  
  // Use author's avatar if author is an object and has avatar property
  const displayAvatarUri = typeof author === 'object' && author?.avatar 
    ? author.avatar 
    : avatarUri || `https://robohash.org/${authorName}?set=set4`;
  
  // Check if this comment is by the current user
  const isCurrentUser = authState.isAuthenticated && 
    ((typeof author === 'object' && author?.id === authState.user?.id) || 
     (typeof author === 'string' && author === authState.user?.username));
  
  return (
    <View className="bg-white p-4 rounded-xl mb-3 shadow-sm border border-gray-50">
      <View className="flex-row items-center mb-3">
        <TouchableOpacity
          activeOpacity={isCurrentUser || !authorId ? 1 : 0.7}
          onPress={() => {
            // Only navigate if this is not the current user and we have an author ID
            if (authorId && (!authState.isAuthenticated || !isCurrentUser)) {
              router.push({
                pathname: "/(root)/(userProfile)" as any,
                params: { userId: authorId }
              });
            }
          }}
          className="flex-row items-center flex-1"
        >
          <Image
            source={{ uri: formatImageUrl(displayAvatarUri) }}
            className="w-9 h-9 rounded-full border-2 border-purple-100"
          />
          <View className="ml-3 flex-1">
            <Text className="font-rubik-semibold text-gray-800">{authorName}</Text>
            <Text className="font-rubik text-xs text-gray-500">{formatTimeAgo(timestamp)}</Text>
          </View>
        </TouchableOpacity>
      </View>
      <Text className="font-rubik text-gray-700 leading-5 mb-2">{content}</Text>
    </View>
  );
};

const PostDetail = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [newComment, setNewComment] = useState('');
  const scrollY = useSharedValue(0);
  
  // Get posts context with all post arrays
  const { 
    state: { currentPost },
    likePost, 
    unlikePost,
    fetchPostById,
    isPostLiked,
    addComment,
    fetchUserPosts
  } = usePosts();
  const { userPosts, feedPosts, likedPosts } = usePosts().state;
  
  // Get user context for profile data and follow functionality
  const { state: userState, followUser, unfollowUser } = useUser();
  
  // Get auth context for authentication status
  const { state: authState } = useAuth();
  
  // Combine user data from both contexts
  const userData = userState.profile || authState.user;
  
  // Find post in all collections in priority order
  const postId = params.id as string;
  const post = currentPost?.id === postId 
    ? currentPost 
    : userPosts?.find(p => p.id === postId) 
      || (Array.isArray(feedPosts) ? feedPosts.find(p => p.id === postId) : undefined)
      || (Array.isArray(likedPosts) ? likedPosts.find(p => p.id === postId) : undefined);
  
  // Animation for the like button
  const likeScale = useSharedValue(1);
  const likeAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: likeScale.value }]
    };
  });

  // Animation for the follow button
  const followScale = useSharedValue(1);
  const followAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: followScale.value }]
    };
  });
  
  // Check if the current user is following the post author
  const isFollowingAuthor = React.useMemo(() => {
    if (!userData || !post?.authorData) return false;
    
    // Get the following array from the user profile
    const following = userState.profile?.following || [];
    console.log('Following array:', following);
    console.log('Author ID:', post.authorData.id);
    
    // Check if the author's ID is in the following array
    return following.includes(post.authorData.id);
  }, [userData, post, userState.profile?.following]);
  
  // Add local state for follow button to provide immediate feedback
  const [isFollowing, setIsFollowing] = useState(isFollowingAuthor);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  
  // Update local follow state when the memo value changes
  useEffect(() => {
    setIsFollowing(isFollowingAuthor);
  }, [isFollowingAuthor]);

  // Handle follow toggle with immediate UI feedback
  const handleFollowToggle = async () => {
    if (!authState.isAuthenticated) {
      // Redirect to login if not authenticated
      router.push('/(root)/(auth)/login');
      return;
    }

    if (!post?.authorData?.id) {
      console.error('No author ID available');
      return;
    }

    // Don't allow following yourself
    if (post.authorData.id === userData?.id) {
      console.log('Cannot follow yourself');
      return;
    }

    // Animate follow button with more noticeable feedback
    followScale.value = withSpring(1.2, { damping: 8 }, () => {
      followScale.value = withSpring(1);
    });

    // Set loading state and update UI immediately
    setIsFollowLoading(true);
    setIsFollowing(!isFollowing); // Optimistic UI update

    try {
      console.log('Toggling follow status for user:', post.authorData.id);
      console.log('Current follow state:', isFollowing);
      
      if (isFollowing) {
        console.log('Unfollowing user...');
        await unfollowUser(post.authorData.id);
        console.log('Unfollow successful');
      } else {
        console.log('Following user...');
        await followUser(post.authorData.id);
        console.log('Follow successful');
      }
    } catch (error) {
      console.error('Error toggling follow status:', error);
      // Revert optimistic update on error
      setIsFollowing(isFollowing);
      // Show error to user (could add a toast notification here)
    } finally {
      setIsFollowLoading(false);
    }
  };
  
  // Use useFocusEffect to ensure the post is fetched every time the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (postId) {
        console.log('Post screen focused - fetching post with ID:', postId);
        // If we don't have the post in any of our collections, fetch it
        if (!post) {
          fetchPostById(postId);
        }
      }
      
      return () => {
        // Optional cleanup if needed
      };
    }, [postId, post, fetchPostById])
  );
  
  // If post is not loaded yet, show loading
  if (!post) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#9333EA" />
        <Text className="mt-4 font-rubik-medium">Loading post...</Text>
      </View>
    );
  }

  // Extract tags from post
  const tags = post.tags || [];

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
  const handleAddComment = async () => {
    if (!authState.isAuthenticated) {
      // Redirect to login if not authenticated
      router.push('/(root)/(auth)/login');
      return;
    }
    
    if (newComment.trim()) {
      // Create a temporary comment object for optimistic UI
      const comment = {
        id: `temp-${Date.now()}`,
        author: authState.user?.username || 'You',
        content: newComment.trim(),
        timestamp: new Date(),
        avatarUri: authState.user?.avatar || '',
        likes: 0
      };
      
      // Clear input right away for better UX
      setNewComment('');
      
      // Update global state through context
      const success = await addComment(post.id, comment as any);
      
      if (!success) {
        // Handle failure - possibly show an error toast/notification
        console.error('Failed to add comment');
        
        // Could restore the comment text if desired
        // setNewComment(comment.content);
      }
    }
  };

  // Handle like toggle
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

  // Add this inside the component after the useEffect hooks
  // This will increment the view count when the post detail page loads
  const viewIncremented = useRef(false);
  useEffect(() => {
    // Post views are already incremented by the backend when post is fetched
    // So we don't need to explicitly call incrementPostViews
    if (post && post.id && !viewIncremented.current) {
      console.log('Post loaded with ID:', post.id);
      viewIncremented.current = true;
      
      // No need to call incrementPostViews as the view is counted
      // when the post is fetched via getPostById in the backend
    }
  }, [post]);

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
            <TouchableOpacity 
              className="flex-row items-center flex-1"
              onPress={() => {
                // Allow navigation for non-authenticated users
                // Only prevent navigation if this is the current user's post
                if (!authState.isAuthenticated || post.authorData?.id !== userData?.id) {
                  router.push({
                    pathname: "/(root)/(userProfile)" as any,
                    params: { userId: post.authorData?.id }
                  });
                }
              }}
              activeOpacity={post.authorData?.id === userData?.id ? 1 : 0.7}
            >
              <View className="w-12 h-12 rounded-full border-2 border-purple-100 overflow-hidden">
                <Image
                  source={{ uri: formatImageUrl(post.authorData?.avatar) || 'https://robohash.org/user123?set=set4' }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </View>
              <View className="ml-3 flex-1">
                <Text className="font-rubik-semibold text-gray-800">{post.authorData?.username || 'Unknown User'}</Text>
                <Text className="text-xs text-gray-500 font-rubik">{formatTimeAgo(post.createdAt || new Date())}</Text>
              </View>
            </TouchableOpacity>
            
            {/* Only show follow button if it's not the current user's post */}
            {authState.isAuthenticated && post.authorData?.id !== userData?.id && (
              <Animated.View style={followAnimatedStyle}>
                <TouchableOpacity 
                  className={`px-4 py-2 rounded-full ${isFollowing ? 'bg-purple-100' : 'bg-purple-600'}`}
                  onPress={handleFollowToggle}
                  activeOpacity={0.6}
                  disabled={isFollowLoading}
                >
                  {isFollowLoading ? (
                    <ActivityIndicator size="small" color={isFollowing ? '#9333EA' : '#ffffff'} />
                  ) : (
                    <View className="flex-row items-center">
                      <Text 
                        className={`font-rubik-medium ${isFollowing ? 'text-purple-600' : 'text-white'}`}
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </Text>
                      {isFollowing && (
                        <Ionicons name="checkmark" size={14} color="#9333EA" style={{ marginLeft: 2 }} />
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            )}
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
            <View className="flex-row items-center mr-6">
              <Ionicons name="eye-outline" size={22} color="#374151" />
              <Text className="ml-2 text-gray-600 font-rubik-medium">{Math.max(0, post.views || 0)}</Text>
            </View>
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
      <View className="bg-white border-t border-gray-100 px-4 py-3 absolute bottom-0 left-0 right-0">
        <View className="flex-row items-center">
          {authState.isAuthenticated && userData ? (
            userData.avatar ? (
              <Image
                source={{ uri: formatImageUrl(userData.avatar) }}
                className="w-8 h-8 rounded-full mr-3"
                defaultSource={require('../../../assets/images/cat1.jpg')}
              />
            ) : (
              <View className="w-8 h-8 bg-purple-100 rounded-full mr-3 items-center justify-center">
                <Text className="text-purple-700 font-bold text-xs">
                  {userData.username?.substring(0, 1).toUpperCase() || "?"}
                </Text>
              </View>
            )
          ) : (
            <View className="w-8 h-8 bg-purple-100 rounded-full mr-3 items-center justify-center">
              <FontAwesome5 name="paw" size={12} color="#9333EA" />
            </View>
          )}
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
