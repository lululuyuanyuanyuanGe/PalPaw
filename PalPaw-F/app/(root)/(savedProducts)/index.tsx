import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  SafeAreaView,
  Dimensions,
  Alert,
  Animated,
  ViewStyle
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons, MaterialIcons, FontAwesome5, Ionicons, AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useProducts, useAuth, useUser } from '@/context';
import { ProductItem } from '@/context/ProductsContext';
import { formatImageUrl } from '@/utils/mediaUtils';
import AuthPrompt from '../../components/AuthPrompt';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');

// Decorative Paw Component
const DecorativePaw = ({ style, size = 24, color = '#9333EA', opacity = 0.2, rotation = '0deg' }: { 
  style: ViewStyle, 
  size?: number, 
  color?: string, 
  opacity?: number, 
  rotation?: string 
}) => {
  return (
    <View
      style={[
        {
          position: 'absolute',
          opacity,
          transform: [{ rotate: rotation }],
        },
        style
      ]}
    >
      <FontAwesome5 name="paw" size={size} color={color} />
    </View>
  );
};

// Mock data for demonstration purposes
const mockProducts: ProductItem[] = [
  {
    id: '1',
    userId: 'user1',
    name: 'Luxury Cat Bed',
    description: 'Plush, cozy bed for your feline friend with soft cushioning',
    price: 79.99,
    category: 'Bedding',
    condition: 'New',
    media: [],
    quantity: 1,
    status: 'active',
    tags: ['cat', 'bed', 'plush'],
    shipping: { method: 'standard' },
    views: 42,
    isDeleted: false,
    createdAt: '2023-02-15T10:30:00Z',
    updatedAt: '2023-02-15T10:30:00Z',
    sellerData: {
      id: 'user1',
      username: 'CatLover',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg'
    },
    imageUrl: 'https://images.unsplash.com/photo-1602587365437-52a4ec0621c5?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3',
    isSaved: true
  },
  {
    id: '2',
    userId: 'user2',
    name: 'Automatic Pet Feeder',
    description: 'Schedule regular feeding times for your pet even when you\'re not home',
    price: 129.99,
    category: 'Accessories',
    condition: 'New',
    media: [],
    quantity: 3,
    status: 'active',
    tags: ['automatic', 'feeder', 'food'],
    shipping: { method: 'express' },
    views: 78,
    isDeleted: false,
    createdAt: '2023-03-10T14:20:00Z',
    updatedAt: '2023-03-11T09:15:00Z',
    sellerData: {
      id: 'user2',
      username: 'PetSupplies',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg'
    },
    imageUrl: 'https://images.unsplash.com/photo-1603189343302-e603f7add05a?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3',
    isSaved: true
  },
  {
    id: '3',
    userId: 'user3',
    name: 'Leather Dog Collar',
    description: 'Premium handmade leather collar with custom name tag',
    price: 45.50,
    category: 'Accessories',
    condition: 'New',
    media: [],
    quantity: 10,
    status: 'active',
    tags: ['dog', 'collar', 'leather'],
    shipping: { method: 'standard' },
    views: 36,
    isDeleted: false,
    createdAt: '2023-01-25T11:45:00Z',
    updatedAt: '2023-01-25T11:45:00Z',
    sellerData: {
      id: 'user3',
      username: 'LeatherCrafts',
      avatar: 'https://randomuser.me/api/portraits/women/65.jpg'
    },
    imageUrl: 'https://images.unsplash.com/photo-1598875184988-5e67b1a874b8?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3',
    isSaved: true
  },
  {
    id: '4',
    userId: 'user4',
    name: 'Interactive Cat Toy Set',
    description: 'Set of 5 interactive toys to keep your cat entertained and active',
    price: 34.99,
    category: 'Toys',
    condition: 'New',
    media: [],
    quantity: 7,
    status: 'active',
    tags: ['cat', 'toys', 'interactive'],
    shipping: { method: 'standard' },
    views: 51,
    isDeleted: false,
    createdAt: '2023-04-05T16:30:00Z',
    updatedAt: '2023-04-06T10:20:00Z',
    sellerData: {
      id: 'user4',
      username: 'ToyMaster',
      avatar: 'https://randomuser.me/api/portraits/men/22.jpg'
    },
    imageUrl: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?q=80&w=1980&auto=format&fit=crop&ixlib=rb-4.0.3',
    isSaved: true
  },
  {
    id: '5',
    userId: 'user5',
    name: 'Heated Pet Bed',
    description: 'Thermostatically controlled pet bed for cold winter nights',
    price: 89.99,
    category: 'Bedding',
    condition: 'New',
    media: [],
    quantity: 4,
    status: 'active',
    tags: ['heated', 'bed', 'winter'],
    shipping: { method: 'express' },
    views: 62,
    isDeleted: false,
    createdAt: '2023-05-12T09:10:00Z',
    updatedAt: '2023-05-13T14:40:00Z',
    sellerData: {
      id: 'user5',
      username: 'PetComfort',
      avatar: 'https://randomuser.me/api/portraits/women/28.jpg'
    },
    imageUrl: 'https://images.unsplash.com/photo-1591946614720-90a587da4a36?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3',
    isSaved: true
  }
];

