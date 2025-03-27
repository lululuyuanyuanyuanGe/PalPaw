import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, Ionicons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BaseItem, PostItem, ProductItem, isButtonItem, isPostItem, isProductItem, ProfileTab } from './types';
import { usePosts } from '../../../../context';
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated';

interface RenderItemProps {
  item: BaseItem;
  activeTab: ProfileTab;
  onPress: (item: BaseItem) => void;
  onLike?: (postId: string) => void;
  showTabBar?: boolean;
}

// Helper function to format relative time
const formatRelativeTime = (date?: Date): string => {
  if (!date) return "Recent";
  
  // Convert to milliseconds if it's a string
  const timestamp = typeof date === 'string' ? new Date(date).getTime() : date.getTime();
  const now = new Date().getTime();
  const diff = now - timestamp;
  
  // Calculate time difference in various units
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  // Return appropriate formatted string
  if (seconds < 60) {
    return 'Just now';
  } else if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else if (days < 7) {
    return `${days}d ago`;
  } else if (weeks < 4) {
    return `${weeks}w ago`;
  } else if (months < 12) {
    return `${months}mo ago`;
  } else {
    return `${years}y ago`;
  }
};

export const RenderItem: React.FC<RenderItemProps> = ({ item, activeTab, onPress: handleItemPress, onLike, showTabBar }) => {
  
  // Get screen width for sizing
  const { width } = Dimensions.get('window');
  
  const router = useRouter();
  const { setCurrentPost, isPostLiked } = usePosts();
  
  // Animation for the like button
  const likeScale = useSharedValue(1);
  
  if (!item) {
    return <View style={{ padding: 10, width: `${100 / 2}%` }} />;
  }
  
  // Function to navigate to post detail
  const navigateToPostDetail = (post: BaseItem) => {
    if (isPostItem(post)) {
      // Set current post in context first
      setCurrentPost(post);
      
      // Navigate to posts detail screen with just the post ID
      // Context will provide all the other data
      router.push({
        pathname: "/(root)/(posts)",
        params: {
          id: post.id
        }
      } as any);
    } else if (isProductItem(post)) {
      console.log('Product item clicked');
      // Future implementation for product detail navigation
    }
  };
  
  // Function to determine if a post has video media
  const hasVideoMedia = (item: PostItem): boolean => {
    // First check the direct mediaType property
    if (item.mediaType === 'video') return true;
    
    // Then check in allMedia array
    if (item.allMedia && item.allMedia.length > 0) {
      return item.allMedia.some(media => {
        if (typeof media === 'object' && media !== null) {
          return media.type === 'video' || 
            (media.url && typeof media.url === 'string' && media.url.match(/\.(mp4|mov|avi|wmv)$/i));
        }
        // If media is a string URL, check if it looks like a video URL
        if (typeof media === 'string') {
          return media.match(/\.(mp4|mov|avi|wmv)$/i);
        }
        return false;
      });
    }
    
    // Check if mediaUrl is a video URL
    if (item.mediaUrl && typeof item.mediaUrl === 'string') {
      return item.mediaUrl.match(/\.(mp4|mov|avi|wmv)$/i) !== null;
    }
    
    return false;
  };
  
  // Function to get thumbnail for video
  const getVideoThumbnail = (item: PostItem): string | undefined => {
    // Use explicit thumbnail if available
    if (item.thumbnailUri) return item.thumbnailUri;
    if ((item as any).imageUrl) return (item as any).imageUrl;
    
    // Check for thumbnail in media array
    if (item.allMedia && item.allMedia.length > 0) {
      // First try to find an explicit thumbnail
      const videoMedia = item.allMedia.find(media => {
        if (typeof media === 'object' && media !== null) {
          return media.type === 'video' || 
            (media.url && typeof media.url === 'string' && media.url.match(/\.(mp4|mov|avi|wmv)$/i));
        }
        return false;
      });
      
      if (videoMedia && typeof videoMedia === 'object' && videoMedia.thumbnail) {
        return videoMedia.thumbnail;
      }
      
      // If no explicit thumbnail, look for posterUri or thumbnailUri
      if (videoMedia && typeof videoMedia === 'object') {
        if (videoMedia.posterUri) return videoMedia.posterUri;
        if (videoMedia.thumbnailUri) return videoMedia.thumbnailUri;
      }
      
      // If still no thumbnail, look for an image to use as thumbnail
      const firstImage = item.allMedia.find(media => {
        if (typeof media === 'object' && media !== null) {
          return media.type === 'image';
        }
        if (typeof media === 'string') {
          return media.match(/\.(jpg|jpeg|png|gif|webp)$/i) !== null;
        }
        return false;
      });
      
      if (firstImage) {
        if (typeof firstImage === 'object' && firstImage.url) {
          return firstImage.url;
        }
        if (typeof firstImage === 'string') {
          return firstImage;
        }
      }
    }
    
    // Fallback to the mediaUrl for image types or the image uri
    if (item.mediaType === 'image' && item.mediaUrl) {
      return item.mediaUrl;
    }
    
    // Try the image property
    if (item.image && item.image.uri) {
      return item.image.uri;
    }
    
    // Last resort - return whatever mediaUrl we have
    return item.mediaUrl;
  };
  
  // Handle like press with animation
  const handleLikePress = (postItem: BaseItem, event: any) => {
    // Stop event propagation to prevent navigating to detail
    event.stopPropagation();
    
    if (!isPostItem(postItem)) return;
    
    // Animate the like button
    likeScale.value = withSpring(1.3, { damping: 10 }, () => {
      likeScale.value = withSpring(1);
    });
    
    // Call the onLike handler if provided
    if (onLike) {
      onLike(postItem.id);
    }
  };

  // Render different item types
  if (isButtonItem(item)) {
    // New Post/Product Button
    return (
      <TouchableOpacity 
        className="m-1 rounded-xl overflow-hidden shadow-sm bg-white border-2 border-dashed border-purple-200 flex-1 items-center justify-center"
        style={{ 
          height: 150,
          maxWidth: width / 2 - 8, // Account for margins
        }}
        onPress={() => {
          handleItemPress(item);
          // Navigate to new post creation
          if (activeTab === 'posts') {
            router.push("/(root)/(createPosts)/createPosts");
          } else {
            router.push("/(root)/(createProducts)/createProducts");
          }
        }}
      >
        <LinearGradient
          colors={['#9333EA', '#C084FC']}
          className="rounded-full p-3 mb-2"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Feather name="plus" size={24} color="white" />
        </LinearGradient>
        <Text className="text-purple-700 font-rubik-medium text-sm">
          {activeTab === 'posts' ? 'New Post' : 'Add Product'}
        </Text>
      </TouchableOpacity>
    );
  } else {
    return (
      // Regular item (post or product)
      <View className="m-1 flex-1" style={{ maxWidth: width / 2 - 8 }}>
        {isPostItem(item) ? (
          // Post Item - This is used for both regular posts and liked posts
          <TouchableOpacity 
            className="rounded-xl overflow-hidden shadow-sm bg-white border border-pink-50"
            onPress={() => navigateToPostDetail(item)}
          >
            {hasVideoMedia(item as PostItem) ? (
              <View style={{ height: 150, overflow: 'hidden' }}>
                <Image 
                  source={{ 
                    uri: getVideoThumbnail(item as PostItem) || 
                         (item as any).imageUrl || 
                         item.image?.uri || 
                         'https://via.placeholder.com/300x200/000000/FFFFFF?text=Video'
                  }}
                  style={{ width: '100%', height: 150 }}
                  resizeMode="cover"
                  defaultSource={require('@/assets/images/no-result.png')}
                />
                {/* Video indicator overlay */}
                <View style={[styles.videoIndicator, { position: 'absolute', top: 5, left: 5 }]}>
                  <View className="bg-black/60 px-2 py-0.5 rounded-full flex-row items-center">
                    <Ionicons name="videocam" size={10} color="white" />
                    <Text className="text-white text-xs ml-0.5">Video</Text>
                  </View>
                </View>
                {/* Play button overlay */}
                <View style={[styles.playButton, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }]}>
                  <View className="bg-black/50 rounded-full w-8 h-8 items-center justify-center">
                    <Ionicons name="play" size={16} color="white" />
                  </View>
                </View>
              </View>
            ) : (
              <Image 
                source={{ 
                  uri: item.image?.uri || 
                       item.mediaUrl || 
                       (item as any).imageUrl || 
                       'https://via.placeholder.com/300x200/CCCCCC/666666?text=No+Image'
                }}
                style={{ width: '100%', height: 150 }}
                resizeMode="cover"
                defaultSource={require('@/assets/images/no-result.png')}
              />
            )}
            
            <View className="p-3">
              <Text className="text-xs text-gray-400 mb-1 font-rubik">
                {formatRelativeTime(item.createdAt)}
              </Text>
              
              <Text numberOfLines={1} className="text-sm font-rubik-medium text-gray-800">
                {item.title || "Untitled Post"}
              </Text>
              <Text numberOfLines={2} className="text-xs text-gray-500 mt-1 font-rubik">
                {item.content || "No description available"}
              </Text>
              
              {/* Tags - horizontal scrollable row */}
              {item.tags && item.tags.length > 0 && (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  className="mt-2"
                >
                  {item.tags.map((tag: string, index: number) => (
                    <View 
                      key={index} 
                      className="bg-purple-50 rounded-full px-2 py-1 mr-1 flex-row items-center"
                    >
                      <MaterialCommunityIcons name="tag" size={10} color="#9333EA" />
                      <Text className="text-purple-700 text-xs ml-1">
                        {tag}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              )}
              
              {/* Like interaction area */}
              <View className="flex-row justify-between items-center mt-3">
                <TouchableOpacity 
                  className="flex-row items-center" 
                  onPress={(event) => handleLikePress(item, event)}
                >
                  <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                    <Ionicons 
                      name={isPostLiked(item.id) ? "heart" : "heart-outline"} 
                      size={16} 
                      color={isPostLiked(item.id) ? "#F43F5E" : "#374151"} 
                    />
                  </Animated.View>
                  <Text className="ml-1 text-xs text-gray-600">{Math.max(0, item.likes || 0)}</Text>
                </TouchableOpacity>
                
                {item.comments && (
                  <View className="flex-row items-center">
                    <Ionicons name="chatbubble-outline" size={14} color="#374151" />
                    <Text className="ml-1 text-xs text-gray-600">
                      {Array.isArray(item.comments) ? item.comments.length : 0}
                    </Text>
                  </View>
                )}
                
                {/* View count */}
                <View className="flex-row items-center">
                  <Ionicons name="eye-outline" size={14} color="#374151" />
                  <Text className="ml-1 text-xs text-gray-600">{item.views || 0}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ) : isProductItem(item) ? (
          // Product Item
          <TouchableOpacity 
            className="rounded-xl overflow-hidden shadow-sm bg-white border border-blue-50"
            onPress={() => handleItemPress(item)}
          >
            <Image 
              source={{ uri: item.image?.uri || item.mediaUrl }}
              style={{ width: '100%', height: 150 }}
              resizeMode="cover"
              defaultSource={require('@/assets/images/no-result.png')}
            />
            
            <View className="p-3">
              <Text numberOfLines={1} className="text-sm font-rubik-medium text-gray-800">
                {(item as ProductItem).name || "Untitled Product"}
              </Text>
              <Text className="text-xs text-purple-600 mt-1 font-rubik-bold">
                ${(item as ProductItem).price?.toFixed(2) || "0.00"}
              </Text>
              <Text numberOfLines={2} className="text-xs text-gray-500 mt-1 font-rubik">
                No description available
              </Text>
              
              <View className="flex-row justify-between items-center mt-3">
                <View className="flex-row items-center">
                  <Feather name="shopping-cart" size={14} color="#374151" />
                  <Text className="ml-1 text-xs text-gray-600">
                    {(item as ProductItem).sold ? `${(item as ProductItem).sold} sold` : "0 sold"}
                  </Text>
                </View>
                
                {/* View count for products */}
                <View className="flex-row items-center">
                  <Ionicons name="eye-outline" size={14} color="#374151" />
                  <Text className="ml-1 text-xs text-gray-600">{(item as ProductItem).views || 0}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          // Fallback for unknown item type
          <View className="rounded-xl overflow-hidden shadow-sm bg-white border border-gray-100 h-150">
            <Text className="p-4 text-gray-500">Unknown item type</Text>
          </View>
        )}
      </View>
    );
  }
};

const styles = StyleSheet.create({
  videoIndicator: {
    zIndex: 10,
  },
  playButton: {
    zIndex: 10,
  }
}); 