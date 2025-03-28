import React, { useState, useCallback, useEffect, useRef } from "react";
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
  ImageBackground,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import Constants from "expo-constants";
import { useFocusEffect } from "@react-navigation/native";
import {
  BaseItem,
  PostItem,
  ProductItem,
  isPostItem,
  isProductItem,
  newPostButton,
  newProductButton,
  ProfileTab
} from "./types";
import { RenderItem } from './ProfileRenderer';
import { usePosts, useUser, useAuth, useProducts } from "@/context";
import AuthPrompt from "@/app/components/AuthPrompt";
import { formatImageUrl } from "@/utils/mediaUtils";
import { ProductItem as ContextProductItem } from "@/context/ProductsContext";
import { FontAwesome5 } from "@expo/vector-icons";

const ProfileScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ activeTab?: ProfileTab }>();
  
  // Use a ref to track if we've already applied the URL parameter
  const initialTabApplied = useRef(false);
  
  // Get initial tab from URL or default to 'posts'
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  
  // Effect to set initial tab from URL params only once
  useEffect(() => {
    if (!initialTabApplied.current && params.activeTab) {
      setActiveTab(params.activeTab as ProfileTab);
      initialTabApplied.current = true;
    }
  }, [params.activeTab]);
  
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [postsLoading, setPostsLoading] = useState<boolean>(false);
  const [productsLoading, setProductsLoading] = useState<boolean>(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  
  // Get status bar height for proper spacing
  const statusBarHeight = Constants.statusBarHeight || 0;
  
  // Use AuthContext for authentication status
  const { state: authState, logout: authLogout } = useAuth();
  
  // Use UserContext for user data
  const { 
    state: userState, 
    fetchUserProfile, 
    hasLikedPost 
  } = useUser();
  
  // Use PostsContext for post data
  const { 
    fetchUserPosts,
    fetchLikedPosts,
    state: postsState,
    setCurrentPost,
    likePost,
    unlikePost,
    isPostLiked
  } = usePosts();
  
  // Use ProductsContext for product data
  const {
    state: productsState,
    fetchUserProducts,
    setCurrentProduct,
    saveProduct,
    unsaveProduct,
    isProductSaved
  } = useProducts();
  
  // Use focus effect to refresh data when returning to the screen
  useFocusEffect(
    useCallback(() => {
      if (!authState.isAuthenticated || authState.loading) return;
      
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTime;
      // Only refresh if significant time has passed
      if (authState.user?.id && timeSinceLastFetch > 30000 && !refreshing && !postsLoading && !productsLoading) {
        console.log("Refreshing data on focus after", Math.round(timeSinceLastFetch/1000), "seconds");
        refreshData();
      }
      
      return () => {
        // Cleanup on blur
      };
    }, [authState.user?.id, authState.isAuthenticated, authState.loading, refreshing, postsLoading, productsLoading])
  );
  
  // Refresh all data
  const refreshData = useCallback(() => {
    if (refreshing || postsLoading || productsLoading || !authState.user?.id) return;
    
    setRefreshing(true);
    
    Promise.all([
      fetchUserProfile(),
      fetchUserPosts(authState.user.id),
      fetchLikedPosts(authState.user.id),
      fetchUserProducts(authState.user.id)
    ])
      .catch(err => console.error("Error refreshing data:", err))
      .finally(() => {
        setRefreshing(false);
        setLastFetchTime(Date.now());
      });
  }, [authState.user?.id, refreshing, postsLoading, productsLoading]);
  
  // Handle tab change
  const handleTabChange = (tab: ProfileTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await authLogout();
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
        return [...postsState.userPosts, newPostButton];
      case 'products':
        return [...productsState.userProducts, newProductButton];
      case 'liked':
        return postsState.likedPosts.length > 0 ? postsState.likedPosts : [];
      default:
        return [...postsState.userPosts, newPostButton];
    }
  };
  
  // Render grid items
  const renderItem = ({ item }: { item: BaseItem }) => {
    if (!item) return null;
    
    // Create a proper onPress handler that takes the item as parameter
    const onPress = (item: BaseItem) => {
      if (isPostItem(item)) {
        // Set the current post in context before navigation
        setCurrentPost(item as PostItem);
        
      } else if (isProductItem(item)) {
        setCurrentProduct(item as unknown as ContextProductItem);
        console.log('Product item clicked');
      }
    };
    
    // Handle like/unlike actions for posts
    const handleLike = async (postId: string) => {
      // Check if post is already liked using PostsContext's isPostLiked function
      const isCurrentlyLiked = isPostLiked(postId);
      console.log("isCurrentlyLiked", isCurrentlyLiked);
      
      // Call the appropriate function based on current liked status
      if (isCurrentlyLiked) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }
      
      // Refresh the liked posts if we're on the liked tab to keep it in sync
      if (activeTab === 'liked' && authState.user?.id) {
        await fetchLikedPosts(authState.user.id);
      }
    };
    
    // Handle save/unsave actions for products
    const handleSave = async (productId: string) => {
      // Check if product is already saved
      const isCurrentlySaved = isProductSaved(productId);
      console.log("isCurrentlySaved", isCurrentlySaved);
      
      // Call the appropriate function based on current saved status
      if (isCurrentlySaved) {
        await unsaveProduct(productId);
      } else {
        await saveProduct(productId);
      }
    };
    
    // Pass all handling to the RenderItem component
    return (
      <RenderItem 
        item={item} 
        activeTab={activeTab} 
        onPress={onPress}
        onLike={handleLike}
        onSave={handleSave}
        showTabBar={false}
      />
    );
  };
  

  // Show not authenticated state
  if (!authState.isAuthenticated) {
    return <AuthPrompt statusBarHeight={statusBarHeight} />;
  }

  const user = userState.profile || authState.user;
  
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
            refreshing={refreshing || postsLoading || productsLoading}
            onRefresh={refreshData}
            colors={['#9333EA']}
            tintColor="#9333EA"
          />
        }
        ListHeaderComponent={
          user ? (
            <View>
              {/* Background with Enhanced Decorative Elements */}
              <View className="w-full h-60 relative">
                  <>
                    <LinearGradient
                      colors={['#9333EA', '#C084FC']}
                      className="w-full h-full"
                      start={{ x: 0.1, y: 0.1 }}
                      end={{ x: 0.9, y: 0.9 }}
                    >
                      {/* Decorative shapes for gradient background */}
                      <View className="absolute inset-0 overflow-hidden">
                        {/* Circle decorations */}
                        <View className="absolute -right-10 -top-20 w-40 h-40 rounded-full bg-white opacity-10" />
                        <View className="absolute right-20 top-5 w-20 h-20 rounded-full bg-white opacity-10" />
                        <View className="absolute left-10 top-10 w-30 h-30 rounded-full bg-white opacity-10" />
                        
                        {/* Paw print pattern */}
                        <View className="absolute top-12 left-5">
                          <FontAwesome5 name="paw" size={16} color="white" style={{ opacity: 0.6 }} />
                          <FontAwesome5 name="paw" size={12} color="white" style={{ marginLeft: 25, marginTop: 8, opacity: 0.5 }} />
                          <FontAwesome5 name="paw" size={14} color="white" style={{ marginLeft: 10, marginTop: 12, opacity: 0.4 }} />
                        </View>
                        
                        <View className="absolute top-16 right-10">
                          <FontAwesome5 name="paw" size={12} color="white" style={{ opacity: 0.5, transform: [{ rotate: '45deg' }] }} />
                          <FontAwesome5 name="paw" size={16} color="white" style={{ marginLeft: -5, marginTop: 18, opacity: 0.6, transform: [{ rotate: '-15deg' }] }} />
                        </View>
                        
                        {/* Diagonal line decoration */}
                        <View className="absolute bottom-20 left-0 right-0 h-0.5 bg-white opacity-10 transform rotate-6" />
                        <View className="absolute bottom-30 left-0 right-0 h-0.5 bg-white opacity-5 transform -rotate-3" />
                      </View>
                      
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
                              router.push("/(root)/(Edit)" as any);
                            }}
                          >
                            <Feather name="edit-2" size={20} color="#9333EA" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </LinearGradient>
                  </>
              </View>
              
              {/* Bio Section */}
              <View className="px-5 pt-3 pb-4">
                <Text className="text-gray-700 text-sm leading-tight">{userState.profile?.bio || "Hello! I'm a PalPaw user."}</Text>
              </View>
              
              {/* Stats Row */}
              <View className="flex-row justify-around px-5 py-4 border-t border-b border-purple-100 mb-4 bg-white">
                <View className="items-center">
                  <Text className="text-purple-700 font-bold text-lg">{postsState.userPosts.length || 0}</Text>
                  <Text className="text-gray-500 text-xs">Posts</Text>
                </View>
                <View className="items-center">
                  <Text className="text-purple-700 font-bold text-lg">{userState.profile?.followerCount || 0}</Text>
                  <Text className="text-gray-500 text-xs">Followers</Text>
                </View>
                <View className="items-center">
                  <Text className="text-purple-700 font-bold text-lg">{userState.profile?.followingCount || 0}</Text>
                  <Text className="text-gray-500 text-xs">Following</Text>
                </View>
                <View className="items-center">
                  <Text className="text-purple-700 font-bold text-lg">{productsState.userProducts.length || 0}</Text>
                  <Text className="text-gray-500 text-xs">Products</Text>
                </View>
              </View>
              
              {/* Tab Selector */}
              <View className="flex-row justify-center mt-3">
                <TouchableOpacity 
                  className={`px-6 py-2 rounded-full mx-1 ${activeTab === 'posts' ? 'bg-purple-100' : 'bg-transparent'}`}
                  onPress={() => handleTabChange('posts')}
                >
                  <Text className={`font-rubik-medium ${activeTab === 'posts' ? 'text-purple-700' : 'text-gray-500'}`}>Posts ({postsState.userPosts.length || 0})</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className={`px-6 py-2 rounded-full mx-1 ${activeTab === 'liked' ? 'bg-purple-100' : 'bg-transparent'}`}
                  onPress={() => handleTabChange('liked')}
                >
                  <Text className={`font-rubik-medium ${activeTab === 'liked' ? 'text-purple-700' : 'text-gray-500'}`}>Liked ({postsState.likedPosts.length || 0})</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className={`px-6 py-2 rounded-full mx-1 ${activeTab === 'products' ? 'bg-purple-100' : 'bg-transparent'}`}
                  onPress={() => handleTabChange('products')}
                >
                  <Text className={`font-rubik-medium ${activeTab === 'products' ? 'text-purple-700' : 'text-gray-500'}`}>Products ({productsState.userProducts.length || 0})</Text>
                </TouchableOpacity>
              </View>
              
              {/* Section Header */}
              <View className="px-4 mb-2">
                <Text className="text-lg font-bold text-gray-800">
                  {activeTab === 'posts' ? 'My Posts' : activeTab === 'products' ? 'My Products' : 'Liked Posts'}
                </Text>
                {(postsLoading && activeTab !== 'products') && (
                  <View className="flex-row items-center mt-1">
                    <ActivityIndicator size="small" color="#9333EA" />
                    <Text className="ml-2 text-xs text-gray-500">Updating posts...</Text>
                  </View>
                )}
                {(productsLoading && activeTab === 'products') && (
                  <View className="flex-row items-center mt-1">
                    <ActivityIndicator size="small" color="#9333EA" />
                    <Text className="ml-2 text-xs text-gray-500">Updating products...</Text>
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