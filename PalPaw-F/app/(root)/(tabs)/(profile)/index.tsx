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
import api, { getUserProducts } from "@/utils/apiClient";
import AuthPrompt from "@/app/components/AuthPrompt";

// Define API base URL for media
const API_BASE_URL = 'http://192.168.2.11:5001';

// Base item type with common properties
interface BaseItem {
  id: string;
  image?: any;
  isButton?: boolean;
}

// Define post type
interface PostItem extends BaseItem {
  title: string;
  likes?: number;
  content?: string;
}

// Define new post button type
interface ButtonItem extends BaseItem {
  isButton: true;
  title: string;
  image: null;
}

// Define product type
interface ProductItem extends BaseItem {
  name: string;
  price: number;
  rating?: number;
  sold?: number;
}

// Define new product button type
interface ProductButtonItem extends BaseItem {
  isButton: true;
  name: string;
  image: null;
}

// Define user type
interface User {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  email?: string;
  stats?: {
    posts?: number;
    followers?: number;
    following?: number;
    products?: number;
  };
}

// Type guard functions
const isPostItem = (item: any): item is PostItem => {
  return 'title' in item && !('price' in item);
};

const isProductItem = (item: any): item is ProductItem => {
  return 'name' in item && 'price' in item;
};

const isButtonItem = (item: any): item is ButtonItem | ProductButtonItem => {
  return item.isButton === true;
};

// Create new post button item
const newPostButton: ButtonItem = { id: "newPost", isButton: true, title: "", image: null };

// Create new product button item
const newProductButton: ProductButtonItem = { id: "newProduct", isButton: true, name: "", image: null };

type ProfileTab = 'posts' | 'products';

// Format image URL function
const formatImageUrl = (path: string | undefined): string => {
  if (!path) {
    return 'https://robohash.org/default?set=set4&bgset=bg1';
  }
  
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  return `${API_BASE_URL}${path}`;
};

