import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  StyleSheet
} from 'react-native';
import { Ionicons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context';
import { useUser } from '@/context';
import { formatImageUrl } from '@/utils/mediaUtils';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import api from '@/utils/apiClient';

// User type interface - Adjusted to match UserProfile from context
interface User {
  id: string;
  username: string;
  avatar?: string; // Make avatar optional to match UserProfile
  bio?: string;
  isFollowing?: boolean;
  // Add other fields that might be in UserProfile but not required in our UI
  email?: string;
  firstName?: string;
  lastName?: string;
  followerCount?: number;
  followingCount?: number;
  following?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface FollowingModalProps {
  userId: string;
  visible: boolean;
  onClose: () => void;
}

const { height, width } = Dimensions.get('window');

const FollowingModal = ({ userId, visible, onClose }: FollowingModalProps) => {
  const router = useRouter();
  const { state: authState } = useAuth();
  const { state: userState, fetchFollowing, followUser, unfollowUser } = useUser();
  
  const [following, setFollowing] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slideAnim] = useState(new Animated.Value(height));
  const [fadeAnim] = useState(new Animated.Value(0));
  
  // Animation refs for list items
  const itemAnimations = useRef<Animated.Value[]>([]);
  
  // Animate in/out when visibility changes
  useEffect(() => {
    if (visible) {
      // Reset animations for list items when data is available
      if (userState.followedUsers?.length) {
        itemAnimations.current = userState.followedUsers.map(() => new Animated.Value(0));
      }
      
      // Fetch following data when becoming visible
      fetchUserFollowing();
      
      // Fade in background
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      // Slide up animation with spring effect
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else {
      // Fade out background
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      // Slide down animation
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
        easing: Easing.ease
      }).start();
    }
  }, [visible]);
  
  // Update following list when userState changes
  useEffect(() => {
    if (userState.followedUsers?.length) {
      // Map UserProfile[] to User[] to ensure type compatibility
      const mappedFollowing = userState.followedUsers.map(followedUser => {
        // Users in the following list are always being followed by definition
        return {
          id: followedUser.id,
          username: followedUser.username,
          avatar: followedUser.avatar,
          bio: followedUser.bio,
          isFollowing: true, // By definition these are users we follow
          // Copy other fields as needed
          email: followedUser.email,
          firstName: followedUser.firstName,
          lastName: followedUser.lastName
        };
      });

      setFollowing(mappedFollowing);
      
      // Setup animations for new following data
      itemAnimations.current = mappedFollowing.map(() => new Animated.Value(0));
      
      // Animate list items in sequence if modal is visible
      if (visible) {
        mappedFollowing.forEach((_, index) => {
          Animated.timing(itemAnimations.current[index], {
            toValue: 1,
            duration: 300,
            delay: 100 + (index * 50),
            useNativeDriver: true,
            easing: Easing.out(Easing.quad)
          }).start();
        });
      }
    }
  }, [userState.followedUsers, visible]);
  
  // Function to fetch following using context
  const fetchUserFollowing = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use the context function to fetch following
      await fetchFollowing(userId);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching following users:', err);
      setError('An error occurred while fetching following users');
      setLoading(false);
    }
  };
  
  // Handle follow/unfollow user
  const handleFollowToggle = async (targetUserId: string, isCurrentlyFollowing: boolean) => {
    try {
      if (isCurrentlyFollowing) {
        await unfollowUser(targetUserId);
      } else {
        await followUser(targetUserId);
      }
      
      // Update local state to reflect the change immediately for better UX
      setFollowing(following.map(user => 
        user.id === targetUserId 
          ? { ...user, isFollowing: !isCurrentlyFollowing }
          : user
      ));
      
    } catch (err) {
      console.error(`Error ${isCurrentlyFollowing ? 'unfollowing' : 'following'} user:`, err);
    }
  };
  
  // Render each item with animation
  const renderUserItem = ({ item, index }: { item: User, index: number }) => {
    // Don't show follow button for your own profile
    const isCurrentUser = item.id === authState.user?.id;
    
    // Generate random banner color based on user id
    const bannerColor = `hsl(${parseInt(item.id) * 40 % 360}, 70%, 85%)`;
    
    return (
      <Animated.View 
        style={{
          opacity: itemAnimations.current[index] || new Animated.Value(1),
          transform: [
            { 
              translateY: Animated.multiply(
                Animated.subtract(1, itemAnimations.current[index] || new Animated.Value(1)), 
                new Animated.Value(20)
              ) 
            }
          ]
        }}
      >
        <TouchableOpacity 
          className="mb-4 mx-3 bg-white rounded-xl overflow-hidden"
          style={styles.userCard}
          activeOpacity={0.7}
          onPress={() => {
            onClose();
            router.push({
              pathname: "/(root)/(tabs)/(profile)" as any, 
              params: { userId: item.id }
            });
          }}
        >
          {/* User banner */}
          <View 
            style={[
              styles.userBanner, 
              { backgroundColor: bannerColor }
            ]}
          >
            {/* Decorative paw prints */}
            <View style={styles.pawPrint1}>
              <FontAwesome5 name="paw" size={12} color="rgba(255,255,255,0.4)" />
            </View>
            <View style={styles.pawPrint2}>
              <FontAwesome5 name="paw" size={18} color="rgba(255,255,255,0.25)" />
            </View>
            <View style={styles.pawPrint3}>
              <FontAwesome5 name="paw" size={10} color="rgba(255,255,255,0.3)" />
            </View>
          </View>
          
          <View className="p-4 pt-8">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <Image 
                  source={{ uri: formatImageUrl(item.avatar) || `https://robohash.org/${item.id}?set=set4` }} 
                  className="w-16 h-16 rounded-full"
                  style={styles.avatar}
                />
                <View className="ml-4 flex-1 justify-center">
                  <Text className="font-bold text-gray-800 text-lg">{item.username}</Text>
                  {item.bio ? (
                    <Text className="text-gray-500 text-sm mt-1" numberOfLines={2}>{item.bio}</Text>
                  ) : null}
                </View>
              </View>
              
              {!isCurrentUser && (
                <TouchableOpacity 
                  className={`px-5 py-2 rounded-full ${item.isFollowing ? 'bg-purple-100' : 'bg-purple-600'} ml-2`}
                  style={item.isFollowing ? styles.followingButton : styles.followButton}
                  onPress={() => handleFollowToggle(item.id, !!item.isFollowing)}
                >
                  {item.isFollowing ? (
                    <View className="flex-row items-center">
                      <Text className="text-sm font-medium text-purple-700 mr-1">Following</Text>
                      <Feather name="check" size={14} color="#9333EA" />
                    </View>
                  ) : (
                    <Text className="text-sm font-medium text-white">Follow</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };
  
  // Don't render anything if not visible
  if (!visible) return null;
  
  return (
    <View className="absolute inset-0 z-50" style={{ elevation: 5 }}>
      {/* Semi-transparent background with fade animation */}
      <Animated.View 
        style={[
          StyleSheet.absoluteFill,
          { opacity: fadeAnim, backgroundColor: 'rgba(0,0,0,0.5)' }
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => {
            console.log('Background pressed, closing modal');
            onClose();
          }}
        />
      </Animated.View>
      
      {/* Content container */}
      <Animated.View 
        className="bg-white rounded-t-3xl overflow-hidden"
        style={[
          styles.modalContainer,
          {
            transform: [{ translateY: slideAnim }],
            marginTop: Constants.statusBarHeight + 40,
            maxHeight: height - 80,
            height: height - 80
          }
        ]}
      >
        {/* Handle indicator for drag gesture */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>
        
        {/* Header with gradient background */}
        <LinearGradient
          colors={['#9333EA', '#C084FC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="rounded-t-3xl"
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View className="flex-row items-center">
              <FontAwesome5 name="star" size={18} color="white" style={{ marginRight: 8 }} />
              <Text className="text-xl font-bold text-white">Following</Text>
            </View>
            <TouchableOpacity 
              onPress={() => {
                console.log('Close button pressed');
                onClose();
              }}
              style={styles.closeButton}
              activeOpacity={0.6}
              hitSlop={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <Ionicons name="close-outline" size={28} color="white" />
            </TouchableOpacity>
          </View>
          
          {/* Decorative paw prints */}
          <View style={styles.headerPawPrint1}>
            <FontAwesome5 name="paw" size={20} color="rgba(255,255,255,0.15)" />
          </View>
          <View style={styles.headerPawPrint2}>
            <FontAwesome5 name="paw" size={14} color="rgba(255,255,255,0.2)" />
          </View>
          <View style={styles.headerPawPrint3}>
            <FontAwesome5 name="paw" size={18} color="rgba(255,255,255,0.12)" />
          </View>
          
          <View style={styles.decorativeBubble1} />
          <View style={styles.decorativeBubble2} />
          <View style={styles.decorativeLine} />
        </LinearGradient>
        
        {/* Content area */}
        <View style={styles.contentContainer}>
          {loading ? (
            <View className="flex-1 justify-center items-center p-4">
              <ActivityIndicator size="large" color="#9333EA" />
              <View className="items-center mt-4">
                <Text className="text-purple-700 font-bold text-base">Loading following...</Text>
                <Text className="text-gray-500 text-xs mt-1">Please wait</Text>
              </View>
            </View>
          ) : error ? (
            <View className="flex-1 justify-center items-center p-4">
              <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
              <Text className="text-red-500 font-bold mt-4 text-center">{error}</Text>
              <TouchableOpacity 
                className="bg-purple-100 px-6 py-3 rounded-full mt-4"
                style={styles.retryButton}
                onPress={() => fetchUserFollowing()}
              >
                <Text className="text-purple-700 font-bold">Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : following.length === 0 ? (
            <View className="flex-1 justify-center items-center p-6">
              <View style={styles.emptyStateIcon}>
                <FontAwesome5 name="star" size={32} color="#9333EA" />
              </View>
              <Text className="text-xl font-bold text-gray-800 mt-6">Not following anyone</Text>
              <Text className="text-gray-500 text-center mt-2 mb-6">
                When you follow someone, they'll appear here
              </Text>
              <TouchableOpacity 
                className="bg-purple-600 px-6 py-3 rounded-full mt-2"
                style={styles.button}
                onPress={onClose}
              >
                <Text className="text-white font-bold">Discover Users</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={following}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Modal container
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  
  // Header
  headerGradient: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  
  // Handle indicator
  handleContainer: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  
  // Decorative elements
  decorativeBubble1: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorativeBubble2: {
    position: 'absolute',
    left: 30,
    bottom: -10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decorativeLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerPawPrint1: {
    position: 'absolute',
    right: 40,
    top: 15,
    transform: [{ rotate: '25deg' }],
  },
  headerPawPrint2: {
    position: 'absolute',
    left: 60,
    bottom: 15,
    transform: [{ rotate: '-15deg' }],
  },
  headerPawPrint3: {
    position: 'absolute',
    right: 70,
    bottom: 25,
    transform: [{ rotate: '40deg' }],
  },
  
  // Content
  contentContainer: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  listContainer: {
    paddingVertical: 16,
  },
  
  // User cards
  userCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userBanner: {
    height: 10,
    width: '100%',
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  avatar: {
    borderWidth: 2,
    borderColor: '#E9D5FF',
  },
  pawPrint1: {
    position: 'absolute',
    right: 30,
    top: 2,
    transform: [{ rotate: '25deg' }],
  },
  pawPrint2: {
    position: 'absolute',
    left: 40,
    bottom: 0,
    transform: [{ rotate: '-15deg' }],
  },
  pawPrint3: {
    position: 'absolute',
    right: 60,
    bottom: 0,
    transform: [{ rotate: '40deg' }],
  },
  
  // Buttons
  followButton: {
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  followingButton: {
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  button: {
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  retryButton: {
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  
  // Empty state
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
});

export default FollowingModal; 