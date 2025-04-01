import React, {useState, useEffect, useRef} from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StatusBar, Modal, Animated, Easing, ScrollView } from "react-native";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/apiClient';

const ResetPasswordScreen: React.FC = () => {
  // Form state
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const router = useRouter();
  
  // Modal states
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorTitle, setErrorTitle] = useState("Reset Failed");
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
  
  // Derive animated properties from the single animation value - using matching array lengths
  const translateY = animation.interpolate({
    inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
    outputRange: [0, -7, 0, -7, 0, 0],
  });
  
  const scale = animation.interpolate({
    inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
    outputRange: [1, 1.1, 1, 1.1, 1, 1],
  });
  
  const rotate = animation.interpolate({
    inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
    outputRange: ['0deg', '2deg', '-2deg', '2deg', '-2deg', '0deg'],
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

  // Handle password reset
  const handleResetPassword = async () => {
    // Validate inputs
    if (!email) {
      showError("Reset Failed", "Please enter your email address.");
      return;
    }
    
    if (!validateEmail(email)) {
      showError("Reset Failed", "Please enter a valid email address.");
      return;
    }
    
    if (!currentPassword) {
      showError("Reset Failed", "Please enter your current password.");
      return;
    }
    
    if (!newPassword) {
      showError("Reset Failed", "Please enter a new password.");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      showError("Reset Failed", "New passwords do not match.");
      return;
    }
    
    if (currentPassword === newPassword) {
      showError("Reset Failed", "New password must be different from current password.");
      return;
    }

    setLoading(true);

    try {
      // Call your API to reset the password
      const response = await api.post('/users/reset-password', { 
        email: email.trim(),
        currentPassword,
        newPassword
      });
      
      if (response.data.success) {
        showSuccess("Password reset successfully");
        
        // Navigate to login after a short delay
        setTimeout(() => {
          router.replace("/(root)/(auth)/login");
        }, 2000);
      } else {
        showError("Reset Failed", response.data.message || "Failed to reset password.");
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      showError("Reset Failed", error.response?.data?.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
              Change Your Password
            </Text>
          </LinearGradient>
        </View>
        
        <View className="flex-1 px-6 pt-8 pb-8">
          {/* Instructions */}
          <Text className="text-gray-600 mb-6 text-center">
            Enter your email, current password, and set a new password
          </Text>

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

          {/* Current Password Input */}
          <View className="w-full bg-white flex-row items-center px-4 py-3.5 rounded-xl border border-purple-100 shadow-sm mb-4">
            <Feather name="lock" size={20} color="#9333EA" />
            <TextInput
              placeholder="Current Password"
              secureTextEntry={!showCurrentPassword}
              className="flex-1 ml-3 text-gray-700"
              placeholderTextColor="#9CA3AF"
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
              <Feather name={showCurrentPassword ? "eye-off" : "eye"} size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* New Password Input */}
          <View className="w-full bg-white flex-row items-center px-4 py-3.5 rounded-xl border border-purple-100 shadow-sm mb-4">
            <Feather name="key" size={20} color="#9333EA" />
            <TextInput
              placeholder="New Password"
              secureTextEntry={!showNewPassword}
              className="flex-1 ml-3 text-gray-700"
              placeholderTextColor="#9CA3AF"
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
              <Feather name={showNewPassword ? "eye-off" : "eye"} size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Confirm Password Input */}
          <View className="w-full bg-white flex-row items-center px-4 py-3.5 rounded-xl border border-purple-100 shadow-sm mb-4">
            <Feather name="key" size={20} color="#9333EA" />
            <TextInput
              placeholder="Confirm New Password"
              secureTextEntry={!showConfirmPassword}
              className="flex-1 ml-3 text-gray-700"
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Feather name={showConfirmPassword ? "eye-off" : "eye"} size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Reset Password Button */}
          <TouchableOpacity
            className="w-full mt-6 rounded-xl overflow-hidden shadow-sm"
            onPress={handleResetPassword}
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
                <Text className="text-white font-semibold text-lg">Change Password</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Login Link */}
          <View className="flex-row mt-8 justify-center">
            <Text className="text-gray-600">Remember your password? </Text>
            <TouchableOpacity onPress={() => router.replace("/(root)/(auth)/login")}>
              <Text className="text-purple-600 font-bold">Log In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      
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
        onRequestClose={() => setSuccessModalVisible(false)}
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
                onPress={() => setSuccessModalVisible(false)}
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

export default ResetPasswordScreen;
