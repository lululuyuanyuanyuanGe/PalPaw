// app/market.tsx - Redesigned Market Screen with unified vertical product listings
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  FlatList,
  StatusBar,
  SafeAreaView,
  RefreshControl
} from 'react-native';
import { 
  Feather, 
  MaterialCommunityIcons,
  FontAwesome
} from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useProducts } from '@/context';
import { formatImageUrl } from '@/utils/mediaUtils';

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
  const { state: { feedProducts, loading }, fetchFeedProducts, setCurrentProduct } = useProducts();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  // Load all products when the component mounts
  useEffect(() => {
    // Fetch all products without category filter
    fetchFeedProducts();
  }, []);
  
  // Refresh products when returning to the screen
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      // Only refresh if it's been at least 2 seconds since last refresh
      if (now - lastRefresh > 2000) {
        console.log('Market screen focused, refreshing products');
        fetchFeedProducts();
        setLastRefresh(now);
      }
      
      return () => {
        // Cleanup function when screen loses focus
      };
    }, [fetchFeedProducts, lastRefresh])
  );
  
  // Handle pull-to-refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    console.log('Pull-to-refresh: refreshing products');
    
    // Fetch products
    fetchFeedProducts()
      .finally(() => {
        setRefreshing(false);
        setLastRefresh(Date.now());
      });
  }, [fetchFeedProducts]);
  
  // Handle category selection - just update the selected category
  const handleCategoryChange = useCallback((categoryName: string) => {
    setSelectedCategory(categoryName);
  }, []);
  
  const clearSearchQuery = () => {
    setSearchQuery('');
  };

  // Memoize filtered products based on category and search
  const filteredProducts = useMemo(() => {
    if (!feedProducts || feedProducts.length === 0) return [];
    
    return feedProducts.filter(product => {
      // Filter by category if not "All"
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      
      // Filter by search query
      const matchesSearch = !searchQuery || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        product.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesCategory && matchesSearch;
    });
  }, [feedProducts, selectedCategory, searchQuery]);

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

  // Navigate to product details
  const navigateToProductDetails = (productId: string) => {
    // Find the product in our state
    const product = feedProducts.find(p => p.id === productId);
    
    // Set current product in context before navigation
    if (product) {
      setCurrentProduct(product as any);
    }
    
    // Then navigate to the product details page
    router.push({
      pathname: "/(root)/(products)",
      params: {
        id: String(productId)
      }
    });
  };

  // Render product item
  const renderProductItem = useCallback(({ item }: { item: ProductItem }) => (
    <ProductItemCard 
      item={item}
      onPress={navigateToProductDetails}
      getCategoryIcon={getCategoryIcon}
    />
  ), [navigateToProductDetails, getCategoryIcon]);
  
  // Loading placeholder item for smoother transitions
  const renderLoadingItem = useCallback(() => (
    <View 
      className="bg-white rounded-xl shadow-md overflow-hidden mb-3 border border-gray-50 animate-pulse"
      style={{ height: 120 }}
    >
      <View className="flex-row p-2">
        <View className="bg-gray-200 rounded-lg" style={{ width: 95, height: 95 }} />
        <View className="flex-1 pl-3 justify-between">
          <View className="h-4 bg-gray-200 rounded w-2/3 mt-1" />
          <View className="flex-row mt-2">
            <View className="h-3 bg-gray-200 rounded w-1/4 mr-2" />
            <View className="h-3 bg-gray-200 rounded w-1/4" />
          </View>
          <View className="h-6 bg-gray-200 rounded w-1/3 mt-2" />
          <View className="flex-row justify-between mt-3">
            <View className="h-4 bg-gray-200 rounded w-1/4" />
            <View className="h-4 bg-gray-200 rounded-full w-1/4" />
          </View>
        </View>
      </View>
    </View>
  ), []);
  
  // Main product listings section
  const renderProductListings = useCallback(() => {
    // Show loading state if first load and no products yet
    if (loading && (!feedProducts || feedProducts.length === 0)) {
      return (
        <View>
          {[1, 2, 3, 4].map(i => (
            <View key={`loading-${i}`}>
              {renderLoadingItem()}
            </View>
          ))}
        </View>
      );
    }
    
    // No products after filtering
    if (filteredProducts.length === 0) {
      return (
        <View className="items-center justify-center py-20 bg-gray-50 rounded-lg">
          <MaterialCommunityIcons name="paw" size={60} color="#D1D5DB" />
          <Text className="text-gray-500 mt-4 text-center">
            No products found matching your search.
          </Text>
        </View>
      );
    }
    
    // Show filtered products
    return (
      <FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id.toString()}
        scrollEnabled={false} // Prevent scrolling within FlatList since parent ScrollView handles it
        removeClippedSubviews={false} // Important for performance
        initialNumToRender={4} // Only render what's visible initially
        maxToRenderPerBatch={8} // Limit batch size for smoother rendering
        windowSize={5} // Controls how many items are rendered outside the visible area
      />
    );
  }, [loading, feedProducts, filteredProducts, renderProductItem, renderLoadingItem]);
  
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
              ) : null}
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
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#9333EA']} // Purple color for the refresh spinner
                tintColor="#9333EA"
              />
            }
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
              {renderProductListings()}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </>
  );
}

// Separate component for ProductItemCard to properly use hooks
const ProductItemCard = React.memo(({ 
  item,
  onPress,
  getCategoryIcon
}: { 
  item: ProductItem; 
  onPress: (id: string) => void;
  getCategoryIcon: (category: string) => CategoryIconName;
}) => {
  // Track if avatar failed to load
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  
  // Get avatar URL or use robohash as fallback
  const avatarUrl = item.sellerData?.avatar ? formatImageUrl(item.sellerData.avatar) : null;
  const username = item.sellerData?.username || 'User';
  const firstLetter = username.charAt(0).toUpperCase();
  const robohashUrl = `https://robohash.org/${item.sellerData?.id || item.id}?set=set4`;
  
  return (
    <TouchableOpacity 
      className="bg-white rounded-xl shadow-md overflow-hidden mb-3 border border-gray-50"
      style={{
        shadowColor: "#9333EA",
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
      activeOpacity={0.9}
      onPress={() => onPress(item.id)}
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
            {/* Seller info with enhanced visuals and improved avatar handling */}
            {item.sellerData && (
              <View className="flex-row items-center bg-gray-50 px-1.5 py-0.5 rounded-full">
                {avatarUrl && !avatarLoadFailed ? (
                  <View className="w-5 h-5 rounded-full overflow-hidden border border-purple-200">
                    <Image 
                      source={{ uri: avatarUrl || robohashUrl }}
                      className="w-full h-full"
                      style={{ resizeMode: 'cover' }}
                      onError={() => setAvatarLoadFailed(true)}
                    />
                  </View>
                ) : (
                  <View className="w-5 h-5 rounded-full overflow-hidden border border-purple-200">
                    <Image
                      source={{ uri: robohashUrl }}
                      className="w-full h-full"
                      style={{ resizeMode: 'cover' }}
                    />
                  </View>
                )}
                <Text className="text-xs text-gray-600 ml-1.5 font-medium">{username}</Text>
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
});