// app/market.tsx - Market Screen with Pet Supplies and Pets tabs
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
  SafeAreaView,
  Platform
} from 'react-native';
import { 
  Feather, 
  MaterialCommunityIcons,
  FontAwesome,
  Ionicons 
} from '@expo/vector-icons';
import { Stack } from 'expo-router';
import Constants from 'expo-constants';

// Define types
type SupplyItem = {
  id: number;
  name: string;
  price: number;
  rating: number;
  image: string;
  discount?: number;
};

type PetItem = {
  id: number;
  name: string;
  breed: string;
  age: string;
  price: number;
  image: string;
  distance: string;
};

type Category = {
  id: number;
  name: string;
  icon: string;
};

// Define market screen component
export default function MarketScreen() {
  const [activeTab, setActiveTab] = useState<'supplies' | 'pets'>('supplies');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Mock data for pet supplies
  const petSupplies: SupplyItem[] = [
    {
      id: 1,
      name: 'Premium Dog Food',
      price: 29.99,
      rating: 4.8,
      image: 'https://picsum.photos/200',
      discount: 15
    },
    {
      id: 2,
      name: 'Cat Tree Tower',
      price: 49.99,
      rating: 4.6,
      image: 'https://picsum.photos/201'
    },
    {
      id: 3,
      name: 'Bird Cage Deluxe',
      price: 75.99,
      rating: 4.7,
      image: 'https://picsum.photos/202'
    },
    {
      id: 4,
      name: 'Hamster Exercise Wheel',
      price: 12.99,
      rating: 4.5,
      image: 'https://picsum.photos/203',
      discount: 10
    },
    {
      id: 5,
      name: 'Fish Tank Filter',
      price: 24.99,
      rating: 4.3,
      image: 'https://picsum.photos/204'
    },
    {
      id: 6,
      name: 'Cozy Pet Bed',
      price: 34.99,
      rating: 4.9,
      image: 'https://picsum.photos/205',
      discount: 20
    }
  ];
  
  // Mock data for pets
  const pets: PetItem[] = [
    {
      id: 1,
      name: 'Max',
      breed: 'Golden Retriever',
      age: '2 years',
      price: 800,
      image: 'https://picsum.photos/206',
      distance: '1.2 mi'
    },
    {
      id: 2,
      name: 'Luna',
      breed: 'Siamese Cat',
      age: '1 year',
      price: 500,
      image: 'https://picsum.photos/207',
      distance: '0.5 mi'
    },
    {
      id: 3,
      name: 'Charlie',
      breed: 'Cockatiel',
      age: '8 months',
      price: 150,
      image: 'https://picsum.photos/208',
      distance: '3.7 mi'
    },
    {
      id: 4,
      name: 'Bella',
      breed: 'Holland Lop Rabbit',
      age: '4 months',
      price: 120,
      image: 'https://picsum.photos/209',
      distance: '2.1 mi'
    },
    {
      id: 5,
      name: 'Rocky',
      breed: 'French Bulldog',
      age: '1.5 years',
      price: 1200,
      image: 'https://picsum.photos/210',
      distance: '4.3 mi'
    }
  ];
  
  const clearSearchQuery = () => {
    setSearchQuery('');
  };

  // Categories for pet supplies
  const supplyCategories: Category[] = [
    { id: 1, name: 'Food', icon: '🍖' },
    { id: 2, name: 'Toys', icon: '🧸' },
    { id: 3, name: 'Beds', icon: '🛏️' },
    { id: 4, name: 'Grooming', icon: '✂️' },
    { id: 5, name: 'Clothing', icon: '👕' },
    { id: 6, name: 'Health', icon: '💊' }
  ];
  
  // Categories for pets
  const petCategories: Category[] = [
    { id: 1, name: 'Dogs', icon: '🐕' },
    { id: 2, name: 'Cats', icon: '🐈' },
    { id: 3, name: 'Birds', icon: '🦜' },
    { id: 4, name: 'Fish', icon: '🐠' },
    { id: 5, name: 'Small Pets', icon: '🐹' },
    { id: 6, name: 'Reptiles', icon: '🦎' }
  ];
  
  // Display categories based on active tab
  const displayCategories = activeTab === 'supplies' ? supplyCategories : petCategories;

  // Render supply item - now with width set for 2 items per row
  const renderSupplyItem = ({ item }: { item: SupplyItem }) => (
    <View className="bg-white rounded-xl shadow-sm overflow-hidden border border-pink-50 w-[48%] mb-4">
      <View className="relative">
        <Image 
          source={{ uri: item.image }} 
          className="w-full h-32"
          style={{ resizeMode: 'cover' }}
        />
        {item.discount && (
          <View className="absolute top-2 left-2 bg-pink-500 rounded-full px-2 py-0.5">
            <Text className="text-white text-xs font-bold">{item.discount}% OFF</Text>
          </View>
        )}
      </View>
      <View className="p-3">
        <Text className="font-medium text-gray-800 text-sm">{item.name}</Text>
        <View className="flex-row items-center mt-1">
          <FontAwesome name="star" size={12} color="#FBBF24" />
          <Text className="text-xs text-gray-600 ml-1">{item.rating}</Text>
        </View>
        <View className="mt-2 flex-row justify-between items-center">
          <Text className="font-bold text-purple-600">${item.price.toFixed(2)}</Text>
          <TouchableOpacity className="bg-purple-100 p-1.5 rounded-full">
            <Feather name="shopping-bag" size={16} color="#9333EA" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Render pet item
  const renderPetItem = ({ item }: { item: PetItem }) => (
    <View className="bg-white rounded-xl shadow-sm overflow-hidden border border-pink-50 w-full mb-3">
      <View className="relative">
        <Image 
          source={{ uri: item.image }} 
          className="w-full h-32"
          style={{ resizeMode: 'cover' }}
        />
        <View className="absolute bottom-2 right-2 bg-white bg-opacity-80 rounded-full px-2 py-0.5">
          <Text className="text-xs font-medium">{item.distance}</Text>
        </View>
      </View>
      <View className="p-3">
        <View className="flex-row justify-between">
          <Text className="font-medium text-gray-800">{item.name}</Text>
          <View className="bg-purple-100 px-2 py-0.5 rounded-full">
            <Text className="text-xs text-purple-600">{item.age}</Text>
          </View>
        </View>
        <Text className="text-xs text-gray-500 mt-1">{item.breed}</Text>
        <View className="mt-2 flex-row justify-between items-center">
          <Text className="font-bold text-purple-600">${item.price}</Text>
          <TouchableOpacity className="bg-purple-100 px-2 py-1 rounded-full">
            <Text className="text-purple-600 text-xs font-medium">View</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
            {/* Title and Cart Icon */}
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white text-xl font-bold">PalPaw Market</Text>
              <View className="relative">
                <View className="h-10 w-10 bg-white rounded-full items-center justify-center flex-row">
                  <Feather name="shopping-bag" size={20} color="#A855F7" />
                </View>
                <View className="absolute -top-1 -right-1 h-5 w-5 bg-pink-500 rounded-full items-center justify-center">
                  <Text className="text-white text-xs">3</Text>
                </View>
              </View>
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
                placeholder={activeTab === 'supplies' ? "Search for pet supplies..." : "Search for pets..."}
              />
              {searchQuery ? (
                <TouchableOpacity
                  onPress={clearSearchQuery}
                  className="absolute right-12 top-0 bottom-0 justify-center z-10"
                >
                  <Feather name="x" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity className="absolute right-3 top-0 bottom-0 justify-center z-10">
                <Feather name="filter" size={18} color="#A855F7" />
              </TouchableOpacity>
            </View>
            
            {/* Sub Tabs */}
            <View className="flex-row bg-purple-400 rounded-full p-1 mb-4">
              <TouchableOpacity 
                onPress={() => setActiveTab('supplies')}
                className={`flex-1 py-2 rounded-full flex-row items-center justify-center ${
                  activeTab === 'supplies' 
                    ? 'bg-white' 
                    : ''
                }`}
              >
                <Feather 
                  name="shopping-bag" 
                  size={16} 
                  color={activeTab === 'supplies' ? '#9333EA' : '#fff'} 
                />
                <Text 
                  className={`ml-1 ${
                    activeTab === 'supplies' 
                      ? 'text-purple-600 font-medium' 
                      : 'text-white'
                  }`}
                >
                  Supplies
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setActiveTab('pets')}
                className={`flex-1 py-2 rounded-full flex-row items-center justify-center ${
                  activeTab === 'pets' 
                    ? 'bg-white' 
                    : ''
                }`}
              >
                <MaterialCommunityIcons 
                  name="paw" 
                  size={16} 
                  color={activeTab === 'pets' ? '#9333EA' : '#fff'} 
                />
                <Text 
                  className={`ml-1 ${
                    activeTab === 'pets' 
                      ? 'text-purple-600 font-medium' 
                      : 'text-white'
                  }`}
                >
                  Pets
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Scrollable Content Area - Categories and products */}
          <ScrollView 
            className="flex-1 bg-blue-50"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {/* Pink Border Line - Part of scrollable content */}
            <View className="h-1 bg-pink-500 w-full" />
            
            {/* Categories */}
            <View className="px-4 pt-4">
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                className="pb-2"
                nestedScrollEnabled={true}
              >
                {displayCategories.map(category => (
                  <TouchableOpacity 
                    key={category.id} 
                    className="flex-none mr-3 items-center"
                  >
                    <View className="w-16 h-16 bg-white rounded-full items-center justify-center shadow-sm border border-pink-100">
                      <Text className="text-2xl">{category.icon}</Text>
                    </View>
                    <Text className="text-xs font-medium mt-1 text-gray-700">{category.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            {/* Product Listings */}
            <View className="px-4 pt-4 pb-20">
              <Text className="text-lg font-bold text-gray-800 mb-3">
                {activeTab === 'supplies' ? 'Popular Supplies' : 'Pets Near You'}
              </Text>
              
              {/* Supply items or Pets list - Using original FlatList components */}
              {activeTab === 'supplies' ? (
                <FlatList
                  key="supplies-grid"
                  data={petSupplies}
                  renderItem={renderSupplyItem}
                  keyExtractor={(item) => item.id.toString()}
                  numColumns={2}
                  columnWrapperStyle={{ 
                    justifyContent: 'space-between',
                    marginHorizontal: 2,
                  }}
                  contentContainerStyle={{
                    paddingBottom: 20,
                  }}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false} // Prevent scrolling within FlatList since parent ScrollView handles it
                  nestedScrollEnabled={true}
                />
              ) : (
                <FlatList
                  key="pets-list"
                  data={pets}
                  renderItem={renderPetItem}
                  keyExtractor={(item) => item.id.toString()}
                  numColumns={1}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false} // Prevent scrolling within FlatList since parent ScrollView handles it
                  nestedScrollEnabled={true}
                />
              )}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </>
  );
}