import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import images from "@/constants/images";
import { router } from "expo-router";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SignupScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async () => {
    if (!username || !password) {
      Alert.alert("Signup Failed", "All fields are required.");
      return;
    }
  
    setLoading(true);
  
    try {
      const response = await axios.post("http://192.168.2.11:5001/api/auth/signup", {
        username: username,
        password: password,
      });
  
      if (response.data.success) {
        //  Store user token in AsyncStorage for persistent login
        await AsyncStorage.setItem("authToken", response.data.token);
  
        Alert.alert("Signup Successful", "You can now log in.");
        
        //  Redirect to home or login page
        router.replace("/home"); 
      } else {
        Alert.alert("Signup Failed", response.data.message);
      }
    } catch (error: any) {
      Alert.alert("Signup Failed", error.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-white px-6">
      {/* Logo */}
      <Image
        source={images.loginPic}
        className="w-24 h-24 mb-10 rounded-full"
        resizeMode="cover"
      />

      {/* App Name */}
      <Text className="text-3xl font-bold text-primary" style={{ color: "#715D47" }}>
        PalPaw
      </Text>

      {/* Signup Title */}
      <Text className="text-lg font-bold text-gray-700 mt-1">Sign Up</Text>

      {/* Username Input */}
      <View className="w-full bg-yellow-100 flex-row items-center px-3 py-3 mt-4 rounded-lg">
        <Feather name="user" size={20} color="brown" />
        <TextInput
          placeholder="Enter your Username"
          className="flex-1 ml-2 text-gray-700"
          placeholderTextColor="gray"
          keyboardType="default"
          value={username}
          onChangeText={setUsername}
        />
      </View>

      {/* Password Input */}
      <View className="w-full bg-yellow-100 flex-row items-center px-3 py-3 mt-3 rounded-lg">
        <Feather name="lock" size={20} color="brown" />
        <TextInput
          placeholder="Enter your Password"
          secureTextEntry
          className="flex-1 ml-2 text-gray-700"
          placeholderTextColor="gray"
          value={password}
          onChangeText={setPassword}
        />
      </View>

      {/* Big Signup Button */}
      <TouchableOpacity
        className="w-full bg-[#715D47] flex-row items-center justify-center py-4 mt-6 rounded-lg"
        onPress={handleSignup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <>
            <Feather name="arrow-right" size={24} color="white" />
            <Text className="text-white ml-2 font-semibold text-lg">Sign Up</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Login Link */}
      <View className="flex-row mt-4">
        <Text className="text-gray-600">Already have an account? </Text>
        <TouchableOpacity onPress={() => router.replace("/(root)/(auth)/login")}>
          <Text className="text-primary font-bold text-brown-500">Login!</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default SignupScreen;
 