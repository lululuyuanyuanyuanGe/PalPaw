// app/market.tsx - Redesigned Market Screen with unified vertical product listings
import React, { useState } from 'react';
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
import { Stack } from 'expo-router';
import Constants from 'expo-constants';

// Define types
type ProductItem = {
  id: number;
  name: string;
  description: string;
  price: number;
  rating: number;
  image: string;
  category: string;
  discount?: number;
  isNew?: boolean;
};

type CategoryIconName = 'paw' | 'food-variant' | 'toy-brick' | 'bed' | 'tshirt-crew' | 
                       'medical-bag' | 'content-cut' | 'whistle' | 'bag-suitcase' | 'dog-side';

type Category = {
  id: number;
  name: string;
  icon: CategoryIconName;
  color: string;
};

// Define market screen component
export default function MarketScreen() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Mock data for pet products - combined list
  const products: ProductItem[] = [
    {
      id: 1,
      name: 'Premium Dog Food',
      description: 'High-quality nutrition for your furry friend',
      price: 29.99,
      rating: 4.8,
      image: 'https://picsum.photos/200',
      category: 'Pet Food',
      discount: 15
    },
    {
      id: 2,
      name: 'Cat Tree Tower',
      description: 'Multi-level cat condo with scratching posts',
      price: 49.99,
      rating: 4.6,
      image: 'https://picsum.photos/201',
      category: 'Pet Beds',
      isNew: true
    },
    {
      id: 3,
      name: 'Bird Cage Deluxe',
      description: 'Spacious and stylish home for your feathered companion',
      price: 75.99,
      rating: 4.7,
      image: 'https://picsum.photos/202',
      category: 'Accessories'
    },
    {
      id: 4,
      name: 'Hamster Exercise Wheel',
      description: 'Silent spinner for happy rodents',
      price: 12.99,
      rating: 4.5,
      image: 'https://picsum.photos/203',
      category: 'Pet Toys',
      discount: 10
    },
    {
      id: 5,
      name: 'Fish Tank Filter',
      description: 'Advanced filtration for crystal clear water',
      price: 24.99,
      rating: 4.3,
      image: 'https://picsum.photos/204',
      category: 'Health & Wellness'
    },
    {
      id: 6,
      name: 'Cozy Pet Bed',
      description: 'Ultra-soft sleeping space for dogs and cats',
      price: 34.99,
      rating: 4.9,
      image: 'https://picsum.photos/205',
      category: 'Pet Beds',
      discount: 20
    },
    {
      id: 7,
      name: 'Interactive Dog Toy',
      description: 'Mental stimulation for intelligent pups',
      price: 18.99,
      rating: 4.7,
      image: 'https://picsum.photos/206',
      category: 'Pet Toys',
      isNew: true
    },
    {
      id: 8,
      name: 'Cat Scratching Post',
      description: 'Save your furniture with this sisal-wrapped post',
      price: 22.50,
      rating: 4.6,
      image: 'https://picsum.photos/207',
      category: 'Pet Beds'
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

  // Categories for products
  const categories: Category[] = [
    { id: 0, name: 'All', icon: 'paw', color: '#9333EA' },
    { id: 1, name: 'Pet Food', icon: 'food-variant', color: getCategoryColor('Pet Food') },
    { id: 2, name: 'Pet Toys', icon: 'toy-brick', color: getCategoryColor('Pet Toys') },
    { id: 3, name: 'Pet Beds', icon: 'bed', color: getCategoryColor('Pet Beds') },
    { id: 4, name: 'Pet Clothing', icon: 'tshirt-crew', color: getCategoryColor('Pet Clothing') },
    { id: 5, name: 'Health & Wellness', icon: 'medical-bag', color: getCategoryColor('Health & Wellness') },
    { id: 6, name: 'Grooming', icon: 'content-cut', color: getCategoryColor('Grooming') },
    { id: 7, name: 'Training', icon: 'whistle', color: getCategoryColor('Training') },
    { id: 8, name: 'Carriers & Travel', icon: 'bag-suitcase', color: getCategoryColor('Carriers & Travel') },
    { id: 9, name: 'Accessories', icon: 'dog-side', color: getCategoryColor('Accessories') }
  ];
  
  // Filter products based on search query and selected category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Render product item
  const renderProductItem = ({ item }: { item: ProductItem }) => (
    <TouchableOpacity 
      className="bg-white rounded-xl shadow-sm overflow-hidden border border-pink-50 mb-4"
      activeOpacity={0.9}
    >
      <View className="flex-row">
        <View className="relative">
          <Image 
            source={{ uri: item.image }} 
            className="w-28 h-28"
            style={{ resizeMode: 'cover' }}
          />
          {item.discount && (
            <View className="absolute top-2 left-2 bg-pink-500 rounded-full px-2 py-0.5">
              <Text className="text-white text-xs font-bold">{item.discount}% OFF</Text>
            </View>
          )}
          {item.isNew && (
            <View className="absolute top-2 left-2 bg-teal-500 rounded-full px-2 py-0.5">
              <Text className="text-white text-xs font-bold">NEW</Text>
            </View>
          )}
        </View>
        
        <View className="flex-1 p-3 justify-between">
          <View>
            <Text className="font-medium text-gray-800 text-base">{item.name}</Text>
            <Text className="text-xs text-gray-500 mt-1" numberOfLines={2}>{item.description}</Text>
            
            <View className="flex-row items-center mt-1 gap-1">
              <FontAwesome name="star" size={12} color="#FBBF24" />
              <Text className="text-xs text-gray-600">{item.rating}</Text>
              
              <View className="ml-2 px-2 py-0.5 bg-purple-100 rounded-full">
                <Text className="text-xs text-purple-700">{item.category}</Text>
              </View>
            </View>
          </View>
          
          <View className="flex-row justify-between items-center mt-2">
            <Text className="font-bold text-purple-600">${item.price.toFixed(2)}</Text>
            <TouchableOpacity className="bg-purple-600 px-3 py-1.5 rounded-full">
              <Text className="text-white text-xs font-medium">View Details</Text>
            </TouchableOpacity>
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
          {/* Fixed Header - Always stays at the top */}
          <View className="bg-purple-500 px-4 shadow-md z-10">
            {/* Title */}
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white text-xl font-bold">PalPaw Market</Text>
            </View>
            
            {/* Search Bar */}
            <View className="relative mb-4">
              <View className="absolute left-3 top-0 bottom-0 justify-center z-10">
                <Feather name="search" size={18} color="#9CA3AF" />
              </View>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="bg-white py-3 pl-10 pr-10 rounded-full w-full"
                placeholder="Search for pet products..."
              />
              {searchQuery ? (
                <TouchableOpacity
                  onPress={clearSearchQuery}
                  className="absolute right-3 top-0 bottom-0 justify-center z-10"
                >
                  <Feather name="x" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
          
          {/* Pink Border Line */}
          <View className="h-1 bg-pink-500 w-full" />
          
          {/* Scrollable Content Area */}
          <ScrollView 
            className="flex-1 bg-blue-50"
            showsVerticalScrollIndicator={false}
          >
            {/* Categories */}
            <View className="px-4 pt-4">
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                className="pb-2"
              >
                {categories.map(category => (
                  <TouchableOpacity 
                    key={category.id} 
                    className="flex-none mr-3 items-center"
                    onPress={() => setSelectedCategory(category.name)}
                  >
                    <View className="w-16 h-16 rounded-full items-center justify-center shadow-sm"
                      style={{
                        backgroundColor: selectedCategory === category.name 
                          ? `${category.color}15` // 15 is hex for 8% opacity
                          : '#F9F5FF', // Light purple background for all icons
                        borderWidth: 1,
                        borderColor: selectedCategory === category.name 
                          ? category.color 
                          : '#F3E8FF' // Light border
                      }}
                    >
                      <MaterialCommunityIcons 
                        name={category.icon} 
                        size={28}
                        color={category.color}
                      />
                    </View>
                    <Text className={`text-xs mt-1 ${
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
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            {/* Product Listings */}
            <View className="px-4 pt-4 pb-20">
              {filteredProducts.length === 0 ? (
                <View className="items-center justify-center py-20">
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