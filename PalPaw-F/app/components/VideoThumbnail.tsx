import React from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Define API base URL for media
const API_BASE_URL = 'http://192.168.2.11:5001';

// Fixed background color for placeholder
const BG_COLOR = '#6200EE';

interface VideoThumbnailProps {
  videoUrl: string;
  width?: number | string;
  height?: number | string;
  onPress?: () => void;
}

const VideoThumbnail: React.FC<VideoThumbnailProps> = ({
  videoUrl,
  width = '100%',
  height = 150,
  onPress,
}) => {
  // Format the thumbnail URL correctly
  const getThumbnailUrl = (url: string): string => {
    // If URL is empty, undefined, or invalid
    if (!url || url === 'undefined' || url === 'null') {
      console.log('VideoThumbnail: Using fallback for invalid URL:', url);
      return "https://via.placeholder.com/300x200/6200EE/FFFFFF?text=Video";
    }
    
    // If the URL is already a thumbnail URL, return it as is
    if (url.includes('/video/thumbnail')) {
      return url;
    }

    // Normalize URL - remove any hash or query parameters
    let cleanUrl = url.split('?')[0].split('#')[0];
    
    // If it's a full URL, we need to get just the file path portion
    let filePath = cleanUrl;
    
    // Handle URLs that include the API base
    if (cleanUrl.startsWith(API_BASE_URL)) {
      filePath = cleanUrl.substring(API_BASE_URL.length);
    }
    
    // Ensure the file path has a leading slash
    if (!filePath.startsWith('/')) {
      filePath = '/' + filePath;
    }
    
    // Return the thumbnail URL
    return `${API_BASE_URL}/video/thumbnail?videoPath=${encodeURIComponent(filePath)}`;
  };

  // Handle press events
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      console.log('Video pressed:', videoUrl);
    }
  };

  // Render the thumbnail with play button overlay
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[
        styles.container,
        { width, height } as any,
      ]}
      onPress={handlePress}
    >
      <Image
        source={{ uri: getThumbnailUrl(videoUrl) }}
        style={[styles.thumbnail, { width, height } as any]}
        resizeMode="cover"
      />
      {/* Play button overlay */}
      <View style={styles.playButtonOverlay}>
        <View style={styles.playButton}>
          <Ionicons name="play" size={20} color="#ffffff" />
        </View>
      </View>
      {/* Video indicator */}
      <View style={styles.videoIndicator}>
        <Ionicons name="videocam" size={12} color="#ffffff" style={styles.videoIcon} />
        <Text style={styles.videoText}>Video</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#000000',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  videoIcon: {
    marginRight: 4,
  },
  videoText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  errorText: {
    color: '#721c24',
    textAlign: 'center',
    padding: 10,
  },
});

export default VideoThumbnail; 