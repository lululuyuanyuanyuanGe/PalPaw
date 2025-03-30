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
  RefreshControl
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
  ProfileTab
} from "../(tabs)/(profile)/types";
import { RenderItem } from '../(tabs)/(profile)/ProfileRenderer';
import { useAuth, usePosts, useProducts, useUser } from "@/context";
import { formatImageUrl } from "@/utils/mediaUtils";
import { ProductItem as ContextProductItem } from "@/context/ProductsContext";
import { FontAwesome5 } from "@expo/vector-icons";
import FollowersModal from "../(social)/FollowersModal";
import FollowingModal from "../(social)/FollowingModal";

const UserProfileScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId: string, activeTab?: ProfileTab }>();
  const userId = params.userId;
  
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
  const [followLoading, setFollowLoading] = useState<boolean>(false);
  
  // Add a state to track initial data loading and prevent repeated fetches
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false);
  const previousUserId = useRef<string | null>(null);
  const hasLoadedForCurrentUser = useRef<boolean>(false);
  
  // Get status bar height for proper spacing
  const statusBarHeight = Constants.statusBarHeight || 0;
  
  // Use AuthContext for authentication status
  const { state: authState } = useAuth();
  
  // Use UserContext for other user data
  const {
    state: userState,
    fetchOtherUserProfile,
    fetchOtherUserFollowers,
    fetchOtherUserFollowing,
    followUser,
    unfollowUser
  } = useUser();
  
  // Use PostsContext for post data
  const { 
    state: postsState,
    fetchOtherUserPosts,
    setCurrentPost,
    likePost,
    unlikePost,
    isPostLiked
  } = usePosts();
  
  // Use ProductsContext for product data
  const {
    state: productsState,
    fetchOtherUserProducts,
    setCurrentProduct,
    saveProduct,
    unsaveProduct,
    isProductSaved
  } = useProducts();
  
  // Check if current user is following this profile
  const isFollowing = useRef(false);
  
  useEffect(() => {
    if (authState.isAuthenticated && userState.otherUserProfile) {
      // Check if current user is following the viewed profile
      const following = userState.profile?.following || [];
      isFollowing.current = following.includes(userState.otherUserProfile.id);
    }
  }, [authState.user, userState.profile, userState.otherUserProfile]);
  
  // Fetch user data
  const fetchUserData = useCallback(async () => {
    // Prevent fetching if already fetching or no userId
    if (!userId || refreshing) return;
    
    setRefreshing(true);
    console.log(`Fetching data for user: ${userId}`);
    
    try {
      // Fetch user profile and related data in parallel
      await Promise.all([
        fetchOtherUserProfile(userId),
        fetchOtherUserPosts(userId),
        fetchOtherUserProducts(userId)
      ]);
      setInitialLoadComplete(true);
      hasLoadedForCurrentUser.current = true;
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setRefreshing(false);
    }
  }, [userId, fetchOtherUserProfile, fetchOtherUserPosts, fetchOtherUserProducts]);
  
  // Fetch data only when the userId changes or on initial load
  useEffect(() => {
    if (userId && (previousUserId.current !== userId || !hasLoadedForCurrentUser.current)) {
      console.log(`User ID changed from ${previousUserId.current} to ${userId} - fetching data`);
      previousUserId.current = userId;
      hasLoadedForCurrentUser.current = false; // Reset for new user
      fetchUserData();
    }
  }, [userId, fetchUserData]);
  
  // Simple focus effect that doesn't trigger refetches
  useFocusEffect(
    useCallback(() => {
      console.log("Screen focused - userId:", userId, "hasLoaded:", hasLoadedForCurrentUser.current);
      
      // We're now only setting a log message here, not triggering refetches
      // This helps prevent the infinite loop
      
      return () => {
        // Cleanup on blur
      };
    }, [userId])
  );
  
  // Only refresh data when manually pulled down
  const refreshData = useCallback(() => {
    if (refreshing || !userId) return;
    console.log("Manual refresh triggered");
    fetchUserData();
  }, [userId, refreshing, fetchUserData]);
  
  // Handle tab change
  const handleTabChange = (tab: ProfileTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
  };
  
  // Handle follow/unfollow 
  const handleFollowToggle = async () => {
    if (!authState.isAuthenticated) {
      router.push("/(root)/(auth)/login");
      return;
    }
    
    if (!userState.otherUserProfile?.id) return;
    
    setFollowLoading(true);
    
    try {
      if (isFollowing.current) {
        await unfollowUser(userState.otherUserProfile.id);
        isFollowing.current = false;
      } else {
        await followUser(userState.otherUserProfile.id);
        isFollowing.current = true;
      }
      
      // Refresh the profile to get updated follower count
      await fetchOtherUserProfile(userId);
      
    } catch (error) {
      console.error("Error toggling follow status:", error);
    } finally {
      setFollowLoading(false);
    }
  };
  
  // Get dimensions for grid layout
  const numColumns = 2;
  
  // Create getDisplayItems function using context directly
  const getDisplayItems = (): BaseItem[] => {
    switch(activeTab) {
      case 'posts':
        return postsState.otherUserPosts;
      case 'products':
        return productsState.otherUserProducts;
      default:
        return postsState.otherUserPosts;
    }
  };
  
  // Stats Row - display the correct stats
  const getPostCount = (): number => {
    return postsState.otherUserPosts?.length || 0;
  };
  
  const getProductCount = (): number => {
    return productsState.otherUserProducts?.length || 0;
  };
  
  // Render grid items
  const renderItem = ({ item }: { item: BaseItem }) => {
    if (!item) return null;
    
    // Create a proper onPress handler that takes the item as parameter
    const onPress = (item: BaseItem) => {
      if (isPostItem(item)) {
        // Set the current post in context before navigation
        setCurrentPost(item as PostItem);
        
        router.push({
          pathname: "/(root)/(posts)",
          params: { id: item.id }
        });
      } else if (isProductItem(item)) {
        setCurrentProduct(item as unknown as ContextProductItem);
        
        router.push({
          pathname: "/(root)/(products)",
          params: { id: item.id }
        });
      }
    };
    
    // Handle like/unlike actions for posts
    const handleLike = async (postId: string) => {
      if (!authState.isAuthenticated) {
        router.push("/(root)/(auth)/login");
        return;
      }
      
      // Check if post is already liked using PostsContext's isPostLiked function
      const isCurrentlyLiked = isPostLiked(postId);
      console.log("isCurrentlyLiked", isCurrentlyLiked);
      
      // Call the appropriate function based on current liked status
      if (isCurrentlyLiked) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }
    };
    
    // Handle save/unsave actions for products
    const handleSave = async (productId: string) => {
      if (!authState.isAuthenticated) {
        router.push("/(root)/(auth)/login");
        return;
      }
      
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
  
  // Modal states
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  
  // Handle followers modal open
  const handleOpenFollowersModal = () => {
    // Fetch followers when opening the modal
    fetchOtherUserFollowers(userId);
    setShowFollowersModal(true);
  };
  
  // Handle following modal open
  const handleOpenFollowingModal = () => {
    // Fetch following when opening the modal
    fetchOtherUserFollowing(userId);
    setShowFollowingModal(true);
  };
  
  // Show loading state if profile is not loaded yet
  if (!userState.otherUserProfile && !refreshing) {
    return (
      <SafeAreaView className="flex-1 bg-blue-50 justify-center items-center">
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        <ActivityIndicator size="large" color="#9333EA" />
        <Text className="mt-4 text-purple-700">Loading profile...</Text>
      </SafeAreaView>
    );
  }

  const profileUser = userState.otherUserProfile;

  // Render profile
  return (
    <SafeAreaView className="flex-1 bg-blue-50">
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      
      {/* Back button at the top */}
      <View className="absolute top-0 left-0 z-10 m-4 mt-10">
        <TouchableOpacity 
          className="bg-white/80 p-2 rounded-full"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#9333EA" />
        </TouchableOpacity>
      </View>
      
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
            refreshing={refreshing || userState.loading}
            onRefresh={refreshData}
            colors={['#9333EA']}
            tintColor="#9333EA"
          />
        }
        ListHeaderComponent={
          profileUser ? (
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
                      
                      {/* Viewing Profile Label - Aesthetic Version */}
                      <View className="absolute top-10 right-0 bg-purple-800/90 backdrop-blur-sm px-3 py-1.5 rounded-l-lg shadow-md">
                        <Text className="text-white text-xs font-medium">Viewing Profile</Text>
                      </View>
                      
                      {/* User Info Section */}
                      <View className="absolute bottom-0 left-0 right-0 p-4">
                        <View className="flex-row items-end">
                          <View className="shadow-xl">
                            <Image
                              source={{ uri: formatImageUrl(profileUser.avatar) }}
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
                            <Text className="text-xl font-bold text-white mb-1">{profileUser.username}</Text>
                            <Text className="text-white text-opacity-80 text-sm">ID: {profileUser.id}</Text>
                          </View>
                          {/* Action buttons - only shown if viewing someone else's profile */}
                          {authState.isAuthenticated && authState.user?.id !== profileUser.id && (
                            <View className="flex-row">
                              {/* Message Button - Aesthetic Version */}
                              <TouchableOpacity 
                                className="rounded-full px-3 py-2 mr-2 bg-purple-700 shadow-md border border-purple-400"
                                onPress={() => router.push({
                                  pathname: "/(root)/(chats)",
                                  params: { userId: profileUser.id }
                                })}
                              >
                                <Ionicons name="chatbubble-outline" size={20} color="#FFFFFF" />
                              </TouchableOpacity>
                              
                              {/* Follow/Unfollow button */}
                              <TouchableOpacity 
                                className={`rounded-full px-4 py-2 ${isFollowing.current ? 'bg-white' : 'bg-purple-800'}`}
                                onPress={handleFollowToggle}
                                disabled={followLoading}
                              >
                                {followLoading ? (
                                  <ActivityIndicator size="small" color={isFollowing.current ? "#9333EA" : "#FFFFFF"} />
                                ) : (
                                  <Text 
                                    className={`font-medium ${isFollowing.current ? 'text-purple-600' : 'text-white'}`}
                                  >
                                    {isFollowing.current ? 'Following' : 'Follow'}
                                  </Text>
                                )}
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      </View>
                    </LinearGradient>
                  </>
              </View>
              
              {/* Bio Section */}
              <View className="px-5 pt-3 pb-4">
                <Text className="text-gray-700 text-sm leading-tight">{profileUser.bio || "No bio available."}</Text>
              </View>
              
              {/* Stats Row */}
              <View className="flex-row justify-around px-5 py-4 border-t border-b border-purple-100 mb-4 bg-white">
                <View className="items-center">
                  <Text className="text-purple-700 font-bold text-lg">
                    {getPostCount()}
                  </Text>
                  <Text className="text-gray-500 text-xs">Posts</Text>
                </View>
                <TouchableOpacity 
                  className="items-center" 
                  onPress={handleOpenFollowersModal}
                  activeOpacity={0.7}
                >
                  <Text className="text-purple-700 font-bold text-lg">{profileUser.followerCount || 0}</Text>
                  <View className="flex-row items-center">
                    <Text className="text-gray-500 text-xs">Followers</Text>
                    <Feather name="chevron-right" size={12} color="#9333EA" style={{ marginLeft: 2 }} />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity 
                  className="items-center"
                  onPress={handleOpenFollowingModal}
                  activeOpacity={0.7}
                >
                  <Text className="text-purple-700 font-bold text-lg">{profileUser.followingCount || 0}</Text>
                  <View className="flex-row items-center">
                    <Text className="text-gray-500 text-xs">Following</Text>
                    <Feather name="chevron-right" size={12} color="#9333EA" style={{ marginLeft: 2 }} />
                  </View>
                </TouchableOpacity>
                <View className="items-center">
                  <Text className="text-purple-700 font-bold text-lg">
                    {getProductCount()}
                  </Text>
                  <Text className="text-gray-500 text-xs">Products</Text>
                </View>
              </View>
              
              {/* Tab Selector - without the liked tab */}
              <View className="flex-row justify-center mt-3">
                <TouchableOpacity 
                  className={`px-6 py-2 rounded-full mx-1 ${activeTab === 'posts' ? 'bg-purple-100' : 'bg-transparent'}`}
                  onPress={() => handleTabChange('posts')}
                >
                  <Text className={`font-rubik-medium ${activeTab === 'posts' ? 'text-purple-700' : 'text-gray-500'}`}>
                    Posts ({getPostCount()})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className={`px-6 py-2 rounded-full mx-1 ${activeTab === 'products' ? 'bg-purple-100' : 'bg-transparent'}`}
                  onPress={() => handleTabChange('products')}
                >
                  <Text className={`font-rubik-medium ${activeTab === 'products' ? 'text-purple-700' : 'text-gray-500'}`}>
                    Products ({getProductCount()})
                  </Text>
                </TouchableOpacity>
              </View>
              
              {/* Section Header */}
              <View className="px-4 mb-2">
                <Text className="text-lg font-bold text-gray-800">
                  {activeTab === 'posts' ? `${profileUser.username}'s Posts` : `${profileUser.username}'s Products`}
                </Text>
                {userState.loading && (
                  <View className="flex-row items-center mt-1">
                    <ActivityIndicator size="small" color="#9333EA" />
                    <Text className="ml-2 text-xs text-gray-500">Loading...</Text>
                  </View>
                )}
              </View>
              
              {/* No posts/products message */}
              {getDisplayItems().length === 0 && !userState.loading && (
                <View className="items-center justify-center py-10">
                  <FontAwesome5 name={activeTab === 'posts' ? 'images' : 'shopping-bag'} size={40} color="#D1D5DB" />
                  <Text className="text-gray-500 mt-4 text-center">
                    {activeTab === 'posts' ? 'No posts yet' : 'No products yet'}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View className="items-center justify-center py-20">
              <Text className="text-gray-500">User not found</Text>
            </View>
          )
        }
      />
      
      {/* Followers Modal */}
      <FollowersModal 
        userId={profileUser?.id || ''}
        visible={showFollowersModal} 
        onClose={() => setShowFollowersModal(false)} 
      />
      
      {/* Following Modal */}
      <FollowingModal 
        userId={profileUser?.id || ''}
        visible={showFollowingModal} 
        onClose={() => setShowFollowingModal(false)} 
      />
      
    </SafeAreaView>
  );
};

export default UserProfileScreen;
