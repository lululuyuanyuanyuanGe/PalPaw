import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons, FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { DrawerToggleButton } from "@react-navigation/drawer";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "@/utils/apiClient";
import AuthPrompt from "@/app/components/AuthPrompt";
import { 
  fetchUserPosts, 
  fetchUserProducts, 
  fetchUserProfileData, 
  formatImageUrl 
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

const ProfileScreen = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  // Start with assumed authentication to prevent flash
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  // Start with loading to show a loading indicator instead of auth prompt
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [fetchError, setFetchError] = useState<boolean>(false);
  const [retrying, setRetrying] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  // Ref to track if initial loading has happened
  const initialLoadCompleted = useRef(false);
  // Ref to track focus state to prevent duplicate loads
  const isFocused = useRef(false);
  // Ref to track last data fetch time
  const lastFetchTime = useRef(0);
  
  // Get status bar height for proper spacing
  const statusBarHeight = Constants.statusBarHeight || 0;
  
  // Check if user is authenticated - runs once on mount
  useEffect(() => {
    console.log("ProfileScreen: Initial mount effect running");
    checkAuth();
  }, []);
  
  // Use focus effect to reload data when returning to the screen
  useFocusEffect(
    useCallback(() => {
      console.log("ProfileScreen: Focus effect triggered");
      isFocused.current = true;
      
      // Only check authentication on initial focus if we're not already authenticated
      if (!isAuthenticated && !initialLoadCompleted.current) {
        console.log("ProfileScreen: Checking auth on focus (not authenticated yet)");
        checkAuth();
      }
      
      // If we're already authenticated and have a user, just silently refresh in the background
      const now = Date.now();
      if (isAuthenticated && user && initialLoadCompleted.current && (now - lastFetchTime.current > 1000)) {
        console.log("ProfileScreen: Silently refreshing data on focus");
        // Always use silent refresh when returning to the tab
        fetchUserData(user.id, false);
      }
      
      return () => {
        console.log("ProfileScreen: Lost focus");
        isFocused.current = false;
      };
    }, [user, isAuthenticated])
  );
  
  // Cache the user data, posts, and products in AsyncStorage
  const cacheProfileData = async (userId: string, userData: User | null, userPosts: PostItem[], userProducts: ProductItem[]) => {
    try {
      if (!userId || !userData) return;
      
      const cacheData = {
        userData,
        posts: userPosts,
        products: userProducts,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem(`profile_cache_${userId}`, JSON.stringify(cacheData));
      console.log("ProfileScreen: Cached profile data for user", userId);
    } catch (error) {
      console.error("Error caching profile data:", error);
      // Non-critical error, we can continue without caching
    }
  };
  
  // Load cached profile data from AsyncStorage
  const loadCachedProfileData = async (userId: string) => {
    try {
      const cachedDataString = await AsyncStorage.getItem(`profile_cache_${userId}`);
      if (!cachedDataString) return null;
      
      const cachedData = JSON.parse(cachedDataString);
      console.log("ProfileScreen: Loaded cached profile data for user", userId);
      
      // Return the cached data if it exists and isn't too old (24 hours)
      const now = Date.now();
      const isExpired = now - cachedData.timestamp > 24 * 60 * 60 * 1000;
      
      if (isExpired) {
        console.log("ProfileScreen: Cached data is expired, will fetch fresh data");
        return null;
      }
      
      return cachedData;
    } catch (error) {
      console.error("Error loading cached profile data:", error);
      return null;
    }
  };
  
  // Check authentication and load user data
  const checkAuth = async () => {
    console.log("ProfileScreen: Checking authentication");
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userDataStr = await AsyncStorage.getItem('userData');
      
      if (token && userDataStr) {
        // User is authenticated, let's load the data
        // Note: isAuthenticated is already true by default
        try {
          // Parse the stored user data
          const userData = JSON.parse(userDataStr);
          console.log("ProfileScreen: User data loaded from storage", userData.id);
          
          // Try to load cached profile data first
          const cachedData = await loadCachedProfileData(userData.id);
          
          if (cachedData) {
            // If we have cached data, use it immediately
            setUser(cachedData.userData);
            setPosts(cachedData.posts);
            setProducts(cachedData.products);
            console.log("ProfileScreen: Using cached data for immediate display");
            
            // Mark initial load as complete since we have data
            initialLoadCompleted.current = true;
            // Turn off loading indicator
            setIsLoading(false);
            
            // Fetch fresh data in the background without showing loading indicator
            fetchUserData(userData.id, false).catch(err => {
              console.error("Error fetching background data:", err);
            });
            
            return; // Exit early since we've loaded cached data
          }
          
          // If no cached data, set up default user data
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
          
          // Loading indicator is already showing (set in initial state)
          
          // Fetch user data, posts and products
          try {
            await fetchUserData(userData.id, true);
          } catch (fetchError) {
            console.error("Failed to fetch user data:", fetchError);
            // We already set default user data, so we can continue
            setIsLoading(false);
          }
          // Mark initial load as complete
          initialLoadCompleted.current = true;
        } catch (parseError) {
          console.error("Error parsing user data:", parseError);
          // If there's an error parsing the user data, we're not really authenticated
          setIsAuthenticated(false);
          setIsLoading(false);
          Alert.alert(
            "Error",
            "There was a problem with your account data. Please login again.",
            [
              { 
                text: "OK", 
                onPress: async () => {
                  await AsyncStorage.removeItem('authToken');
                  await AsyncStorage.removeItem('userData');
                }
              }
            ]
          );
        }
      } else {
        // No valid auth token, user is definitely not authenticated
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error checking authentication:", error);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };
  
  // Function to refresh data (for pull-to-refresh)
  const refreshUserData = () => {
    if (user) {
      console.log("ProfileScreen: Pull-to-refresh triggered");
      setRefreshing(true);
      // Never show the loading screen for pull-to-refresh
      fetchUserData(user.id, false)
        .catch(err => console.error("Error during refresh:", err))
        .finally(() => {
          setRefreshing(false);
        });
    }
  };
  
  // Fetch user's posts and products
  const fetchUserData = async (userId: string, showLoadingIndicator = false) => {
    console.log("ProfileScreen: Fetching user data for ID:", userId, "showLoadingIndicator:", showLoadingIndicator);
    lastFetchTime.current = Date.now();
    
    // Track if we successfully fetched all data for caching
    let fetchedUserData = null;
    let fetchedPosts: PostItem[] = [];
    let fetchedProducts: ProductItem[] = [];
    let fetchSuccessful = false;
    
    if (isFocused.current) {
      setFetchError(false);
    }
    
    // Only show full loading state if explicitly requested and component is focused
    if (showLoadingIndicator && isFocused.current) {
      setIsLoading(true);
    }
    
    try {
      // Fetch additional user profile data
      try {
        const userData = await fetchUserProfileData(userId);
        
        if (userData && isFocused.current) {
          setUser((prevUser) => {
            const updatedUser = {
              ...(prevUser || {}),
              id: userData.id,
              username: userData.username,
              firstName: userData.firstName || prevUser?.firstName,
              lastName: userData.lastName || prevUser?.lastName,
              bio: userData.bio || prevUser?.bio || "Hello! I'm a PalPaw user.",
              avatar: userData.avatar || prevUser?.avatar,
              email: userData.email || prevUser?.email,
              stats: {
                ...prevUser?.stats,
                // Keep post and product counts until we fetch those separately
                followers: userData.followers || prevUser?.stats?.followers || 0,
                following: userData.following || prevUser?.stats?.following || 0,
              }
            };
            
            fetchedUserData = updatedUser;
            return updatedUser;
          });
        }
      } catch (userError) {
        console.error("Error fetching user profile data:", userError);
        // Continue to fetch other data even if user profile fails
      }
      
      // Fetch posts
      try {
        const fetchedPostsData = await fetchUserPosts(userId);
        
        // Check if component is still mounted and focused before updating state
        if (isFocused.current) {
          setPosts(fetchedPostsData);
          fetchedPosts = fetchedPostsData;
          
          // Update user stats with post count
          setUser(prevUser => {
            if (prevUser) {
              const updatedUser = {
                ...prevUser,
                stats: {
                  ...prevUser.stats,
                  posts: fetchedPostsData.length
                }
              };
              
              fetchedUserData = updatedUser;
              return updatedUser;
            }
            return prevUser;
          });
        }
      } catch (postError) {
        console.error("Error in post fetching:", postError);
        if (isFocused.current) {
          setPosts([]);
        }
      }
      
      // Fetch products
      try {
        const fetchedProductsData = await fetchUserProducts(userId);
        
        // Check if component is still mounted and focused before updating state
        if (isFocused.current) {
          setProducts(fetchedProductsData);
          fetchedProducts = fetchedProductsData;
          
          // Update user stats with product count
          setUser(prevUser => {
            if (prevUser) {
              const updatedUser = {
                ...prevUser,
                stats: {
                  ...prevUser.stats,
                  products: fetchedProductsData.length
                }
              };
              
              fetchedUserData = updatedUser;
              return updatedUser;
            }
            return prevUser;
          });
        }
      } catch (productError) {
        console.error("Error in product fetching:", productError);
        if (isFocused.current) {
          setProducts([]);
        }
      }
      
      // If we got this far without throwing, the fetch was successful
      fetchSuccessful = true;

    } catch (error: any) {
      console.error("Error fetching user data:", error);
      if (isFocused.current) {
        setFetchError(true);
        
        if (error.response && error.response.status === 401) {
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('userData');
          router.replace("/(root)/(auth)/login");
          return;
        }
        
        Alert.alert(
          "Error", 
          "Failed to load profile data. Please try again later."
        );
      }
    } finally {
      if (isFocused.current) {
        setIsLoading(false);
        setRetrying(false);
        
        // Cache the data if the fetch was successful and we have the necessary data
        if (fetchSuccessful && fetchedUserData) {
          cacheProfileData(userId, fetchedUserData, fetchedPosts, fetchedProducts);
        }
      }
    }
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      // Clear profile cache if we have a user ID
      if (user && user.id) {
        await AsyncStorage.removeItem(`profile_cache_${user.id}`);
      }
      
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
      setIsAuthenticated(false);
      setUser(null);
      setPosts([]);
      setProducts([]);
      initialLoadCompleted.current = false;
      console.log("ProfileScreen: User logged out");
    } catch (error) {
      console.error("Error logging out:", error);
      Alert.alert("Error", "Failed to log out. Please try again.");
    }
  };

  // Get dimensions for grid layout
  const numColumns = 2;
  
  // Add the "Create New" buttons to the lists
  const postsWithButton = [...posts, newPostButton];
  const productsWithButton = [...products, newProductButton];
  
  // Render grid items
  const renderItem = ({ item }: { item: BaseItem }) => {
    if (!item) return null;
    
    console.log(`Rendering item ${item.id} for ${activeTab} tab, mediaType: ${item.mediaType}, mediaUrl: ${item.mediaUrl?.substring(0, 30)}`);
    
    return (
      <RenderItem 
        item={item} 
        activeTab={activeTab} 
        onPress={(selectedItem) => {
          console.log(`Item pressed: ${selectedItem.id}`);
          // Here you can navigate to the detail screen or perform other actions
          if (isPostItem(selectedItem)) {
            console.log('Post item clicked');
            // router.push(`/posts/${selectedItem.id}`);
          } else if (isProductItem(selectedItem)) {
            console.log('Product item clicked');
            // router.push(`/products/${selectedItem.id}`);
          }
        }}
      />
    );
  };
  
  // Retry function
  const handleRetry = () => {
    if (user) {
      setRetrying(true);
      fetchUserData(user.id);
    }
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

  // Show not authenticated state using the AuthPrompt component
  if (!isAuthenticated) {
    return <AuthPrompt statusBarHeight={statusBarHeight} />;
  }
  
  // Show error state
  if (fetchError && !isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-blue-50 items-center justify-center px-6">
        <MaterialCommunityIcons name="access-point-network-off" size={50} color="#9333EA" />
        <Text className="text-lg font-bold text-gray-800 mt-4 text-center">
          Failed to load profile data
        </Text>
        <Text className="text-gray-600 text-center mt-2 mb-6">
          There was a problem connecting to the server. Please check your internet connection and try again.
        </Text>
        <TouchableOpacity
          onPress={handleRetry}
          className="bg-purple-600 py-3 px-8 rounded-full"
          disabled={retrying}
        >
          {retrying ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white font-medium">Try Again</Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    );
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
        data={activeTab === 'posts' ? postsWithButton : productsWithButton}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshUserData}
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
                  <Text className="text-purple-700 font-bold text-lg">{user.stats?.posts || 0}</Text>
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
                  <Text className="text-purple-700 font-bold text-lg">{user.stats?.products || 0}</Text>
                  <Text className="text-gray-500 text-xs">Products</Text>
                </View>
              </View>
              
              {/* Tab Selector */}
              <View className="flex-row bg-white mb-4 border-b border-purple-100">
                <TouchableOpacity 
                  className={`flex-1 py-3 items-center ${activeTab === 'posts' ? 'border-b-2 border-purple-500' : ''}`}
                  onPress={() => setActiveTab('posts')}
                >
                  <Text className={activeTab === 'posts' ? 'text-purple-600 font-medium' : 'text-gray-500'}>
                    Posts
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className={`flex-1 py-3 items-center ${activeTab === 'products' ? 'border-b-2 border-purple-500' : ''}`}
                  onPress={() => setActiveTab('products')}
                >
                  <Text className={activeTab === 'products' ? 'text-purple-600 font-medium' : 'text-gray-500'}>
                    Shop
                  </Text>
                </TouchableOpacity>
              </View>
              
              {/* Section Header */}
              <View className="px-4 mb-2">
                <Text className="text-lg font-bold text-gray-800">
                  {activeTab === 'posts' ? 'My Posts' : 'My Products'}
                </Text>
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