import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions, 
  ActivityIndicator,
  Alert,
  Linking
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { usePosts, useAuth } from "@/context";
import MediaCarousel from '../../../components/MediaCarousel';

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

// Product specification component
interface SpecificationProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const Specification: React.FC<SpecificationProps> = ({ icon, label, value }) => {
  return (
    <View className="bg-white p-3 rounded-xl mb-2 flex-row items-center">
      <View className="bg-purple-50 p-2 rounded-full mr-3">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-xs text-gray-500 font-rubik">{label}</Text>
        <Text className="text-sm text-gray-800 font-rubik-medium">{value}</Text>
      </View>
    </View>
  );
};

// Product Review component
interface ReviewProps {
  author: string;
  rating: number;
  content: string;
  timestamp: string | Date;
  avatarUri: string;
}

const Review: React.FC<ReviewProps> = ({ author, rating, content, timestamp, avatarUri }) => {
  // Generate stars based on rating
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons 
          key={i} 
          name={i <= rating ? "star" : "star-outline"} 
          size={14} 
          color={i <= rating ? "#F59E0B" : "#D1D5DB"} 
          style={{ marginRight: 2 }}
        />
      );
    }
    return stars;
  };

  return (
    <View className="bg-white p-4 rounded-xl mb-3 shadow-sm border border-gray-50">
      <View className="flex-row items-center mb-3">
        <Image
          source={{ uri: avatarUri }}
          className="w-9 h-9 rounded-full border-2 border-purple-100"
        />
        <View className="ml-3 flex-1">
          <Text className="font-rubik-semibold text-gray-800">{author}</Text>
          <Text className="font-rubik text-xs text-gray-500">{formatTimeAgo(timestamp)}</Text>
        </View>
        <View className="flex-row items-center">
          {renderStars()}
        </View>
      </View>
      <Text className="font-rubik text-gray-700 leading-5 mb-2">{content}</Text>
    </View>
  );
};

