import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { AntDesign, Feather, MaterialIcons, Ionicons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

// Define colors directly since we don't have access to constants/Colors
const colors = {
  primary: '#A45EE5',
  primaryLighter: '#C17CEF',
};

// Menu item type definition
interface MenuItem {
  id: string;
  icon: JSX.Element;
  label: string;
  badge?: number;
  onPress?: () => void;
}

interface User {
  username: string;
  email: string;
  avatar?: string;
}

export default function ProfileDrawer() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  // Check authentication status when component mounts
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        const userDataStr = await AsyncStorage.getItem('userData');
        
        if (token && userDataStr) {
          setIsAuthenticated(true);
          const userData = JSON.parse(userDataStr);
          setUser({
            username: userData.username || 'User',
            email: userData.email || 'user@example.com',
            avatar: userData.avatar
          });
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error("Error checking authentication in drawer:", error);
        setIsAuthenticated(false);
        setUser(null);
      }
    };
    
    checkAuth();
  }, []);

  // Get status bar height for proper spacing
  const statusBarHeight = Constants.statusBarHeight || 0;

  // Handle logout
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
      setIsAuthenticated(false);
      setUser(null);
      router.replace("/");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // Menu items data
  const menuItems: MenuItem[] = [
    { 
      id: 'messages', 
      icon: <Feather name="message-circle" size={24} color="#333" />, 
      label: 'Messages', 
      badge: 3 
    },
    { 
      id: 'notifications', 
      icon: <Ionicons name="notifications-outline" size={24} color="#333" />, 
      label: 'Notifications', 
      badge: 5 
    },
    { 
      id: 'orders', 
      icon: <Feather name="shopping-bag" size={24} color="#333" />, 
      label: 'Orders', 
      badge: 2 
    },
    { 
      id: 'favorites', 
      icon: <AntDesign name="heart" size={24} color="#333" />, 
      label: 'Favorites' 
    },
    { 
      id: 'payments', 
      icon: <MaterialIcons name="payment" size={24} color="#333" />, 
      label: 'Payment Methods' 
    },
    { 
      id: 'myShop', 
      icon: <FontAwesome name="shopping-basket" size={22} color="#333" />, 
      label: 'My Shop' 
    },
    { 
      id: 'switchAccount', 
      icon: <MaterialCommunityIcons name="account-switch" size={24} color="#333" />, 
      label: 'Switch Account' 
    },
    { 
      id: 'settings', 
      icon: <Ionicons name="settings-outline" size={24} color="#333" />, 
      label: 'Settings' 
    },
    { 
      id: 'help', 
      icon: <Feather name="help-circle" size={24} color="#333" />, 
      label: 'Help & Support' 
    }
  ];

  // If not authenticated, return empty drawer
  if (!isAuthenticated || !user) {
    return (
      <View style={styles.emptyContainer}>
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={() => router.push('/(root)/(auth)/login')}
        >
          <Text style={styles.loginButtonText}>Log In to Access Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Regular drawer UI for authenticated users
  return (
    <View style={styles.container}>
      {/* User profile section */}
      <LinearGradient
        colors={[colors.primary, colors.primaryLighter]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.profileHeader, { paddingTop: statusBarHeight + 20 }]}
      >
        <Image 
          source={user.avatar 
            ? { uri: `http://192.168.2.11:5001${user.avatar}` } 
            : require('../../assets/images/loginPic.jpg')} 
          style={styles.profileImage} 
        />
        <Text style={styles.profileName}>{user.username}</Text>
        <Text style={styles.profileEmail}>{user.email}</Text>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => router.push('/(root)/(tabs)/(profile)')}
        >
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Menu items */}
      <ScrollView style={styles.menuList}>
        {menuItems.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <View style={styles.menuItemLeft}>
              {item.icon}
              <Text style={styles.menuItemLabel}>{item.label}</Text>
            </View>
            {item.badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Logout button */}
      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Feather name="log-out" size={24} color={colors.primary} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginButton: {
    backgroundColor: '#A45EE5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileHeader: {
    padding: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
    borderWidth: 3,
    borderColor: 'white',
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 15,
  },
  editButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 5,
  },
  editButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  menuList: {
    flex: 1,
    padding: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemLabel: {
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
  },
  badge: {
    backgroundColor: colors.primary,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  logoutText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});
