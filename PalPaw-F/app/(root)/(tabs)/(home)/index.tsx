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
  RefreshControl
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
  
  // Select the main image to display
  const imageUrl = post.media && post.media.length > 0
    ? formatImageUrl(post.media[0].url)
    : `https://robohash.org/${post.id}?set=set4`;
  
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
        <View className="absolute bottom-2 right-2 bg-white bg-opacity-80 rounded-full px-2 py-0.5">
          <View className="flex-row items-center">
            <Ionicons name="heart" size={12} color="#FF2442" />
            <Text className="ml-1 text-xs font-medium">{post.likes || 0}</Text>
          </View>
        </View>
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
          <TouchableOpacity className="bg-purple-100 px-2 py-1 rounded-full">
            <Text className="text-purple-600 text-xs font-medium">View</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const HomeScreen = () => {
  const [activeTab, setActiveTab] = useState('explore');
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [refreshing, setRefreshing] = useState(false);
  
  // Get posts context
  const { 
    state: postsState, 
    fetchPosts,
    fetchFeedPosts,
    fetchUserPosts,
    setCurrentPost
  } = usePosts();
  
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
  
  // Fetch posts when component mounts or tab changes
  useEffect(() => {
    loadPosts();
  }, [activeTab]);
  
  // Function to load posts based on active tab
  const loadPosts = async () => {
    try {
      if (activeTab === 'explore') {
        await fetchFeedPosts();
      } else {
        // Fetch following posts - for now, just fetch regular posts
        // In a real app, you'd have a fetchFollowingPosts method
        await fetchPosts();
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };
  
  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadPosts();
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
  // For now, both tabs use the same post data
  const postsToDisplay = activeTab === 'explore' 
    ? postsState.feedPosts
    : postsState.feedPosts; // TODO: Replace with followingPosts when available
  
  // Split posts into left and right columns for waterfall layout
  const leftColumnPosts = postsToDisplay.filter((_, index: number) => index % 2 === 0);
  const rightColumnPosts = postsToDisplay.filter((_, index: number) => index % 2 === 1);
  
  // Check if loading
  const isLoading = postsState.loading;
  
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
              )}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </>
  );
};

export default HomeScreen;