const ProductDetail = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollY = useSharedValue(0);
  const { width } = Dimensions.get('window');
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(0);
  
  // Dummy product data - in real app, fetch from context or API
  const product = {
    id: params.id || 'product-1',
    name: 'Premium Pet Carrier Travel Bag',
    price: 89.99,
    discountedPrice: 69.99,
    description: 'This premium pet carrier is perfect for travel with your furry friend. Made with high-quality materials that are both durable and comfortable for your pet. Features multiple ventilation windows, a soft internal mat, and safety tether.',
    rating: 4.7,
    reviewCount: 142,
    inStock: true,
    availableQuantity: 23,
    images: [
      'https://robohash.org/pet-carrier-1?set=set4&bgset=bg1',
      'https://robohash.org/pet-carrier-2?set=set4&bgset=bg1',
      'https://robohash.org/pet-carrier-3?set=set4&bgset=bg1'
    ],
    variants: [
      { name: 'Small', price: 69.99 },
      { name: 'Medium', price: 79.99 },
      { name: 'Large', price: 89.99 }
    ],
    specifications: [
      { label: 'Weight', value: '1.2 kg', icon: <MaterialCommunityIcons name="weight" size={18} color="#9333EA" /> },
      { label: 'Dimensions', value: '45 x 30 x 28 cm', icon: <MaterialCommunityIcons name="ruler-square" size={18} color="#9333EA" /> },
      { label: 'Material', value: 'Premium Nylon', icon: <MaterialCommunityIcons name="material-design" size={18} color="#9333EA" /> },
      { label: 'Max Pet Weight', value: 'Up to 8 kg', icon: <FontAwesome5 name="dog" size={18} color="#9333EA" /> }
    ],
    seller: {
      id: 'seller-123',
      name: 'PetShop Premium',
      avatar: 'https://robohash.org/seller123?set=set4',
      rating: 4.9,
      verifiedSeller: true,
      responseRate: '98%',
      location: 'San Francisco, CA'
    },
    reviews: [
      {
        id: 'review-1',
        author: 'Sarah Johnson',
        avatarUri: 'https://robohash.org/sarah?set=set4',
        rating: 5,
        content: 'My cat loves this carrier! It\'s so comfortable and easy to clean. Highly recommend!',
        timestamp: '2023-10-15T14:23:40Z'
      },
      {
        id: 'review-2',
        author: 'Mike Peters',
        avatarUri: 'https://robohash.org/mike?set=set4',
        rating: 4,
        content: 'Great quality but a bit smaller than I expected. Still works well for my small dog.',
        timestamp: '2023-09-28T09:12:15Z'
      }
    ],
    createdAt: '2023-08-10T08:30:00Z'
  };
  
  // Get authorization context
  const { state: authState } = useAuth();

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
  
  // Price with possible discount
  const currentPrice = product.variants ? product.variants[selectedVariant].price : (product.discountedPrice || product.price);
  const hasDiscount = product.discountedPrice && product.discountedPrice < product.price;
  
  // Handle quantity changes
  const incrementQuantity = () => {
    if (quantity < product.availableQuantity) {
      setQuantity(prev => prev + 1);
    }
  };
  
  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };
  
  // Handle add to cart
  const handleAddToCart = () => {
    if (!authState.isAuthenticated) {
      Alert.alert("Authentication Required", "Please login to add items to cart");
      return;
    }
    
    Alert.alert(
      "Success!",
      `${quantity} ${product.name} (${product.variants ? product.variants[selectedVariant].name : ''}) added to your cart.`
    );
  };
  
  // Handle contact seller
  const handleContactSeller = () => {
    Alert.alert("Contact Seller", "This feature will be available soon!");
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
        <Text className="flex-1 text-lg font-rubik-medium text-gray-800 ml-2">{product.name?.substring(0, 20)}...</Text>
      </Animated.View>
      
      <ScrollView 
        className="flex-1 bg-gray-50"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(event) => {
          scrollY.value = event.nativeEvent.contentOffset.y;
        }}
      >
        {/* Custom Header - For the top of the screen only */}
        <View className="bg-white shadow-sm">
          <View className="flex-row items-center px-4 pt-12 pb-4">
            <TouchableOpacity onPress={() => router.back()} className="p-2">
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="flex-1 text-lg font-rubik-medium text-gray-800 ml-2">Product Details</Text>
            <TouchableOpacity className="p-2">
              <Ionicons name="share-social-outline" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Product Images Carousel */}
        <MediaCarousel media={product.images.map(url => ({ url, type: 'image' }))} />

        {/* Pricing and Rating Section */}
        <View className="p-4 bg-white mt-2 shadow-sm">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <View className="bg-green-100 px-3 py-1 rounded-full">
                <Text className="text-green-700 text-xs font-rubik-medium">
                  {product.inStock ? 'In Stock' : 'Out of Stock'}
                </Text>
              </View>
              <Text className="text-xs text-gray-500 ml-2 font-rubik">
                {product.availableQuantity} available
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="star" size={16} color="#F59E0B" />
              <Text className="ml-1 text-gray-700 font-rubik-medium">{product.rating}</Text>
              <Text className="ml-1 text-gray-500 text-xs font-rubik">({product.reviewCount} reviews)</Text>
            </View>
          </View>
          
          <Text className="text-xl font-rubik-semibold text-gray-800 mb-1">{product.name}</Text>
          
          <View className="flex-row items-center mt-2">
            <Text className="text-2xl font-rubik-semibold text-purple-700">
              {formatCurrency(currentPrice)}
            </Text>
            {hasDiscount && (
              <Text className="ml-2 text-gray-500 line-through text-sm font-rubik">
                {formatCurrency(product.price)}
              </Text>
            )}
            {hasDiscount && (
              <View className="ml-2 bg-red-100 px-2 py-1 rounded-full">
                <Text className="text-red-600 text-xs font-rubik-medium">
                  {Math.round(((product.price - product.discountedPrice) / product.price) * 100)}% OFF
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Seller Information */}
        <View className="p-4 bg-white mt-2 shadow-sm">
          <View className="flex-row items-center">
            <Image
              source={{ uri: product.seller.avatar }}
              className="w-12 h-12 rounded-full border-2 border-purple-100"
            />
            <View className="ml-3 flex-1">
              <View className="flex-row items-center">
                <Text className="font-rubik-semibold text-gray-800">{product.seller.name}</Text>
                {product.seller.verifiedSeller && (
                  <Ionicons name="checkmark-circle" size={16} color="#9333EA" style={{ marginLeft: 4 }} />
                )}
              </View>
              <Text className="text-xs text-gray-500 font-rubik">
                {product.seller.location} • Response rate: {product.seller.responseRate}
              </Text>
            </View>
            <TouchableOpacity 
              className="bg-purple-100 px-4 py-2 rounded-full"
              onPress={handleContactSeller}
            >
              <Text className="text-purple-600 font-rubik-medium">Contact</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Variants Selector */}
        {product.variants && product.variants.length > 0 && (
          <View className="p-4 bg-white mt-2 shadow-sm">
            <Text className="font-rubik-semibold text-gray-800 mb-3">Available Sizes</Text>
            <View className="flex-row">
              {product.variants.map((variant, index) => (
                <TouchableOpacity 
                  key={variant.name}
                  onPress={() => setSelectedVariant(index)}
                  className={`mr-2 px-4 py-2 rounded-lg border ${
                    selectedVariant === index 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-200'
                  }`}
                >
                  <Text className={`font-rubik-medium ${
                    selectedVariant === index ? 'text-purple-700' : 'text-gray-700'
                  }`}>
                    {variant.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Product Description */}
        <View className="p-4 bg-white mt-2 shadow-sm">
          <Text className="font-rubik-semibold text-gray-800 mb-2">Description</Text>
          <Text className="text-gray-700 leading-6 font-rubik">{product.description}</Text>
        </View>

        {/* Product Specifications */}
        <View className="p-4 bg-white mt-2 shadow-sm">
          <Text className="font-rubik-semibold text-gray-800 mb-3">Specifications</Text>
          {product.specifications.map((spec, index) => (
            <Specification 
              key={index}
              icon={spec.icon}
              label={spec.label}
              value={spec.value}
            />
          ))}
        </View>

        {/* Customer Reviews */}
        <View className="p-4 bg-white mt-2 mb-24 shadow-sm">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-rubik-semibold text-gray-800 text-lg">Customer Reviews</Text>
            <TouchableOpacity className="flex-row items-center">
              <Text className="text-purple-600 font-rubik-medium text-xs mr-1">View All</Text>
              <Ionicons name="chevron-forward" size={14} color="#9333EA" />
            </TouchableOpacity>
          </View>
          
          {product.reviews.map(review => (
            <Review
              key={review.id}
              author={review.author}
              rating={review.rating}
              content={review.content}
              timestamp={review.timestamp}
              avatarUri={review.avatarUri}
            />
          ))}
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View className="bg-white border-t border-gray-100 px-4 py-3 absolute bottom-0 left-0 right-0 shadow-up">
        <View className="flex-row items-center justify-between">
          {/* Quantity selector */}
          <View className="flex-row items-center border border-gray-200 rounded-lg">
            <TouchableOpacity 
              onPress={decrementQuantity}
              className="px-3 py-2"
            >
              <Ionicons name="remove" size={20} color={quantity > 1 ? "#374151" : "#D1D5DB"} />
            </TouchableOpacity>
            <Text className="px-3 font-rubik-medium text-gray-800">{quantity}</Text>
            <TouchableOpacity 
              onPress={incrementQuantity}
              className="px-3 py-2"
            >
              <Ionicons name="add" size={20} color={quantity < product.availableQuantity ? "#374151" : "#D1D5DB"} />
            </TouchableOpacity>
          </View>
          
          {/* Price & Add to Cart */}
          <View className="flex-row">
            <TouchableOpacity className="bg-white border border-purple-500 mr-2 px-4 py-2 rounded-full">
              <Ionicons name="heart-outline" size={20} color="#9333EA" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleAddToCart}
              className="flex-row items-center justify-center"
            >
              <LinearGradient
                colors={['#9333EA', '#C084FC']}
                className="px-6 py-2 rounded-full flex-row items-center"
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="cart-outline" size={20} color="white" />
                <Text className="ml-2 text-white font-rubik-medium">
                  Add to Cart • {formatCurrency(currentPrice * quantity)}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </>
  );
};

export default ProductDetail;
