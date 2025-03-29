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
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, AntDesign, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useProducts, useAuth, useUser } from '@/context';
import { ProductItem } from '@/context/ProductsContext';
import { formatImageUrl } from '@/utils/mediaUtils';
import AuthPrompt from './AuthPrompt';
import Constants from 'expo-constants';

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
  
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);

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
      setLastFetchTime(Date.now());
    } catch (error) {
      console.error('Error loading saved products:', error);
    }
  };

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    if (refreshing || !authState.user?.id) return;
    
    setRefreshing(true);
    try {
      await fetchSavedProducts(authState.user.id);
      setLastFetchTime(Date.now());
    } catch (error) {
      console.error('Error refreshing saved products:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, authState.user?.id]);

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
              await unsaveProduct(productId);
              // Products context handles removing from the saved products list
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
  const renderItem = ({ item }: { item: ProductItem }) => (
    <TouchableOpacity
      onPress={() => handleProductPress(item)}
      className="bg-white rounded-xl mx-4 my-2 shadow-md overflow-hidden"
      style={{
        shadowColor: '#9333EA20',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
      }}
    >
      <View className="flex-row">
        {/* Product Image */}
        <View className="w-24 h-24 rounded-l-xl overflow-hidden bg-gray-100">
          <Image
            source={{ uri: item.imageUrl || 'https://via.placeholder.com/100' }}
            className="w-full h-full"
            resizeMode="cover"
          />
        </View>
        
        {/* Product Details */}
        <View className="flex-1 p-3 justify-between">
          <View>
            <Text className="text-lg font-bold text-gray-800 mb-1" numberOfLines={1}>
              {item.name}
            </Text>
            <Text className="text-purple-700 font-bold mb-1">${item.price.toFixed(2)}</Text>
            <Text className="text-gray-500 text-xs" numberOfLines={1}>{item.description}</Text>
          </View>
          
          {/* Seller info */}
          <View className="flex-row items-center mt-1">
            {item.sellerData?.avatar && (
              <Image
                source={{ uri: formatImageUrl(item.sellerData.avatar) }}
                className="w-5 h-5 rounded-full mr-1"
              />
            )}
            <Text className="text-xs text-gray-500">
              {item.sellerData?.username || 'Unknown seller'}
            </Text>
          </View>
        </View>
        
        {/* Action Buttons */}
        <View className="justify-between p-2">
          <TouchableOpacity
            onPress={() => handleUnsaveProduct(item.id)}
            className="bg-red-50 p-2 rounded-full"
          >
            <AntDesign name="heart" size={16} color="#e11d48" />
          </TouchableOpacity>
          
          <TouchableOpacity className="bg-purple-50 p-2 rounded-full">
            <Feather name="share" size={16} color="#9333EA" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Show authentication prompt if not logged in
  if (!authState.isAuthenticated) {
    return <AuthPrompt statusBarHeight={statusBarHeight} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-blue-50">
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      
      {/* Header */}
      <LinearGradient
        colors={['#9333EA', '#C084FC']}
        className="w-full pt-6 pb-4"
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View className="flex-row items-center justify-between px-4 pt-2">
          {onClose ? (
            <TouchableOpacity className="p-2" onPress={onClose}>
              <Feather name="arrow-left" size={24} color="white" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
          
          <Text className="text-white font-bold text-xl">Saved Products</Text>
          
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>
      
      {/* Content */}
      <FlatList
        data={productsState.savedProducts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 12 }}
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
                <MaterialIcons name="shopping-bag" size={60} color="#C084FC" style={{ opacity: 0.6 }} />
                <Text className="text-gray-500 text-lg mt-4 text-center">You haven't saved any products yet</Text>
                <TouchableOpacity
                  className="bg-purple-600 px-4 py-3 rounded-full mt-6"
                  onPress={() => router.push('/(root)/(tabs)/market')}
                >
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
