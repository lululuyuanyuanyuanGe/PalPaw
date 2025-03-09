import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar, 
  Dimensions,
  Platform,
  PixelRatio,
  SafeAreaView,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

// Define card data interface
interface CardData {
  id: string;
  image: any;
  title: string;
  subtitle?: string;
  author: {
    name: string;
    avatar: any;
  };
  aspectRatio?: number; // Using aspectRatio instead of fixed height
  likes?: number;
}

// Card data with aspectRatio instead of height
const cardsData: CardData[] = [
  {
    id: '1',
    image: require('../../../../assets/images/cat1.jpg'),
    title: 'Morning Walk with Max',
    author: {
      name: 'Yining',
      avatar: require('../../../../assets/images/cat1.jpg'),
    },
    aspectRatio: 1.2, // Width:Height ratio
    likes: 328,
  },
  {
    id: '2',
    image: require('../../../../assets/images/cat1.jpg'),
    title: 'Help animals affected by...',
    subtitle: 'World Animal Protection',
    author: {
      name: 'World Animal Protection',
      avatar: require('../../../../assets/images/cat1.jpg'),
    },
    aspectRatio: 1.4,
    likes: 456,
  },
  {
    id: '3',
    image: require('../../../../assets/images/cat1.jpg'),
    title: "Luna's Favorite Fetch Time!",
    author: {
      name: 'Kevin',
      avatar: require('../../../../assets/images/cat1.jpg'),
    },
    aspectRatio: 1.4,
    likes: 221,
  },
  {
    id: '4',
    image: require('../../../../assets/images/cat1.jpg'),
    title: "Mittens' Cozy Caturday Vibes",
    author: {
      name: 'Luyuan',
      avatar: require('../../../../assets/images/cat1.jpg'),
    },
    aspectRatio: 1.0,
    likes: 189,
  },
  {
    id: '5',
    image: require('../../../../assets/images/cat1.jpg'),
    title: "Weekend with Whiskers",
    author: {
      name: 'Minjie',
      avatar: require('../../../../assets/images/cat1.jpg'),
    },
    aspectRatio: 1.0,
    likes: 412,
  },
  {
    id: '6',
    image: require('../../../../assets/images/cat1.jpg'),
    title: "Playtime with Peanut",
    author: {
      name: 'Emma',
      avatar: require('../../../../assets/images/cat1.jpg'),
    },
    aspectRatio: 1.2,
    likes: 275,
  },
];

// Get screen dimensions for responsive sizing and account for pixel density
const { width: screenWidth } = Dimensions.get('window');
const pixelDensity = PixelRatio.get();
// Adjust card width based on platform - iOS needs slightly different calculations
const cardWidth = Platform.OS === 'ios' 
  ? (screenWidth / 2) - 14 
  : (screenWidth / 2) - 12;