const ProfileScreen = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
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
      // This prevents the infinite loop of authentication checks
      if (!isAuthenticated && !initialLoadCompleted.current) {
        console.log("ProfileScreen: Checking auth on focus (not authenticated yet)");
        checkAuth();
      }
      
      // Only refresh data if:
      // 1. User is authenticated
      // 2. We have a user loaded
      // 3. Initial load is completed
      // 4. It's been at least 1 second since the last fetch (debounce)
      const now = Date.now();
      if (isAuthenticated && user && initialLoadCompleted.current && (now - lastFetchTime.current > 1000)) {
        console.log("ProfileScreen: Refreshing data on focus");
        refreshUserData();
      }
      
      return () => {
        // When screen loses focus
        console.log("ProfileScreen: Lost focus");
        isFocused.current = false;
      };
    }, [user, isAuthenticated])
  );
  
  // Check authentication and load user data
  const checkAuth = async () => {
    console.log("ProfileScreen: Checking authentication");
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userDataStr = await AsyncStorage.getItem('userData');
      
      if (token && userDataStr) {
        // Only continue if we're not already authenticated with user data
        // This prevents unnecessary re-fetching
        if (!isAuthenticated || !user) {
          setIsAuthenticated(true);
          try {
            // Parse the stored user data
            const userData = JSON.parse(userDataStr);
            console.log("ProfileScreen: User data loaded from storage", userData.id);
            setUser({
              id: userData.id,
              username: userData.username,
              firstName: userData.firstName,
              lastName: userData.lastName,
              avatar: userData.avatar,
              bio: userData.bio || "Hello! I'm a PalPaw user.",
              email: userData.email,
              stats: {
                posts: 0,
                followers: userData.followers || 0,
                following: userData.following || 0,
                products: 0
              }
            });
            
            // Fetch user data, posts and products
            await fetchUserData(userData.id);
            // Mark initial load as complete
            initialLoadCompleted.current = true;
          } catch (parseError) {
            console.error("Error parsing user data:", parseError);
            await AsyncStorage.removeItem('authToken');
            await AsyncStorage.removeItem('userData');
            setIsAuthenticated(false);
            setIsLoading(false);
          }
        } else {
          // Already authenticated with user data, just update loading state
          console.log("ProfileScreen: Already authenticated, skipping data fetch");
          setIsLoading(false);
        }
      } else {
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
      fetchUserData(user.id)
        .catch(err => console.error("Error during refresh:", err))
        .finally(() => {
          setRefreshing(false);
        });
    }
  };
  
  // Fetch user's posts and products
  const fetchUserData = async (userId: string) => {
    console.log(`ProfileScreen: Fetching user data for ${userId}`);
    lastFetchTime.current = Date.now();
    
    try {
      if (fetchError) setFetchError(false);
      
      // Only show full loading state if not refreshing
      if (!refreshing) {
        setIsLoading(true);
      }
      
      // Fetch posts
      try {
        console.log("ProfileScreen: Fetching posts");
        const postsResponse = await api.get('/posts');
        console.log("ProfileScreen: Posts response received");
        
        if (postsResponse?.data) {
          let userPosts = [];
          
          if (Array.isArray(postsResponse.data)) {
            userPosts = postsResponse.data.filter((post: any) => post.userId === userId);
          } else if (postsResponse.data.posts && Array.isArray(postsResponse.data.posts)) {
            userPosts = postsResponse.data.posts.filter((post: any) => post.userId === userId);
          } else if (typeof postsResponse.data === 'object') {
            userPosts = [];
          }
          
          console.log(`ProfileScreen: Found ${userPosts.length} posts for user`);
          
          const fetchedPosts = userPosts.map((post: any) => {
            // Handle media in a similar way to products
            let imageUrl = 'https://robohash.org/post' + post.id + '?set=set4';
            
            if (post.media && post.media.length > 0) {
              if (typeof post.media[0] === 'string') {
                imageUrl = formatImageUrl(post.media[0]);
              } else if (post.media[0].url) {
                imageUrl = formatImageUrl(post.media[0].url);
              }
            }
            
            return {
              id: post.id,
              title: post.title || "Untitled Post",
              content: post.content,
              likes: post.likes || 0,
              image: { uri: imageUrl }
            };
          });
          
          // Check if component is still mounted and focused before updating state
          if (isFocused.current) {
            setPosts(fetchedPosts);
            
            // Update user stats with post count
            setUser(prevUser => {
              if (prevUser) {
                return {
                  ...prevUser,
                  stats: {
                    ...prevUser.stats,
                    posts: fetchedPosts.length
                  }
                };
              }
              return prevUser;
            });
          }
        } else {
          console.log("ProfileScreen: No posts data in response");
          if (isFocused.current) {
            setPosts([]);
          }
        }
      } catch (postError) {
        console.error("Error fetching posts:", postError);
        if (isFocused.current) {
          setPosts([]);
        }
      }
      
      // Fetch products
      try {
        console.log("ProfileScreen: Fetching products");
        const userProducts = await getUserProducts(userId);
        console.log(`ProfileScreen: Received ${userProducts.length} products`);
        
        const fetchedProducts = userProducts.map((product: any) => {
          // Handle media from the API format
          let imageUrl = 'https://robohash.org/product' + product.id + '?set=set4';
          
          if (product.media && product.media.length > 0) {
            // Check if media is an array of strings or objects
            if (typeof product.media[0] === 'string') {
              imageUrl = formatImageUrl(product.media[0]);
            } else if (product.media[0].url) {
              imageUrl = formatImageUrl(product.media[0].url);
            }
          }
          
          return {
            id: product.id,
            name: product.name || "Untitled Product",
            price: product.price || 0,
            rating: 4.5,
            sold: product.sold || 0,
            image: { uri: imageUrl }
          };
        });
        
        console.log(`ProfileScreen: Processed ${fetchedProducts.length} products for display`);
        
        // Check if component is still mounted and focused before updating state
        if (isFocused.current) {
          setProducts(fetchedProducts);
          
          // Update user stats with product count
          setUser(prevUser => {
            if (prevUser) {
              return {
                ...prevUser,
                stats: {
                  ...prevUser.stats,
                  products: fetchedProducts.length
                }
              };
            }
            return prevUser;
          });
        }
      } catch (productError) {
        console.error("Error fetching products:", productError);
        if (isFocused.current) {
          setProducts([]);
        }
      }

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
      }
    }
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
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

  // Screen dimensions for responsive grid
  const numColumns = 2;
  const screenWidth = Dimensions.get("window").width;
  const itemSize = screenWidth / numColumns - 16;
  
  // Add the "Create New" buttons to the lists
  const postsWithButton = [...posts, newPostButton];
  const productsWithButton = [...products, newProductButton];
  
  // Render grid items (posts or products)
  const renderItem = ({ item }: { item: BaseItem }) => (
    <View style={{ width: itemSize, margin: 8 }}>
      {isButtonItem(item) ? (
        // "Create New" Button
        <TouchableOpacity 
          onPress={() => {
            if (activeTab === 'posts') {
              router.push("/(root)/(createPosts)/createPosts");
            } else {
              router.push("/(root)/(createProducts)/createProducts");
            }
          }}
          className="h-40 rounded-xl overflow-hidden"
        >
          <LinearGradient
            colors={['#9333EA', '#C084FC']}
            className="w-full h-full items-center justify-center"
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather name="plus" size={34} color="white" />
            <Text className="text-white font-medium mt-2">
              {activeTab === 'posts' ? 'New Post' : 'Add Product'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : isPostItem(item) ? (
        // Post Item
        <TouchableOpacity className="rounded-xl overflow-hidden shadow-sm bg-white border border-pink-50">
          <Image 
            source={item.image} 
            style={{ width: '100%', height: 150 }}
            resizeMode="cover"
          />
          <View className="p-2">
            <Text className="text-gray-800 font-medium" numberOfLines={1}>{item.title}</Text>
            <View className="flex-row items-center mt-1">
              <Ionicons name="heart" size={12} color="#FF2442" />
              <Text className="text-xs text-gray-500 ml-1">{item.likes || 0}</Text>
            </View>
          </View>
        </TouchableOpacity>
      ) : isProductItem(item) ? (
        // Product Item
        <TouchableOpacity className="rounded-xl overflow-hidden shadow-sm bg-white border border-pink-50">
          <Image 
            source={item.image} 
            style={{ width: '100%', height: 150 }}
            resizeMode="cover"
          />
          <View className="absolute top-2 right-2 bg-purple-500 px-2 py-0.5 rounded-full">
            <Text className="text-white text-xs font-bold">${item.price}</Text>
          </View>
          <View className="p-2">
            <Text className="text-gray-800 font-medium" numberOfLines={1}>{item.name}</Text>
            <View className="flex-row items-center justify-between mt-1">
              <View className="flex-row items-center">
                <FontAwesome name="star" size={10} color="#FBBF24" />
                <Text className="text-xs text-gray-500 ml-1">{item.rating || 4.5}</Text>
              </View>
              <Text className="text-xs text-gray-400">{item.sold || 0} sold</Text>
            </View>
          </View>
        </TouchableOpacity>
      ) : (
        <View />
      )}
    </View>
  );
  
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