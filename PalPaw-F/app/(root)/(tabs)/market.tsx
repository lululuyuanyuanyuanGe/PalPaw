// app/market.tsx - Redesigned Market Screen with unified vertical product listings
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  FlatList,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { 
  Feather, 
  MaterialCommunityIcons,
  FontAwesome
} from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useProducts } from '@/context';

// Define types
type ProductItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  media: any[];
  imageUrl?: string;
  category: string;
  condition: string;
  quantity: number;
  shippingOptions?: string[];
  sellerData?: {
    id: string;
    username: string;
    avatar: string;
  };
  views?: number;
  isNew?: boolean;
};

type CategoryIconName = 'food-variant' | 'toy-brick' | 'bed' | 'tshirt-crew' | 
                       'medical-bag' | 'content-cut' | 'whistle' | 'bag-suitcase' | 'dog-side' | 'paw';

type Category = {
  id: string | number;
  name: string;
  icon: CategoryIconName;
  color: string;
};

// Define market screen component
export default function MarketScreen() {
  const router = useRouter();
  const { state: { feedProducts }, fetchFeedProducts } = useProducts();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [products, setProducts] = useState<ProductItem[]>([]);
  
  // Load products when the component mounts
  useEffect(() => {
    fetchFeedProducts();
  }, []);

  // Update local products state when feedProducts changes
  useEffect(() => {
    if (feedProducts && feedProducts.length > 0) {
      setProducts(feedProducts);
    } else {
      // Fallback to mock data if no products from API
      setProducts(mockProducts);
    }
  }, [feedProducts]);
  
  // Mock data for pet products - combined list (fallback)
  const mockProducts: ProductItem[] = [
    {
      id: "1",
      name: 'Premium Dog Food',
      description: 'High-quality nutrition for your furry friend',
      price: 29.99,
      media: [],
      imageUrl: 'https://picsum.photos/200',
      category: 'Pet Food',
      condition: 'New',
      quantity: 5,
      shippingOptions: ['Pickup', 'Delivery'],
      views: 45,
      sellerData: {
        id: "user1",
        username: "PetLover",
        avatar: "https://randomuser.me/api/portraits/men/1.jpg"
      },
      isNew: true
    },
    {
      id: "2",
      name: 'Cat Tree Tower',
      description: 'Multi-level cat condo with scratching posts',
      price: 49.99,
      media: [],
      imageUrl: 'https://picsum.photos/201',
      category: 'Pet Beds',
      condition: 'New',
      quantity: 3,
      shippingOptions: ['Pickup'],
      views: 32,
      sellerData: {
        id: "user2",
        username: "CatLady",
        avatar: "https://randomuser.me/api/portraits/women/2.jpg"
      }
    },
    {
      id: "3",
      name: 'Bird Cage Deluxe',
      description: 'Spacious and stylish home for your feathered companion',
      price: 75.99,
      media: [],
      imageUrl: 'https://picsum.photos/202',
      category: 'Accessories',
      condition: 'New',
      quantity: 2,
      shippingOptions: ['Delivery'],
      views: 18,
      sellerData: {
        id: "user3",
        username: "BirdEnthusiast",
        avatar: "https://randomuser.me/api/portraits/men/3.jpg"
      }
    },
    {
      id: "4",
      name: 'Hamster Exercise Wheel',
      description: 'Silent spinner for happy rodents',
      price: 12.99,
      media: [],
      imageUrl: 'https://picsum.photos/203',
      category: 'Pet Toys',
      condition: 'New',
      quantity: 10,
      shippingOptions: ['Pickup', 'Delivery'],
      views: 27,
      sellerData: {
        id: "user4",
        username: "RodentFan",
        avatar: "https://randomuser.me/api/portraits/women/4.jpg"
      }
    },
    {
      id: "5",
      name: 'Fish Tank Filter',
      description: 'Advanced filtration for crystal clear water',
      price: 24.99,
      media: [],
      imageUrl: 'https://picsum.photos/204',
      category: 'Health & Wellness',
      condition: 'New',
      quantity: 8,
      shippingOptions: ['Pickup'],
      views: 14,
      sellerData: {
        id: "user5",
        username: "AquariumMaster",
        avatar: "https://randomuser.me/api/portraits/men/5.jpg"
      }
    },
    {
      id: "6",
      name: 'Cozy Pet Bed',
      description: 'Ultra-soft sleeping space for dogs and cats',
      price: 34.99,
      media: [],
      imageUrl: 'https://picsum.photos/205',
      category: 'Pet Beds',
      condition: 'New',
      quantity: 6,
      shippingOptions: ['Delivery'],
      views: 36,
      sellerData: {
        id: "user6",
        username: "PetComfort",
        avatar: "https://randomuser.me/api/portraits/women/6.jpg"
      }
    },
    {
      id: "7",
      name: 'Interactive Dog Toy',
      description: 'Mental stimulation for intelligent pups',
      price: 18.99,
      media: [],
      imageUrl: 'https://picsum.photos/206',
      category: 'Pet Toys',
      condition: 'New',
      quantity: 12,
      shippingOptions: ['Pickup', 'Delivery'],
      views: 41,
      sellerData: {
        id: "user7",
        username: "DogTrainer",
        avatar: "https://randomuser.me/api/portraits/men/7.jpg"
      },
      isNew: true
    },
    {
      id: "8",
      name: 'Cat Scratching Post',
      description: 'Save your furniture with this sisal-wrapped post',
      price: 22.50,
      media: [],
      imageUrl: 'https://picsum.photos/207',
      category: 'Pet Beds',
      condition: 'Like New',
      quantity: 4,
      shippingOptions: ['Pickup'],
      views: 23,
      sellerData: {
        id: "user8",
        username: "CatWhisperer",
        avatar: "https://randomuser.me/api/portraits/women/8.jpg"
      }
    }
  ];
  
  const clearSearchQuery = () => {
    setSearchQuery('');
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

  // Get icon based on category
  const getCategoryIcon = (categoryName: string): CategoryIconName => {
    const iconMap: {[key: string]: CategoryIconName} = {
      'Pet Food': 'food-variant',
      'Pet Toys': 'toy-brick',
      'Pet Beds': 'bed',
      'Pet Clothing': 'tshirt-crew', 
      'Health & Wellness': 'medical-bag',
      'Grooming': 'content-cut',
      'Training': 'whistle',
      'Carriers & Travel': 'bag-suitcase',
      'Accessories': 'dog-side',
      'All': 'paw'
    };
    
    return iconMap[categoryName] || 'paw';
  };

  // Categories for products - match with createProducts.tsx
  const categories: Category[] = [
    { id: 0, name: 'All', icon: 'paw', color: '#9333EA' },
    { id: 1, name: 'Pet Food', icon: getCategoryIcon('Pet Food'), color: getCategoryColor('Pet Food') },
    { id: 2, name: 'Pet Toys', icon: getCategoryIcon('Pet Toys'), color: getCategoryColor('Pet Toys') },
    { id: 3, name: 'Pet Beds', icon: getCategoryIcon('Pet Beds'), color: getCategoryColor('Pet Beds') },
    { id: 4, name: 'Pet Clothing', icon: getCategoryIcon('Pet Clothing'), color: getCategoryColor('Pet Clothing') },
    { id: 5, name: 'Health & Wellness', icon: getCategoryIcon('Health & Wellness'), color: getCategoryColor('Health & Wellness') },
    { id: 6, name: 'Grooming', icon: getCategoryIcon('Grooming'), color: getCategoryColor('Grooming') },
    { id: 7, name: 'Training', icon: getCategoryIcon('Training'), color: getCategoryColor('Training') },
    { id: 8, name: 'Carriers & Travel', icon: getCategoryIcon('Carriers & Travel'), color: getCategoryColor('Carriers & Travel') },
    { id: 9, name: 'Accessories', icon: getCategoryIcon('Accessories'), color: getCategoryColor('Accessories') }
  ];

  // Change category and fetch products for that category
  const handleCategoryChange = (categoryName: string) => {
    setSelectedCategory(categoryName);
    if (categoryName === 'All') {
      fetchFeedProducts();
    } else {
      fetchFeedProducts(categoryName);
    }
  };
  
  // Filter products based on search query and selected category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          product.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  // Navigate to product details
  const navigateToProductDetails = (productId: string) => {
    router.push(`/(root)/product/${productId}` as any);
  };

  // Render product item
  const renderProductItem = ({ item }: { item: ProductItem }) => (
    <TouchableOpacity 
      className="bg-white rounded-xl shadow-md overflow-hidden mb-3 border border-gray-50"
      style={{
        shadowColor: "#9333EA",
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 2,
      }}
      activeOpacity={0.9}
      onPress={() => navigateToProductDetails(item.id)}
    >
      <View className="flex-row p-2">
        {/* Product Image with frame decoration */}
        <View className="rounded-lg overflow-hidden border-2 border-purple-100" style={{ width: 95, height: 95 }}>
          <Image 
            source={{ uri: item.imageUrl || (item.media && item.media.length > 0 ? item.media[0].uri : 'https://picsum.photos/200') }} 
            className="w-full h-full"
            style={{ resizeMode: 'cover' }}
          />
          {/* New badge if applicable */}
          {item.isNew && (
            <View className="absolute top-0 left-0 bg-teal-500 px-1.5 py-0.5 rounded-br-lg">
              <Text className="text-white text-[10px] font-bold">NEW</Text>
            </View>
          )}
          {/* Image overlay decoration with correct category icon */}
          <View className="absolute bottom-0 right-0 w-6 h-6 bg-purple-500 rounded-tl-lg items-center justify-center opacity-80">
            <MaterialCommunityIcons 
              name={item.category ? getCategoryIcon(item.category) : 'paw'} 
              size={14} 
              color="white" 
            />
          </View>
        </View>
        
        {/* Product Details */}
        <View className="flex-1 pl-3 justify-between">
          {/* Product Name */}
          <View className="flex-row items-center">
            <MaterialCommunityIcons name="tag-outline" size={14} color="#9333EA" style={{ marginRight: 4 }} />
            <Text className="font-medium text-gray-800" numberOfLines={1}>{item.name}</Text>
          </View>
          
          {/* Condition and Category Tags */}
          <View className="flex-row mt-1">
            <View className="px-2 py-0.5 bg-purple-100 rounded-full mr-1 flex-row items-center">
              <MaterialCommunityIcons name="star-outline" size={10} color="#9333EA" style={{ marginRight: 2 }} />
              <Text className="text-xs text-purple-700">{item.condition}</Text>
            </View>
            
            <View className="px-2 py-0.5 bg-blue-100 rounded-full flex-row items-center">
              <MaterialCommunityIcons 
                name={item.category ? getCategoryIcon(item.category) : 'paw'} 
                size={10} 
                color="#3B82F6" 
                style={{ marginRight: 2 }} 
              />
              <Text className="text-xs text-blue-700">{item.category ? item.category.replace('Pet ', '') : 'Other'}</Text>
            </View>
            
            {/* View Count */}
            <View className="flex-row items-center ml-auto bg-gray-50 px-1.5 rounded-full">
              <Feather name="eye" size={10} color="#9CA3AF" />
              <Text className="text-xs text-gray-500 ml-0.5">
                {item.views ? item.views : '0'}
              </Text>
            </View>
          </View>
          
          {/* Price and Shipping Options */}
          <View className="flex-row items-center mt-1.5">
            {/* Price with icon */}
            <View className="flex-row items-center bg-purple-50 px-2 py-0.5 rounded-lg">
              <MaterialCommunityIcons name="cash" size={12} color="#9333EA" />
              <Text className="font-bold text-purple-600 text-base ml-1">${item.price.toFixed(2)}</Text>
            </View>
            
            <View className="flex-row items-center ml-2 bg-gray-50 px-1.5 rounded-full">
              <MaterialCommunityIcons name="package-variant" size={10} color="#4B5563" />
              <Text className="text-xs text-gray-500 ml-0.5">x{item.quantity}</Text>
            </View>
            
            {/* Shipping Options with enhanced visuals */}
            <View className="flex-row ml-auto">
              {item.shippingOptions?.includes('Pickup') && (
                <View className="flex-row items-center mr-1 bg-indigo-50 px-1.5 py-0.5 rounded-full border border-indigo-100">
                  <Feather name="map-pin" size={10} color="#6366F1" />
                  <Text className="text-xs text-indigo-700 ml-0.5">Pickup</Text>
                </View>
              )}
              
              {item.shippingOptions?.includes('Delivery') && (
                <View className="flex-row items-center bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-100">
                  <Feather name="package" size={10} color="#F59E0B" />
                  <Text className="text-xs text-amber-700 ml-0.5">Delivery</Text>
                </View>
              )}
            </View>
          </View>
          
          {/* View Details Button and Seller Info with decoration */}
          <View className="flex-row items-center justify-between mt-2 pt-1.5 border-t border-gray-100">
            {/* Seller info with enhanced visuals */}
            {item.sellerData && (
              <View className="flex-row items-center bg-gray-50 px-1.5 py-0.5 rounded-full">
                {item.sellerData.avatar ? (
                  <Image 
                    source={{ uri: item.sellerData.avatar }} 
                    className="w-5 h-5 rounded-full border border-purple-200"
                    style={{ resizeMode: 'cover' }}
                  />
                ) : (
                  <View className="w-5 h-5 rounded-full bg-purple-100 items-center justify-center border border-purple-200">
                    <Text className="text-xs text-purple-600 font-bold">{item.sellerData.username.charAt(0)}</Text>
                  </View>
                )}
                <Text className="text-xs text-gray-600 ml-1.5 font-medium">{item.sellerData.username}</Text>
              </View>
            )}
            
            {/* View Details Button with icon */}
            <View className="overflow-hidden rounded-full">
              <TouchableOpacity className="bg-gradient-to-r from-purple-600 to-pink-500 px-3 py-1 rounded-full flex-row items-center">
                <Feather name="external-link" size={10} color="white" style={{ marginRight: 2 }} />
                <Text className="text-white text-xs font-medium">View Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
  
  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
          title: "Market",
          statusBarStyle: "light"
        }} 
      />
      
      {/* Use a StatusBar component to set status bar style */}
      <StatusBar 
        translucent
        backgroundColor="transparent" 
        barStyle="light-content" 
      />
      
      {/* Wrap everything in SafeAreaView with proper edges */}
      <SafeAreaView className="flex-1 bg-purple-500" style={{ paddingTop: Constants.statusBarHeight }}>
        <View className="flex-1">
          {/* Fixed Header - Always stays at the top with decoration */}
          <View className="bg-purple-500 px-4 pb-3 shadow-md z-10">
            {/* Title with icon */}
            <View className="flex-row justify-between items-center mb-3 pt-3">
              <View className="flex-row items-center">
                <MaterialCommunityIcons name="store" size={24} color="white" style={{ marginRight: 6 }} />
                <Text className="text-white text-xl font-bold">PalPaw Market</Text>
              </View>
              
              {/* Header decoration */}
              <View className="h-7 w-7 rounded-full bg-purple-400 items-center justify-center">
                <MaterialCommunityIcons name="paw" size={16} color="white" />
              </View>
            </View>
            
            {/* Search Bar with enhanced styling */}
            <View className="relative mb-3">
              <View className="absolute left-3 top-0 bottom-0 justify-center z-10">
                <Feather name="search" size={16} color="#9333EA" />
              </View>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="bg-white py-2 pl-10 pr-10 rounded-full w-full shadow-sm text-sm"
                placeholder="Search for pet products..."
                placeholderTextColor="#9CA3AF"
                style={{ borderWidth: 1, borderColor: 'rgba(147, 51, 234, 0.1)' }}
              />
              {searchQuery ? (
                <TouchableOpacity
                  onPress={clearSearchQuery}
                  className="absolute right-3 top-0 bottom-0 justify-center z-10"
                >
                  <Feather name="x" size={16} color="#9333EA" />
                </TouchableOpacity>
              ) : (
                <View className="absolute right-3 top-0 bottom-0 justify-center z-10">
                  <MaterialCommunityIcons name="microphone-outline" size={16} color="#9CA3AF" />
                </View>
              )}
            </View>
          </View>
          
          {/* Pink Border Line with enhanced gradient */}
          <View className="h-1 w-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500" />
          
          {/* Categories with decorative background */}
          <View className="pt-2 pb-1 bg-white">
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              className="pb-1 px-3"
              contentContainerStyle={{ paddingRight: 16 }}
            >
              {categories.map(category => (
                <TouchableOpacity 
                  key={category.id} 
                  className="flex-none mx-1.5 items-center"
                  onPress={() => handleCategoryChange(category.name)}
                >
                  <View className="w-14 h-14 rounded-full items-center justify-center shadow-sm"
                    style={{
                      backgroundColor: selectedCategory === category.name 
                        ? category.color  // Use solid color for selected category
                        : '#F9F5FF', // Light purple background for unselected icons
                      borderWidth: 1.5,
                      borderColor: selectedCategory === category.name 
                        ? 'white' // White border for selected category 
                        : '#F3E8FF' // Light border for unselected
                    }}
                  >
                    <MaterialCommunityIcons 
                      name={category.icon} 
                      size={22}
                      color={selectedCategory === category.name ? 'white' : category.color}
                    />
                  </View>
                  <Text className={`text-[10px] mt-1 ${
                    selectedCategory === category.name 
                      ? 'font-bold' 
                      : 'font-medium'
                  }`}
                  style={{ 
                    color: selectedCategory === category.name 
                      ? category.color
                      : '#4B5563'
                  }}
                  >
                    {category.name.replace('Pet ', '')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {/* Decorative divider */}
            <View className="h-0.5 bg-gray-100 mx-4 my-1" />
          </View>
          
          {/* Scrollable Content Area */}
          <ScrollView 
            className="flex-1 bg-white"
            showsVerticalScrollIndicator={false}
          >
            {/* Title Decoration */}
            {selectedCategory !== 'All' && (
              <View className="flex-row items-center px-4 pt-3 pb-1">
                <MaterialCommunityIcons 
                  name={getCategoryIcon(selectedCategory)} 
                  size={16} 
                  color={getCategoryColor(selectedCategory)} 
                  style={{ marginRight: 4 }}
                />
                <Text className="text-sm font-bold" style={{ color: getCategoryColor(selectedCategory) }}>
                  {selectedCategory.replace('Pet ', '')} Products
                </Text>
                <View className="flex-1 h-0.5 bg-gray-100 ml-2" />
              </View>
            )}
            
            {/* Product Listings */}
            <View className="px-3 pt-2 pb-20">
              {filteredProducts.length === 0 ? (
                <View className="items-center justify-center py-20 bg-gray-50 rounded-lg">
                  <MaterialCommunityIcons name="paw" size={60} color="#D1D5DB" />
                  <Text className="text-gray-500 mt-4 text-center">
                    No products found matching your search.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredProducts}
                  renderItem={renderProductItem}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false} // Prevent scrolling within FlatList since parent ScrollView handles it
                />
              )}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </>
  );
}