// Card component with platform-specific rendering
const Card = ({ data }: { data: CardData }) => {
  // Calculate appropriate height based on aspectRatio
  const imageHeight = cardWidth / (data.aspectRatio || 1.2);
  
  return (
    <View className="bg-white rounded-xl shadow-sm overflow-hidden border border-pink-50 w-full mb-3">
      <View className="relative">
        <Image 
          source={data.image} 
          style={{
            width: cardWidth,
            height: imageHeight,
          }}
          className="w-full"
          resizeMode="cover" 
        />
        <View className="absolute bottom-2 right-2 bg-white bg-opacity-80 rounded-full px-2 py-0.5">
          <View className="flex-row items-center">
            <Ionicons name="heart" size={12} color="#FF2442" />
            <Text className="ml-1 text-xs font-medium">{data.likes}</Text>
          </View>
        </View>
      </View>
      <View className="p-3">
        <Text className="font-medium text-gray-800 text-sm" numberOfLines={2}>
          {data.title}
        </Text>
        {data.subtitle && (
          <Text className="text-xs text-gray-500 mt-1" numberOfLines={1}>
            {data.subtitle}
          </Text>
        )}
        <View className="mt-2 flex-row justify-between items-center">
          <View className="flex-row items-center">
            <Image 
              source={data.author.avatar} 
              style={{
                width: 20,
                height: 20,
                borderRadius: 10
              }}
            />
            <Text className="ml-1 text-xs text-gray-600">{data.author.name}</Text>
          </View>
          <TouchableOpacity className="bg-purple-100 px-2 py-1 rounded-full">
            <Text className="text-purple-600 text-xs font-medium">View</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const HomeScreen = () => {
  const [activeTab, setActiveTab] = useState('explore');
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  
  // Handle device rotation or dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener(
      'change',
      ({ window }) => {
        setDimensions(window);
      }
    );
    return () => subscription.remove();
  }, []);
  
  // Split cards into left and right columns for waterfall layout
  const leftColumnCards = cardsData.filter((_, index) => index % 2 === 0);
  const rightColumnCards = cardsData.filter((_, index) => index % 2 === 1);

  // iOS-specific tab style
  const iosTabStyle = (isActive: boolean) => Platform.OS === 'ios' ? {
    paddingBottom: 8,
    paddingHorizontal: 4,
  } : {};
  
  return (
    <>
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
          <View className="bg-purple-500 px-4 py-2 shadow-md z-10">
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center">
                <DrawerToggleButton tintColor="#fff" />
                <Text className="text-white text-xl font-bold ml-2">PalPaw</Text>
              </View>
              <TouchableOpacity onPress={() => router.push("/searchPosts")}>
                <View className="h-10 w-10 bg-white rounded-full items-center justify-center">
                  <Feather name="search" size={20} color="#A855F7" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Scrollable Content - Tabs and content scroll together */}
          <ScrollView 
            className="flex-1 bg-blue-50"
            showsVerticalScrollIndicator={false}
          >
            {/* Tab Bar */}
            <View className="bg-purple-500 px-4 pb-4 border-b-4 border-pink-500">
              <View className="flex-row bg-purple-400 rounded-full p-1 mx-4">
                <TouchableOpacity 
                  onPress={() => setActiveTab('follow')}
                  className={`flex-1 py-2 rounded-full flex-row items-center justify-center ${
                    activeTab === 'follow' 
                      ? 'bg-white' 
                      : ''
                  }`}
                >
                  <Feather 
                    name="users" 
                    size={16} 
                    color={activeTab === 'follow' ? '#9333EA' : '#fff'} 
                  />
                  <Text 
                    className={`ml-1 ${
                      activeTab === 'follow' 
                        ? 'text-purple-600 font-medium' 
                        : 'text-white'
                    }`}
                  >
                    Followed
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setActiveTab('explore')}
                  className={`flex-1 py-2 rounded-full flex-row items-center justify-center ${
                    activeTab === 'explore' 
                      ? 'bg-white' 
                      : ''
                  }`}
                >
                  <Feather 
                    name="compass" 
                    size={16} 
                    color={activeTab === 'explore' ? '#9333EA' : '#fff'} 
                  />
                  <Text 
                    className={`ml-1 ${
                      activeTab === 'explore' 
                        ? 'text-purple-600 font-medium' 
                        : 'text-white'
                    }`}
                  >
                    Discovery
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Main Content */}
            <View className="px-4 pt-4 pb-20">
              <Text className="text-lg font-bold text-gray-800 mb-3">
                {activeTab === 'follow' ? 'Latest from Friends' : 'Trending Posts'}
              </Text>
              
              <View className="flex-row justify-between">
                {/* Left column */}
                <View className="w-[48%]">
                  {leftColumnCards.map((card) => (
                    <Card key={card.id} data={card} />
                  ))}
                </View>
                
                {/* Right column */}
                <View className="w-[48%]">
                  {rightColumnCards.map((card) => (
                    <Card key={card.id} data={card} />
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </>
  );
};

export default HomeScreen;