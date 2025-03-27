import React, {useState, useEffect, useRef} from "react";
import { View, Text, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator, StatusBar, Modal, Animated, Easing } from "react-native";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from '@/context/AuthContext';

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login, state: authState, clearError } = useAuth();
  
  // Modal states
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorTitle, setErrorTitle] = useState("Login Failed");
  const [errorMessage, setErrorMessage] = useState("");
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
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
    
    // Set status bar to light mode (white text) on mount
    StatusBar.setBarStyle('light-content', true);
    
    return () => {
      // Reset to default when component unmounts
      StatusBar.setBarStyle('dark-content', true);
    };
  }, []);
  
  // Watch for auth state changes
  useEffect(() => {
    if (authState.isAuthenticated && !loading) {
      // Show success message
      showSuccess("Login successful");
      
      // Navigate after a short delay
      setTimeout(() => {
        router.replace("/(root)/(tabs)/(profile)");
      }, 1000);
    }

    if (authState.error && !loading) {
      showError("Login Failed", authState.error);
      clearError();
    }
  }, [authState.isAuthenticated, authState.error, loading]);
  
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
  
  // Validate email format
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  // Show error modal with custom message
  const showError = (title: string, message: string) => {
    setErrorTitle(title);
    setErrorMessage(message);
    setErrorModalVisible(true);
  };
  
  // Show success modal with custom message
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setSuccessModalVisible(true);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showError("Login Failed", "Please enter your email and password.");
      return;
    }
    
    if (!validateEmail(email)) {
      showError("Login Failed", "Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      // Use AuthContext login function
      await login({ 
        email: email.trim(),

        password 
      });
    } catch (error: any) {
      // Most errors will be handled by the useEffect watching authState.error
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
            
            {/* Logo with Animation */}
            <Animated.View 
              className="w-32 h-32 rounded-full bg-white items-center justify-center mb-3 overflow-hidden" 
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 4,
                transform: [
                  { translateY }
                ]
              }}
            >
              <Animated.Image
                source={{ uri: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Cat%20Face.png' }}
                className="w-28 h-28"
                resizeMode="contain"
                style={{ 
                  transform: [
                    { scale },
                    { rotate }
                  ] 
                }}
              />
            </Animated.View>
            
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
          {/* Email Input */}
          <View className="w-full bg-white flex-row items-center px-4 py-3.5 rounded-xl border border-purple-100 shadow-sm mb-4">
            <Feather name="mail" size={20} color="#9333EA" />
            <TextInput
              placeholder="Email Address"
              className="flex-1 ml-3 text-gray-700"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
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
      
      {/* Custom Error Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={errorModalVisible}
        onRequestClose={() => setErrorModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white w-[85%] rounded-xl overflow-hidden shadow-lg">
            <View className="bg-rose-500 p-4">
              <Text className="text-lg font-rubik-medium text-white text-center">{errorTitle}</Text>
            </View>
            
            <View className="px-5 py-6 items-center">
              <View className="mb-4 bg-rose-100 p-3 rounded-full">
                <Ionicons name="alert-circle" size={36} color="#F43F5E" />
              </View>
              
              <Text className="text-base text-gray-700 font-rubik text-center mb-6">
                {errorMessage}
              </Text>
              
              <TouchableOpacity 
                onPress={() => setErrorModalVisible(false)}
                className="bg-rose-500 py-3 px-6 rounded-full"
              >
                <Text className="text-white font-rubik-medium">OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={successModalVisible}
        onRequestClose={() => {
          setSuccessModalVisible(false);
          router.replace("/(root)/(tabs)/(profile)");
        }}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white w-[85%] rounded-xl overflow-hidden shadow-lg">
            <View className="bg-purple-500 p-4">
              <Text className="text-lg font-rubik-medium text-white text-center">Success</Text>
            </View>
            
            <View className="px-5 py-6 items-center">
              <View className="mb-4 bg-green-100 p-3 rounded-full">
                <Ionicons name="checkmark-circle" size={36} color="#10B981" />
              </View>
              
              <Text className="text-base text-gray-700 font-rubik text-center mb-6">
                {successMessage}
              </Text>
              
              <TouchableOpacity 
                onPress={() => {
                  setSuccessModalVisible(false);
                  router.replace("/(root)/(tabs)/(profile)");
                }}
                className="bg-purple-500 py-3 px-6 rounded-full"
              >
                <Text className="text-white font-rubik-medium">OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default LoginScreen;
