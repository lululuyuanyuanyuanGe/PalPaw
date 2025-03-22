import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  ImageBackground,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  SafeAreaView,
  ScrollView,
  Platform,
} from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons, FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import cats from "@/constants/images";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { DrawerToggleButton } from "@react-navigation/drawer";
import { useNavigation } from "@react-navigation/native";

const user = {
  name: "Alfredo_Yu",
  id: "1234568",
  bio: "Hi there! I'm a proud pet parent of three adorable cats: Mochi, Luna, and Tiger! 🐱🐯🐾",
  avatar: require("../../../../assets/images/loginPic.jpg"),
  background: require("../../../../assets/images/japan.png"),
  stats: {
    posts: 47,
    followers: 328,
    following: 142,
    products: 15,
    sales: 89
  }
};

// Base item type with common properties
interface BaseItem {
  id: string;
  image: any;
  isButton?: boolean;
}

// Define post type
interface PostItem extends BaseItem {
  title: string;
  likes: number;
}

// Define new post button type
interface ButtonItem extends BaseItem {
  isButton: true;
  title: string;
  image: null;
}

// Define product type
interface ProductItem extends BaseItem {
  name: string;
  price: number;
  rating: number;
  sold: number;
}

// Define new product button type
interface ProductButtonItem extends BaseItem {
  isButton: true;
  name: string;
  image: null;
}

// Type guard functions
const isPostItem = (item: any): item is PostItem => {
  return 'title' in item && 'likes' in item;
};

const isProductItem = (item: any): item is ProductItem => {
  return 'name' in item && 'price' in item;
};

const isButtonItem = (item: any): item is ButtonItem | ProductButtonItem => {
  return item.isButton === true;
};

const posts: PostItem[] = [
  { id: "1", image: require("../../../../assets/images/cat1.jpg"), title: "Morning with Mochi", likes: 42 },
  { id: "2", image: require("../../../../assets/images/cat1.jpg"), title: "Luna in the Bag", likes: 28 },
  { id: "3", image: require("../../../../assets/images/cat2.jpg"), title: "Mochi's Show Time!", likes: 35 },
  { id: "4", image: require("../../../../assets/images/cat2.jpg"), title: "Tiger is here", likes: 31 },
  { id: "5", image: require("../../../../assets/images/cat3.jpg"), title: "Mochi's Nap", likes: 26 },
  { id: "6", image: require("../../../../assets/images/cat3.jpg"), title: "Tiger's Playtime", likes: 32 },
];

// Sample products for the store
const products: ProductItem[] = [
  { id: "p1", image: require("../../../../assets/images/cat1.jpg"), name: "Premium Cat Food", price: 29.99, rating: 4.8, sold: 124 },
  { id: "p2", image: require("../../../../assets/images/cat2.jpg"), name: "Cat Toy Bundle", price: 19.99, rating: 4.6, sold: 78 },
  { id: "p3", image: require("../../../../assets/images/cat3.jpg"), name: "Cozy Cat Bed", price: 39.99, rating: 4.9, sold: 56 },
  { id: "p4", image: require("../../../../assets/images/cat4.jpg"), name: "Cat Grooming Kit", price: 24.99, rating: 4.7, sold: 45 },
  { id: "p5", image: require("../../../../assets/images/cat1.jpg"), name: "Interactive Laser Toy", price: 14.99, rating: 4.5, sold: 92 },
  { id: "p6", image: require("../../../../assets/images/cat2.jpg"), name: "Automatic Cat Feeder", price: 49.99, rating: 4.4, sold: 38 },
];

const numColumns = 2;

// ** Get screen width for responsive sizing ** //
const screenWidth = Dimensions.get("window").width;
const itemSize = screenWidth / numColumns - 16;

// Create new post button item
const newPostButton: ButtonItem = { id: "newPost", isButton: true, title: "", image: null };

// Create new product button item
const newProductButton: ProductButtonItem = { id: "newProduct", isButton: true, name: "", image: null };

// Dynamically Add "Create New" Buttons at the End
const postsWithButton = [...posts, newPostButton];
const productsWithButton = [...products, newProductButton];

type ProfileTab = 'posts' | 'products';

