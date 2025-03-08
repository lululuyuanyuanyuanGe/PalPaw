import React from 'react';
import { View, Text } from 'react-native';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';

const searchDrawer = (props: any) => (
  <DrawerContentScrollView {...props}>
    <View className="pt-5 px-5 border-b border-gray-200 pb-5">
      <View className="w-16 h-16 bg-gray-100 rounded-full mb-3 self-center justify-center items-center">
        <Ionicons name="person" size={32} color="#999" />
      </View>
      <Text className="text-center font-bold text-lg">Log in</Text>
      <Text className="text-center text-gray-500 text-xs mt-1">
        Discover more after logging in
      </Text>
    </View>

    <DrawerItem
      label="Scan"
      icon={({ color, size }) => <Ionicons name="qr-code-outline" size={size} color={color} />}
      onPress={() => {}}
    />
    <DrawerItem
      label="Settings"
      icon={({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />}
      onPress={() => {}}
    />
    <DrawerItem
      label="Help Center"
      icon={({ color, size }) => <Ionicons name="help-circle-outline" size={size} color={color} />}
      onPress={() => {}}
    />
    <DrawerItem
      label="User Agreement"
      icon={({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} />}
      onPress={() => {}}
    />
    <DrawerItem
      label="Privacy Policy"
      icon={({ color, size }) => <Ionicons name="shield-outline" size={size} color={color} />}
      onPress={() => {}}
    />
  </DrawerContentScrollView>
);

export default searchDrawer;
