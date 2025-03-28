import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
    <Modal
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
            <Text className="text-lg font-medium text-white text-center">Confirm Deletion</Text>
          </LinearGradient>
          
          <View className="px-5 py-6 items-center">
            <View className="mb-4 bg-rose-100 p-3 rounded-full">
              <Ionicons name="trash-outline" size={30} color="#EF4444" />
            </View>
            
            <Text className="text-base text-gray-700 text-center mb-6">
              Are you sure you want to delete this {itemType}? This action cannot be undone.
            </Text>
            
            <View className="flex-row justify-center w-full">
              <TouchableOpacity 
                onPress={onClose}
                className="bg-gray-100 py-3 px-6 rounded-full mr-3"
              >
                <Text className="text-gray-700 font-medium">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={onDelete}
                disabled={isDeleting}
                className="bg-rose-500 py-3 px-6 rounded-full"
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white font-medium">Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
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
    <Modal
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
            <Text className="text-lg font-medium text-white text-center">Success</Text>
          </LinearGradient>
          
          <View className="px-5 py-6 items-center">
            <View className="mb-4 bg-green-100 p-3 rounded-full">
              <Ionicons name="checkmark-circle" size={36} color="#10B981" />
            </View>
            
            <Text className="text-base text-gray-700 text-center mb-6">
              {message}
            </Text>
            
            <TouchableOpacity 
              onPress={onClose}
              className="bg-purple-500 py-3 px-6 rounded-full"
            >
              <Text className="text-white font-medium">OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white w-[85%] rounded-xl overflow-hidden shadow-lg">
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
      </View>
    </Modal>
  );
}; 