import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  FlatList
} from 'react-native';
import { Ionicons, AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
import { PetTagCategory } from './postService';

interface Media {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
}

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
    <Modal
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
              You have an unsaved post draft. Would you like to restore it?
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
    </Modal>
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
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white w-[85%] rounded-xl overflow-hidden shadow-lg">
          <View className="bg-purple-500 p-4">
            <Text className="text-lg font-rubik-medium text-white text-center">Success</Text>
          </View>
          
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
    </Modal>
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
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white w-[85%] rounded-xl overflow-hidden shadow-lg">
          <View className="bg-rose-500 p-4">
            <Text className="text-lg font-rubik-medium text-white text-center">{title}</Text>
          </View>
          
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
    </Modal>
  );
};

// Tag Selection Modal
interface TagModalProps {
  visible: boolean;
  onClose: () => void;
  tags: string[];
  setTags: (tags: string[]) => void;
  tagCategories: PetTagCategory[];
  loadingTags: boolean;
}

export const TagModal: React.FC<TagModalProps> = ({
  visible,
  onClose,
  tags,
  setTags,
  tagCategories,
  loadingTags
}) => {
  const [customTag, setCustomTag] = React.useState('');

  const handleDone = () => {
    if (customTag.trim().length > 0) {
      if (!tags.includes(customTag.trim())) {
        setTags([...tags, customTag.trim()]);
      }
      setCustomTag('');
    }
    onClose();
  };

  const addCustomTag = () => {
    if (customTag.trim().length > 0) {
      if (!tags.includes(customTag.trim())) {
        setTags([...tags, customTag.trim()]);
      }
      setCustomTag('');
    }
  };

  const removeTag = (index: number) => {
    const newTags = [...tags];
    newTags.splice(index, 1);
    setTags(newTags);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text className="text-lg font-rubik-medium text-gray-800">Pet Tags</Text>
          <TouchableOpacity onPress={handleDone}>
            <Text className="text-purple-600 font-rubik-medium">Done</Text>
          </TouchableOpacity>
        </View>
        
        <View className="p-4">
          <Text className="text-base font-rubik-medium text-gray-800 mb-2">Add Tags</Text>
          <Text className="text-sm font-rubik-regular text-gray-600 mb-4">
            Tags help others discover your post
          </Text>
          
          {/* Custom Tag Input */}
          <View className="flex-row items-center bg-gray-100 rounded-full px-4 mb-4">
            <TextInput
              className="flex-1 py-2 text-gray-800 font-rubik-regular"
              placeholder="Add a custom tag..."
              placeholderTextColor="#9CA3AF"
              value={customTag}
              onChangeText={setCustomTag}
              onSubmitEditing={addCustomTag}
            />
            {customTag.trim().length > 0 && (
              <TouchableOpacity onPress={addCustomTag}>
                <AntDesign name="pluscircle" size={20} color="#7C3AED" />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Selected Tags */}
          {tags.length > 0 && (
            <View className="mb-4">
              <Text className="text-sm font-rubik-medium text-gray-800 mb-2">Your Tags</Text>
              <View className="flex-row flex-wrap">
                {tags.map((tag, index) => (
                  <View key={index} className="flex-row items-center bg-purple-100 rounded-full px-3 py-1 mr-2 mb-2">
                    <Text className="text-purple-700 font-rubik-regular">{tag}</Text>
                    <TouchableOpacity 
                      onPress={() => removeTag(index)}
                      className="ml-1"
                    >
                      <Ionicons name="close-circle" size={16} color="#7C3AED" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          {/* Suggested Tag Categories */}
          {tagCategories.length > 0 ? (
            <View>
              <Text className="text-sm font-rubik-medium text-gray-800 mb-2">Suggested Categories</Text>
              {tagCategories.map((category, catIndex) => (
                <View key={catIndex} className="mb-4">
                  <Text className="text-xs font-rubik-medium text-gray-500 uppercase mb-2">{category.name}</Text>
                  <View className="flex-row flex-wrap">
                    {category.tags.map((tag, tagIndex) => (
                      <TouchableOpacity
                        key={tagIndex}
                        onPress={() => {
                          if (!tags.includes(tag)) {
                            setTags([...tags, tag]);
                          }
                        }}
                        className={`mr-2 mb-2 px-3 py-1 rounded-full ${
                          tags.includes(tag) ? 'bg-purple-500' : 'bg-gray-100'
                        }`}
                      >
                        <Text 
                          className={`font-rubik-regular ${
                            tags.includes(tag) ? 'text-white' : 'text-gray-700'
                          }`}
                        >
                          {tag}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : loadingTags ? (
            <View className="py-8 items-center">
              <ActivityIndicator color="#7C3AED" />
              <Text className="mt-2 text-gray-500 font-rubik-regular">Loading suggestions...</Text>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
}; 