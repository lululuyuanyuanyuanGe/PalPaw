import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StatusBar,
  ScrollView
} from "react-native";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import images from "@/constants/images";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { authService } from '@/utils/apiClient';

// Import BASE_URL constant
const BASE_URL = 'http://192.168.2.11:5001/api';

const SignupScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Set status bar style once on component mount
  useEffect(() => {
    // Set status bar to light mode (white text) on mount
    StatusBar.setBarStyle('light-content', true);
    
    return () => {
      // Reset to default when component unmounts
      StatusBar.setBarStyle('dark-content', true);
    };
  }, []);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignup = async () => {
    // Form validation
    if (!username || !email || !password) {
      Alert.alert("Signup Failed", "Username, email, and password are required.");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Signup Failed", "Please enter a valid email address.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Signup Failed", "Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Signup Failed", "Password must be at least 6 characters long.");
      return;
    }
  
    setLoading(true);
    
    try {
      console.log("Starting registration process...");
      const registrationData = {
        username: username.trim(),
        email: email.trim(),
        password,
        ...(firstName ? { firstName: firstName.trim() } : {}),
        ...(lastName ? { lastName: lastName.trim() } : {})
      };
      
      console.log("Registration data:", JSON.stringify(registrationData));
      
      // Use our improved authService that uses fetch directly
      const response = await authService.register(registrationData);
      
      console.log("Registration successful:", JSON.stringify(response.data));
      
      if (response.data.token) {
        // Store token and user info
        await AsyncStorage.setItem("authToken", response.data.token);
        await AsyncStorage.setItem("userData", JSON.stringify(response.data.user));
  
        Alert.alert("Success", "Account created successfully");
        router.replace("/(root)/(tabs)/(profile)");
      } else {
        throw new Error("No token received");
      }
    } catch (error: any) {
      console.error("Signup error details:", JSON.stringify(error, null, 2));
      
      let errorMessage = "Something went wrong. Please try again.";
      
      if (error.response) {
        // Server responded with an error status code
        const { status, data } = error.response;
        console.log(`Server responded with status ${status}:`, data);
        
        if (status === 400) {
          errorMessage = data?.message || "Invalid registration data";
          
          // Check for field-specific errors
          if (data?.field) {
            errorMessage = `${data.field === 'username' ? 'Username' : 'Email'} already exists.`;
          }
          if (data?.errors && data.errors.length > 0) {
            errorMessage = data.errors.map((e: { field: string; message: string }) => `${e.field}: ${e.message}`).join(", ");
          }
        } else if (status === 500) {
          errorMessage = data?.message || "Server error. Please try again later.";
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.log("No response received:", error.request);
        errorMessage = "Unable to connect to the server. Please check your internet connection.";
      } else {
        // Something happened in setting up the request
        console.log("Error setting up request:", error.message);
        errorMessage = error.message || "Request error. Please try again.";
      }
      
      Alert.alert("Signup Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-blue-50">
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
            Create your account
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
            autoCapitalize="none"
          />
        </View>

        {/* Email Input */}
        <View className="w-full bg-white flex-row items-center px-4 py-3.5 rounded-xl border border-purple-100 shadow-sm mb-4">
          <Feather name="mail" size={20} color="#9333EA" />
          <TextInput
            placeholder="Email"
            className="flex-1 ml-3 text-gray-700"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
        </View>

        {/* First Name Input (Optional) */}
        <View className="w-full bg-white flex-row items-center px-4 py-3.5 rounded-xl border border-purple-100 shadow-sm mb-4">
          <Feather name="user-plus" size={20} color="#9333EA" />
          <TextInput
            placeholder="First Name (Optional)"
            className="flex-1 ml-3 text-gray-700"
            placeholderTextColor="#9CA3AF"
            value={firstName}
            onChangeText={setFirstName}
          />
        </View>

        {/* Last Name Input (Optional) */}
        <View className="w-full bg-white flex-row items-center px-4 py-3.5 rounded-xl border border-purple-100 shadow-sm mb-4">
          <Feather name="users" size={20} color="#9333EA" />
          <TextInput
            placeholder="Last Name (Optional)"
            className="flex-1 ml-3 text-gray-700"
            placeholderTextColor="#9CA3AF"
            value={lastName}
            onChangeText={setLastName}
          />
        </View>

        {/* Password Input */}
        <View className="w-full bg-white flex-row items-center px-4 py-3.5 rounded-xl border border-purple-100 shadow-sm mb-4">
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

        {/* Confirm Password Input */}
        <View className="w-full bg-white flex-row items-center px-4 py-3.5 rounded-xl border border-purple-100 shadow-sm">
          <Feather name="shield" size={20} color="#9333EA" />
          <TextInput
            placeholder="Confirm Password"
            secureTextEntry
            className="flex-1 ml-3 text-gray-700"
            placeholderTextColor="#9CA3AF"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>

        {/* Sign Up Button */}
        <TouchableOpacity
          className="w-full mt-8 rounded-xl overflow-hidden shadow-sm"
          onPress={handleSignup}
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
              <Text className="text-white font-semibold text-lg">Sign Up</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Login Link */}
        <View className="flex-row mt-8 mb-8 justify-center">
          <Text className="text-gray-600">Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace("/(root)/(auth)/login")}>
            <Text className="text-purple-600 font-bold">Log In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default SignupScreen;
 