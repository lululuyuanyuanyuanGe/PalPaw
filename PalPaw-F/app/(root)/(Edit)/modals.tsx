import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { height, width } = Dimensions.get('window');

// Base modal overlay component that uses Animated.View instead of Modal
interface BaseOverlayProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const BaseOverlay: React.FC<BaseOverlayProps> = ({
  visible,
  onClose,
  children
}) => {
  const [display, setDisplay] = useState(visible);
  const fadeAnim = useState(new Animated.Value(0))[0];
  
  // Handle back button press
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (visible) {
        onClose();
        return true;
      }
      return false;
    });
    
    return () => backHandler.remove();
  }, [visible, onClose]);
  
  // Animation control
  useEffect(() => {
    if (visible) {
      setDisplay(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setDisplay(false);
      });
    }
  }, [visible, fadeAnim]);
  
  if (!display) return null;
  
  return (
    <Animated.View 
      style={{
        opacity: fadeAnim,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
      }}
    >
      <TouchableOpacity
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
        activeOpacity={1}
        onPress={onClose}
      />
      <Animated.View 
        style={{
          transform: [{
            scale: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.9, 1],
            }),
          }],
        }}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
};

// Delete Confirmation Modal
interface DeleteConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onDelete: () => Promise<void>;
  itemType: 'post' | 'product';
  isDeleting: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  visible,
  onClose,
  onDelete,
  itemType,
  isDeleting
}) => {
  return (
    <BaseOverlay visible={visible} onClose={onClose}>
      <View className="bg-white rounded-xl overflow-hidden shadow-lg" style={{ width: 350 }}>
        <View className="bg-red-500 p-3.5">
          <Text className="text-white font-semibold text-center text-base">Confirm Deletion</Text>
        </View>
        
        <View className="p-6 items-center">
          <View className="mb-4 bg-red-100 p-3 rounded-full">
            <Ionicons name="trash-outline" size={28} color="#EF4444" />
          </View>
          
          <Text className="text-gray-700 text-center mb-6 text-base">
            Are you sure you want to delete this {itemType}? This action cannot be undone.
          </Text>
          
          <View className="flex-row justify-center w-full">
            <TouchableOpacity 
              onPress={onClose}
              className="bg-gray-100 py-2.5 px-6 rounded-full mr-3"
            >
              <Text className="text-gray-700 font-medium text-base">Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={onDelete}
              disabled={isDeleting}
              className="bg-red-500 py-2.5 px-6 rounded-full"
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-medium text-base">Delete</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </BaseOverlay>
  );
};

// Delete Success Modal
interface DeleteSuccessModalProps {
  visible: boolean;
  message: string;
  onClose: () => void;
}

export const DeleteSuccessModal: React.FC<DeleteSuccessModalProps> = ({
  visible,
  message,
  onClose
}) => {
  return (
    <BaseOverlay visible={visible} onClose={onClose}>
      <View className="bg-white rounded-xl overflow-hidden shadow-lg" style={{ width: 350 }}>
        {/* Header */}
        <View className="bg-purple-500 p-3.5">
          <Text className="text-white font-semibold text-center text-base">Success</Text>
        </View>
        
        <View className="p-6 items-center">
          {/* Checkmark icon */}
          <View className="mb-4 bg-green-100 p-3 rounded-full">
            <Ionicons name="checkmark" size={28} color="#10B981" />
          </View>
          
          {/* Message */}
          <Text className="text-gray-700 text-center mb-6 text-base">
            {message}
          </Text>
          
          {/* OK Button */}
          <TouchableOpacity 
            onPress={onClose}
            className="bg-purple-500 py-2.5 px-6 rounded-full"
          >
            <Text className="text-white font-medium text-base">OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BaseOverlay>
  );
};

// Profile Success Modal
interface ProfileSuccessModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ProfileSuccessModal: React.FC<ProfileSuccessModalProps> = ({
  visible,
  onClose
}) => {
  return (
    <BaseOverlay visible={visible} onClose={onClose}>
      <View className="bg-white w-[85%] rounded-xl overflow-hidden shadow-lg" style={{ maxWidth: width * 0.85 }}>
        <LinearGradient
          colors={['#8B5CF6', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="p-4"
        >
          <Text className="text-lg font-medium text-white text-center">Profile Updated</Text>
        </LinearGradient>
        
        <View className="px-5 py-8 items-center">
          <View className="mb-5 bg-green-100 p-4 rounded-full">
            <Ionicons name="checkmark-circle" size={40} color="#10B981" />
          </View>
          
          <View className="mb-6 items-center">
            <Text className="text-lg text-gray-800 font-medium text-center mb-2">
              Great news!
            </Text>
            <Text className="text-base text-gray-600 text-center">
              Your profile has been updated successfully!
            </Text>
          </View>
          
          {/* Decorative elements */}
          <View className="w-full flex-row justify-center mb-6">
            <View className="h-1 w-10 bg-purple-200 rounded-full mx-0.5" />
            <View className="h-1 w-20 bg-purple-400 rounded-full mx-0.5" />
            <View className="h-1 w-10 bg-purple-200 rounded-full mx-0.5" />
          </View>
          
          <TouchableOpacity 
            onPress={onClose}
            className="bg-purple-600 py-3 px-8 rounded-full shadow-md"
          >
            <Text className="text-white font-medium text-base">Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BaseOverlay>
  );
};