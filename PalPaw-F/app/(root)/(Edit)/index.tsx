import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  FlatList,
  Dimensions
} from "react-native";
import { Feather, Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth, usePosts, useProducts, useUser } from "@/context";
import { formatImageUrl } from "@/utils/mediaUtils";
import { BaseItem, PostItem, ProductItem, isPostItem, isProductItem, ProfileTab } from "../(tabs)/(profile)/types";
import { RenderItem } from "../(tabs)/(profile)/ProfileRenderer";
import { DeleteConfirmModal, DeleteSuccessModal, ProfileSuccessModal } from "./modals";

const { width } = Dimensions.get("window");

const EditProfileScreen = () => {
  const router = useRouter();
  const { state: userState, updateUserProfile, fetchUserProfile } = useUser();
  const { state: authState } = useAuth();
  const { state: postsState, deletePost, setCurrentPost, likePost, unlikePost, isPostLiked } = usePosts();
  const { state: productsState, deleteProduct, setCurrentProduct, saveProduct, unsaveProduct, isProductSaved } = useProducts();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  
  // Delete modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  // Success modal state
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [profileSuccessModalVisible, setProfileSuccessModalVisible] = useState(false);

  // Get dimensions for grid layout
  const numColumns = 2;

  useEffect(() => {
    // Load user data
    if (userState.profile || authState.user) {
      const user = userState.profile || authState.user;
      if (!user) return;
      
      setUsername(user.username || "");
      if ('bio' in user && user.bio) {
        setBio(user.bio);
      }
      setAvatarImage(user.avatar || null);
    }
  }, [userState.profile, authState.user]);

  const pickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled) {
        setAvatarImage(result.assets[0].uri);
        setAvatarFile(result.assets[0]);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const saveProfile = async () => {
    try {
      setIsSaving(true);
      
      // Create form data for api upload
      const formData = new FormData();
      formData.append("username", username);
      formData.append("bio", bio);
      
      // Add avatar if changed
      if (avatarFile) {
        const uriParts = avatarFile.uri.split(".");
        const fileType = uriParts[uriParts.length - 1];
        
        formData.append("avatar", {
          uri: avatarFile.uri,
          name: `avatar.${fileType}`,
          type: `image/${fileType}`,
        } as any);
      }

      await updateUserProfile(formData);
      await fetchUserProfile();
      
      // Show success modal instead of alert
      setProfileSuccessModalVisible(true);
      
      // Short delay before navigation for the modal to be visible
      setTimeout(() => {
        // Navigate back to profile with active tab
        router.push({
          pathname: "/(root)/(tabs)/(profile)",
          params: { activeTab: "posts" }
        });
      }, 1500);
    } catch (error) {
      console.error("Failed to update profile:", error);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = (id: string) => {
    setItemToDelete(id);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    setDeleteLoading(itemToDelete);
    setDeleteModalVisible(false);
    
    try {
      if (activeTab === "posts") {
        await deletePost(itemToDelete);
      } else {
        await deleteProduct(itemToDelete);
      }
      
      // Show success modal instead of alert
      setSuccessMessage(`${activeTab === "posts" ? "Post" : "Product"} deleted successfully!`);
      setSuccessModalVisible(true);
    } catch (error) {
      console.error("Failed to delete item:", error);
      Alert.alert("Error", "Failed to delete item. Please try again.");
    } finally {
      setDeleteLoading(null);
      setItemToDelete(null);
    }
  };

  // Create getDisplayItems function
  const getDisplayItems = (): BaseItem[] => {
    return activeTab === 'posts'
      ? postsState.userPosts.filter(post => post.id !== "new-post-button" && post.id !== itemToDelete)
      : productsState.userProducts.filter(product => product.id !== "new-product-button" && product.id !== itemToDelete);
  };

  // Render grid items - using the ProfileRenderer with improved layout
  const renderItem = ({ item }: { item: BaseItem }) => {
    if (!item) return null;
    
    // Create a proper onPress handler that takes the item as parameter
    const onPress = (item: BaseItem) => {
      if (isPostItem(item)) {
        // Set the current post in context before navigation
        setCurrentPost(item as PostItem);
      } else if (isProductItem(item)) {
        setCurrentProduct(item as any);
      }
    };
    
    // Handle like/unlike actions for posts
    const handleLike = async (postId: string) => {
      // Check if post is already liked
      const isCurrentlyLiked = isPostLiked(postId);
      
      // Call the appropriate function based on current liked status
      if (isCurrentlyLiked) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }
    };
    
    // Handle save/unsave actions for products
    const handleSave = async (productId: string) => {
      // Check if product is already saved
      const isCurrentlySaved = isProductSaved(productId);
      
      // Call the appropriate function based on current saved status
      if (isCurrentlySaved) {
        await unsaveProduct(productId);
      } else {
        await saveProduct(productId);
      }
    };

    // Add delete button overlay for Edit mode
    return (
      <View className="flex-1 mx-1 my-1 relative" style={{maxWidth: width / 2 - 8}}>
        <RenderItem 
          item={item} 
          activeTab={activeTab} 
          onPress={onPress}
          onLike={handleLike}
          onSave={handleSave}
          showTabBar={false}
        />
        
        {/* Delete button overlay with improved icon */}
        <TouchableOpacity 
          className="absolute top-2 right-2 bg-red-500/85 rounded-full w-8 h-8 items-center justify-center z-10 shadow-md"
          onPress={() => handleDeleteItem(item.id)}
          disabled={deleteLoading === item.id}
        >
          {deleteLoading === item.id ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="trash-outline" size={18} color="white" />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-blue-50">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Fixed Navigation Buttons */}
      <View className="absolute top-10 left-0 right-0 flex-row items-center justify-between px-4 z-10">
        <TouchableOpacity 
          className="bg-white/30 p-2 rounded-full shadow-sm"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold drop-shadow-md">Edit Profile</Text>
        <TouchableOpacity 
          className="bg-white/30 p-2 rounded-full shadow-sm"
          onPress={saveProfile} 
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Feather name="check" size={22} color="white" />
          )}
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header (Scrollable) */}
        <View className="relative">
          <LinearGradient
            colors={['#9333EA', '#C084FC']} 
            className="w-full" 
            start={{ x: 0.1, y: 0.1 }}
            end={{ x: 0.9, y: 0.9 }}
            style={{ height: 160 }}
          >
            {/* Decorative elements */}
            <View className="absolute -right-10 -top-20 w-40 h-40 rounded-full bg-white opacity-10" />
            <View className="absolute right-20 top-5 w-20 h-20 rounded-full bg-white opacity-10" />
            <View className="absolute left-10 top-10 w-30 h-30 rounded-full bg-white opacity-10" />
            
            {/* Paw print pattern */}
            <View className="absolute top-12 left-5">
              <FontAwesome5 name="paw" size={16} color="white" style={{ opacity: 0.6 }} />
              <FontAwesome5 name="paw" size={12} color="white" style={{ marginLeft: 25, marginTop: 8, opacity: 0.5 }} />
              <FontAwesome5 name="paw" size={14} color="white" style={{ marginLeft: 10, marginTop: 12, opacity: 0.4 }} />
            </View>
          </LinearGradient>
            
          {/* Centered Avatar */}
          <View className="absolute left-0 right-0 -bottom-10 items-center justify-center z-10">
            <View className="w-[100px] h-[100px] rounded-full bg-white p-[3px] shadow-lg">
              <Image
                source={avatarImage ? { uri: formatImageUrl(avatarImage) } : require('../../../assets/images/cat1.jpg')}
                className="w-full h-full rounded-full"
              />
              <TouchableOpacity
                className="absolute bottom-0 right-0 bg-purple-600 rounded-full w-9 h-9 items-center justify-center border-[3px] border-white"
                onPress={pickAvatar}
              >
                <Feather name="camera" size={18} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {/* Main Content */}
        <View className="bg-white rounded-t-3xl mx-4 shadow-sm p-5 mt-16">
          {/* Username Input with enhanced styling */}
          <View className="mb-5">
            <Text className="text-lg font-semibold mb-2 text-purple-700">Username</Text>
            <View className="bg-gray-50 rounded-xl px-4 py-1 border border-gray-200">
              <TextInput
                className="text-base text-gray-800 py-2.5"
                value={username}
                onChangeText={setUsername}
                placeholder="Enter your username"
                maxLength={30}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
          
          {/* Bio Input with enhanced styling */}
          <View className="mb-5">
            <Text className="text-lg font-semibold mb-2 text-purple-700">Bio</Text>
            <View className="bg-gray-50 rounded-xl px-4 py-1 border border-gray-200">
              <TextInput
                className="text-base text-gray-800 py-2.5 min-h-[80px]"
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us about yourself"
                multiline
                maxLength={150}
                placeholderTextColor="#9CA3AF"
                textAlignVertical="top"
              />
              <View className="items-end pt-1.5 pb-0.5">
                <Text className="text-sm font-semibold text-purple-700">
                  {bio.length}<Text className="font-normal text-gray-400">/150</Text>
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Content Management Section */}
        <View className="mt-5 mx-4">
          {/* Section Header */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-gray-800">
              Manage Content
            </Text>
            <Text className="text-xs text-purple-600">Tap to delete</Text>
          </View>
          
          {/* Tab Selector - Styled like profile page */}
          <View className="flex-row justify-center mt-3 mb-4">
            <TouchableOpacity 
              className={`px-6 py-2 rounded-full mx-1 ${activeTab === 'posts' ? 'bg-purple-100' : 'bg-transparent'}`}
              onPress={() => setActiveTab('posts')}
            >
              <Text className={`${activeTab === 'posts' ? 'text-purple-700' : 'text-gray-500'} font-medium`}>
                Posts ({postsState.userPosts.length || 0})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className={`px-6 py-2 rounded-full mx-1 ${activeTab === 'products' ? 'bg-purple-100' : 'bg-transparent'}`}
              onPress={() => setActiveTab('products')}
            >
              <Text className={`${activeTab === 'products' ? 'text-purple-700' : 'text-gray-500'} font-medium`}>
                Products ({productsState.userProducts.length || 0})
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Section Title */}
          <View className="px-1 mb-2">
            <Text className="text-lg font-bold text-gray-800">
              {activeTab === 'posts' ? 'My Posts' : 'My Products'}
            </Text>
          </View>
          
          {/* Content Grid */}
          <View className="w-full px-0">
            {isLoading ? (
              <View className="py-10 items-center">
                <ActivityIndicator size="large" color="#9333EA" />
              </View>
            ) : getDisplayItems().length > 0 ? (
              <FlatList
                data={getDisplayItems()}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                numColumns={numColumns}
                scrollEnabled={false}
                columnWrapperStyle={{ justifyContent: 'space-between', width: '100%' }}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            ) : (
              <View className="py-10 bg-white rounded-xl items-center shadow-sm">
                <Feather name="inbox" size={40} color="#D1D5DB" />
                <Text className="text-gray-400 mt-3 text-sm">
                  No {activeTab === "posts" ? "posts" : "products"} yet
                </Text>
                <TouchableOpacity 
                  className="mt-4 bg-purple-100 px-4 py-2 rounded-full"
                  onPress={() => router.push(activeTab === "posts" ? "/(root)/(createPosts)/createPosts" : "/(root)/(createProducts)/createProducts")}
                >
                  <Text className="text-purple-700 font-medium">Create {activeTab === "posts" ? "Post" : "Product"}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        visible={deleteModalVisible}
        onClose={() => {
          setDeleteModalVisible(false);
          setItemToDelete(null);
        }}
        onDelete={confirmDelete}
        itemType={activeTab === "posts" ? "post" : "product"}
        isDeleting={deleteLoading === itemToDelete}
      />

      {/* Delete Success Modal */}
      <DeleteSuccessModal
        visible={successModalVisible}
        message={successMessage}
        onClose={() => setSuccessModalVisible(false)}
      />

      {/* Profile Success Modal */}
      <ProfileSuccessModal
        visible={profileSuccessModalVisible}
        onClose={() => setProfileSuccessModalVisible(false)}
      />
    </SafeAreaView>
  );
};

export default EditProfileScreen; 