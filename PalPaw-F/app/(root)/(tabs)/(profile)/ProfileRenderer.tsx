import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BaseItem, PostItem, ProductItem, isButtonItem, isPostItem, isProductItem, ProfileTab } from './types';
import { usePosts } from '../../../../context';

interface RenderItemProps {
  item: BaseItem;
  activeTab: ProfileTab;
  onPress: (item: BaseItem) => void;
  showTabBar?: boolean;
}

export const RenderItem: React.FC<RenderItemProps> = ({ item, activeTab, onPress: handleItemPress, showTabBar }) => {
  
  // Get screen width for sizing
  const { width } = Dimensions.get('window');
  
  const router = useRouter();
  const { setCurrentPost } = usePosts();
  
  if (!item) {
    return <View style={{ padding: 10, width: `${100 / 2}%` }} />;
  }
  
  // Function to navigate to post detail
  const navigateToPostDetail = (post: BaseItem) => {
    if (isPostItem(post)) {
      // Set current post in context first
      setCurrentPost(post);
      
      // Prepare the media array
      const allMediaParam = post.allMedia ? JSON.stringify(post.allMedia) : '[]';
      
      // Navigate to posts detail screen with all available data
      router.push({
        pathname: "/(root)/(posts)",
        params: {
          id: post.id,
          title: (post as PostItem).title || '',
          content: (post as PostItem).content || '',
          likes: (post as PostItem).likes?.toString() || '0',
          mediaType: post.mediaType,
          mediaUrl: post.mediaUrl,
          thumbnailUri: post.thumbnailUri || '',
          imageUri: post.image?.uri || '',
          allMedia: allMediaParam,
          createdAt: (post as PostItem).createdAt?.toISOString() || new Date().toISOString()
        }
      } as any);
    } else if (isProductItem(post)) {
      console.log('Product item clicked');
      // Future implementation for product detail navigation
    }
  };
  
  return (
    <View
      style={{
        padding: 10,
        width: `${100 / 2}%`, // 2 columns
      }}
    >
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
        <TouchableOpacity 
          className="rounded-xl overflow-hidden shadow-sm bg-white border border-pink-50"
          onPress={() => {
            console.log(`Post clicked: ${item.id}`);
            // Navigate to post detail instead of just calling the handler
            navigateToPostDetail(item);
          }}
        >
          {item.mediaType === 'video' && item.mediaUrl ? (
            <View style={{ height: 150, overflow: 'hidden' }}>
              <Image 
                source={{ uri: item.thumbnailUri || item.mediaUrl }}
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
            // Show placeholder if image fails to load
            <Image 
              source={item.image?.uri ? item.image : { uri: 'https://via.placeholder.com/300x200/000000/FFFFFF?text=No+Image' }}
              style={{ width: '100%', height: 150 }}
              resizeMode="cover"
              defaultSource={require('@/assets/images/no-result.png')}
            />
          )}
          <View className="p-2">
            <Text className="text-gray-800 font-medium" numberOfLines={1}>{item.title || 'Untitled'}</Text>
            <View className="flex-row items-center mt-1">
              <Ionicons name="heart" size={12} color="#FF2442" />
              <Text className="text-xs text-gray-500 ml-1">{item.likes || 0}</Text>
            </View>
          </View>
        </TouchableOpacity>
      ) : isProductItem(item) ? (
        // Product Item
        <TouchableOpacity 
          className="rounded-xl overflow-hidden shadow-sm bg-white border border-pink-50"
          onPress={() => {
            console.log(`Product clicked: ${item.id}`);
            handleItemPress(item);
          }}
        >
          {item.mediaType === 'video' && item.mediaUrl ? (
            <View style={{ height: 150, overflow: 'hidden' }}>
              <Image 
                source={{ uri: item.thumbnailUri || item.mediaUrl }}
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
              source={item.image?.uri ? item.image : { uri: 'https://via.placeholder.com/300x200/000000/FFFFFF?text=No+Image' }}
              style={{ width: '100%', height: 150 }}
              resizeMode="cover"
              defaultSource={require('@/assets/images/no-result.png')}
            />
          )}
          <View className="absolute top-2 right-2 bg-purple-500 px-2 py-0.5 rounded-full">
            <Text className="text-white text-xs font-bold">${item.price || 0}</Text>
          </View>
          <View className="p-2">
            <Text className="text-gray-800 font-medium" numberOfLines={1}>{item.name || 'Untitled'}</Text>
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
};

const styles = StyleSheet.create({
  videoIndicator: {
    zIndex: 10,
  },
  playButton: {
    zIndex: 5,
  }
}); 