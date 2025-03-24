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
  Dimensions,
  BackHandler
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons, MaterialCommunityIcons, Feather, AntDesign } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { createPost, Media as ServiceMedia, PostData, getPetTagSuggestions, PetTagCategory } from './postService';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Draft post interface
interface PostDraft extends Omit<PostData, 'locationCoordinates'> {
  locationCoordinates?: LocationData;
  draftId?: string;
  lastUpdated: number;
}

const POST_DRAFT_KEY = 'post_draft';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Simple Video Preview component without hooks
const VideoPreview: React.FC<{ uri: string }> = ({ uri }) => {
  return (
    <View className="w-full h-full items-center justify-center bg-black">
      <View className="w-full h-full">
        <Image 
          source={{ uri }} 
          className="w-full h-full"
          resizeMode="cover"
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

const CreatePostScreen: React.FC = () => {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationText, setLocationText] = useState<string>('');
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [tagCategories, setTagCategories] = useState<PetTagCategory[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [customTag, setCustomTag] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorTitle, setErrorTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const videoRef = useRef<Video>(null);

  // Helper function to check if form has any data entered
  const hasFormData = () => {
    return (
      title.trim() !== '' || 
      content.trim() !== '' || 
      media.length > 0 ||
      locationText !== '' ||
      tags.length > 0
    );
  };

  // Save current form data as draft
  const saveDraft = async () => {
    if (!hasFormData()) return;
    
    setDraftSaving(true);
    try {
      const draft: PostDraft = {
        title,
        content,
        media,
        postType: 'pet',
        location: locationText,
        locationCoordinates: locationData || undefined,
        tags: tags.length > 0 ? tags : undefined,
        lastUpdated: Date.now()
      };
      
      await AsyncStorage.setItem(POST_DRAFT_KEY, JSON.stringify(draft));
      setHasDraft(true);
      console.log('Post draft saved');
    } catch (error) {
      console.error('Error saving post draft:', error);
    } finally {
      setDraftSaving(false);
    }
  };

  // Load draft data from AsyncStorage
  const loadDraft = async () => {
    try {
      const draftStr = await AsyncStorage.getItem(POST_DRAFT_KEY);
      if (draftStr) {
        const draft: PostDraft = JSON.parse(draftStr);
        setTitle(draft.title || '');
        setContent(draft.content || '');
        setMedia(draft.media || []);
        setLocationText(draft.location || '');
        setLocationData(draft.locationCoordinates || null);
        setTags(draft.tags || []);
        setHasDraft(true);
        setIsDraftRestored(true);
        console.log('Post draft loaded');
      }
    } catch (error) {
      console.error('Error loading post draft:', error);
    }
  };

  // Clear saved draft
  const clearDraft = async () => {
    try {
      await AsyncStorage.removeItem(POST_DRAFT_KEY);
      setHasDraft(false);
      console.log('Post draft cleared');
    } catch (error) {
      console.error('Error clearing post draft:', error);
    }
  };

  // Auto-save draft on form changes
  useEffect(() => {
    if (isDraftRestored) {
      const timer = setTimeout(() => {
        saveDraft();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [title, content, media, locationText, locationData, tags, isDraftRestored]);

  // Check for existing draft and load tag categories on mount
  useEffect(() => {
    const loadInitialData = async () => {
      const draftExists = await AsyncStorage.getItem(POST_DRAFT_KEY);
      setHasDraft(!!draftExists);
      
      // If draft exists, show restore prompt
      if (draftExists) {
        setRestoreModalVisible(true);
      }
    };
    
    loadInitialData();
  }, []);

  // Handle back button press and prompt to save draft
  useEffect(() => {
    const handleBackPress = () => {
      if (hasFormData() && !draftSaving) {
        // Auto-save draft without asking
        saveDraft().then(() => {
          router.back();
        });
        return true; // Prevent default back action
      }
      return false; // Allow default back action
    };

    // Android hardware back button handling
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    return () => {
      backHandler.remove();
    };
  }, [title, content, media, locationText, locationData, tags, draftSaving]);

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

  // Helper function for showing error modal
  const showErrorModal = (title: string, message: string) => {
    setErrorTitle(title);
    setErrorMessage(message);
    setErrorModalVisible(true);
  };

  // Request location permission and get current location
  const getLocation = async () => {
    try {
      // First, ask for location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        showErrorModal(
          'Permission Denied',
          'PalPaw needs location permission to add your current location to posts.'
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
      showErrorModal(
        'Location Error',
        'Could not get your current location. Please try again later.'
      );
    }
  };

  // Add or remove a tag from the selected tags
  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter(t => t !== tag));
    } else {
      setTags([...tags, tag]);
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
    setTags(tags.filter(t => t !== tag));
  };

  // Handle post submission
  const handleSubmit = async () => {
    console.log('Submit pressed. Title value:', title);
    console.log('Title length before trim:', title.length);
    
    if (!title || title.trim().length === 0) {
      showErrorModal('Missing Information', 'Please add a title');
      return;
    }

    if (media.length === 0) {
      showErrorModal('Missing Media', 'Please add at least one image or video');
      return;
    }

    setLoading(true);
    
    try {
      // Prepare post data with sanitized values
      const postData: PostData = {
        title: title.trim(),  // Ensure trimmed title is used
        content: content.trim(),
        media: media as ServiceMedia[],
        postType: 'pet',
      };
      
      console.log('Post data being sent:', postData);
      
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
      
      if (tags.length > 0) postData.tags = tags;
      
      // Send data to the API
      const result = await createPost(postData);
      
      setLoading(false);
      
      if (result.success) {
        // Clear the draft after successful submission
        await clearDraft();
        
        // Show custom success modal instead of default alert
        setSuccessMessage(result.message || 'Post created successfully!');
        setSuccessModalVisible(true);
      } else {
        showErrorModal('Error', result.message);
      }
    } catch (error) {
      setLoading(false);
      showErrorModal('Error', 'Failed to create post. Please try again.');
      console.error(error);
    }
  };

  // Render media preview
  const renderMediaItem = ({ item, index }: { item: Media; index: number }) => {
    return (
      <View className="relative mr-2 rounded-xl overflow-hidden" style={{ width: 100, height: 100 }}>
        {item.type === 'image' ? (
          <Image source={{ uri: item.uri }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <VideoPreview uri={item.uri} key={`video-${item.uri}`} />
        )}
        <TouchableOpacity 
          onPress={() => removeMedia(index)}
          className="absolute top-1 right-1 bg-black/50 rounded-full p-1"
        >
          <Ionicons name="close" size={16} color="white" />
        </TouchableOpacity>
      </View>
    );
  };

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
              tags.includes(tag) ? 'bg-opacity-100' : 'bg-opacity-20'
            }`}
            style={{ backgroundColor: item.color + (tags.includes(tag) ? '' : '40') }}
          >
            <Text 
              className={`text-xs font-rubik ${
                tags.includes(tag) ? 'text-white' : 'text-gray-700'
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
          <TouchableOpacity 
            onPress={() => {
              if (hasFormData() && !draftSaving) {
                // Auto-save draft without asking
                saveDraft().then(() => {
                  router.back();
                });
              } else {
                router.back();
              }
            }} 
            className="p-2"
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text className="text-lg font-rubik-medium text-gray-800">
            {hasDraft ? "Edit Draft Post" : "Create Post"}
          </Text>
          <View className="flex-row">
            {hasDraft && (
              <TouchableOpacity 
                onPress={clearDraft}
                className="mr-2 p-2"
              >
                <Feather name="trash-2" size={22} color="#EF4444" />
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              onPress={handleSubmit}
              disabled={loading} 
              className={`py-2 px-4 rounded-full ${loading ? 'bg-gray-300' : 'bg-purple-500'}`}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-rubik-medium">Post</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Main form */}
        <View className="p-4">
          {/* Title Input */}
          <View className="mb-4">
            <Text className="text-sm text-gray-500 mb-1 font-rubik">Post Title *</Text>
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
            <Text className="text-sm text-gray-500 mb-1 font-rubik">Description *</Text>
            <TextInput
              className="bg-gray-50 p-3 rounded-xl text-gray-800 min-h-[120px] font-rubik"
              placeholder="Share details about your pet..."
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
              <Text className="text-sm text-gray-500 mb-1 font-rubik">Post Media</Text>
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
            <Text className="text-gray-700 font-rubik-medium mb-3">Add Media *</Text>
            <View className="flex-row justify-around">
              <TouchableOpacity 
                onPress={() => pickMedia('both')}
                className="items-center"
              >
                <View className="bg-purple-100 rounded-full p-3 mb-1">
                  <Ionicons name="images" size={24} color="#8B5CF6" />
                </View>
                <Text className="text-xs text-gray-600 font-rubik">Gallery</Text>
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
              onPress={getLocation}
            >
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
                  <View className="bg-blue-50 rounded-full py-1 px-2">
                    <Text className="text-blue-500 text-xs font-rubik">Add</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-row items-center py-3 border-b border-gray-100"
              onPress={() => setTagModalVisible(true)}
            >
              <View className="bg-purple-100 rounded-full p-2 mr-3">
                <MaterialCommunityIcons name="tag-outline" size={18} color="#8B5CF6" />
              </View>
              <View className="flex-row flex-1 items-center">
                <Text className="text-gray-700 font-rubik mr-2">
                  {tags.length > 0 ? "Tags:" : "Add Tags"}
                </Text>
                {tags.length > 0 ? (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    className="flex-1 mr-2"
                  >
                    {tags.slice(0, 3).map((tag, index) => (
                      <View key={index} className="bg-purple-50 rounded-full px-2 py-0.5 mr-1">
                        <Text className="text-purple-700 text-xs font-rubik">{tag}</Text>
                      </View>
                    ))}
                    {tags.length > 3 && (
                      <View className="bg-purple-50 rounded-full px-2 py-0.5">
                        <Text className="text-purple-700 text-xs font-rubik">+{tags.length - 3}</Text>
                      </View>
                    )}
                  </ScrollView>
                ) : null}
                <View className="bg-purple-50 rounded-full py-1 px-2 ml-auto">
                  <Text className="text-purple-500 text-xs font-rubik">Select</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
          
          {/* Draft status indicator */}
          {(draftSaving || (hasDraft && !draftSaving)) && (
            <View className="flex-row items-center mb-2 bg-gray-50 p-2 rounded-lg">
              {draftSaving ? (
                <>
                  <ActivityIndicator size="small" color="#9333EA" className="mr-2" />
                  <Text className="text-sm text-gray-600 font-rubik-regular">Saving draft...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" className="mr-2" />
                  <Text className="text-sm text-gray-600 font-rubik-regular">Draft saved</Text>
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Pet Tag Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={tagModalVisible}
        onRequestClose={() => setTagModalVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
            <TouchableOpacity onPress={() => setTagModalVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text className="text-lg font-rubik-medium text-gray-800">Pet Tags</Text>
            <TouchableOpacity 
              onPress={() => {
                if (customTag.trim().length > 0) {
                  if (!tags.includes(customTag.trim())) {
                    setTags([...tags, customTag.trim()]);
                  }
                  setCustomTag('');
                }
                setTagModalVisible(false);
              }}
            >
              <Text className="text-purple-600 font-rubik-medium">Done</Text>
            </TouchableOpacity>
          </View>
          
          <View className="p-4">
            <Text className="text-base font-rubik-medium text-gray-800 mb-2">Add Tags</Text>
            <Text className="text-sm font-rubik-regular text-gray-600 mb-4">
              Tags help others discover your post
            </Text>
            
            {/* Custom Tag Input */}
            <View className="flex-row items-center bg-gray-100 rounded-full px-4 mb-4">
              <TextInput
                className="flex-1 py-2 text-gray-800 font-rubik-regular"
                placeholder="Add a custom tag..."
                placeholderTextColor="#9CA3AF"
                value={customTag}
                onChangeText={setCustomTag}
                onSubmitEditing={() => {
                  if (customTag.trim().length > 0) {
                    if (!tags.includes(customTag.trim())) {
                      setTags([...tags, customTag.trim()]);
                    }
                    setCustomTag('');
                  }
                }}
              />
              {customTag.trim().length > 0 && (
                <TouchableOpacity onPress={() => {
                  if (!tags.includes(customTag.trim())) {
                    setTags([...tags, customTag.trim()]);
                  }
                  setCustomTag('');
                }}>
                  <AntDesign name="pluscircle" size={20} color="#7C3AED" />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Selected Tags */}
            {tags.length > 0 && (
              <View className="mb-4">
                <Text className="text-sm font-rubik-medium text-gray-800 mb-2">Your Tags</Text>
                <View className="flex-row flex-wrap">
                  {tags.map((tag, index) => (
                    <View key={index} className="flex-row items-center bg-purple-100 rounded-full px-3 py-1 mr-2 mb-2">
                      <Text className="text-purple-700 font-rubik-regular">{tag}</Text>
                      <TouchableOpacity 
                        onPress={() => {
                          const newTags = [...tags];
                          newTags.splice(index, 1);
                          setTags(newTags);
                        }}
                        className="ml-1"
                      >
                        <Ionicons name="close-circle" size={16} color="#7C3AED" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
            
            {/* Suggested Tag Categories */}
            {tagCategories.length > 0 ? (
              <View>
                <Text className="text-sm font-rubik-medium text-gray-800 mb-2">Suggested Categories</Text>
                {tagCategories.map((category, catIndex) => (
                  <View key={catIndex} className="mb-4">
                    <Text className="text-xs font-rubik-medium text-gray-500 uppercase mb-2">{category.name}</Text>
                    <View className="flex-row flex-wrap">
                      {category.tags.map((tag, tagIndex) => (
                        <TouchableOpacity
                          key={tagIndex}
                          onPress={() => {
                            if (!tags.includes(tag)) {
                              setTags([...tags, tag]);
                            }
                          }}
                          className={`mr-2 mb-2 px-3 py-1 rounded-full ${
                            tags.includes(tag) ? 'bg-purple-500' : 'bg-gray-100'
                          }`}
                        >
                          <Text 
                            className={`font-rubik-regular ${
                              tags.includes(tag) ? 'text-white' : 'text-gray-700'
                            }`}
                          >
                            {tag}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            ) : loadingTags ? (
              <View className="py-8 items-center">
                <ActivityIndicator color="#7C3AED" />
                <Text className="mt-2 text-gray-500 font-rubik-regular">Loading suggestions...</Text>
              </View>
            ) : null}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Custom Restore Draft Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={restoreModalVisible}
        onRequestClose={() => setRestoreModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white w-[85%] rounded-xl overflow-hidden shadow-lg">
            <View className="bg-purple-50 p-4 border-b border-purple-100">
              <Text className="text-lg font-rubik-medium text-purple-800 text-center">Restore Draft</Text>
            </View>
            
            <View className="px-5 py-6">
              <Text className="text-base text-gray-700 font-rubik text-center mb-6">
                You have an unsaved post draft. Would you like to restore it?
              </Text>
              
              <View className="flex-row justify-center">
                <TouchableOpacity 
                  onPress={() => {
                    clearDraft();
                    setRestoreModalVisible(false);
                  }}
                  className="bg-gray-100 py-3 px-6 rounded-full mr-3"
                >
                  <Text className="text-gray-700 font-rubik-medium">DISCARD</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => {
                    loadDraft();
                    setRestoreModalVisible(false);
                  }}
                  className="bg-purple-500 py-3 px-6 rounded-full"
                >
                  <Text className="text-white font-rubik-medium">RESTORE</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={successModalVisible}
        onRequestClose={() => {
          setSuccessModalVisible(false);
          // Clear form
          setTitle('');
          setContent('');
          setMedia([]);
          setLocationText('');
          setLocationData(null);
          setTags([]);
          // Navigate back
          router.back();
        }}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white w-[85%] rounded-xl overflow-hidden shadow-lg">
            <View className="bg-purple-500 p-4">
              <Text className="text-lg font-rubik-medium text-white text-center">Success</Text>
            </View>
            
            <View className="px-5 py-6 items-center">
              <View className="mb-4 bg-green-100 p-3 rounded-full">
                <Ionicons name="checkmark-circle" size={36} color="#10B981" />
              </View>
              
              <Text className="text-base text-gray-700 font-rubik text-center mb-6">
                {successMessage}
              </Text>
              
              <TouchableOpacity 
                onPress={() => {
                  setSuccessModalVisible(false);
                  // Clear form
                  setTitle('');
                  setContent('');
                  setMedia([]);
                  setLocationText('');
                  setLocationData(null);
                  setTags([]);
                  // Navigate back
                  router.back();
                }}
                className="bg-purple-500 py-3 px-6 rounded-full"
              >
                <Text className="text-white font-rubik-medium">OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Error Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={errorModalVisible}
        onRequestClose={() => setErrorModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white w-[85%] rounded-xl overflow-hidden shadow-lg">
            <View className="bg-rose-500 p-4">
              <Text className="text-lg font-rubik-medium text-white text-center">{errorTitle}</Text>
            </View>
            
            <View className="px-5 py-6 items-center">
              <View className="mb-4 bg-rose-100 p-3 rounded-full">
                <Ionicons name="alert-circle" size={36} color="#F43F5E" />
              </View>
              
              <Text className="text-base text-gray-700 font-rubik text-center mb-6">
                {errorMessage}
              </Text>
              
              <TouchableOpacity 
                onPress={() => setErrorModalVisible(false)}
                className="bg-rose-500 py-3 px-6 rounded-full"
              >
                <Text className="text-white font-rubik-medium">OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default CreatePostScreen;
