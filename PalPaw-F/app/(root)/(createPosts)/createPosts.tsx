import React, { useState, useRef, useEffect } from 'react';
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
  Alert,
  Modal,
  SafeAreaView,
  Dimensions
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons, MaterialCommunityIcons, Feather, AntDesign } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { createPost, Media as ServiceMedia, PostData, getPetTagSuggestions, PetTagCategory } from './postService';

interface Media {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
}

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CreatePostScreen: React.FC = () => {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationText, setLocationText] = useState<string>('');
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [petTags, setPetTags] = useState<string[]>([]);
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [tagCategories, setTagCategories] = useState<PetTagCategory[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [customTag, setCustomTag] = useState('');
  const videoRef = useRef<Video>(null);

  // Load tag categories when the tag modal is opened
  useEffect(() => {
    if (tagModalVisible && tagCategories.length === 0) {
      loadTagCategories();
    }
  }, [tagModalVisible]);

  // Load tag categories from service
  const loadTagCategories = async () => {
    setLoadingTags(true);
    try {
      const categories = await getPetTagSuggestions();
      setTagCategories(categories);
    } catch (error) {
      console.error('Error loading tag categories:', error);
    } finally {
      setLoadingTags(false);
    }
  };

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

  // Remove location
  const removeLocation = () => {
    setLocationText('');
    setLocationData(null);
  };

  // Request location permission and get current location
  const getLocation = async () => {
    try {
      // First, ask for location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'PalPaw needs location permission to add your current location to posts.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Show loading indicator
      setLoading(true);
      
      // Get current position
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      
      // Reverse geocode to get address
      const geocode = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });
      
      setLoading(false);
      
      // Extract address components
      if (geocode && geocode.length > 0) {
        const location = geocode[0];
        const address = [
          location.name,
          location.street,
          location.city,
          location.region,
          location.country
        ].filter(Boolean).join(', ');
        
        setLocationText(address);
        setLocationData({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          address
        });
      } else {
        // If geocoding fails, just use coordinates
        const coordsText = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
        setLocationText(coordsText);
        setLocationData({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      }
    } catch (error) {
      setLoading(false);
      console.error('Error getting location:', error);
      Alert.alert(
        'Location Error',
        'Could not get your current location. Please try again later.',
        [{ text: 'OK' }]
      );
    }
  };

  // Add or remove a tag from the selected tags
  const toggleTag = (tag: string) => {
    if (petTags.includes(tag)) {
      setPetTags(petTags.filter(t => t !== tag));
    } else {
      setPetTags([...petTags, tag]);
    }
  };

  // Add a custom tag
  const addCustomTag = () => {
    if (customTag.trim() && !petTags.includes(customTag.trim())) {
      setPetTags([...petTags, customTag.trim()]);
      setCustomTag('');
    }
  };

  // Remove media item
  const removeMedia = (index: number) => {
    const newMedia = [...media];
    newMedia.splice(index, 1);
    setMedia(newMedia);
  };

  // Remove a tag
  const removeTag = (tag: string) => {
    setPetTags(petTags.filter(t => t !== tag));
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
      if (locationText) {
        postData.location = locationText;
        
        // If we have precise location data, add it to the post
        if (locationData) {
          postData.locationCoordinates = {
            latitude: locationData.latitude,
            longitude: locationData.longitude
          };
        }
      }
      
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
            setLocationText('');
            setLocationData(null);
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

  // Render a tag item
  const renderTagItem = ({ item }: { item: string }) => (
    <View className="bg-purple-100 rounded-full px-3 py-1 mr-2 mb-2 flex-row items-center">
      <Text className="text-purple-700 text-xs font-rubik mr-1">{item}</Text>
      <TouchableOpacity onPress={() => removeTag(item)}>
        <Ionicons name="close-circle" size={16} color="#8B5CF6" />
      </TouchableOpacity>
    </View>
  );

  // Render tag category in modal
  const renderTagCategory = ({ item }: { item: PetTagCategory }) => (
    <View className="mb-5">
      <Text className="text-gray-700 font-rubik-medium mb-2">{item.name}</Text>
      <View className="flex-row flex-wrap">
        {item.tags.map((tag) => (
          <TouchableOpacity 
            key={tag}
            onPress={() => toggleTag(tag)}
            className={`rounded-full px-3 py-1 mr-2 mb-2 ${
              petTags.includes(tag) ? 'bg-opacity-100' : 'bg-opacity-20'
            }`}
            style={{ backgroundColor: item.color + (petTags.includes(tag) ? '' : '40') }}
          >
            <Text 
              className={`text-xs font-rubik ${
                petTags.includes(tag) ? 'text-white' : 'text-gray-700'
              }`}
            >
              {tag}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
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

          {/* Selected Tags */}
          {petTags.length > 0 && (
            <View className="mb-4">
              <Text className="text-gray-700 font-rubik-medium mb-2">Selected Tags</Text>
              <View className="flex-row flex-wrap">
                {petTags.map(tag => (
                  <View key={tag} className="bg-purple-100 rounded-full px-3 py-1 mr-2 mb-2 flex-row items-center">
                    <Text className="text-purple-700 text-xs font-rubik mr-1">{tag}</Text>
                    <TouchableOpacity onPress={() => removeTag(tag)}>
                      <Ionicons name="close-circle" size={16} color="#8B5CF6" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

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
            <View className="flex-row items-center py-3 border-b border-gray-100">
              <View className="bg-blue-100 rounded-full p-2 mr-3">
                <Feather name="map-pin" size={18} color="#3B82F6" />
              </View>
              
              {locationText ? (
                <View className="flex-row flex-1 items-center justify-between">
                  <Text className="text-gray-700 font-rubik flex-1 mr-2" numberOfLines={1}>
                    {locationText}
                  </Text>
                  <TouchableOpacity 
                    onPress={removeLocation}
                    className="bg-gray-100 rounded-full p-1"
                  >
                    <Feather name="x" size={16} color="#4B5563" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="flex-row flex-1 items-center justify-between">
                  <Text className="text-gray-700 font-rubik">Add Location</Text>
                  <TouchableOpacity 
                    onPress={getLocation}
                    className="bg-blue-50 rounded-full py-1 px-2 flex-row items-center"
                  >
                    <Ionicons name="locate" size={14} color="#3B82F6" />
                    <Text className="text-blue-500 text-xs ml-1 font-rubik">Current Location</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            
            <TouchableOpacity 
              className="flex-row items-center py-3 border-b border-gray-100"
              onPress={() => setTagModalVisible(true)}
            >
              <View className="bg-purple-100 rounded-full p-2 mr-3">
                <MaterialCommunityIcons name="tag-outline" size={18} color="#8B5CF6" />
              </View>
              <View className="flex-row flex-1 items-center justify-between">
                <Text className="text-gray-700 font-rubik">
                  {petTags.length > 0 ? `${petTags.length} Tags Selected` : "Add Tags"}
                </Text>
                <View className="bg-purple-50 rounded-full py-1 px-2">
                  <Text className="text-purple-500 text-xs font-rubik">Select</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Pet Tag Modal */}
      <Modal
        visible={tagModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTagModalVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-1">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
              <TouchableOpacity onPress={() => setTagModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
              <Text className="text-lg font-rubik-medium text-gray-800">Pet Tags</Text>
              <TouchableOpacity onPress={() => setTagModalVisible(false)}>
                <Text className="text-purple-500 font-rubik-medium">Done</Text>
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 p-4">
              {/* Custom Tag Input */}
              <View className="flex-row items-center mb-5">
                <TextInput
                  className="flex-1 bg-gray-50 p-3 rounded-l-xl text-gray-800 font-rubik"
                  placeholder="Add custom tag..."
                  placeholderTextColor="#9CA3AF"
                  value={customTag}
                  onChangeText={setCustomTag}
                  maxLength={20}
                />
                <TouchableOpacity 
                  onPress={addCustomTag}
                  disabled={customTag.trim().length === 0}
                  className={`p-3 rounded-r-xl ${
                    customTag.trim().length > 0 ? 'bg-purple-500' : 'bg-gray-300'
                  }`}
                >
                  <AntDesign name="plus" size={20} color="white" />
                </TouchableOpacity>
              </View>

              {/* Selected Tags */}
              {petTags.length > 0 && (
                <View className="mb-5">
                  <Text className="text-gray-700 font-rubik-medium mb-2">Selected Tags</Text>
                  <View className="flex-row flex-wrap">
                    {petTags.map(tag => (
                      <View key={tag} className="bg-purple-100 rounded-full px-3 py-1 mr-2 mb-2 flex-row items-center">
                        <Text className="text-purple-700 text-xs font-rubik mr-1">{tag}</Text>
                        <TouchableOpacity onPress={() => removeTag(tag)}>
                          <Ionicons name="close-circle" size={16} color="#8B5CF6" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Loading indicator */}
              {loadingTags ? (
                <View className="py-10 items-center">
                  <ActivityIndicator size="large" color="#8B5CF6" />
                  <Text className="text-gray-500 mt-3 font-rubik">Loading tag suggestions...</Text>
                </View>
              ) : (
                <>
                  {/* Tag Categories */}
                  <Text className="text-xl font-rubik-medium text-gray-800 mb-4">Suggestions</Text>
                  <FlatList
                    data={tagCategories}
                    renderItem={renderTagCategory}
                    keyExtractor={(item) => item.name}
                    scrollEnabled={false}
                  />
                </>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default CreatePostScreen;
