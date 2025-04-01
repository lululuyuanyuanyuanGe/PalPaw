import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { Ionicons, MaterialCommunityIcons, AntDesign, Feather, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, useUser } from '@/context';
import { formatImageUrl } from '@/utils/mediaUtils';

const SearchDrawer = (props: any) => {
  const router = useRouter();
  const { state: authState, logout } = useAuth();
  const { state: userState } = useUser();

  // Handle login navigation
  const handleLogin = () => {
    router.push('/(root)/(auth)/login');
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Get user information from context
  const isLoggedIn = authState.isAuthenticated;
  const userData = userState.profile || authState.user;

  return (
    <DrawerContentScrollView 
      {...props}
      contentContainerStyle={{ 
        flex: 1, 
        backgroundColor: '#F5F8FF' 
      }}
    >
      {/* Modern header with fully rounded corners */}
      <View className="overflow-hidden">
        <LinearGradient
          colors={['#9333EA', '#A855F7', '#C084FC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="pt-8 px-5 pb-12"
          style={{
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            borderBottomLeftRadius: 30,
            borderBottomRightRadius: 30,
            margin: 12,
            marginTop: 6
          }}
        >
          {/* Decorative elements - reduced number of paws */}
          <View style={{ 
            position: 'absolute', 
            right: 15, 
            top: 20, 
            opacity: 0.35 
          }}>
            <FontAwesome5 name="paw" size={50} color="#ffffff" />
          </View>
          <View style={{ 
            position: 'absolute', 
            left: 20, 
            bottom: 40, 
            opacity: 0.3 
          }}>
            <FontAwesome5 name="paw" size={35} color="#ffffff" />
          </View>
          
          {/* Profile Avatar with Glow Effect */}
          <View className="items-center mb-5">
            <View className="w-20 h-20 rounded-full bg-white items-center justify-center shadow-md" 
              style={{
                shadowColor: '#F9A8D4',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 8,
                elevation: 5,
              }}
            >
              {isLoggedIn && userData && userData.avatar ? (
                <Image 
                  source={{ uri: formatImageUrl(userData.avatar) }} 
                  className="w-16 h-16 rounded-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-16 h-16 bg-purple-100 rounded-full items-center justify-center">
                  {isLoggedIn && userData ? (
                    <Text className="text-purple-700 font-bold text-lg">
                      {userData.username && userData.username.substring(0, 1).toUpperCase()}
                    </Text>
                  ) : (
                    <FontAwesome5 name="paw" size={30} color="#9333EA" />
                  )}
                </View>
              )}
            </View>
            
            {/* Display username if logged in */}
            {isLoggedIn && userData && (
              <Text className="text-white font-bold text-lg mt-2">
                {userData.username}
              </Text>
            )}
          </View>
          
          {/* Login/Logout button with shadow */}
          {isLoggedIn ? (
            <TouchableOpacity 
              onPress={handleLogout}
              className="bg-white rounded-full py-2.5 mx-6 shadow-sm"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
                elevation: 2,
              }}
            >
              <Text className="text-center font-bold text-red-500">Log out</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              onPress={handleLogin}
              className="bg-white rounded-full py-2.5 mx-6 shadow-sm"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
                elevation: 2,
              }}
            >
              <Text className="text-center font-bold text-purple-600">Log in</Text>
            </TouchableOpacity>
          )}
          
          <Text className="text-center text-white text-xs mt-3 mb-1 opacity-80">
            {isLoggedIn ? 'Welcome back to PalPaw!' : 'Discover more features after logging in'}
          </Text>
        </LinearGradient>
      </View>

      {/* Reduced number of background paws */}
      <View style={{ position: 'absolute', right: 25, top: 235, opacity: 0.15 }}>
        <FontAwesome5 name="paw" size={35} color="#6B21A8" />
      </View>
      <View style={{ position: 'absolute', left: 40, top: 550, opacity: 0.17, transform: [{ rotate: '20deg' }] }}>
        <FontAwesome5 name="paw" size={30} color="#7E22CE" />
      </View>
      
      {/* Just a few paws in the bottom white space */}
      <View style={{ position: 'absolute', right: 50, bottom: 180, opacity: 0.18, transform: [{ rotate: '10deg' }] }}>
        <FontAwesome5 name="paw" size={55} color="#6B21A8" />
      </View>
      <View style={{ position: 'absolute', left: 60, bottom: 130, opacity: 0.25, transform: [{ rotate: '-15deg' }] }}>
        <FontAwesome5 name="paw" size={35} color="#7E22CE" />
      </View>

      {/* Menu items with custom colors - made larger */}
      <View className="mt-3 px-2">
        {/* Menu Item: Messages - increased size */}
        <View className="bg-white rounded-xl mx-3 my-2 shadow-sm" style={{
          shadowColor: '#9333EA20',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 1,
        }}>
          <DrawerItem
            label="Messages"
            labelStyle={{ fontWeight: '600', color: '#474747', fontSize: 16 }}
            icon={({ size }) => (
              <View className="bg-purple-100 p-2.5 rounded-full">
                <Feather name="message-circle" size={size-6} color="#9333EA" />
              </View>
            )}
            onPress={() => {
              props.navigation.closeDrawer();
              router.push('/(root)/(chats)');
            }}
            style={{ paddingVertical: 10 }}
          />
        </View>
        
        {/* Menu Item: Liked Posts - increased size */}
        <View className="bg-white rounded-xl mx-3 my-2 shadow-sm" style={{
          shadowColor: '#9333EA20',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 1,
        }}>
          <DrawerItem
            label="Liked Posts"
            labelStyle={{ fontWeight: '600', color: '#474747', fontSize: 16 }}
            icon={({ size }) => (
              <View className="bg-purple-100 p-2.5 rounded-full">
                <AntDesign name="heart" size={size-6} color="#9333EA" />
              </View>
            )}
            onPress={() => {
              props.navigation.closeDrawer();
              router.push({
                pathname: '/(root)/(tabs)/(profile)',
                params: { activeTab: 'liked' }
              });
            }}
            style={{ paddingVertical: 10 }}
          />
        </View>
        
        {/* Menu Item: Saved Products - increased size */}
        <View className="bg-white rounded-xl mx-3 my-2 shadow-sm" style={{
          shadowColor: '#9333EA20',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 1,
        }}>
          <DrawerItem
            label="Saved Products"
            labelStyle={{ fontWeight: '600', color: '#474747', fontSize: 16 }}
            icon={({ size }) => (
              <View className="bg-purple-100 p-2.5 rounded-full">
                <Feather name="shopping-bag" size={size-6} color="#9333EA" />
              </View>
            )}
            onPress={() => {
              props.navigation.closeDrawer();
              router.push('/(root)/(savedProducts)');
            }}
            style={{ paddingVertical: 10 }}
          />
        </View>
        
        {/* Menu Item: Settings - increased size */}
        <View className="bg-white rounded-xl mx-3 my-2 shadow-sm" style={{
          shadowColor: '#9333EA20',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 1,
        }}>
          <DrawerItem
            label="Settings"
            labelStyle={{ fontWeight: '600', color: '#474747', fontSize: 16 }}
            icon={({ size }) => (
              <View className="bg-purple-100 p-2.5 rounded-full">
                <Ionicons name="settings-outline" size={size-6} color="#9333EA" />
              </View>
            )}
            onPress={() => {
              props.navigation.closeDrawer();
              router.push('/(root)/(auth)/selectionPage');
            }}
            style={{ paddingVertical: 10 }}
          />
        </View>
      </View>
      
      {/* App version at bottom with reduced paw prints */}
      <View className="mt-auto border-t border-gray-200 pt-3 pb-5">
        <Text className="text-center text-gray-400 text-xs">
          PalPaw v1.0.0
        </Text>
        {/* Single bottom decorative paw */}
        <View style={{ position: 'absolute', right: 20, bottom: 20, opacity: 0.4 }}>
          <FontAwesome5 name="paw" size={18} color="#7E22CE" />
        </View>
      </View>
    </DrawerContentScrollView>
  );
};

export default SearchDrawer;