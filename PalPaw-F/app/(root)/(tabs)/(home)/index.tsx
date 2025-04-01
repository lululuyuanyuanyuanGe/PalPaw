import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar, 
  Dimensions,
  Platform,
  PixelRatio,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { usePosts } from '@/context';
import { PostItem } from '../(profile)/types';
import { formatImageUrl } from '@/utils/mediaUtils';

// Get screen dimensions for responsive sizing and account for pixel density
const { width: screenWidth } = Dimensions.get('window');
const pixelDensity = PixelRatio.get();
// Adjust card width based on platform - iOS needs slightly different calculations
const cardWidth = Platform.OS === 'ios' 
  ? (screenWidth / 2) - 14 
  : (screenWidth / 2) - 12;

// Card component with platform-specific rendering
const Card = ({ post, onPress, index }: { post: PostItem, onPress: (post: PostItem) => void, index: number }) => {
  // Calculate a varied aspect ratio based on post index for visual interest
  // This creates a more natural waterfall effect with varying heights
  const getAspectRatio = () => {
    const baseRatio = 1.2; // Default ratio
    
    // Create variations based on index for more visual interest
    const variations = [0.9, 1.0, 1.2, 1.4, 1.0];
    const variation = variations[index % variations.length];
    
    // Add slight randomness based on post id (but consistent for same post)
    const idVariation = (parseInt(post.id.substring(0, 8), 16) % 30) / 100; // Small variation 0-0.3
    
    return baseRatio * variation + idVariation;
  };
  
  // Calculate height using the dynamic aspect ratio
  const aspectRatio = getAspectRatio();
  const imageHeight = cardWidth / aspectRatio;
  
  // Process media properly to handle both images and videos
  // Select the main image to display, handling videos appropriately
  const getMediaUrl = () => {
    if (!post.media || post.media.length === 0) {
      return `https://robohash.org/${post.id}?set=set4`;
    }
    
    const firstMedia = post.media[0];
    
    // Check if it's a video
    const isVideo = 
      (typeof firstMedia === 'object' && firstMedia.type === 'video') ||
      (typeof firstMedia === 'string' && firstMedia.match(/\.(mp4|mov|avi|wmv)$/i));
      
    // If it's a video, use the thumbnail if available
    if (isVideo && typeof firstMedia === 'object') {
      // Use thumbnail if available, otherwise use a video placeholder
      if (firstMedia.thumbnail) {
        return formatImageUrl(firstMedia.thumbnail);
      } else {
        return 'https://via.placeholder.com/300x200/000000/FFFFFF?text=Video';
      }
    }
    
    // Otherwise just use the regular formatImageUrl
    return formatImageUrl(
      typeof firstMedia === 'object' ? firstMedia.url : firstMedia
    );
  };
  
  const imageUrl = getMediaUrl();
  
  // Determine if this is a video for displaying an indicator
  const isVideo = post.media && post.media.length > 0 && (
    (typeof post.media[0] === 'object' && post.media[0].type === 'video') ||
    (typeof post.media[0] === 'string' && post.media[0].match(/\.(mp4|mov|avi|wmv)$/i))
  );
  
  return (
    <TouchableOpacity 
      className="bg-white rounded-xl shadow-sm overflow-hidden border border-pink-50 w-full mb-3"
      onPress={() => onPress(post)}
      activeOpacity={0.9}
    >
      <View className="relative">
        <Image 
          source={{ uri: imageUrl }} 
          style={{
            width: cardWidth,
            height: imageHeight,
          }}
          className="w-full"
          resizeMode="cover" 
        />
        <View className="absolute bottom-2 right-2 bg-purple-100 bg-opacity-90 rounded-full px-2 py-0.5 flex-row shadow-sm">
          <View className="flex-row items-center mr-2">
            <Ionicons name="eye-outline" size={12} color="#9333EA" />
            <Text className="ml-1 text-xs font-medium text-purple-800">{post.views || 0}</Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="heart" size={12} color="#FF2442" />
            <Text className="ml-1 text-xs font-medium text-purple-800">{post.likes || 0}</Text>
          </View>
        </View>
        
        {/* Video indicator badge */}
        {isVideo && (
          <View className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded-full flex-row items-center">
            <Ionicons name="videocam" size={12} color="white" />
            <Text className="text-white text-xs ml-1">Video</Text>
          </View>
        )}
      </View>
      <View className="p-3">
        <Text className="font-medium text-gray-800 text-sm" numberOfLines={2}>
          {post.content || "No caption"}
        </Text>
        <View className="mt-2 flex-row justify-between items-center">
          <View className="flex-row items-center">
            <Image 
              source={{ uri: formatImageUrl(post.authorData?.avatar) || `https://robohash.org/${post.userId}?set=set4` }} 
              style={{
                width: 20,
                height: 20,
                borderRadius: 10
              }}
            />
            <Text className="ml-1 text-xs text-gray-600">{post.authorData?.username || "User"}</Text>
          </View>
          <TouchableOpacity 
            className="bg-purple-100 px-2 py-1 rounded-full"
            onPress={() => onPress(post)}
            activeOpacity={0.7}
          >
            <Text className="text-purple-600 text-xs font-medium">View</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const HomeScreen = () => {
  const [activeTab, setActiveTab] = useState<'explore' | 'follow'>('explore');
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Refs to track last refresh time for each tab
  const lastRefreshTimeRef = useRef<{
    explore: number | null,
    follow: number | null
  }>({
    explore: null,
    follow: null
  });
  
  // Get posts context
  const { 
    state: postsState, 
    fetchPosts,
    fetchFeedPosts,
    fetchFriendsPosts,
    setCurrentPost
  } = usePosts();
  
  // Helper function to check if refresh is needed (5 minute threshold)
  const shouldRefresh = (tab: 'explore' | 'follow'): boolean => {
    const lastRefreshTime = lastRefreshTimeRef.current[tab];
    
    // If never refreshed before, should refresh
    if (lastRefreshTime === null) return true;
    
    const currentTime = Date.now();
    const fiveMinutesInMs = 5 * 60 * 1000;
    
    // Return true if more than 5 minutes have passed since last refresh
    return (currentTime - lastRefreshTime) > fiveMinutesInMs;
  };
  
  // Update last refresh time for current tab
  const updateLastRefreshTime = (tab: 'explore' | 'follow') => {
    lastRefreshTimeRef.current[tab] = Date.now();
    console.log(`Updated last refresh time for ${tab} tab: ${new Date().toLocaleTimeString()}`);
  };
  
  // Handle device rotation or dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener(
      'change',
      ({ window }) => {
        setDimensions(window);
      }
    );
    return () => subscription.remove();
  }, []);
  
  // Check if we need to refresh when tab changes
  useEffect(() => {
    if (shouldRefresh(activeTab)) {
      console.log(`Tab changed to ${activeTab}. More than 5 minutes since last refresh, loading fresh data.`);
      loadPosts();
    } else {
      console.log(`Tab changed to ${activeTab}. Using cached data (less than 5 minutes old).`);
      // If we have data but don't need to refresh, just clear any errors
      setLoadError(null);
    }
  }, [activeTab]);
  
  // Function to load posts based on active tab
  const loadPosts = async (forceRefresh = false) => {
    // Skip if not forcing refresh and we refreshed recently
    if (!forceRefresh && !shouldRefresh(activeTab)) {
      console.log(`Skipping refresh for ${activeTab} tab - last refresh was less than 5 minutes ago`);
      return;
    }
    
    setIsLoading(true);
    setLoadError(null);
    
    try {
      if (activeTab === 'explore') {
        await fetchFeedPosts();
        // Update last refresh time
        updateLastRefreshTime('explore');
      } else {
        try {
          await fetchFriendsPosts();
          // Update last refresh time
          updateLastRefreshTime('follow');
        } catch (friendsError) {
          console.error('Error fetching friends posts:', friendsError);
          setLoadError('Could not load friends posts. Showing recommended posts instead.');
          // Fall back to feed posts if friends posts fails
          await fetchFeedPosts();
        }
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      setLoadError('Could not load posts. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle manual refresh - always force refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadPosts(true); // Pass true to force refresh regardless of time
    } catch (error) {
      console.error('Error refreshing posts:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  // Handle post press
  const handlePostPress = (post: PostItem) => {
    setCurrentPost(post);
    router.push({
      pathname: '/(root)/(posts)',
      params: { id: post.id }
    });
  };
  
  // Get the appropriate posts based on active tab
  const postsToDisplay = activeTab === 'explore' 
    ? (postsState.feedPosts || [])
    : (postsState.friendsPosts || []);
  
  console.log(`Home: Found ${postsToDisplay?.length || 0} posts to display in ${activeTab} tab`);
  
  // Split posts into left and right columns for waterfall layout
  const leftColumnPosts = postsToDisplay ? postsToDisplay.filter((_, index) => index % 2 === 0) : [];
  const rightColumnPosts = postsToDisplay ? postsToDisplay.filter((_, index) => index % 2 === 1) : [];
  
  console.log(`Home: Split into ${leftColumnPosts.length} left and ${rightColumnPosts.length} right posts`);
  
  return (
    <>
      {/* Use a StatusBar component to set status bar style */}
      <StatusBar 
        translucent
        backgroundColor="transparent" 
        barStyle="light-content" 
      />
      
      {/* Wrap everything in SafeAreaView with proper edges */}
      <SafeAreaView className="flex-1 bg-purple-500" style={{ paddingTop: Constants.statusBarHeight }}>
        <View className="flex-1">
          {/* Fixed Header - Always stays at the top */}
          <View className="bg-purple-500 px-4 py-2 shadow-md z-10">
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center">
                <DrawerToggleButton tintColor="#fff" />
                <Text className="text-white text-xl font-bold ml-2">PalPaw</Text>
              </View>
              <TouchableOpacity onPress={() => router.push("/searchPosts")}>
                <View className="h-10 w-10 bg-white rounded-full items-center justify-center">
                  <Feather name="search" size={20} color="#A855F7" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Scrollable Content - Tabs and content scroll together */}
          <ScrollView 
            className="flex-1 bg-blue-50"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#9333EA']}
                tintColor="#9333EA"
              />
            }
          >
            {/* Tab Bar */}
            <View className="bg-purple-500 px-4 pb-4 border-b-4 border-pink-500">
              <View className="flex-row bg-purple-400 rounded-full p-1 mx-4">
                <TouchableOpacity 
                  onPress={() => setActiveTab('follow')}
                  className={`flex-1 py-2 rounded-full flex-row items-center justify-center ${
                    activeTab === 'follow' 
                      ? 'bg-white' 
                      : ''
                  }`}
                >
                  <Feather 
                    name="users" 
                    size={16} 
                    color={activeTab === 'follow' ? '#9333EA' : '#fff'} 
                  />
                  <Text 
                    className={`ml-1 ${
                      activeTab === 'follow' 
                        ? 'text-purple-600 font-medium' 
                        : 'text-white'
                    }`}
                  >
                    Followed
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setActiveTab('explore')}
                  className={`flex-1 py-2 rounded-full flex-row items-center justify-center ${
                    activeTab === 'explore' 
                      ? 'bg-white' 
                      : ''
                  }`}
                >
                  <Feather 
                    name="compass" 
                    size={16} 
                    color={activeTab === 'explore' ? '#9333EA' : '#fff'} 
                  />
                  <Text 
                    className={`ml-1 ${
                      activeTab === 'explore' 
                        ? 'text-purple-600 font-medium' 
                        : 'text-white'
                    }`}
                  >
                    Discovery
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Main Content */}
            <View className="px-4 pt-4 pb-20">
              <Text className="text-lg font-bold text-gray-800 mb-3">
                {activeTab === 'follow' ? 'Latest from Friends' : 'Trending Posts'}
              </Text>
              
              {isLoading ? (
                <View className="items-center justify-center py-20">
                  <ActivityIndicator size="large" color="#9333EA" />
                  <Text className="text-purple-600 mt-4 font-medium">Loading posts...</Text>
                </View>
              ) : postsToDisplay.length === 0 ? (
                <View className="items-center justify-center py-20">
                  <MaterialCommunityIcons name="post-outline" size={60} color="#D1D5DB" />
                  <Text className="text-gray-500 mt-4 text-center">
                    {activeTab === 'follow' 
                      ? "Follow people to see their posts here!" 
                      : "No posts found. Check back later!"}
                  </Text>
                </View>
              ) : (
                <>
                  {loadError && (
                    <View className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                      <Text className="text-red-600">{loadError}</Text>
                    </View>
                  )}
                  <View className="flex-row justify-between">
                    {/* Left column */}
                    <View className="w-[48%]">
                      {leftColumnPosts.map((post, index) => (
                        <Card key={post.id} post={post} onPress={handlePostPress} index={index * 2} />
                      ))}
                    </View>
                    
                    {/* Right column */}
                    <View className="w-[48%]">
                      {rightColumnPosts.map((post, index) => (
                        <Card key={post.id} post={post} onPress={handlePostPress} index={index * 2 + 1} />
                      ))}
                    </View>
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    padding: 15,
    backgroundColor: '#FFF6F5',
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
  },
});

export default HomeScreen;