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
  Switch,
  BackHandler
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { createProduct, getProductCategories } from './productService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  Media, 
  ProductDraft, 
  ProductData, 
  Category, 
  ServiceMedia,
  getCategoryIcon, 
  getCategoryColor,
  CategoryModal,
  RestoreDraftModal,
  SuccessModal,
  ErrorModal
} from './modals';

const PRODUCT_DRAFT_KEY = 'product_draft';

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

const CreateProductScreen: React.FC = () => {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<string>('');
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [condition, setCondition] = useState<string>('New');
  const [quantity, setQuantity] = useState('1');
  const [freeShipping, setFreeShipping] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
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
      name.trim() !== '' || 
      description.trim() !== '' || 
      price !== '' || 
      media.length > 0 ||
      category !== '' ||
      condition !== 'New' ||
      quantity !== '1' ||
      freeShipping !== false
    );
  };

  // Helper function for showing error modal
  const showErrorModal = (title: string, message: string) => {
    setErrorTitle(title);
    setErrorMessage(message);
    setErrorModalVisible(true);
  };

  // Save current form data as draft
  const saveDraft = async () => {
    if (!hasFormData()) return;
    
    setDraftSaving(true);
    try {
      const draft: ProductDraft = {
        name,
        description,
        price,
        media,
        category,
        condition,
        quantity: parseInt(quantity, 10),
        shippingOptions: freeShipping ? ['Free Shipping'] : [],
        lastUpdated: Date.now()
      };
      
      await AsyncStorage.setItem(PRODUCT_DRAFT_KEY, JSON.stringify(draft));
      setHasDraft(true);
      console.log('Product draft saved');
    } catch (error) {
      console.error('Error saving product draft:', error);
    } finally {
      setDraftSaving(false);
    }
  };

  // Load draft data from AsyncStorage
  const loadDraft = async () => {
    try {
      const draftStr = await AsyncStorage.getItem(PRODUCT_DRAFT_KEY);
      if (draftStr) {
        const draft: ProductDraft = JSON.parse(draftStr);
        setName(draft.name || '');
        setDescription(draft.description || '');
        setPrice(draft.price || '');
        setMedia(draft.media || []);
        setCategory(draft.category || '');
        setCondition(draft.condition || 'New');
        setQuantity(draft.quantity?.toString() || '1');
        setFreeShipping(draft.shippingOptions?.includes('Free Shipping') || false);
        setHasDraft(true);
        setIsDraftRestored(true);
        console.log('Product draft loaded');
      }
    } catch (error) {
      console.error('Error loading product draft:', error);
    }
  };

  // Clear saved draft
  const clearDraft = async () => {
    try {
      await AsyncStorage.removeItem(PRODUCT_DRAFT_KEY);
      setHasDraft(false);
      console.log('Product draft cleared');
    } catch (error) {
      console.error('Error clearing product draft:', error);
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
  }, [name, description, price, media, category, condition, quantity, freeShipping, isDraftRestored]);

  // Check for existing draft and load categories on mount
  useEffect(() => {
    const loadInitialData = async () => {
      const draftExists = await AsyncStorage.getItem(PRODUCT_DRAFT_KEY);
      setHasDraft(!!draftExists);
      
      // Load categories
      loadCategories();
      
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
  }, [name, description, price, media, category, condition, quantity, freeShipping, draftSaving]);

  // Load categories
  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      // For better UX, we'll create 9 predefined categories with unique icons
      const predefinedCategories = [
        { id: '1', name: 'Pet Food' },
        { id: '2', name: 'Pet Toys' },
        { id: '3', name: 'Pet Beds' },
        { id: '4', name: 'Pet Clothing' },
        { id: '5', name: 'Health & Wellness' },
        { id: '6', name: 'Grooming' },
        { id: '7', name: 'Training' },
        { id: '8', name: 'Carriers & Travel' },
        { id: '9', name: 'Accessories' }
      ];
      setCategories(predefinedCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoadingCategories(false);
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

  // Take photo with camera - update to use custom error modal
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      showErrorModal('Permission Denied', 'We need camera permissions to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
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

  // Handle product submission - update to use custom error modal
  const handleSubmit = async () => {
    // Validate fields
    if (name.trim().length === 0) {
      showErrorModal('Missing Information', 'Please add a product name');
      return;
    }

    if (media.length === 0) {
      showErrorModal('Missing Media', 'Please add at least one image');
      return;
    }
    
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      showErrorModal('Invalid Price', 'Please enter a valid price');
      return;
    }

    setLoading(true);
    
    try {
      // Prepare product data
      const productData: ProductData = {
        name,
        description,
        price: parseFloat(price),
        media: media as ServiceMedia[],
        category,
        condition,
        quantity: parseInt(quantity, 10),
        shippingOptions: freeShipping ? ['Free Shipping'] : [],
      };
      
      // Send data to the API
      const result = await createProduct(productData);
      
      setLoading(false);
      
      if (result.success) {
        // Clear the draft after successful submission
        await clearDraft();
        
        // Show custom success modal instead of default alert
        setSuccessMessage(result.message || 'Product listed successfully!');
        setSuccessModalVisible(true);
      } else {
        showErrorModal('Error', result.message);
      }
    } catch (error) {
      setLoading(false);
      showErrorModal('Error', 'Failed to create product. Please try again.');
      console.error(error);
    }
  };

  // Handle successful modal close
  const handleSuccessModalClose = () => {
    setSuccessModalVisible(false);
    // Clear form
    setName('');
    setDescription('');
    setPrice('');
    setMedia([]);
    setCategory('');
    setCondition('New');
    setQuantity('1');
    setFreeShipping(false);
    // Navigate back
    router.back();
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
            {hasDraft ? "Edit Draft Product" : "Add Product"}
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
                <Text className="text-white font-rubik-medium">List Item</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View className="p-4">
          {/* Product Name Input */}
          <View className="mb-4">
            <Text className="text-sm text-gray-500 mb-1 font-rubik">Product Name *</Text>
            <TextInput
              className="bg-gray-50 p-3 rounded-xl text-gray-800 font-rubik"
              placeholder="Enter product name"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
              maxLength={100}
            />
          </View>

          {/* Description Input */}
          <View className="mb-4">
            <Text className="text-sm text-gray-500 mb-1 font-rubik">Description *</Text>
            <TextInput
              className="bg-gray-50 p-3 rounded-xl text-gray-800 min-h-[120px] font-rubik"
              placeholder="Describe your product..."
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
          </View>

          {/* Price Input */}
          <View className="mb-4">
            <Text className="text-sm text-gray-500 mb-1 font-rubik">Price *</Text>
            <View className="flex-row items-center bg-gray-50 p-3 rounded-xl">
              <Text className="text-gray-500 mr-2 font-rubik">$</Text>
              <TextInput
                className="flex-1 text-gray-800 font-rubik"
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
              />
            </View>
          </View>

          {/* Quantity Input */}
          <View className="mb-4">
            <Text className="text-sm text-gray-500 mb-1 font-rubik">Quantity</Text>
            <View className="flex-row items-center bg-gray-50 p-3 rounded-xl">
              <TextInput
                className="flex-1 text-gray-800 font-rubik"
                placeholder="1"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
              />
              <View className="flex-row">
                <TouchableOpacity 
                  onPress={() => setQuantity(prev => Math.max(1, parseInt(prev || '1', 10) - 1).toString())}
                  className="bg-gray-200 h-8 w-8 rounded-l items-center justify-center"
                >
                  <Feather name="minus" size={16} color="#4B5563" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setQuantity(prev => (parseInt(prev || '1', 10) + 1).toString())}
                  className="bg-gray-200 h-8 w-8 rounded-r items-center justify-center"
                >
                  <Feather name="plus" size={16} color="#4B5563" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Media Preview */}
          {media.length > 0 && (
            <View className="mb-4">
              <Text className="text-sm text-gray-500 mb-1 font-rubik">Product Images</Text>
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
          <View className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-xl mb-4">
            <Text className="text-gray-700 font-rubik-medium mb-3">Add Product Images *</Text>
            <View className="flex-row justify-around">
              <TouchableOpacity 
                onPress={() => pickMedia('both')}
                className="items-center"
              >
                <View className="bg-green-100 rounded-full p-3 mb-1">
                  <Ionicons name="images" size={24} color="#10B981" />
                </View>
                <Text className="text-xs text-gray-600 font-rubik">Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={takePhoto}
                className="items-center"
              >
                <View className="bg-amber-100 rounded-full p-3 mb-1">
                  <Ionicons name="camera" size={24} color="#F59E0B" />
                </View>
                <Text className="text-xs text-gray-600 font-rubik">Camera</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Additional Options */}
          <View className="mb-6">
            {/* Category */}
            <View className="mb-4">
              <Text className="text-sm text-gray-500 mb-2 font-rubik">Category *</Text>
              {category ? (
                <View className="flex-row items-center">
                  <View 
                    className="rounded-full px-4 py-2.5 mr-2 mb-2 flex-row items-center shadow-sm"
                    style={{ backgroundColor: `${getCategoryColor(category)}20` }} // 20 is hex for 12% opacity
                  >
                    <MaterialCommunityIcons 
                      name={getCategoryIcon(category)} 
                      size={16} 
                      color={getCategoryColor(category)}
                      style={{ marginRight: 8 }} 
                    />
                    <Text 
                      style={{ color: getCategoryColor(category) }}
                      className="font-rubik-medium mr-2"
                    >
                      {category}
                    </Text>
                    <TouchableOpacity onPress={() => setCategory('')}>
                      <Ionicons 
                        name="close-circle" 
                        size={18} 
                        color={getCategoryColor(category)} 
                      />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity 
                    onPress={() => setCategoryModalVisible(true)}
                    className="bg-purple-100 rounded-full px-4 py-2.5 mb-2 flex-row items-center shadow-sm"
                  >
                    <Feather name="edit-2" size={14} color="#9333EA" style={{ marginRight: 6 }} />
                    <Text className="text-purple-700 font-rubik">Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  className="rounded-xl p-4 border border-gray-100 flex-row items-center justify-between shadow-sm"
                  style={{ backgroundColor: '#f9f5ff' }} // Very light purple background
                  onPress={() => setCategoryModalVisible(true)}
                >
                  <View className="flex-row items-center">
                    <View className="bg-purple-100 rounded-full p-3 mr-3 shadow-sm">
                      <MaterialCommunityIcons name="shape-outline" size={18} color="#9333EA" />
                    </View>
                    <View>
                      <Text className="text-gray-700 font-rubik">Select a category</Text>
                      <Text className="text-xs text-gray-400 font-rubik">Required for your product listing</Text>
                    </View>
                  </View>
                  <View className="bg-purple-500 rounded-full py-2 px-3 shadow-sm">
                    <Text className="text-white text-xs font-rubik-medium">Select</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
            
            {/* Condition */}
            <View className="mb-4">
              <Text className="text-sm text-gray-500 mb-2 font-rubik">Condition</Text>
              <View className="flex-row flex-wrap gap-2">
                {['New', 'Like New', 'Good', 'Fair'].map((conditionOption) => (
                  <TouchableOpacity 
                    key={conditionOption}
                    className={`px-4 py-2 rounded-full ${
                      condition === conditionOption 
                        ? 'bg-purple-100 border border-purple-200' 
                        : 'bg-gray-50 border border-gray-100'
                    }`}
                    onPress={() => setCondition(conditionOption)}
                  >
                    <Text 
                      className={`font-rubik ${
                        condition === conditionOption 
                          ? 'text-purple-700' 
                          : 'text-gray-500'
                      }`}
                    >
                      {conditionOption}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Free Shipping */}
            <View className="flex-row items-center justify-between py-3 mt-2 border-t border-gray-100">
              <View className="flex-row items-center">
                <View className="bg-amber-100 rounded-full p-2 mr-3">
                  <Feather name="package" size={18} color="#F59E0B" />
                </View>
                <Text className="text-gray-700 font-rubik">Free Shipping</Text>
              </View>
              <Switch
                value={freeShipping}
                onValueChange={setFreeShipping}
                trackColor={{ false: '#E5E7EB', true: '#C084FC' }}
                thumbColor={freeShipping ? '#8B5CF6' : '#f4f3f4'}
              />
            </View>
          </View>
        </View>
      </ScrollView>
      
      {/* Modals */}
      <CategoryModal
        visible={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
        categories={categories}
        selectedCategory={category}
        onSelectCategory={setCategory}
        loadingCategories={loadingCategories}
      />

      <RestoreDraftModal
        visible={restoreModalVisible}
        onClose={() => setRestoreModalVisible(false)}
        onRestore={() => {
          loadDraft();
          setRestoreModalVisible(false);
        }}
        onDiscard={() => {
          clearDraft();
          setRestoreModalVisible(false);
        }}
      />

      <SuccessModal
        visible={successModalVisible}
        message={successMessage}
        onClose={handleSuccessModalClose}
      />

      <ErrorModal
        visible={errorModalVisible}
        title={errorTitle}
        message={errorMessage}
        onClose={() => setErrorModalVisible(false)}
      />
    </KeyboardAvoidingView>
  );
};

export default CreateProductScreen;
