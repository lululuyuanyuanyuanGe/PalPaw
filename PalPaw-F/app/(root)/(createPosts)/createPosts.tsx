import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
  Alert
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { createPost, Media as ServiceMedia, PostData } from './postService';

interface Media {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
}

const CreatePostScreen: React.FC = () => {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<string>('');
  const [petTags, setPetTags] = useState<string[]>([]);
  const videoRef = useRef<Video>(null);

  // Pick media from gallery
  const pickMedia = async (type: 'image' | 'video' | 'both') => {
    let options: ImagePicker.ImagePickerOptions = {
      mediaTypes: type === 'image' 
        ? 'images'
        : type === 'video'
          ? 'videos'
          : ['images', 'videos'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    };

    const result = await ImagePicker.launchImageLibraryAsync(options);

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const mediaType = asset.uri.endsWith('.mp4') || asset.type === 'video' ? 'video' : 'image';
      
      setMedia([...media, {
        uri: asset.uri,
        type: mediaType,
        width: asset.width,
        height: asset.height
      }]);
    }
  };

  // Take photo with camera
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      alert('Sorry, we need camera permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setMedia([...media, {
        uri: asset.uri,
        type: 'image',
        width: asset.width,
        height: asset.height
      }]);
    }
  };

  // Remove media item
  const removeMedia = (index: number) => {
    const newMedia = [...media];
    newMedia.splice(index, 1);
    setMedia(newMedia);
  };

  // Handle post submission
  const handleSubmit = async () => {
    if (title.trim().length === 0) {
      Alert.alert('Missing Information', 'Please add a title');
      return;
    }

    if (media.length === 0) {
      Alert.alert('Missing Media', 'Please add at least one image or video');
      return;
    }

    setLoading(true);
    
    try {
      // Prepare post data
      const postData: PostData = {
        title,
        content,
        media: media as ServiceMedia[],
        postType: 'pet',
      };
      
      // Add optional fields
      if (location) postData.location = location;
      if (petTags.length > 0) postData.petTags = petTags;
      
      // Send data to the API
      const result = await createPost(postData);
      
      setLoading(false);
      
      if (result.success) {
        Alert.alert('Success', result.message, [
          { text: 'OK', onPress: () => {
            // Clear form
            setTitle('');
            setContent('');
            setMedia([]);
            setLocation('');
            setPetTags([]);
            // Navigate back
            router.back();
          }}
        ]);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Failed to create post. Please try again.');
      console.error(error);
    }
  };

  // Render media preview
  const renderMediaItem = ({ item, index }: { item: Media; index: number }) => (
    <View className="relative mr-2 rounded-xl overflow-hidden" style={{ width: 100, height: 100 }}>
      {item.type === 'image' ? (
        <Image source={{ uri: item.uri }} className="w-full h-full" />
      ) : (
        <Video
          ref={videoRef}
          source={{ uri: item.uri }}
          className="w-full h-full"
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls
        />
      )}
      <TouchableOpacity 
        onPress={() => removeMedia(index)}
        className="absolute top-1 right-1 bg-black/50 rounded-full p-1"
      >
        <Ionicons name="close" size={16} color="white" />
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView className="flex-1" bounces={false} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-12 pb-4 border-b border-gray-100">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text className="text-lg font-rubik-medium text-gray-800">Create Post</Text>
          <TouchableOpacity 
            onPress={handleSubmit}
            disabled={loading} 
            className={`py-2 px-4 rounded-full ${loading ? 'bg-gray-300' : 'bg-purple-500'}`}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-rubik-medium">Share</Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="p-4">
          {/* Title Input */}
          <View className="mb-4">
            <TextInput
              className="bg-gray-50 p-3 rounded-xl text-gray-800 font-rubik"
              placeholder="What's on your mind?"
              placeholderTextColor="#9CA3AF"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          {/* Content Input */}
          <View className="mb-4">
            <TextInput
              className="bg-gray-50 p-3 rounded-xl text-gray-800 min-h-[120px] font-rubik"
              placeholder="Share your pet's story..."
              placeholderTextColor="#9CA3AF"
              value={content}
              onChangeText={setContent}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
          </View>

          {/* Media Preview */}
          {media.length > 0 && (
            <View className="mb-4">
              <FlatList
                data={media}
                renderItem={renderMediaItem}
                keyExtractor={(_, index) => index.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                className="py-2"
              />
            </View>
          )}

          {/* Media Upload Buttons */}
          <View className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl mb-4">
            <Text className="text-gray-700 font-rubik-medium mb-3">Add Media</Text>
            <View className="flex-row justify-around">
              <TouchableOpacity 
                onPress={() => pickMedia('image')}
                className="items-center"
              >
                <View className="bg-purple-100 rounded-full p-3 mb-1">
                  <Ionicons name="image" size={24} color="#8B5CF6" />
                </View>
                <Text className="text-xs text-gray-600 font-rubik">Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => pickMedia('video')}
                className="items-center"
              >
                <View className="bg-purple-100 rounded-full p-3 mb-1">
                  <Ionicons name="videocam" size={24} color="#8B5CF6" />
                </View>
                <Text className="text-xs text-gray-600 font-rubik">Video</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={takePhoto}
                className="items-center"
              >
                <View className="bg-purple-100 rounded-full p-3 mb-1">
                  <Ionicons name="camera" size={24} color="#8B5CF6" />
                </View>
                <Text className="text-xs text-gray-600 font-rubik">Camera</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Additional Options */}
          <View className="mb-6">
            <TouchableOpacity 
              className="flex-row items-center py-3 border-b border-gray-100"
              onPress={() => {
                /* Show location picker modal */
                Alert.prompt(
                  "Add Location", 
                  "Enter your location", 
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "OK", onPress: text => setLocation(text || '') }
                  ],
                  "plain-text",
                  location,
                );
              }}
            >
              <View className="bg-blue-100 rounded-full p-2 mr-3">
                <Feather name="map-pin" size={18} color="#3B82F6" />
              </View>
              <Text className="text-gray-700 font-rubik">
                {location ? location : "Add Location"}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-row items-center py-3 border-b border-gray-100"
              onPress={() => {
                /* Show pet tag picker */
                // This would ideally open a tag picker UI
              }}
            >
              <View className="bg-purple-100 rounded-full p-2 mr-3">
                <MaterialCommunityIcons name="tag-outline" size={18} color="#8B5CF6" />
              </View>
              <Text className="text-gray-700 font-rubik">Tag Pet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default CreatePostScreen;
