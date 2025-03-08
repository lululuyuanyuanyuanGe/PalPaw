import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar, 
  Dimensions
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

// 定义卡片数据接口
interface CardData {
  id: string;
  image: any;
  title: string;
  subtitle?: string;
  author: {
    name: string;
    avatar: any;
  };
  height?: number;
  likes?: number;
}

// 卡片数据
const cardsData: CardData[] = [
  {
    id: '1',
    image: require('../../../../assets/images/cat1.jpg'),
    title: 'Morning Walk with Max',
    author: {
      name: 'Yining',
      avatar: require('../../../../assets/images/cat1.jpg'),
    },
    height: 140,
    likes: 328,
  },
  {
    id: '2',
    image:require('../../../../assets/images/cat1.jpg'),
    title: 'Help animals affected by...',
    subtitle: 'World Animal Protection',
    author: {
      name: 'World Animal Protection',
      avatar:require('../../../../assets/images/cat1.jpg'),
    },
    height: 120,
    likes: 456,
  },
  {
    id: '3',
    image:require('../../../../assets/images/cat1.jpg'),
    title: "Luna's Favorite Fetch Time!",
    author: {
      name: 'Kevin',
      avatar:require('../../../../assets/images/cat1.jpg'),
    },
    height: 120,
    likes: 221,
  },
  {
    id: '4',
    image:require('../../../../assets/images/cat1.jpg'),
    title: "Mittens' Cozy Caturday Vibes",
    author: {
      name: 'Luyuan',
      avatar:require('../../../../assets/images/cat1.jpg'),
    },
    height: 150,
    likes: 189,
  },
  {
    id: '5',
    image:require('../../../../assets/images/cat1.jpg'),
    title: "Weekend with Whiskers",
    author: {
      name: 'Minjie',
      avatar:require('../../../../assets/images/cat1.jpg'),
    },
    height: 160,
    likes: 412,
  },
  {
    id: '6',
    image:require('../../../../assets/images/cat1.jpg'),
    title: "Playtime with Peanut",
    author: {
      name: 'Emma',
      avatar:require('../../../../assets/images/cat1.jpg'),
    },
    height: 130,
    likes: 275,
  },
];

// 卡片组件 - 小红书风格
const Card = ({ data }: { data: CardData }) => {
  return (
    <View className="bg-white rounded-lg overflow-hidden mb-3 w-full shadow-sm">
      <View className="w-full">
        <Image 
          source={data.image} 
          className="w-full rounded-t-lg"
          style={{ height: data.height || 136 }}
          resizeMode="cover" 
        />
      </View>
      <View className="p-2">
        <Text className="text-gray-800 font-medium text-sm" numberOfLines={2}>
          {data.title}
        </Text>
        <View className="flex-row items-center justify-between mt-2">
          <View className="flex-row items-center">
            <Image 
              source={data.author.avatar} 
              className="w-5 h-5 rounded-full" 
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
    
    // 为左右列创建不同的数组以便瀑布流布局
    const leftColumnCards = cardsData.filter((_, index) => index % 2 === 0);
    const rightColumnCards = cardsData.filter((_, index) => index % 2 === 1);
  
    return (
      <View className="flex-1 bg-gray-100">
        <StatusBar barStyle="dark-content" />
        
        {/* 顶部导航栏 - 小红书风格 */}
    <View 
      className="flex-row items-center border-b border-gray-200 bg-white"
      style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16 }}
    >
      {/* Drawer Menu Icon - Left Side */}
      <View className="flex-1 items-start">
        <DrawerToggleButton tintColor="#333" />
      </View>

      {/* "关注" & "发现" - Centered with Small Gap */}
      <View className="flex-row items-center gap-3">
        <TouchableOpacity onPress={() => setActiveTab('follow')}>
          <Text className={`font-medium ${activeTab === 'follow' ? 'text-black' : 'text-gray-400'}`}>
            followed
          </Text>
          {activeTab === 'follow' && (
            <View className="h-1 bg-red-500 rounded-full mt-1 w-4 self-center" />
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setActiveTab('explore')}>
          <Text className={`font-medium ${activeTab === 'explore' ? 'text-black' : 'text-gray-400'}`}>
            Discovery
          </Text>
          {activeTab === 'explore' && (
            <View className="h-1 bg-red-500 rounded-full mt-1 w-4 self-center" />
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
        
        {/* 内容区域 - 瀑布流布局 */}
        <ScrollView className="flex-1">
          <View className="flex-row px-2 pt-2">
            {/* 左列 */}
            <View className="w-1/2 px-1">
              {leftColumnCards.map((card) => (
                <Card key={card.id} data={card} />
              ))}
            </View>
            
            {/* 右列 */}
            <View className="w-1/2 px-1">
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