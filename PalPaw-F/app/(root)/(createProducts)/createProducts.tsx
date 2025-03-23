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
  Switch,
  Modal
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialCommunityIcons, Feather, FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { createProduct, Media as ServiceMedia, ProductData, getProductCategories } from './productService';
import { LinearGradient } from 'expo-linear-gradient';

interface Media {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
}

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
  const [categories, setCategories] = useState<{id: string; name: string}[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const videoRef = useRef<Video>(null);

  // Function to get icon name based on category
  const getCategoryIcon = (categoryName: string): any => {
    const iconMap: {[key: string]: any} = {
      'Pet Food': 'food-variant',
      'Pet Toys': 'toy-brick',
      'Pet Beds': 'bed',
      'Pet Clothing': 'tshirt-crew',
      'Health & Wellness': 'medical-bag',
      'Grooming': 'content-cut',
      'Training': 'whistle',
      'Carriers & Travel': 'bag-suitcase',
      'Accessories': 'dog-side'
    };
    
    return iconMap[categoryName] || 'paw';
  };

  // Get color based on category
  const getCategoryColor = (categoryName: string): string => {
    const colorMap: {[key: string]: string} = {
      'Pet Food': '#8B5CF6',     // Violet-500
      'Pet Toys': '#A855F7',     // Purple-500
      'Pet Beds': '#D946EF',     // Fuchsia-500
      'Pet Clothing': '#EC4899', // Pink-500
      'Health & Wellness': '#06B6D4', // Cyan-500
      'Grooming': '#14B8A6',     // Teal-500
      'Training': '#F59E0B',     // Amber-500
      'Carriers & Travel': '#10B981', // Emerald-500
      'Accessories': '#6366F1'   // Indigo-500
    };
    
    return colorMap[categoryName] || '#9333EA';
  };

  // Load categories when component mounts
  useEffect(() => {
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
    
    loadCategories();
  }, []);

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
      Alert.alert('Permission Denied', 'We need camera permissions to take photos.');
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

  // Handle product submission
  const handleSubmit = async () => {
    // Validate fields
    if (name.trim().length === 0) {
      Alert.alert('Missing Information', 'Please add a product name');
      return;
    }

    if (media.length === 0) {
      Alert.alert('Missing Media', 'Please add at least one image');
      return;
    }
    
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price');
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
        Alert.alert('Success', result.message, [
          { text: 'OK', onPress: () => {
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
          }}
        ]);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Failed to create product. Please try again.');
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
          <Text className="text-lg font-rubik-medium text-gray-800">Add Product</Text>
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
                onPress={() => pickMedia('image')}
                className="items-center"
              >
                <View className="bg-green-100 rounded-full p-3 mb-1">
                  <Ionicons name="image" size={24} color="#10B981" />
                </View>
                <Text className="text-xs text-gray-600 font-rubik">Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => pickMedia('video')}
                className="items-center"
              >
                <View className="bg-blue-100 rounded-full p-3 mb-1">
                  <Ionicons name="videocam" size={24} color="#3B82F6" />
                </View>
                <Text className="text-xs text-gray-600 font-rubik">Video</Text>
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
      
      {/* Category Modal */}
      <Modal
        visible={categoryModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View className="flex-1 bg-white">
          {/* Modal Header */}
          <LinearGradient
            colors={['#9333EA', '#A855F7', '#C084FC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="px-4 pt-12 pb-4 border-b border-gray-100"
          >
            <View className="flex-row items-center justify-between">
              <TouchableOpacity 
                onPress={() => setCategoryModalVisible(false)}
                className="bg-white p-2 rounded-full shadow-sm"
              >
                <Ionicons name="close" size={22} color="#9333EA" />
              </TouchableOpacity>
              <View className="flex-row items-center">
                <MaterialCommunityIcons name="paw" size={22} color="white" style={{ marginRight: 8 }} />
                <Text className="text-lg font-rubik-medium text-white">Pet Categories</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setCategoryModalVisible(false)}
                className="bg-white px-3 py-1 rounded-full shadow-sm"
              >
                <Text className="text-purple-700 font-rubik-medium">Done</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
          
          <ScrollView className="flex-1 bg-white">
            <View className="p-4 bg-purple-50">
              <View className="flex-row items-center mb-3">
                <Ionicons name="information-circle-outline" size={18} color="#9333EA" style={{ marginRight: 6 }} />
                <Text className="text-purple-900 text-sm font-rubik">Select one category for your pet product:</Text>
              </View>
            </View>
            
            {loadingCategories ? (
              <View className="py-10 items-center">
                <ActivityIndicator size="large" color="#9333EA" />
                <Text className="text-gray-500 mt-3 font-rubik">Loading categories...</Text>
              </View>
            ) : (
              <View className="px-2 py-4">                
                <View className="flex-row flex-wrap">
                  {categories.map((cat) => (
                    <TouchableOpacity 
                      key={cat.id}
                      className="w-1/3 px-2 mb-4"
                      onPress={() => {
                        setCategory(cat.name);
                        setCategoryModalVisible(false);
                      }}
                    >
                      <View 
                        className={`items-center justify-center py-4 px-2 rounded-xl ${
                          category === cat.name 
                            ? 'shadow-md border border-purple-200' 
                            : 'border border-gray-100'
                        }`}
                        style={{ 
                          backgroundColor: category === cat.name 
                            ? `${getCategoryColor(cat.name)}15` // 15 is hex for 8% opacity
                            : '#FFFFFF',
                        }}
                      >
                        <View 
                          className="rounded-full p-3 mb-3 shadow-sm"
                          style={{ 
                            backgroundColor: `${getCategoryColor(cat.name)}15`,
                          }}
                        >
                          <MaterialCommunityIcons 
                            name={getCategoryIcon(cat.name)}
                            size={28} 
                            color={getCategoryColor(cat.name)}
                          />
                        </View>
                        <Text 
                          className={`font-rubik text-center text-xs ${
                            category === cat.name 
                              ? 'font-rubik-medium' 
                              : ''
                          }`}
                          style={{ 
                            color: category === cat.name 
                              ? getCategoryColor(cat.name) 
                              : '#4B5563' 
                          }}
                          numberOfLines={2}
                        >
                          {cat.name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default CreateProductScreen;