const ProfileScreen = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  
  // Get status bar height for proper spacing
  const statusBarHeight = Constants.statusBarHeight || 0;
  
  const renderItem = ({ item }: { item: BaseItem }) => (
    <View style={{ width: itemSize, margin: 8 }}>
      {isButtonItem(item) ? (
        // "Create New" Button
        <TouchableOpacity 
          onPress={() => {
            if (activeTab === 'posts') {
              router.push("/(root)/(createPosts)/createPosts");
            } else {
              router.push("/(root)/(createProducts)/createProducts");
            }
          }}
          className="h-40 rounded-xl overflow-hidden"
        >
          <LinearGradient
            colors={['#9333EA', '#C084FC']}
            className="w-full h-full items-center justify-center"
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather name="plus" size={34} color="white" />
            <Text className="text-white font-medium mt-2">
              {activeTab === 'posts' ? 'New Post' : 'Add Product'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : isPostItem(item) ? (
        // Post Item
        <TouchableOpacity className="rounded-xl overflow-hidden shadow-sm bg-white border border-pink-50">
          <Image 
            source={item.image} 
            style={{ width: '100%', height: 150 }}
            resizeMode="cover"
          />
          <View className="p-2">
            <Text className="text-gray-800 font-medium" numberOfLines={1}>{item.title}</Text>
            <View className="flex-row items-center mt-1">
              <Ionicons name="heart" size={12} color="#FF2442" />
              <Text className="text-xs text-gray-500 ml-1">{item.likes}</Text>
            </View>
          </View>
        </TouchableOpacity>
      ) : isProductItem(item) ? (
        // Product Item
        <TouchableOpacity className="rounded-xl overflow-hidden shadow-sm bg-white border border-pink-50">
          <Image 
            source={item.image} 
            style={{ width: '100%', height: 150 }}
            resizeMode="cover"
          />
          <View className="absolute top-2 right-2 bg-purple-500 px-2 py-0.5 rounded-full">
            <Text className="text-white text-xs font-bold">${item.price}</Text>
          </View>
          <View className="p-2">
            <Text className="text-gray-800 font-medium" numberOfLines={1}>{item.name}</Text>
            <View className="flex-row items-center justify-between mt-1">
              <View className="flex-row items-center">
                <FontAwesome name="star" size={10} color="#FBBF24" />
                <Text className="text-xs text-gray-500 ml-1">{item.rating}</Text>
              </View>
              <Text className="text-xs text-gray-400">{item.sold} sold</Text>
            </View>
          </View>
        </TouchableOpacity>
      ) : (
        // Fallback
        <View />
      )}
    </View>
  );
  
  return (
    <SafeAreaView className="flex-1 bg-blue-50">
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      
      {/* Main Content */}
      <FlatList
        data={activeTab === 'posts' ? postsWithButton : productsWithButton}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        renderItem={renderItem}
        ListHeaderComponent={
          <View>
            {/* Background with Gradient Overlay */}
            <View className="w-full h-60 relative">
              <Image
                source={user.background}
                className="absolute top-0 left-0 w-full h-full"
                resizeMode="cover"
              />
              <LinearGradient
                colors={['rgba(147, 51, 234, 0.7)', 'rgba(192, 132, 252, 0.6)']}
                style={{ position: 'absolute', width: '100%', height: '100%' }}
              />
              
              {/* Menu Button - Using DrawerToggleButton */}
              <View 
                style={{ 
                  position: 'absolute',
                  top: statusBarHeight + 10,
                  left: 15,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  borderRadius: 20,
                  padding: 4
                }}
              >
                <DrawerToggleButton tintColor="#FFFFFF" />
              </View>
              
              {/* User Info Section */}
              <View className="absolute bottom-0 left-0 right-0 p-4">
                <View className="flex-row items-end">
                  <View className="shadow-xl">
                    <Image
                      source={user.avatar}
                      className="w-24 h-24 rounded-full border-4 border-white"
                      style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                      }}
                    />
                  </View>
                  <View className="ml-4 flex-1">
                    <Text className="text-xl font-bold text-white mb-1">{user.name}</Text>
                    <Text className="text-white text-opacity-80 text-sm">ID: {user.id}</Text>
                  </View>
                  <TouchableOpacity 
                    className="bg-purple-100 rounded-full p-2 mr-2"
                    onPress={() => {}}
                  >
                    <Feather name="edit-2" size={20} color="#9333EA" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            
            {/* Bio Section */}
            <View className="px-5 pt-3 pb-4">
              <Text className="text-gray-700 text-sm leading-tight">{user.bio}</Text>
            </View>
            
            {/* Stats Row */}
            <View className="flex-row justify-around px-5 py-4 border-t border-b border-purple-100 mb-4 bg-white">
              <View className="items-center">
                <Text className="text-purple-700 font-bold text-lg">{user.stats.posts}</Text>
                <Text className="text-gray-500 text-xs">Posts</Text>
              </View>
              <View className="items-center">
                <Text className="text-purple-700 font-bold text-lg">{user.stats.followers}</Text>
                <Text className="text-gray-500 text-xs">Followers</Text>
              </View>
              <View className="items-center">
                <Text className="text-purple-700 font-bold text-lg">{user.stats.following}</Text>
                <Text className="text-gray-500 text-xs">Following</Text>
              </View>
              <View className="items-center">
                <Text className="text-purple-700 font-bold text-lg">{user.stats.products}</Text>
                <Text className="text-gray-500 text-xs">Products</Text>
              </View>
            </View>
            
            {/* Tab Selector */}
            <View className="flex-row bg-white mb-4 border-b border-purple-100">
              <TouchableOpacity 
                className={`flex-1 py-3 items-center ${activeTab === 'posts' ? 'border-b-2 border-purple-500' : ''}`}
                onPress={() => setActiveTab('posts')}
              >
                <Text className={activeTab === 'posts' ? 'text-purple-600 font-medium' : 'text-gray-500'}>
                  Posts
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className={`flex-1 py-3 items-center ${activeTab === 'products' ? 'border-b-2 border-purple-500' : ''}`}
                onPress={() => setActiveTab('products')}
              >
                <Text className={activeTab === 'products' ? 'text-purple-600 font-medium' : 'text-gray-500'}>
                  Shop
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Section Header based on active tab - without "See All" button */}
            <View className="px-4 mb-2">
              <Text className="text-lg font-bold text-gray-800">
                {activeTab === 'posts' ? 'My Posts' : 'My Products'}
              </Text>
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default ProfileScreen;