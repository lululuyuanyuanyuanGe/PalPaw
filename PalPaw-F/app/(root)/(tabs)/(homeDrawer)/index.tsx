import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar, 
  Dimensions,
  Platform,
  PixelRatio
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

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
  
  // iOS-specific styles
  const iosCardStyle = Platform.OS === 'ios' ? {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  } : {};
  
  // iOS-specific image container style
  const iosImageContainerStyle = Platform.OS === 'ios' ? {
    overflow: 'hidden' as const, // Type assertion to fix TypeScript error
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  } : {};
  
  return (
    <View 
      className="bg-white rounded-lg mb-3 w-full" 
      style={[{ width: cardWidth }, iosCardStyle]}
    >
      <View style={iosImageContainerStyle}>
        <Image 
          source={data.image} 
          style={{
            width: cardWidth,
            height: imageHeight,
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
          }}
          resizeMode="cover" 
        />
      </View>
      <View className="p-2">
        <Text className="text-gray-800 font-medium text-sm" numberOfLines={2}>
          {data.title}
        </Text>
        {data.subtitle && (
          <Text className="text-gray-600 text-xs" numberOfLines={1}>
            {data.subtitle}
          </Text>
        )}
        <View className="flex-row items-center justify-between mt-2">
          <View className="flex-row items-center">
            <Image 
              source={data.author.avatar} 
              style={{
                width: 20,
                height: 20,
                borderRadius: 10
              }}
            />
            <Text className="ml-1 text-gray-600 text-xs">{data.author.name}</Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="heart-outline" size={14} color="#FF2442" />
            <Text className="ml-1 text-gray-500 text-xs">{data.likes}</Text>
          </View>
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

  // Platform-specific styling adjustments
  const navBarPadding = {
    paddingTop: Platform.OS === 'ios' ? Math.max(insets.top, 44) : insets.top,
    paddingBottom: 10,
    paddingHorizontal: 16
  };
  
  // Bottom padding to account for home indicator on iOS
  const scrollViewBottomPadding = Platform.OS === 'ios' ? Math.max(insets.bottom, 20) : 5;

  // iOS-specific layout adjustments
  const iosTabStyle = (isActive: boolean) => Platform.OS === 'ios' ? {
    paddingBottom: 8,
    paddingHorizontal: 4,
  } : {};
  
  return (
    <View className="flex-1 bg-gray-100">
      {/* Use consistent StatusBar approach */}
      <StatusBar 
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={true}
      />
      
      {/* Top navigation bar */}
      <View 
        className="flex-row items-center border-b border-gray-200 bg-white"
        style={navBarPadding}
      >
        {/* Drawer Menu Icon - Left Side */}
        <View className="flex-1 items-start">
          <DrawerToggleButton tintColor="#333" />
        </View>

        {/* Centered tabs with platform-specific styling */}
        <View className="flex-row items-center gap-3">
          <TouchableOpacity 
            onPress={() => setActiveTab('follow')}
            style={iosTabStyle(activeTab === 'follow')}
          >
            <Text 
              className={`font-medium ${activeTab === 'follow' ? 'text-black' : 'text-gray-400'}`}
              style={Platform.OS === 'ios' ? { fontSize: 15 } : {}}
            >
              followed
            </Text>
            {activeTab === 'follow' && (
              <View 
                className="h-1 bg-red-500 rounded-full mt-1 self-center" 
                style={{ width: Platform.OS === 'ios' ? 16 : 16 }}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setActiveTab('explore')}
            style={iosTabStyle(activeTab === 'explore')}
          >
            <Text 
              className={`font-medium ${activeTab === 'explore' ? 'text-black' : 'text-gray-400'}`}
              style={Platform.OS === 'ios' ? { fontSize: 15 } : {}}
            >
              Discovery
            </Text>
            {activeTab === 'explore' && (
              <View 
                className="h-1 bg-red-500 rounded-full mt-1 self-center" 
                style={{ width: Platform.OS === 'ios' ? 16 : 16 }}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Search Icon - Right Side */}
        <View className="flex-1 items-end">
          <TouchableOpacity onPress={() => router.push("/searchPosts")}>
            <Ionicons name="search-outline" size={22} color="#333" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Content area - Waterfall layout with platform-specific padding */}
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ 
          paddingBottom: scrollViewBottomPadding,
          paddingTop: Platform.OS === 'ios' ? 10 : 8,
          paddingHorizontal: Platform.OS === 'ios' ? 6 : 4
        }}
      >
        <View 
          className="flex-row"
          style={{ 
            gap: Platform.OS === 'ios' ? 8 : 4 
          }}
        >
          {/* Left column with platform-specific styling */}
          <View 
            style={{ 
              width: '50%',
              paddingLeft: Platform.OS === 'ios' ? 2 : 1,
              paddingRight: Platform.OS === 'ios' ? 2 : 1 
            }}
          >
            {leftColumnCards.map((card) => (
              <Card key={card.id} data={card} />
            ))}
          </View>
          
          {/* Right column with platform-specific styling */}
          <View 
            style={{ 
              width: '50%',
              paddingLeft: Platform.OS === 'ios' ? 2 : 1,
              paddingRight: Platform.OS === 'ios' ? 2 : 1
            }}
          >
            {rightColumnCards.map((card) => (
              <Card key={card.id} data={card} />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default HomeScreen;