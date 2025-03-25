import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import VideoThumbnail from '@/app/components/VideoThumbnail';
import { BaseItem, isButtonItem, isPostItem, isProductItem, ProfileTab } from './types';

interface RenderItemProps {
  item: BaseItem;
  paddingSize: number;
  activeTab: ProfileTab;
}

export const RenderGridItem: React.FC<RenderItemProps> = ({ item, paddingSize, activeTab }) => {
  const router = useRouter();
  
  return (
    <View
      style={{
        padding: paddingSize,
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
            // Navigate to post detail screen (could be implemented later)
          }}
        >
          {item.mediaType === 'video' && item.mediaUrl ? (
            <VideoThumbnail
              videoUrl={item.mediaUrl}
              width="100%"
              height={150}
              onPress={() => {
                console.log("Video post clicked:", item.id);
                // Navigate to post detail view
              }}
            />
          ) : (
            // Show placeholder if image fails to load
            <Image 
              source={item.image}
              style={{ width: '100%', height: 150 }}
              resizeMode="cover"
              defaultSource={require('@/assets/images/placeholder.png')}
            />
          )}
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
        <TouchableOpacity 
          className="rounded-xl overflow-hidden shadow-sm bg-white border border-pink-50"
          onPress={() => {
            console.log(`Product clicked: ${item.id}`);
            // Navigate to product detail screen (could be implemented later)
          }}
        >
          {item.mediaType === 'video' && item.mediaUrl ? (
            <VideoThumbnail
              videoUrl={item.mediaUrl}
              width="100%"
              height={150}
              onPress={() => {
                console.log("Video product clicked:", item.id);
                // Navigate to product detail view
              }}
            />
          ) : (
            <Image 
              source={item.image}
              style={{ width: '100%', height: 150 }}
              resizeMode="cover"
              defaultSource={require('@/assets/images/placeholder.png')}
            />
          )}
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
}; 