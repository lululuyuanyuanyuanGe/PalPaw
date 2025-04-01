import React, { useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, StatusBar, Animated, Easing, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SelectionPage: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Animation values
  const fadeIn = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const catAnimation = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Fade in and slide up animation
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
    
    // Animated cat
    Animated.loop(
      Animated.timing(catAnimation, {
        toValue: 1,
        duration: 5000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
    
    // Set status bar to light mode (white text) on mount
    StatusBar.setBarStyle('light-content', true);
    
    return () => {
      // Reset to default when component unmounts
      StatusBar.setBarStyle('dark-content', true);
    };
  }, []);
  
  // Derive animated properties
  const catScale = catAnimation.interpolate({
    inputRange: [0, 0.3, 0.6, 1],
    outputRange: [1, 1.1, 1, 1], // Breathing effect
  });
  
  const catRotate = catAnimation.interpolate({
    inputRange: [0, 0.2, 0.5, 0.8, 1],
    outputRange: ['0deg', '3deg', '0deg', '-3deg', '0deg'], // Gentle wobble
  });
  
  return (
    <View className="flex-1 bg-blue-50">
      {/* Top curved gradient header */}
      <LinearGradient
        colors={['#9333EA', '#A855F7', '#C084FC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="w-full items-center"
        style={{
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
          paddingTop: insets.top || 50,
          paddingBottom: 80,
        }}
      >
        {/* Decorative elements */}
        <View style={{ position: 'absolute', right: 30, top: insets.top + 20, opacity: 0.2 }}>
          <MaterialCommunityIcons name="paw" size={60} color="#ffffff" />
        </View>
        <View style={{ position: 'absolute', left: 30, bottom: 60, opacity: 0.15 }}>
          <MaterialCommunityIcons name="paw" size={40} color="#ffffff" />
        </View>
        
        {/* Logo with Animation */}
        <Animated.View className="mt-10">
          <Animated.Image
            source={{ uri: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Cat%20Face.png' }}
            className="w-28 h-28"
            resizeMode="contain"
            style={{ 
              transform: [
                { scale: catScale },
                { rotate: catRotate }
              ] 
            }}
          />
        </Animated.View>
        
        {/* Title */}
        <Text className="text-3xl font-bold text-white mt-3">
          Settings
        </Text>
        
        <Text className="text-white opacity-80 text-base mt-1">
          Customize your PalPaw experience
        </Text>
      </LinearGradient>
      
      {/* Content - Slightly overlapping the header */}
      <ScrollView 
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Card with Reset Password option */}
        <Animated.View 
          className="bg-white rounded-3xl shadow-lg mt-[-50px] overflow-hidden"
          style={{
            opacity: fadeIn,
            transform: [{ translateY }],
            shadowColor: '#9333EA',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          {/* Card Header */}
          <View className="p-6 border-b border-purple-100">
            <Text className="text-lg font-bold text-gray-800">Account Security</Text>
            <Text className="text-gray-500 text-sm mt-1">Manage your account security settings</Text>
          </View>
          
          {/* Reset Password Button */}
          <TouchableOpacity
            className="p-6 flex-row items-center justify-between"
            onPress={() => router.push('/(root)/(auth)/resetPassword')}
          >
            <View className="flex-row items-center">
              <View className="bg-purple-100 p-3 rounded-full">
                <Feather name="lock" size={22} color="#9333EA" />
              </View>
              <View className="ml-4">
                <Text className="text-gray-800 font-semibold text-lg">Reset Password</Text>
                <Text className="text-gray-500 text-sm mt-0.5">Change your account password</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={22} color="#9333EA" />
          </TouchableOpacity>
        </Animated.View>
        
        {/* Tips Card */}
        <Animated.View 
          className="bg-white rounded-3xl shadow-md mt-6 p-6"
          style={{
            opacity: fadeIn,
            transform: [{ translateY: Animated.multiply(translateY, 1.2) }],
          }}
        >
          <View className="flex-row items-center mb-4">
            <Ionicons name="information-circle" size={24} color="#9333EA" />
            <Text className="ml-2 text-purple-800 font-bold text-lg">Security Tips</Text>
          </View>
          
          <View className="bg-purple-50 rounded-xl p-4 mb-3">
            <View className="flex-row items-start">
              <View className="bg-purple-200 p-1 rounded-full mt-1">
                <Text className="text-xs font-bold text-purple-700">1</Text>
              </View>
              <Text className="text-gray-700 ml-2 flex-1">Use a strong password with a mix of letters, numbers, and special characters</Text>
            </View>
          </View>
          
          <View className="bg-purple-50 rounded-xl p-4">
            <View className="flex-row items-start">
              <View className="bg-purple-200 p-1 rounded-full mt-1">
                <Text className="text-xs font-bold text-purple-700">2</Text>
              </View>
              <Text className="text-gray-700 ml-2 flex-1">Never share your password or account details with anyone</Text>
            </View>
          </View>
        </Animated.View>
        
        {/* Back button */}
        <TouchableOpacity 
          className="mt-8 flex-row items-center justify-center"
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={16} color="#9333EA" />
          <Text className="text-purple-600 font-medium ml-1">Back to Profile</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default SelectionPage;