interface SavedProductsProps {
  statusBarHeight?: number;
  onClose?: () => void;
}

const SavedProducts: React.FC<SavedProductsProps> = ({ 
  statusBarHeight = Constants.statusBarHeight || 0,
  onClose 
}) => {
  const router = useRouter();
  const { state: productsState, fetchSavedProducts, unsaveProduct, setCurrentProduct } = useProducts();
  const { state: authState } = useAuth();
  const { state: userState } = useUser();
  
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  
  // State for holding either mock data or real data
  const [displayProducts, setDisplayProducts] = useState<ProductItem[]>(mockProducts);

  // Animation values for subtle paw rotations
  const [animation] = useState(new Animated.Value(0));
  
  useEffect(() => {
    // Create a subtle animation for the paws
    Animated.loop(
      Animated.sequence([
        Animated.timing(animation, {
          toValue: 1,
          duration: 6000,
          useNativeDriver: true
        }),
        Animated.timing(animation, {
          toValue: 0,
          duration: 6000,
          useNativeDriver: true
        })
      ])
    ).start();
  }, []);

  // Get animated rotation values
  const rotation1 = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '10deg']
  });
  
  const rotation2 = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-10deg']
  });

  // Fetch saved products when component mounts
  useEffect(() => {
    if (authState.isAuthenticated && authState.user?.id) {
      loadSavedProducts();
    }
  }, [authState.isAuthenticated, authState.user?.id]);

  // Load saved products
  const loadSavedProducts = async () => {
    if (!authState.user?.id) return;
    
    try {
      await fetchSavedProducts(authState.user.id);
      // If the API returns products, use them, otherwise keep using mock data
      if (productsState.savedProducts.length > 0) {
        setDisplayProducts(productsState.savedProducts);
      }
      setLastFetchTime(Date.now());
    } catch (error) {
      console.error('Error loading saved products:', error);
      // Keep mock data if error occurs
    }
  };

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      if (authState.user?.id) {
        await fetchSavedProducts(authState.user.id);
        // If the API returns products, use them, otherwise keep using mock data
        if (productsState.savedProducts.length > 0) {
          setDisplayProducts(productsState.savedProducts);
        }
      }
      setLastFetchTime(Date.now());
    } catch (error) {
      console.error('Error refreshing saved products:', error);
      // Keep mock data if error occurs
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, authState.user?.id]);

  // Handle navigation back
  const handleGoBack = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  // Handle product press
  const handleProductPress = (product: ProductItem) => {
    setCurrentProduct(product);
    router.push({
      pathname: '/(root)/(products)',
      params: { id: product.id }
    });
  };

  // Handle unsave product
  const handleUnsaveProduct = async (productId: string) => {
    Alert.alert(
      "Remove Product",
      "Are you sure you want to remove this product from your saved items?",
      [
        { 
          text: "Cancel", 
          style: "cancel" 
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              // For demo purposes, just remove it from our local display state
              setDisplayProducts(displayProducts.filter(p => p.id !== productId));
              
              // Also call the actual API function if authenticated
              if (authState.isAuthenticated) {
                await unsaveProduct(productId);
              }
            } catch (error) {
              console.error('Error removing product:', error);
              Alert.alert("Error", "Failed to remove product. Please try again.");
            }
          }
        }
      ]
    );
  };

  // Render each product item
  const renderItem = ({ item, index }: { item: ProductItem, index: number }) => (
    <View 
      className="bg-white mx-4 my-2 rounded-2xl overflow-hidden"
      style={{
        shadowColor: '#9333EA40',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
        borderWidth: 2,
        borderColor: '#E9D5FF',
      }}
    >
      <TouchableOpacity
        onPress={() => handleProductPress(item)}
        activeOpacity={0.9}
      >
        <View className="p-2">
          {/* Product Header */}
          <View className="flex-row justify-between items-start mb-1">
            <Text className="text-lg font-bold text-gray-800" numberOfLines={1}>
              {item.name}
            </Text>
            
            {/* Unsave Button */}
            <TouchableOpacity
              onPress={() => handleUnsaveProduct(item.id)}
              className="bg-purple-100 p-1.5 rounded-full"
            >
              <MaterialCommunityIcons name="archive-remove" size={18} color="#9333EA" />
            </TouchableOpacity>
          </View>
          
          {/* Category and Condition Tags */}
          <View className="flex-row items-center mb-1.5">
            <View className="bg-purple-100 rounded-full px-2 py-0.5 mr-2">
              <Text className="text-purple-700 text-xs font-medium">{item.category}</Text>
            </View>
            <View className="bg-gray-100 rounded-full px-2 py-0.5">
              <Text className="text-gray-600 text-xs font-medium">{item.condition}</Text>
            </View>
          </View>
          
          {/* Description */}
          <Text className="text-gray-600 text-xs mb-2" numberOfLines={2}>
            {item.description}
          </Text>
          
          {/* Product Image and Price */}
          <View className="flex-row mb-2">
            <View className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 mr-3">
              <Image
                source={{ uri: item.imageUrl || 'https://via.placeholder.com/100' }}
                className="w-full h-full"
                resizeMode="cover"
              />
              
              {/* Small paw decoration on image */}
              {index % 3 === 0 && (
                <View className="absolute top-1 right-1 bg-white bg-opacity-70 rounded-full p-1">
                  <FontAwesome5 name="paw" size={10} color="#9333EA" />
                </View>
              )}
            </View>
            
            <View className="flex-1 justify-between">
              {/* Price Tag */}
              <View className="bg-purple-600 rounded-lg px-3 py-1 self-start">
                <Text className="text-white font-bold">
                  ${item.price.toFixed(2)}
                </Text>
              </View>
              
              {/* Seller Info */}
              <View className="flex-row items-center">
                {item.sellerData?.avatar && (
                  <Image
                    source={{ uri: formatImageUrl(item.sellerData.avatar) }}
                    className="w-5 h-5 rounded-full mr-1.5"
                  />
                )}
                <Text className="text-xs text-gray-600 font-medium">
                  {item.sellerData?.username || 'Unknown seller'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  // For demo purposes, we'll skip the authentication check
  // if (!authState.isAuthenticated) {
  //   return <AuthPrompt statusBarHeight={statusBarHeight} />;
  // }

  return (
    <SafeAreaView className="flex-1 bg-blue-50">
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      
      {/* Decorative Paws - Static */}
      <DecorativePaw style={{ top: 120, left: 20 }} size={30} opacity={0.15} rotation="-15deg" />
      <DecorativePaw style={{ top: 180, right: 30 }} size={24} opacity={0.12} rotation="20deg" />
      <DecorativePaw style={{ bottom: 300, left: 40 }} size={28} opacity={0.13} rotation="10deg" />
      <DecorativePaw style={{ bottom: 200, right: 25 }} size={36} opacity={0.08} rotation="-5deg" />
      <DecorativePaw style={{ bottom: 100, left: 60 }} size={20} opacity={0.1} rotation="25deg" />
      
      {/* Animated paws */}
      <Animated.View 
        style={{
          position: 'absolute',
          top: 250,
          right: 45,
          opacity: 0.15,
          transform: [{ rotate: rotation1 }]
        }}
      >
        <FontAwesome5 name="paw" size={32} color="#7E22CE" />
      </Animated.View>
      
      <Animated.View 
        style={{
          position: 'absolute',
          bottom: 400,
          left: 30,
          opacity: 0.14,
          transform: [{ rotate: rotation2 }]
        }}
      >
        <FontAwesome5 name="paw" size={26} color="#9333EA" />
      </Animated.View>
      
      {/* Header with gradient */}
      <LinearGradient
        colors={['#9333EA', '#A855F7', '#C084FC']}
        className="w-full pt-10 pb-6"
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Decorative Header Paws */}
        <View style={{ position: 'absolute', right: 20, top: 15, opacity: 0.3 }}>
          <FontAwesome5 name="paw" size={45} color="#ffffff" />
        </View>
        <View style={{ position: 'absolute', left: 30, bottom: 20, opacity: 0.25 }}>
          <FontAwesome5 name="paw" size={30} color="#ffffff" />
        </View>
        
        <View className="flex-row items-center justify-between px-4 pt-2">
          {/* Simplified Back Button */}
          <TouchableOpacity 
            className="bg-white rounded-full w-10 h-10 items-center justify-center" 
            onPress={handleGoBack}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
              elevation: 3,
            }}
          >
            <AntDesign name="arrowleft" size={22} color="#9333EA" />
          </TouchableOpacity>
          
          <View className="items-center">
            <Text className="text-white font-bold text-xl">Saved Products</Text>
            <View className="flex-row items-center mt-1">
              <FontAwesome5 name="paw" size={12} color="#FFF" style={{ opacity: 0.8, marginRight: 4 }} />
              <Text className="text-white text-opacity-90 text-xs">
                {displayProducts.length} items saved
              </Text>
            </View>
          </View>
          
          {/* Right side element for balance */}
          <View style={{ width: 40, height: 40 }} />
        </View>
      </LinearGradient>
      
      {/* Content */}
      <FlatList
        data={displayProducts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ 
          paddingVertical: 12, 
          paddingBottom: 40 
        }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#9333EA']}
            tintColor="#9333EA"
          />
        }
        ListEmptyComponent={
          <View className="py-16 items-center justify-center">
            {refreshing ? (
              <ActivityIndicator size="large" color="#9333EA" />
            ) : (
              <View className="items-center px-5">
                <View className="relative">
                  <MaterialIcons name="bookmark-border" size={80} color="#C084FC" style={{ opacity: 0.7 }} />
                  <FontAwesome5 name="paw" size={24} color="#9333EA" style={{ position: 'absolute', top: 15, right: -10, opacity: 0.3 }} />
                </View>
                <Text className="text-gray-700 text-lg font-medium mt-6 text-center">
                  You haven't saved any products yet
                </Text>
                <Text className="text-gray-500 text-sm mt-2 mb-6 text-center">
                  Items you save will appear here for easy access
                </Text>
                <TouchableOpacity
                  className="bg-purple-600 px-6 py-3.5 rounded-full flex-row items-center"
                  style={{
                    shadowColor: '#9333EA',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.3,
                    shadowRadius: 5,
                    elevation: 3,
                  }}
                  onPress={() => router.push('/(root)/(tabs)/market')}
                >
                  <FontAwesome5 name="paw" size={14} color="#FFF" style={{ marginRight: 6 }} />
                  <Text className="text-white font-bold">Browse Products</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default SavedProducts;
