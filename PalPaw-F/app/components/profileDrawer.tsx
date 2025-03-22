import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { AntDesign, Feather, MaterialIcons, Ionicons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';

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
}

export default function ProfileDrawer() {
  // Get status bar height for proper spacing
  const statusBarHeight = Constants.statusBarHeight || 0;

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
          source={require('../../assets/images/loginPic.jpg')} 
          style={styles.profileImage} 
        />
        <Text style={styles.profileName}>Alfredo_Yu</Text>
        <Text style={styles.profileEmail}>alfredo_yu@example.com</Text>
        <TouchableOpacity style={styles.editButton}>
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Menu items */}
      <ScrollView style={styles.menuList}>
        {menuItems.map((item) => (
          <TouchableOpacity key={item.id} style={styles.menuItem}>
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
      <TouchableOpacity style={styles.logoutButton}>
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
