import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Feather} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { DrawerToggleButton } from "@react-navigation/drawer";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { 
  formatImageUrl, 
  fetchUserProducts,
} from "./renderService";
import {
  BaseItem,
  PostItem,
  ProductItem,
  User,
  isPostItem,
  isProductItem,
  newPostButton,
  newProductButton,
  ProfileTab
} from "./types";
import { RenderItem } from './ProfileRenderer';
import { usePosts } from "@/context";
import AuthPrompt from "@/app/components/AuthPrompt";

// TODO: Create a separate UserContext to manage user data, similar to PostsContext
// This is a temporary placeholder for what would be in the UserContext
const useUserData = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const loadUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return null;
      }
      
      const userData = JSON.parse(userDataStr);
      setUser({
        id: userData.id || 'unknown',
        username: userData.username || 'User',
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        avatar: userData.avatar || '',
        bio: userData.bio || "Hello! I'm a PalPaw user.",
        email: userData.email || '',
        stats: {
          posts: 0,
          followers: userData.followers || 0,
          following: userData.following || 0,
          products: 0
        }
      });
      setIsAuthenticated(true);
      setIsLoading(false);
      return userData.id;
    } catch (err) {
      console.error("Error loading user data:", err);
      setError("Failed to load user data");
      setIsAuthenticated(false);
      setIsLoading(false);
      return null;
    }
  }, []);
  
  const logout = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
      setUser(null);
      setIsAuthenticated(false);
    } catch (err) {
      console.error("Error logging out:", err);
      setError("Failed to logout");
    }
  }, []);
  
  // Update user stats
  const updateUserStats = useCallback((postCount: number, productCount: number) => {
    setUser(prevUser => {
      if (!prevUser) return prevUser;
      return {
        ...prevUser,
        stats: {
          ...prevUser.stats,
          posts: postCount,
          products: productCount
        }
      };
    });
  }, []);
  
  return {
    user,
    isLoading,
    isAuthenticated,
    error,
    loadUser,
    logout,
    updateUserStats
  };
};

