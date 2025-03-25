import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface VideoPreviewProps {
  uri?: string;
  width?: number;
  height?: number;
}

// Simple Video Preview component like in createPosts.tsx
const VideoPreview = (props: VideoPreviewProps) => {
  const { uri = '', width = 150, height = 150 } = props;
  
  console.log('VideoPreview displaying URL:', uri);
  
  return (
    <View style={{width, height}} className="items-center justify-center bg-black overflow-hidden">
      <View className="w-full h-full">
        <Image 
          source={{ uri }} 
          className="w-full h-full"
          resizeMode="cover"
          defaultSource={require('@/assets/images/no-result.png')}
        />
      </View>
      
      {/* Play button overlay */}
      <View className="absolute inset-0 items-center justify-center bg-black/30">
        <View className="bg-black/50 rounded-full w-8 h-8 items-center justify-center">
          <Ionicons name="play" size={16} color="white" />
        </View>
      </View>
      
      {/* Video indicator */}
      <View className="absolute top-1 left-1 bg-black/60 px-2 py-0.5 rounded-full flex-row items-center">
        <Ionicons name="videocam" size={10} color="white" />
        <Text className="text-white text-xs ml-0.5">Video</Text>
      </View>
    </View>
  );
};

// Component display name to help with debugging
VideoPreview.displayName = 'VideoPreview';

export default VideoPreview; 