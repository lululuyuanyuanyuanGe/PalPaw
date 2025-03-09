import React, {useState, useEffect} from "react";
import { View, Text, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator, StatusBar } from "react-native";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import images from "@/constants/images";
import { useRouter } from "expo-router";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

const LoginScreen: React.FC = () => {
  const [username, setUsername] = useState('');
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
    if (!username || !password) {
      Alert.alert("Error", "Please enter both username and password");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post("http://192.168.2.11:5001/api/auth/login", {
        username,
        password,
      });

      const token = response.data.token;
      await AsyncStorage.setItem("authToken", token); // Store token for future requests
      
      Alert.alert("Success", "Login successful");
      router.replace("/(root)/(tabs)/(profile)");
    } catch (error : any) {
      Alert.alert("Login Failed", error.response?.data?.message || "Something went wrong");
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
        {/* Username Input */}
        <View className="w-full bg-white flex-row items-center px-4 py-3.5 rounded-xl border border-purple-100 shadow-sm mb-4">
          <Feather name="user" size={20} color="#9333EA" />
          <TextInput
            placeholder="Username"
            className="flex-1 ml-3 text-gray-700"
            placeholderTextColor="#9CA3AF"
            keyboardType="default"
            value={username}
            onChangeText={setUsername}
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
