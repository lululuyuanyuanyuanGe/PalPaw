import React, {useState} from "react";
import { View, Text, TextInput, TouchableOpacity, Image, SafeAreaView, Alert, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import images from "@/constants/images";
import { useRouter } from "expo-router";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LoginScreen: React.FC = () => {

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
      
      router.replace("/(root)/(tabs)/profile"); //  Navigate to home screen after login
    } catch (error : any) {
      Alert.alert("Login Failed", error.response?.data?.message || "Something went wrong");
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
      <Text className="text-3xl font-bold text-primary"
        style={{color: '#715D47'}}
      >PalPaw</Text>

      {/* Login Title */}
      <Text className="text-lg font-bold text-gray-700 mt-1">Login</Text>

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

      {/* Big Login Button */}
      <TouchableOpacity
        className="w-full bg-[#715D47] flex-row items-center justify-center py-4 mt-6 rounded-lg"
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <>
            <Feather name="arrow-right" size={24} color="white" />
            <Text className="text-white ml-2 font-semibold text-lg">Login</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Signup Link */}
      <View className="flex-row mt-4">
        <Text className="text-gray-600">Don't have an account yet? </Text>
        <TouchableOpacity onPress={() => router.push("/(root)/(auth)/signup")}>
          <Text className="text-primary font-bold text-brown-500">Signup!</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;
