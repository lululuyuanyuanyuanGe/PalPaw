import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions, 
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  interpolate,
  Extrapolate,
  withTiming
} from 'react-native-reanimated';
import { usePosts, useAuth, useProducts, useChat } from "@/context";
import MediaCarousel from '../../components/MediaCarousel';
import { formatImageUrl } from '@/utils/mediaUtils';
import { getCategoryIcon, getCategoryColor, getCategoryBgColor } from './decorations';
import api from '../../../utils/apiClient';

// Utility function to format the date/time
const formatTimeAgo = (date: string | Date) => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  
  // Convert to seconds
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec} sec ago`;
  
  // Convert to minutes
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  
  // Convert to hours
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
  
  // Convert to days
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
  
  // Convert to weeks
  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 4) return `${diffWeek} week${diffWeek !== 1 ? 's' : ''} ago`;
  
  // Format date if older
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  return past.toLocaleDateString(undefined, options);
};

// Utility function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

// Product Info Item component
interface ProductInfoProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  isCategory?: boolean;
}

const ProductInfoItem: React.FC<ProductInfoProps> = ({ icon, label, value, isCategory = false }) => {
  // If this is a category item, use the category-specific styling
  if (isCategory && typeof value === 'string') {
    const iconName = getCategoryIcon(value);
    const iconColor = getCategoryColor(value);
    const bgColor = getCategoryBgColor(value);
    
    return (
      <View className="flex-row items-center mb-3">
        <View style={{ backgroundColor: bgColor, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' }} className="rounded-full mr-3">
          <MaterialCommunityIcons name={iconName} size={20} color={iconColor} />
        </View>
        <View className="flex-1">
          <Text className="text-xs text-gray-500 font-rubik">{label}</Text>
          <Text className="text-sm text-gray-800 font-rubik-medium">{value}</Text>
        </View>
      </View>
    );
  }
  
  // Default rendering for non-category items
  return (
    <View className="flex-row items-center mb-3">
      <View style={{ width: 36, height: 36, justifyContent: 'center', alignItems: 'center' }} className="bg-purple-50 rounded-full mr-3">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-xs text-gray-500 font-rubik">{label}</Text>
        <Text className="text-sm text-gray-800 font-rubik-medium">{value}</Text>
      </View>
    </View>
  );
};

// Shipping option styling
const getShippingOptionIcon = (option: string) => {
  switch (option) {
    case 'Pickup':
      return 'location-outline';
    case 'Delivery':
      return 'car-outline';
    default:
      return 'help-circle-outline';
  }
};

const getShippingOptionColor = (option: string) => {
  switch (option) {
    case 'Pickup':
      return '#10B981'; // Emerald-500
    case 'Delivery':
      return '#F59E0B'; // Amber-500
    default:
      return '#9333EA'; // Purple-600
  }
};

const getShippingOptionBgColor = (option: string) => {
  switch (option) {
    case 'Pickup':
      return '#D1FAE5'; // Emerald-100
    case 'Delivery':
      return '#FEF3C7'; // Amber-100
    default:
      return '#F3E8FF'; // Purple-100
  }
};

const ProductDetail = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const productId = id as string;
  
  console.log(`ProductDetail: Rendering with productId:`, productId);
  console.log(`ProductDetail: Type of productId:`, typeof productId);
  console.log(`ProductDetail: String representation:`, String(productId));
  
  const scrollY = useSharedValue(0);
  const footerOpacity = useSharedValue(0);
  const [loading, setLoading] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [isSavedStatus, setIsSavedStatus] = useState(false);
  
  // Get context values
  const { state: authState } = useAuth();
  const { 
    state: productsState, 
    fetchProductById, 
    isProductSaved,
    saveProduct,
    unsaveProduct
  } = useProducts();
  const { createChat, loadMessages } = useChat();
  
  // Using memoized product to avoid unnecessary re-renders
  const product = React.useMemo(() => {
    // First check if product already exists in any collection
    if (productId) {
      // Check currentProduct first (highest priority)
      if (productsState.currentProduct && productsState.currentProduct.id === productId) {
        return productsState.currentProduct;
      }
      
      // Then check userProducts
      const userProduct = productsState.userProducts.find(p => p.id === productId);
      if (userProduct) return userProduct;
      
      // Then check general products
      const regularProduct = productsState.products.find(p => p.id === productId);
      if (regularProduct) return regularProduct;
      
      // Finally check saved products
      const savedProduct = productsState.savedProducts.find(p => p.id === productId);
      if (savedProduct) return savedProduct;
    }
    
    return null;
  }, [productId, productsState.currentProduct, productsState.userProducts, productsState.products, productsState.savedProducts]);
  
  // Update saved status when product or savedProductIds changes
  useEffect(() => {
    if (product) {
      const saved = isProductSaved(product.id);
      console.log(`ProductDetail: Setting saved status for ${product.id} to ${saved}`);
      setIsSavedStatus(saved);
    }
  }, [product, productsState.savedProductIds]);
  
  // Load product data if not already in state
  useEffect(() => {
    const loadProduct = async () => {
      if (productId && !product) {
        setLoading(true);
        try {
          console.log(`ProductDetail: Loading product with ID ${productId}`);
          
          // First try to get product from context/state
          await fetchProductById(productId).catch(async (error) => {
            console.error(`ProductDetail: Primary fetch failed: ${error.message}`);
            
            // If context fetch fails, try direct API request as a last resort
            try {
              console.log(`ProductDetail: Trying direct API request as fallback...`);
              const response = await api.get(`/pg/products/${productId}`);
              
              if (response.data && response.data.product) {
                console.log('ProductDetail: Directly fetched product from API');
                
                // Try to update the context with the fetched product
                await fetchProductById(productId);
                setLoading(false);
              } else {
                throw new Error('Product not found in API response');
              }
            } catch (directApiError: any) {
              console.error(`ProductDetail: API fallback fetch failed: ${directApiError.message}`);
              Alert.alert('Error', 'Failed to load product details. Please try again later.');
            }
          });
        } catch (error) {
          console.error('ProductDetail: Error in product loading process:', error);
          Alert.alert('Error', 'Failed to load product details');
        }
      } else {
        setLoading(false);
      }
    };
    
    loadProduct();
  }, [productId, product]);
  
  // Handle save/unsave product
  const handleToggleSave = async () => {
    if (!authState.isAuthenticated) {
      Alert.alert("Authentication Required", "Please login to save products");
      return;
    }
    
    if (!product) return;
    
    try {
      // Update local state immediately for UI feedback
      const newSavedStatus = !isSavedStatus;
      console.log(`ProductDetail: Toggling save status for ${product.id} to ${newSavedStatus}`);
      setIsSavedStatus(newSavedStatus);
      
      // Call the appropriate API function
      if (newSavedStatus) {
        await saveProduct(product.id);
      } else {
        await unsaveProduct(product.id);
      }
      
      console.log(`ProductDetail: Successfully ${newSavedStatus ? 'saved' : 'unsaved'} product ${product.id}`);
    } catch (error) {
      // If API call fails, revert the local state
      console.error('Error toggling save status:', error);
      setIsSavedStatus(!isSavedStatus);
      Alert.alert('Error', 'Failed to update product save status');
    }
  };
  
  // Updated handler with proper error handling and message loading
  const handleContactSeller = async () => {
    if (!authState.isAuthenticated) {
      Alert.alert("Authentication Required", "Please login to contact sellers");
      return;
    }
    
    if (!product || !product.sellerData) {
      Alert.alert("Error", "Seller information is not available");
      return;
    }
    
    try {
      // Show loading indicator
      setLoading(true);
      
      console.log("Starting chat with seller:", product.userId);
      console.log("Seller data:", JSON.stringify({
        username: product.sellerData.username,
        avatar: product.sellerData.avatar,
        id: product.userId
      }));
      
      // Create or get existing chat with the seller
      const chatId = await createChat(product.userId);
      console.log("Chat creation result:", chatId);
      
      if (!chatId) {
        throw new Error("Failed to create or retrieve chat ID");
      }
      
      // Load messages for this chat - ensure this completes before navigation
      try {
        console.log("Loading messages for chat:", chatId);
        await loadMessages(chatId);
      } catch (msgError) {
        console.error("Error loading messages, but continuing with navigation:", msgError);
        // We'll continue even if messages don't load, as we can reload them in the chat screen
      }
      
      // Ensure we have the correct username and avatar
      const sellerUsername = product.sellerData?.username || 'Seller';
      const sellerAvatar = formatImageUrl(product.sellerData?.avatar);
      
      // Navigate to chat detail screen
      console.log("Navigating to chat:", chatId, "with seller:", sellerUsername);
      router.push({
        pathname: "/(root)/(chats)/chat/[id]",
        params: { 
          id: chatId, 
          chatName: sellerUsername,
          avatar: sellerAvatar // Pass avatar URL as a param
        }
      });
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert("Error", "Failed to initiate chat with seller");
    } finally {
      setLoading(false);
    }
  };
  
  // Animated header style based on scroll position
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 100],
      [0, 1],
      Extrapolate.CLAMP
    );
    
    return {
      opacity,
      backgroundColor: `rgba(255, 255, 255, ${opacity})`,
      borderBottomWidth: opacity > 0.5 ? 1 : 0,
      borderBottomColor: `rgba(229, 231, 235, ${opacity})`
    };
  });
  
  // Animated footer decoration style
  const footerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: footerOpacity.value,
    };
  });
  
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#9333EA" />
        <Text className="mt-4 text-gray-500 font-rubik">Loading product details...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#9333EA" />
        <Text className="mt-4 text-gray-700 font-rubik-medium">Product not found</Text>
        <TouchableOpacity 
          onPress={() => router.back()}
          className="mt-6 bg-purple-600 px-6 py-2 rounded-full"
        >
          <Text className="text-white font-rubik">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Prepare media array for the carousel
  const mediaItems = product.media && product.media.length > 0 
    ? product.media.map((media: any) => ({
        url: formatImageUrl(media.url || ''),
        type: media.type || 'image'
      }))
    : [{ url: formatImageUrl(product.imageUrl || ''), type: 'image' }];

  // Handle scroll to detect when at bottom
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.value = event.nativeEvent.contentOffset.y;
    
    const offsetY = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const scrollViewHeight = event.nativeEvent.layoutMeasurement.height;
    
    // Check if scrolled to bottom with a very small threshold
    const isScrolledToBottom = offsetY + scrollViewHeight > contentHeight - 5;
    
    if (isScrolledToBottom && !isAtBottom) {
      setIsAtBottom(true);
      footerOpacity.value = withTiming(1, { duration: 500 });
    } else if (!isScrolledToBottom && isAtBottom) {
      setIsAtBottom(false);
      footerOpacity.value = withTiming(0, { duration: 300 });
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      {/* Animated Header */}
      <Animated.View 
        className="absolute top-0 left-0 right-0 z-10 flex-row items-center px-4 pt-12 pb-4"
        style={headerAnimatedStyle}
      >
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-rubik-medium text-gray-800 ml-2">
          {product.name?.substring(0, 20)}{product.name && product.name.length > 20 ? '...' : ''}
        </Text>
        <TouchableOpacity onPress={handleToggleSave} className="p-2">
          <FontAwesome 
            name={isSavedStatus ? "bookmark" : "bookmark-o"} 
            size={22} 
            color={isSavedStatus ? "#9333EA" : "#374151"} 
          />
        </TouchableOpacity>
      </Animated.View>
      
      <ScrollView 
        className="flex-1 bg-gray-50"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
      >
        {/* Custom Header - For the top of the screen only */}
        <View className="bg-white shadow-sm">
          <View className="flex-row items-center px-4 pt-12 pb-4">
            <TouchableOpacity onPress={() => router.back()} className="p-2">
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="flex-1 text-lg font-rubik-medium text-gray-800 ml-2">Product Details</Text>
            <TouchableOpacity onPress={handleToggleSave} className="p-2">
              <FontAwesome 
                name={isSavedStatus ? "bookmark" : "bookmark-o"} 
                size={22} 
                color={isSavedStatus ? "#9333EA" : "#374151"} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Product Images Carousel */}
        <MediaCarousel media={mediaItems} />

        {/* Product Details */}
        <View className="p-4 bg-white mt-2 shadow-sm">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <View className={`px-3 py-1 rounded-full ${product.status === 'sold' ? 'bg-red-100' : 'bg-green-100'}`}>
                <Text className={`text-xs font-rubik-medium ${product.status === 'sold' ? 'text-red-700' : 'text-green-700'}`}>
                  {product.status === 'active' ? 'Available' : product.status === 'sold' ? 'Sold' : 'Archived'}
                </Text>
              </View>
              <Text className="text-xs text-gray-500 ml-2 font-rubik">
                {formatTimeAgo(product.createdAt)}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="eye-outline" size={16} color="#6B7280" />
              <Text className="ml-1 text-gray-500 text-xs font-rubik">{product.views || 0} views</Text>
            </View>
          </View>
          
          <Text className="text-xl font-rubik-semibold text-gray-800 mb-1">{product.name}</Text>
          
          <View className="mt-2">
            <Text className="text-2xl font-rubik-semibold text-purple-700">
              {formatCurrency(product.price)}
            </Text>
          </View>
        </View>

        {/* Seller Information with enhanced UI */}
        <View className="p-4 bg-white mt-2 shadow-sm">
          <View className="flex-row items-center">
            {/* Decorative element */}
            <View className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 to-purple-600 rounded-r-full" />
            
            <TouchableOpacity 
              className="flex-row items-center flex-1"
              onPress={() => {
                // Allow navigation for non-authenticated users
                // Only prevent navigation if this is the current user's product
                if (!authState.isAuthenticated || product.userId !== authState.user?.id) {
                  router.push({
                    pathname: "/(root)/(userProfile)" as any,
                    params: { userId: product.userId }
                  });
                }
              }}
              activeOpacity={product.userId === authState.user?.id ? 1 : 0.7}
            >
              <Image
                source={{ uri: formatImageUrl(product.sellerData?.avatar) || `https://robohash.org/${product.userId}?set=set4` }}
                className="w-12 h-12 rounded-full border-2 border-purple-100"
              />
              <View className="ml-3 flex-1">
                <Text className="font-rubik-semibold text-gray-800">{product.sellerData?.username || 'User'}</Text>
                <View className="flex-row items-center">
                  <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                  <Text className="text-xs text-gray-500 font-rubik ml-1">Member since {new Date().getFullYear()}</Text>
                </View>
              </View>
            </TouchableOpacity>
            
            {/* Only show contact button if not the user's own product */}
            {(!authState.isAuthenticated || product.userId !== authState.user?.id) && (
              <TouchableOpacity 
                className="bg-purple-600 px-4 py-2 rounded-full"
                onPress={handleContactSeller}
              >
                <Text className="text-white font-rubik-medium">Contact</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Product Details Section */}
        <View className="p-4 bg-white mt-2 shadow-sm">
          {/* Decorative accent */}
          <View className="absolute right-0 top-12 h-16 w-16 rounded-full bg-purple-50 opacity-50" style={{ right: -8, top: -8 }} />
          <View className="absolute right-0 top-12 h-8 w-8 rounded-full bg-purple-100 opacity-50" style={{ right: 12, top: 12 }} />
          
          <View className="flex-row items-center mb-3">
            <View style={{ width: 36, height: 36, justifyContent: 'center', alignItems: 'center' }} className="bg-purple-50 rounded-full mr-3">
              <MaterialCommunityIcons name="text-box-outline" size={20} color="#9333EA" />
            </View>
            <Text className="font-rubik-semibold text-gray-800">Description</Text>
          </View>
          <Text className="text-gray-700 leading-6 font-rubik mb-4 pl-1">{product.description}</Text>
          
          <View className="border-t border-gray-100 pt-4 mt-2">
            <View className="flex-row items-center mb-3">
              <View style={{ width: 36, height: 36, justifyContent: 'center', alignItems: 'center' }} className="bg-purple-50 rounded-full mr-3">
                <MaterialCommunityIcons name="information-outline" size={20} color="#9333EA" />
              </View>
              <Text className="font-rubik-semibold text-gray-800">Product Information</Text>
            </View>
            
            <ProductInfoItem 
              icon={<MaterialCommunityIcons name="shape-outline" size={20} color="#9333EA" />}
              label="Category"
              value={product.category || 'General'}
              isCategory={true}
            />
            
            <ProductInfoItem 
              icon={<MaterialCommunityIcons name="tag-outline" size={20} color="#9333EA" />}
              label="Condition"
              value={product.condition || 'Not specified'}
            />
            
            <ProductInfoItem 
              icon={<MaterialCommunityIcons name="package-variant" size={20} color="#9333EA" />}
              label="Quantity Available"
              value={product.quantity || 1}
            />
          </View>
        </View>
        
        {/* Shipping Information */}
        {product.shipping && Object.keys(product.shipping).length > 0 && (
          <View className="p-4 bg-white mt-2 mb-24 shadow-sm">
            {/* Decorative elements */}
            <View className="absolute left-0 bottom-0 h-24 w-24 rounded-tr-full bg-purple-50 opacity-30" style={{ left: 0, bottom: 0 }} />
            
            <View className="flex-row items-center mb-3">
              <View style={{ width: 36, height: 36, justifyContent: 'center', alignItems: 'center' }} className="bg-purple-50 rounded-full mr-3">
                <Ionicons name="bicycle-outline" size={20} color="#9333EA" />
              </View>
              <Text className="font-rubik-semibold text-gray-800">Shipping Details</Text>
            </View>
            
            {product.shipping.options && Array.isArray(product.shipping.options) && product.shipping.options.length > 0 ? (
              <View>
                <View className="flex-row flex-wrap mt-2">
                  {product.shipping.options.includes('Pickup') && (
                    <View 
                      style={{ backgroundColor: getShippingOptionBgColor('Pickup') }} 
                      className="p-3 px-5 rounded-xl mb-2 flex-row items-center mr-2 shadow-sm"
                    >
                      <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons 
                          name={getShippingOptionIcon('Pickup')} 
                          size={18} 
                          color={getShippingOptionColor('Pickup')} 
                        />
                      </View>
                      <Text 
                        style={{ color: getShippingOptionColor('Pickup') }} 
                        className="font-rubik-medium ml-1"
                      >Pickup</Text>
                    </View>
                  )}
                  {product.shipping.options.includes('Delivery') && (
                    <View 
                      style={{ backgroundColor: getShippingOptionBgColor('Delivery') }} 
                      className="p-3 px-5 rounded-xl mb-2 flex-row items-center shadow-sm"
                    >
                      <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons 
                          name={getShippingOptionIcon('Delivery')} 
                          size={18} 
                          color={getShippingOptionColor('Delivery')} 
                        />
                      </View>
                      <Text 
                        style={{ color: getShippingOptionColor('Delivery') }} 
                        className="font-rubik-medium ml-1"
                      >Delivery</Text>
                    </View>
                  )}
                </View>
                {product.shipping.options.includes('Delivery') && (
                  <View className="bg-gray-50 p-3 rounded-lg mt-2 border-l-2 border-amber-300">
                    <Text className="text-xs text-gray-600 font-rubik flex-row items-center">
                      <View style={{ width: 16, height: 16, justifyContent: 'center', alignItems: 'center', marginRight: 4 }}>
                        <Ionicons name="information-circle-outline" size={14} color="#9CA3AF" />
                      </View>
                      <Text>Contact seller for delivery details and fees</Text>
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <Text className="text-gray-700 font-rubik">Contact seller for shipping details</Text>
            )}
          </View>
        )}
        
        {/* Decorative bottom element - only visible when scrolled to bottom */}
        <View className="py-6">
          <View className="items-center">
            <Text className="text-gray-400 text-xs font-rubik mb-4">꧁ ꧂</Text>
            <Text className="text-gray-500 text-xs font-rubik mb-2">Find Your Perfect Pet Companion</Text>
            <View className="flex-row items-center justify-center mb-6">
              <View className="h-px bg-gray-200 w-16 mr-3" />
              <MaterialCommunityIcons name="paw" size={16} color="#9333EA" />
              <View className="h-px bg-gray-200 w-16 ml-3" />
            </View>
          </View>
        </View>
      </ScrollView>
      
      {/* Animated decorative footer - appears when scrolled to bottom */}
      <Animated.View 
        className="absolute bottom-0 left-0 right-0 overflow-hidden"
        style={[{ height: 150 }, footerAnimatedStyle]}
      >
        <LinearGradient
          colors={['rgba(147, 51, 234, 0.7)', 'rgba(126, 34, 206, 0.85)']}
          className="flex-1"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View className="absolute left-0 right-0 top-0 h-full overflow-hidden">
            {/* Decorative paw pattern across the whole banner */}
            <View className="absolute top-0 left-0 right-0 bottom-0 flex-row flex-wrap justify-around opacity-20">
              {Array.from({ length: 20 }).map((_, index) => (
                <MaterialCommunityIcons 
                  key={index} 
                  name="paw" 
                  size={10} 
                  color="white" 
                  style={{ margin: 5 }}
                />
              ))}
            </View>
            
            {/* Decorative paw prints - made more visible */}
            <View className="absolute left-5 top-10">
              <MaterialCommunityIcons name="paw" size={18} color="rgba(255,255,255,0.6)" />
            </View>
            <View className="absolute left-20 top-30">
              <MaterialCommunityIcons name="paw" size={14} color="rgba(255,255,255,0.7)" />
            </View>
            <View className="absolute left-40 top-15">
              <MaterialCommunityIcons name="paw" size={16} color="rgba(255,255,255,0.65)" />
            </View>
            <View className="absolute right-10 top-25">
              <MaterialCommunityIcons name="paw" size={20} color="rgba(255,255,255,0.7)" />
            </View>
            <View className="absolute right-35 top-50">
              <MaterialCommunityIcons name="paw" size={15} color="rgba(255,255,255,0.6)" />
            </View>
            <View className="absolute left-70 top-60">
              <MaterialCommunityIcons name="paw" size={12} color="rgba(255,255,255,0.65)" />
            </View>
            <View className="absolute left-30 top-80">
              <MaterialCommunityIcons name="paw" size={16} color="rgba(255,255,255,0.7)" />
            </View>
            <View className="absolute right-50 top-90">
              <MaterialCommunityIcons name="paw" size={14} color="rgba(255,255,255,0.6)" />
            </View>
            
            {/* Central highlighted text and paw */}
            <View className="absolute left-0 right-0 top-1/4 items-center">
              <Text className="text-white font-rubik-medium mb-1 opacity-90">Find Your Perfect Pet Companion</Text>
              <MaterialCommunityIcons name="paw" size={36} color="rgba(255,255,255,0.9)" />
            </View>
            
            {/* Decorative circles */}
            <View className="absolute left-1/3 top-1/4 h-24 w-24 rounded-full bg-white opacity-10" />
            <View className="absolute right-1/4 top-1/3 h-20 w-20 rounded-full bg-white opacity-10" />
            <View className="absolute left-1/5 bottom-0 h-16 w-16 rounded-full bg-white opacity-15" />
            <View className="absolute right-1/6 bottom-10 h-14 w-14 rounded-full bg-white opacity-10" />
          </View>
        </LinearGradient>
      </Animated.View>

    </>
  );
};

export default ProductDetail;
