import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Animated,
  Easing,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

interface AuthPromptProps {
  statusBarHeight: number;
}

/**
 * AuthPrompt Component
 * 
 * This component displays a UI for non-authenticated users with options to log in or sign up.
 * It's designed to be used in the profile page when a user is not logged in.
 */
const AuthPrompt: React.FC<AuthPromptProps> = ({ statusBarHeight }) => {
  const router = useRouter();

  // Animation values
  const animation = useRef(new Animated.Value(0)).current;
  
  // Set up animations on component mount
  useEffect(() => {
    // Start animated sequence
    Animated.loop(
      Animated.timing(animation, {
        toValue: 1,
        duration: 5000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);
  
  // Derive animated properties from the single animation value
  const translateY = animation.interpolate({
    inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
    outputRange: [0, -7, 0, -7, 0, 0], // Bounce up and down
  });
  
  const scale = animation.interpolate({
    inputRange: [0, 0.1, 0.3, 0.4, 0.5, 0.6, 0.8, 1],
    outputRange: [1, 1.1, 1.05, 1.1, 1, 1.05, 1, 1], // Pulse effect
  });
  
  const rotate = animation.interpolate({
    inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
    outputRange: ['0deg', '2deg', '0deg', '-2deg', '0deg', '2deg', '0deg', '-2deg', '0deg', '2deg', '0deg'], // Wobble
  });

  return (
    <SafeAreaView className="flex-1 bg-blue-50">
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      
      <LinearGradient
        colors={['#9333EA', '#C084FC']}
        className="w-full h-full"
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View className="flex-1 items-center justify-center px-8">
          {/* App Logo - Using cute cat image with animation */}
          <View className="items-center mb-12">
            <Animated.View 
              className="w-40 h-40 bg-white rounded-full items-center justify-center mb-6 shadow-xl overflow-hidden" 
              style={{ 
                elevation: 8, 
                shadowColor: '#000', 
                shadowOffset: { width: 0, height: 4 }, 
                shadowOpacity: 0.3, 
                shadowRadius: 6,
                transform: [
                  { translateY },
                ]
              }}
            >
              <Animated.Image
                source={{ uri: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Cat%20Face.png' }}
                className="w-36 h-36"
                resizeMode="contain"
                style={{ 
                  transform: [
                    { scale },
                    { rotate }
                  ] 
                }}
              />
            </Animated.View>
            
            <Text className="text-white font-bold text-3xl">PalPaw</Text>
            <Text className="text-white text-opacity-80 text-lg mt-1">Find your perfect pet companion</Text>
          </View>
          
          {/* Login Button */}
          <TouchableOpacity 
            className="bg-white w-full py-4 rounded-xl mb-4 items-center shadow-md"
            onPress={() => router.push("/(root)/(auth)/login")}
          >
            <Text className="text-purple-700 font-bold text-lg">Log In</Text>
          </TouchableOpacity>
          
          {/* Signup Button */}
          <TouchableOpacity 
            className="bg-purple-900 bg-opacity-40 border border-white w-full py-4 rounded-xl items-center shadow-md"
            onPress={() => router.push("/(root)/(auth)/signup")}
          >
            <Text className="text-white font-bold text-lg">Sign Up</Text>
          </TouchableOpacity>
          
          {/* Additional Text */}
          <Text className="text-white text-opacity-80 text-center mt-10 px-4">
            Create an account to share photos and shop products for your furry friends
          </Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default AuthPrompt; 