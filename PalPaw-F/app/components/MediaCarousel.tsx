import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Image, 
  FlatList, 
  Dimensions, 
  TouchableOpacity, 
  ActivityIndicator,
  Text
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../constants';

const { width } = Dimensions.get('window');

type MediaItem = {
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
};

interface MediaCarouselProps {
  media: any[]; // Original media array from post
  autoPlay?: boolean;
}

const MediaCarousel: React.FC<MediaCarouselProps> = ({ media, autoPlay = false }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const videoRefs = useRef<{ [key: number]: Video | null }>({});
  
  // Helper function to format URL
  const formatMediaUrl = (url: string): string => {
    if (!url) return 'https://robohash.org/default?set=set4&bgset=bg1';
    
    // Check if URL is already absolute
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If URL is a file system path from expo-image-picker, it will start with file://
    if (url.startsWith('file://')) {
      return url;
    }
    
    // If URL starts with /uploads, append to the base URL
    if (url.startsWith('/uploads')) {
      // You might need to set your API_BASE_URL in a constants file or env variable
      return `${API_BASE_URL}${url}`;
    }
    
    // For relative paths that don't start with /uploads
    if (!url.startsWith('/')) {
      return `${API_BASE_URL}/uploads/${url}`;
    }
    
    // For other relative paths that start with /
    return `${API_BASE_URL}${url}`;
  };
  
  // Process media items to ensure consistent format
  const processedMedia: MediaItem[] = React.useMemo(() => {
    if (!media || !Array.isArray(media) || media.length === 0) {
      // Return a default placeholder if no media
      return [{ type: 'image', url: 'https://robohash.org/default?set=set4&bgset=bg1' }];
    }

    return media.map((item) => {
      // Handle object format
      if (typeof item === 'object' && item !== null) {
        const isVideo = item.type === 'video' || 
          (item.url && typeof item.url === 'string' && item.url.match(/\.(mp4|mov|avi|wmv)$/i));
        
        // Format URL properly
        const formattedUrl = formatMediaUrl(item.url || '');
        const formattedThumbnail = item.thumbnail ? formatMediaUrl(item.thumbnail) : '';
        
        console.log(`Loading media: ${isVideo ? 'video' : 'image'} ${formattedUrl}`);
        
        return {
          type: isVideo ? 'video' : 'image',
          url: formattedUrl,
          thumbnail: formattedThumbnail
        };
      } 
      // Handle string format (URL)
      else if (typeof item === 'string') {
        const isVideo = item.match(/\.(mp4|mov|avi|wmv)$/i) !== null;
        const formattedUrl = formatMediaUrl(item);
        
        console.log(`Loading media: ${isVideo ? 'video' : 'image'} ${formattedUrl}`);
        
        return {
          type: isVideo ? 'video' : 'image',
          url: formattedUrl,
          thumbnail: ''
        };
      }
      // Fallback for any other cases
      return { type: 'image', url: 'https://robohash.org/default?set=set4&bgset=bg1' };
    });
  }, [media]);

  // Pause currently playing video when index changes
  useEffect(() => {
    // Pause all videos except current one
    Object.keys(videoRefs.current).forEach((key) => {
      const index = parseInt(key);
      const videoRef = videoRefs.current[index];
      
      if (videoRef) {
        if (index === currentIndex && isPlaying) {
          videoRef.playAsync();
        } else {
          videoRef.pauseAsync();
        }
      }
    });
  }, [currentIndex, isPlaying]);

  // Handle video playback status update
  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setLoading(false);
      setIsPlaying(status.isPlaying);
    }
  };

  // Handle play/pause for videos
  const handlePlayPress = () => {
    const videoRef = videoRefs.current[currentIndex];
    if (!videoRef) return;
    
    if (isPlaying) {
      videoRef.pauseAsync();
    } else {
      videoRef.playAsync();
    }
    setIsPlaying(!isPlaying);
  };

  // Handle mute toggle for videos
  const handleMutePress = () => {
    const videoRef = videoRefs.current[currentIndex];
    if (!videoRef) return;
    
    videoRef.setIsMutedAsync(!isMuted);
    setIsMuted(!isMuted);
  };

  // Render individual media item
  const renderMediaItem = ({ item, index }: { item: MediaItem; index: number }) => {
    return (
      <View style={{ width, aspectRatio: 1 }}>
        {item.type === 'video' ? (
          <View className="w-full h-full bg-black">
            {loading && index === currentIndex && (
              <View className="absolute inset-0 items-center justify-center bg-black">
                <ActivityIndicator size="large" color="#9333EA" />
              </View>
            )}
            
            <Video
              ref={(ref) => { videoRefs.current[index] = ref; }}
              source={{ uri: item.url }}
              resizeMode={ResizeMode.COVER}
              style={{ width: '100%', height: '100%' }}
              shouldPlay={index === currentIndex && autoPlay}
              isLooping
              onPlaybackStatusUpdate={onPlaybackStatusUpdate}
              isMuted={isMuted}
              posterSource={item.thumbnail ? { uri: item.thumbnail } : undefined}
              usePoster={!!item.thumbnail}
            />
            
            {(!isPlaying || index !== currentIndex) && (
              <View className="absolute inset-0">
                <Image
                  source={{ uri: item.thumbnail || item.url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)']}
                  className="absolute inset-0"
                />
                {index === currentIndex && (
                  <TouchableOpacity
                    onPress={handlePlayPress}
                    className="absolute inset-0 items-center justify-center"
                  >
                    <LinearGradient
                      colors={['rgba(147,51,234,0.8)', 'rgba(192,132,252,0.8)']}
                      className="w-16 h-16 rounded-full items-center justify-center shadow-lg"
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="play" size={36} color="white" />
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            )}
            
            {index === currentIndex && isPlaying && (
              <View className="absolute bottom-4 right-4 flex-row">
                <TouchableOpacity 
                  className="bg-black/60 rounded-full p-2 mr-2"
                  onPress={handleMutePress}
                >
                  <Ionicons name={isMuted ? "volume-mute" : "volume-medium"} size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity 
                  className="bg-black/60 rounded-full p-2"
                  onPress={handlePlayPress}
                >
                  <Ionicons name={isPlaying ? "pause" : "play"} size={20} color="white" />
                </TouchableOpacity>
              </View>
            )}
            
            {/* Video indicator */}
            <View className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-full flex-row items-center">
              <Ionicons name="videocam" size={12} color="white" />
              <Text className="text-white text-xs ml-1 font-rubik">Video</Text>
            </View>
          </View>
        ) : (
          <View className="w-full h-full">
            <Image
              source={{ uri: item.url }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
            {/* Image indicator */}
            <View className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-full flex-row items-center">
              <Ionicons name="image" size={12} color="white" />
              <Text className="text-white text-xs ml-1 font-rubik">Photo</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Pagination indicators
  const renderPagination = () => {
    if (processedMedia.length <= 1) return null;
    
    return (
      <View className="absolute bottom-4 left-0 right-0 flex-row justify-center">
        {processedMedia.map((_, index) => (
          <View
            key={index}
            className={`w-2 h-2 rounded-full mx-1 ${
              index === currentIndex ? 'bg-white' : 'bg-white/40'
            }`}
          />
        ))}
      </View>
    );
  };

  return (
    <View className="w-full aspect-square">
      <FlatList
        ref={flatListRef}
        data={processedMedia}
        renderItem={renderMediaItem}
        keyExtractor={(_, index) => `media-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const newIndex = Math.floor(
            event.nativeEvent.contentOffset.x / width
          );
          setCurrentIndex(newIndex);
        }}
      />
      {renderPagination()}
    </View>
  );
};

export default MediaCarousel; 