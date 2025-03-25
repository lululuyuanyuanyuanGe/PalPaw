// Modal.tsx - Common interfaces and types for the product creation flow
import React from 'react';
import { View, Text, TouchableOpacity, Modal as RNModal, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Media interface for local file handling
export interface Media {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
}

// Service media interface, matches the backend expectations
export interface ServiceMedia extends Media {
  isExisting?: boolean; // Flag to indicate if media is already uploaded
}

// Product data interface for API communications
export interface ProductData {
  name: string;
  description: string;
  price: number;
  media: ServiceMedia[];
  category?: string;
  subcategory?: string;
  condition?: string;
  shippingOptions?: string[];
  quantity?: number;
  tags?: string[];
  mediaToDelete?: string[]; // URLs of media to delete during update
}

// Draft product interface for local storage
export interface ProductDraft extends Omit<ProductData, 'price'> {
  price: string; // Store as string for form purposes
  draftId?: string;
  lastUpdated: number;
}

// Category interface
export interface Category {
  id: string;
  name: string;
}

// API Response interfaces
export interface ProductApiResponse {
  success: boolean;
  message: string;
  productId?: string;
  warning?: string;
  product?: any;
}

// Function to get icon name based on category
export const getCategoryIcon = (categoryName: string): any => {
  const iconMap: {[key: string]: any} = {
    'Pet Food': 'food-variant',
    'Pet Toys': 'toy-brick',
    'Pet Beds': 'bed',
    'Pet Clothing': 'tshirt-crew',
    'Health & Wellness': 'medical-bag',
    'Grooming': 'content-cut',
    'Training': 'whistle',
    'Carriers & Travel': 'bag-suitcase',
    'Accessories': 'dog-side'
  };
  
  return iconMap[categoryName] || 'paw';
};

// Get color based on category
export const getCategoryColor = (categoryName: string): string => {
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

// Category Modal Component
interface CategoryModalProps {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  loadingCategories: boolean;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  visible,
  onClose,
  categories,
  selectedCategory,
  onSelectCategory,
  loadingCategories
}) => {
  return (
    <RNModal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        {/* Modal Header */}
        <LinearGradient
          colors={['#9333EA', '#A855F7', '#C084FC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="px-4 pt-12 pb-4 border-b border-gray-100"
        >
          <View className="flex-row items-center justify-between">
            <TouchableOpacity 
              onPress={onClose}
              className="bg-white p-2 rounded-full shadow-sm"
            >
              <Ionicons name="close" size={22} color="#9333EA" />
            </TouchableOpacity>
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="paw" size={22} color="white" style={{ marginRight: 8 }} />
              <Text className="text-lg font-rubik-medium text-white">Pet Categories</Text>
            </View>
            <TouchableOpacity 
              onPress={onClose}
              className="bg-white px-3 py-1 rounded-full shadow-sm"
            >
              <Text className="text-purple-700 font-rubik-medium">Done</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
        
        <ScrollView className="flex-1 bg-white">
          <View className="p-4 bg-purple-50">
            <View className="flex-row items-center mb-3">
              <Ionicons name="information-circle-outline" size={18} color="#9333EA" style={{ marginRight: 6 }} />
              <Text className="text-purple-900 text-sm font-rubik">Select one category for your pet product:</Text>
            </View>
          </View>
          
          {loadingCategories ? (
            <View className="py-10 items-center">
              <ActivityIndicator size="large" color="#9333EA" />
              <Text className="text-gray-500 mt-3 font-rubik">Loading categories...</Text>
            </View>
          ) : (
            <View className="px-2 py-4">                
              <View className="flex-row flex-wrap">
                {categories.map((cat) => (
                  <TouchableOpacity 
                    key={cat.id}
                    className="w-1/3 px-2 mb-4"
                    onPress={() => {
                      onSelectCategory(cat.name);
                      onClose();
                    }}
                  >
                    <View 
                      className={`items-center justify-center py-4 px-2 rounded-xl ${
                        selectedCategory === cat.name 
                          ? 'shadow-md border border-purple-200' 
                          : 'border border-gray-100'
                      }`}
                      style={{ 
                        backgroundColor: selectedCategory === cat.name 
                          ? `${getCategoryColor(cat.name)}15` // 15 is hex for 8% opacity
                          : '#FFFFFF',
                      }}
                    >
                      <View 
                        className="rounded-full p-3 mb-3 shadow-sm"
                        style={{ 
                          backgroundColor: `${getCategoryColor(cat.name)}15`,
                        }}
                      >
                        <MaterialCommunityIcons 
                          name={getCategoryIcon(cat.name)}
                          size={28} 
                          color={getCategoryColor(cat.name)}
                        />
                      </View>
                      <Text 
                        className={`font-rubik text-center text-xs ${
                          selectedCategory === cat.name 
                            ? 'font-rubik-medium' 
                            : ''
                        }`}
                        style={{ 
                          color: selectedCategory === cat.name 
                            ? getCategoryColor(cat.name) 
                            : '#4B5563' 
                        }}
                        numberOfLines={2}
                      >
                        {cat.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </RNModal>
  );
};

// Restore Draft Modal
interface RestoreDraftModalProps {
  visible: boolean;
  onClose: () => void;
  onRestore: () => void;
  onDiscard: () => void;
}

export const RestoreDraftModal: React.FC<RestoreDraftModalProps> = ({
  visible,
  onClose,
  onRestore,
  onDiscard
}) => {
  return (
    <RNModal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white w-[85%] rounded-xl overflow-hidden shadow-lg">
          <View className="bg-purple-50 p-4 border-b border-purple-100">
            <Text className="text-lg font-rubik-medium text-purple-800 text-center">Restore Draft</Text>
          </View>
          
          <View className="px-5 py-6">
            <Text className="text-base text-gray-700 font-rubik text-center mb-6">
              You have an unsaved product draft. Would you like to restore it?
            </Text>
            
            <View className="flex-row justify-center">
              <TouchableOpacity 
                onPress={onDiscard}
                className="bg-gray-100 py-3 px-6 rounded-full mr-3"
              >
                <Text className="text-gray-700 font-rubik-medium">DISCARD</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={onRestore}
                className="bg-purple-500 py-3 px-6 rounded-full"
              >
                <Text className="text-white font-rubik-medium">RESTORE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </RNModal>
  );
};

// Success Modal
interface SuccessModalProps {
  visible: boolean;
  message: string;
  onClose: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  visible,
  message,
  onClose
}) => {
  return (
    <RNModal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white w-[85%] rounded-xl overflow-hidden shadow-lg">
          <LinearGradient
            colors={['#9333EA', '#A855F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="p-4"
          >
            <Text className="text-lg font-rubik-medium text-white text-center">Success</Text>
          </LinearGradient>
          
          <View className="px-5 py-6 items-center">
            <View className="mb-4 bg-green-100 p-3 rounded-full">
              <Ionicons name="checkmark-circle" size={36} color="#10B981" />
            </View>
            
            <Text className="text-base text-gray-700 font-rubik text-center mb-6">
              {message}
            </Text>
            
            <TouchableOpacity 
              onPress={onClose}
              className="bg-purple-500 py-3 px-6 rounded-full"
            >
              <Text className="text-white font-rubik-medium">OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </RNModal>
  );
};

// Error Modal
interface ErrorModalProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({
  visible,
  title,
  message,
  onClose
}) => {
  return (
    <RNModal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white w-[85%] rounded-xl overflow-hidden shadow-lg">
          <LinearGradient
            colors={['#EF4444', '#F87171']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="p-4"
          >
            <Text className="text-lg font-rubik-medium text-white text-center">{title}</Text>
          </LinearGradient>
          
          <View className="px-5 py-6 items-center">
            <View className="mb-4 bg-rose-100 p-3 rounded-full">
              <Ionicons name="alert-circle" size={36} color="#F43F5E" />
            </View>
            
            <Text className="text-base text-gray-700 font-rubik text-center mb-6">
              {message}
            </Text>
            
            <TouchableOpacity 
              onPress={onClose}
              className="bg-rose-500 py-3 px-6 rounded-full"
            >
              <Text className="text-white font-rubik-medium">OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </RNModal>
  );
}; 