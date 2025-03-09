import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const SearchDrawer = (props: any) => {
  const router = useRouter();

  // Handle login navigation
  const handleLogin = () => {
    // Use proper route format for Expo Router
    router.push('/(root)/(auth)/login');
  };

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
          {/* Decorative elements */}
          <View style={{ 
            position: 'absolute', 
            right: 15, 
            top: 20, 
            opacity: 0.2 
          }}>
            <MaterialCommunityIcons name="paw" size={60} color="#ffffff" />
          </View>
          <View style={{ 
            position: 'absolute', 
            left: 20, 
            bottom: 40, 
            opacity: 0.15 
          }}>
            <MaterialCommunityIcons name="paw" size={40} color="#ffffff" />
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
              <View className="w-16 h-16 bg-purple-100 rounded-full items-center justify-center">
                <Ionicons name="paw" size={34} color="#9333EA" />
              </View>
            </View>
          </View>
          
          {/* Login button with shadow */}
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
          
          <Text className="text-center text-white text-xs mt-3 mb-1 opacity-80">
            Discover more features after logging in
          </Text>
        </LinearGradient>
      </View>

      {/* Menu items with custom colors */}
      <View className="mt-3 px-2">
        <DrawerItem
          label="My Pets"
          labelStyle={{ fontWeight: '500', color: '#474747' }}
          icon={({ size }) => (
            <MaterialCommunityIcons name="paw" size={size} color="#9333EA" />
          )}
          onPress={() => {
            props.navigation.closeDrawer();
            // Use a proper route format or a relative path
            router.push('/');
          }}
          style={{ paddingVertical: 4 }}
        />
        
        <DrawerItem
          label="Scan QR Code"
          labelStyle={{ fontWeight: '500', color: '#474747' }}
          icon={({ size }) => (
            <Ionicons name="qr-code-outline" size={size} color="#9333EA" />
          )}
          onPress={() => {
            props.navigation.closeDrawer();
          }}
          style={{ paddingVertical: 4 }}
        />
        
        <DrawerItem
          label="Notifications"
          labelStyle={{ fontWeight: '500', color: '#474747' }}
          icon={({ size }) => (
            <Ionicons name="notifications-outline" size={size} color="#9333EA" />
          )}
          onPress={() => {
            props.navigation.closeDrawer();
            // Use a proper route format or a relative path
            router.push('/');
          }}
          style={{ paddingVertical: 4 }}
        />
        
        <View className="border-t border-gray-200 my-2 mx-5" />
        
        <DrawerItem
          label="Settings"
          labelStyle={{ fontWeight: '500', color: '#474747' }}
          icon={({ size }) => (
            <Ionicons name="settings-outline" size={size} color="#9333EA" />
          )}
          onPress={() => {
            props.navigation.closeDrawer();
            // Use a proper route format or a relative path
            router.push('/');
          }}
          style={{ paddingVertical: 4 }}
        />
        
        <DrawerItem
          label="Help Center"
          labelStyle={{ fontWeight: '500', color: '#474747' }}
          icon={({ size }) => (
            <Ionicons name="help-circle-outline" size={size} color="#9333EA" />
          )}
          onPress={() => {
            props.navigation.closeDrawer();
          }}
          style={{ paddingVertical: 4 }}
        />
        
        <DrawerItem
          label="User Agreement"
          labelStyle={{ fontWeight: '500', color: '#474747' }}
          icon={({ size }) => (
            <Ionicons name="document-text-outline" size={size} color="#9333EA" />
          )}
          onPress={() => {
            props.navigation.closeDrawer();
          }}
          style={{ paddingVertical: 4 }}
        />
        
        <DrawerItem
          label="Privacy Policy"
          labelStyle={{ fontWeight: '500', color: '#474747' }}
          icon={({ size }) => (
            <Ionicons name="shield-outline" size={size} color="#9333EA" />
          )}
          onPress={() => {
            props.navigation.closeDrawer();
          }}
          style={{ paddingVertical: 4 }}
        />
      </View>
      
      {/* App version at bottom */}
      <View className="mt-auto border-t border-gray-200 pt-3 pb-5">
        <Text className="text-center text-gray-400 text-xs">
          PalPaw v1.0.0
        </Text>
      </View>
    </DrawerContentScrollView>
  );
};

export default SearchDrawer;