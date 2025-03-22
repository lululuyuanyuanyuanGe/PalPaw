import React, {useState, useEffect} from "react";
import { View, Text, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator, StatusBar } from "react-native";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import images from "@/constants/images";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { authService } from '@/utils/apiClient';

const LoginScreen: React.FC = () => {
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  // Set status bar style once on component mount
  useEffect(() => {
    // Set status bar to light mode (white text) on mount
    StatusBar.setBarStyle('light-content', true);
    
    return () => {
      // Reset to default when component unmounts
      StatusBar.setBarStyle('dark-content', true);
    };
  }, []);

  const handleLogin = async () => {
    if (!loginIdentifier || !password) {
      Alert.alert("Login Failed", "Please enter your email/username and password.");
      return;
    }

    setLoading(true);

    try {
      // Backend expects { login: "username_or_email", password: "password" }
      const loginData = {
        login: loginIdentifier.trim(),
        password
      };

      console.log('Sending login data:', JSON.stringify(loginData));
      
      const response = await authService.login(loginData);
      
      console.log('Login successful:', JSON.stringify(response.data));

      if (response.data && response.data.token) {
        await AsyncStorage.setItem("authToken", response.data.token);
        await AsyncStorage.setItem("userData", JSON.stringify(response.data.user));
        
        // Navigate to the main app
        router.replace("/(root)/(tabs)/(profile)");
      }
    } catch (error: any) {
      console.error('Login error details:', JSON.stringify(error, null, 2));
      
      let errorMessage = "Something went wrong. Please try again.";
      
      if (error.response) {
        // Server responded with an error status code
        const { status, data } = error.response;
        console.log(`Server responded with status ${status}:`, data);
        
        if (status === 400 || status === 401) {
          errorMessage = data?.message || "Invalid credentials";
        } else if (status === 500) {
          errorMessage = "Server error. Please try again later.";
        }
      } else if (error.request) {
        // Request was made but no response was received
        console.log("No response received:", error.request);
        errorMessage = "Unable to connect to the server. Please check your internet connection.";
      } else {
        // Something happened in setting up the request
        console.log("Error setting up request:", error.message);
      }
      
      Alert.alert("Login Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-blue-50">
      {/* Top curved gradient header */}
      <View className="w-full overflow-hidden">
        <LinearGradient
          colors={['#9333EA', '#A855F7', '#C084FC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="w-full items-center"
          style={{
            borderBottomLeftRadius: 30,
            borderBottomRightRadius: 30,
            paddingTop: 50, // Simple fixed padding to avoid status bar
            paddingBottom: 25,
          }}
        >
          {/* Decorative paw icon */}
          <View style={{ 
            position: 'absolute', 
            right: 40, 
            top: 50, 
            opacity: 0.2 
          }}>
            <MaterialCommunityIcons name="paw" size={60} color="#ffffff" />
          </View>
          
          {/* Logo */}
          <View className="w-28 h-28 rounded-full bg-white items-center justify-center mb-3" 
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 4,
            }}
          >
            <Image
              source={images.loginPic}
              className="w-24 h-24 rounded-full"
              resizeMode="cover"
            />
          </View>
          
          {/* App Name */}
          <Text className="text-3xl font-bold text-white">
            PalPaw
          </Text>
          
          <Text className="text-white opacity-80 text-base mt-1">
            Login to your account
          </Text>
        </LinearGradient>
      </View>
      
      <View className="flex-1 px-6 pt-8">
        {/* Username/Email Input */}
        <View className="w-full bg-white flex-row items-center px-4 py-3.5 rounded-xl border border-purple-100 shadow-sm mb-4">
          <Feather name="user" size={20} color="#9333EA" />
          <TextInput
            placeholder="Username or Email"
            className="flex-1 ml-3 text-gray-700"
            placeholderTextColor="#9CA3AF"
            keyboardType="default"
            value={loginIdentifier}
            onChangeText={setLoginIdentifier}
            autoCapitalize="none"
          />
        </View>

        {/* Password Input */}
        <View className="w-full bg-white flex-row items-center px-4 py-3.5 rounded-xl border border-purple-100 shadow-sm">
          <Feather name="lock" size={20} color="#9333EA" />
          <TextInput
            placeholder="Password"
            secureTextEntry
            className="flex-1 ml-3 text-gray-700"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {/* Forgot Password link */}
        <TouchableOpacity className="self-end mt-2">
          <Text className="text-purple-500 font-medium">Forgot Password?</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity
          className="w-full mt-8 rounded-xl overflow-hidden shadow-sm"
          onPress={handleLogin}
          disabled={loading}
        >
          <LinearGradient
            colors={['#9333EA', '#C084FC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="py-4 items-center justify-center"
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-semibold text-lg">Log In</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Social login options (placeholders) */}
        <View className="flex-row items-center mt-8 mb-6">
          <View className="flex-1 h-0.5 bg-gray-200" />
          <Text className="mx-4 text-gray-500">Or continue with</Text>
          <View className="flex-1 h-0.5 bg-gray-200" />
        </View>
        
        <View className="flex-row justify-center space-x-6">
          <TouchableOpacity className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-sm border border-gray-100">
            <Ionicons name="logo-google" size={24} color="#DB4437" />
          </TouchableOpacity>
          <TouchableOpacity className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-sm border border-gray-100">
            <Ionicons name="logo-apple" size={24} color="black" />
          </TouchableOpacity>
          <TouchableOpacity className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-sm border border-gray-100">
            <Ionicons name="logo-facebook" size={24} color="#4267B2" />
          </TouchableOpacity>
        </View>

        {/* Signup Link */}
        <View className="flex-row mt-auto mb-8 justify-center">
          <Text className="text-gray-600">Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.replace("/(root)/(auth)/signup")}>
            <Text className="text-purple-600 font-bold">Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default LoginScreen;