const ProfileScreen = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [postsLoading, setPostsLoading] = useState<boolean>(false);
  
  // Get status bar height for proper spacing
  const statusBarHeight = Constants.statusBarHeight || 0;
  
  // Use the temporary UserContext placeholder
  const { 
    user, 
    isLoading, 
    isAuthenticated, 
    loadUser, 
    logout, 
    updateUserStats 
  } = useUserData();
  
  // Use PostsContext for post data
  const { 
    fetchUserPosts,
    fetchLikedPosts,
    state,
    setCurrentPost,
    likePost,
    unlikePost,
    isPostLiked
  } = usePosts();
  const { userPosts, likedPosts, likedPostIds } = state;
  
  // Ref to track last data fetch time to prevent too frequent refreshes
  const lastFetchTime = useRef(0);
  
  // Load user data on mount
  useEffect(() => {
    const initUser = async () => {
      const userId = await loadUser();
      if (userId) {
        // Initial data load
        fetchUserData(userId);
      }
    };
    
    initUser();
  }, []);
  
  // Fetch user data (posts and liked posts)
  const fetchUserData = async (userId: string) => {
    setPostsLoading(true);
    
    try {
      // Fetch user posts
      await fetchUserPosts(userId);
      
      // Fetch liked posts
      await fetchLikedPosts(userId);
      
      // Update user stats
      updateUserStats(state.userPosts.length, products.length);
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setPostsLoading(false);
      lastFetchTime.current = Date.now();
    }
  };
  
  // Update user stats when post data changes
  useEffect(() => {
    if (user && (state.userPosts.length > 0 || products.length > 0)) {
      updateUserStats(state.userPosts.length, products.length);
    }
  }, [state.userPosts.length, products.length, user?.id]);
  
  // Use focus effect to refresh data when returning to the screen
  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated || isLoading) return;
      
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTime.current;
      // Only refresh if significant time has passed
      if (user?.id && timeSinceLastFetch > 30000 && !refreshing && !postsLoading) {
        console.log("Refreshing data on focus after", Math.round(timeSinceLastFetch/1000), "seconds");
        refreshData();
      }
      
      return () => {
        // Cleanup on blur
      };
    }, [user?.id, isAuthenticated, isLoading, refreshing, postsLoading])
  );
  
  // Refresh all data
  const refreshData = useCallback(() => {
    if (refreshing || postsLoading || !user?.id) return;
    
    setRefreshing(true);
    
    fetchUserData(user.id)
      .catch(err => console.error("Error refreshing data:", err))
      .finally(() => {
        setRefreshing(false);
      });
  }, [user?.id, refreshing, postsLoading]);
  
  // Handle tab change
  const handleTabChange = (tab: ProfileTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Error logging out:", error);
      Alert.alert("Error", "Failed to log out. Please try again.");
    }
  };
  
  // Get dimensions for grid layout
  const numColumns = 2;
  
  // Create getDisplayItems function
  const getDisplayItems = (): BaseItem[] => {
    switch(activeTab) {
      case 'posts':
        return [...state.userPosts, newPostButton];
      case 'products':
        return [...products, newProductButton];
      case 'liked':
        return state.likedPosts.length > 0 ? state.likedPosts : [];
      default:
        return [...state.userPosts, newPostButton];
    }
  };
  
  // Render grid items
  const renderItem = ({ item }: { item: BaseItem }) => {
    if (!item) return null;
    
    // Create a proper onPress handler that takes the item as parameter
    const onPress = (item: BaseItem) => {
      if (isPostItem(item)) {
        // Set the current post in context before navigation
        setCurrentPost(item);
        
      } else if (isProductItem(item)) {
        // Future: Handle product navigation
        console.log('Product item clicked');
      }
    };
    
    // Handle like/unlike actions
    const handleLike = async (postId: string) => {
      // Check if post is already liked
      const isCurrentlyLiked = likedPostIds.includes(postId);
      
      // Call the appropriate function based on current liked status
      if (isCurrentlyLiked) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }
      
      // Refresh the liked posts if we're on the liked tab to keep it in sync
      if (activeTab === 'liked' && user?.id) {
        await fetchLikedPosts(user.id);
      }
    };
    
    // Pass all handling to the RenderItem component
    return (
      <RenderItem 
        item={item} 
        activeTab={activeTab} 
        onPress={onPress}
        onLike={handleLike}
        showTabBar={false}
      />
    );
  };
  
  // Show loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-blue-50 items-center justify-center">
        <ActivityIndicator size="large" color="#9333EA" />
        <Text className="mt-4 text-gray-600">Loading profile...</Text>
      </SafeAreaView>
    );
  }

  // Show not authenticated state
  if (!isAuthenticated) {
    return <AuthPrompt statusBarHeight={statusBarHeight} />;
  }
  
  // Render profile if authenticated
  return (
    <SafeAreaView className="flex-1 bg-blue-50">
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      
      {/* Main Content */}
      <FlatList
        data={getDisplayItems()}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || postsLoading}
            onRefresh={refreshData}
            colors={['#9333EA']}
            tintColor="#9333EA"
          />
        }
        ListHeaderComponent={
          user ? (
            <View>
              {/* Background with Gradient */}
              <View className="w-full h-60 relative">
                <LinearGradient
                  colors={['#9333EA', '#C084FC']}
                  className="w-full h-full"
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                
                {/* Menu Button */}
                <View 
                  style={{ 
                    position: 'absolute',
                    top: statusBarHeight + 10,
                    left: 15,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderRadius: 20,
                    padding: 4
                  }}
                >
                  <DrawerToggleButton tintColor="#FFFFFF" />
                </View>

                {/* Logout Button */}
                <TouchableOpacity 
                  style={{ 
                    position: 'absolute',
                    top: statusBarHeight + 10,
                    right: 15,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderRadius: 20,
                    padding: 8
                  }}
                  onPress={handleLogout}
                >
                  <Feather name="log-out" size={20} color="#FFFFFF" />
                </TouchableOpacity>
                
                {/* User Info Section */}
                <View className="absolute bottom-0 left-0 right-0 p-4">
                  <View className="flex-row items-end">
                    <View className="shadow-xl">
                      <Image
                        source={{ uri: formatImageUrl(user.avatar) }}
                        className="w-24 h-24 rounded-full border-4 border-white"
                        style={{
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.2,
                          shadowRadius: 4,
                        }}
                      />
                    </View>
                    <View className="ml-4 flex-1">
                      <Text className="text-xl font-bold text-white mb-1">{user.username}</Text>
                      <Text className="text-white text-opacity-80 text-sm">ID: {user.id}</Text>
                    </View>
                    <TouchableOpacity 
                      className="bg-purple-100 rounded-full p-2 mr-2"
                      onPress={() => {
                        Alert.alert("Coming Soon", "Edit profile feature is coming soon!");
                      }}
                    >
                      <Feather name="edit-2" size={20} color="#9333EA" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              
              {/* Bio Section */}
              <View className="px-5 pt-3 pb-4">
                <Text className="text-gray-700 text-sm leading-tight">{user.bio}</Text>
              </View>
              
              {/* Stats Row */}
              <View className="flex-row justify-around px-5 py-4 border-t border-b border-purple-100 mb-4 bg-white">
                <View className="items-center">
                  <Text className="text-purple-700 font-bold text-lg">{user.stats?.posts || state.userPosts.length || 0}</Text>
                  <Text className="text-gray-500 text-xs">Posts</Text>
                </View>
                <View className="items-center">
                  <Text className="text-purple-700 font-bold text-lg">{user.stats?.followers || 0}</Text>
                  <Text className="text-gray-500 text-xs">Followers</Text>
                </View>
                <View className="items-center">
                  <Text className="text-purple-700 font-bold text-lg">{user.stats?.following || 0}</Text>
                  <Text className="text-gray-500 text-xs">Following</Text>
                </View>
                <View className="items-center">
                  <Text className="text-purple-700 font-bold text-lg">{user.stats?.products || products.length || 0}</Text>
                  <Text className="text-gray-500 text-xs">Products</Text>
                </View>
              </View>
              
              {/* Tab Selector */}
              <View className="flex-row justify-center mt-3">
                <TouchableOpacity 
                  className={`px-6 py-2 rounded-full mx-1 ${activeTab === 'posts' ? 'bg-purple-100' : 'bg-transparent'}`}
                  onPress={() => handleTabChange('posts')}
                >
                  <Text className={`font-rubik-medium ${activeTab === 'posts' ? 'text-purple-700' : 'text-gray-500'}`}>Posts ({state.userPosts.length || 0})</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className={`px-6 py-2 rounded-full mx-1 ${activeTab === 'products' ? 'bg-purple-100' : 'bg-transparent'}`}
                  onPress={() => handleTabChange('products')}
                >
                  <Text className={`font-rubik-medium ${activeTab === 'products' ? 'text-purple-700' : 'text-gray-500'}`}>Products ({products.length || 0})</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className={`px-6 py-2 rounded-full mx-1 ${activeTab === 'liked' ? 'bg-purple-100' : 'bg-transparent'}`}
                  onPress={() => handleTabChange('liked')}
                >
                  <Text className={`font-rubik-medium ${activeTab === 'liked' ? 'text-purple-700' : 'text-gray-500'}`}>Liked ({state.likedPosts.length || 0})</Text>
                </TouchableOpacity>
              </View>
              
              {/* Section Header */}
              <View className="px-4 mb-2">
                <Text className="text-lg font-bold text-gray-800">
                  {activeTab === 'posts' ? 'My Posts' : activeTab === 'products' ? 'My Products' : 'Liked Posts'}
                </Text>
                {postsLoading && activeTab !== 'products' && (
                  <View className="flex-row items-center mt-1">
                    <ActivityIndicator size="small" color="#9333EA" />
                    <Text className="ml-2 text-xs text-gray-500">Updating...</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View className="items-center justify-center py-20">
              <Text className="text-gray-500">User not found</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

export default ProfileScreen;