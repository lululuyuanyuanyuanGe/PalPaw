// app/(tabs)/(homeDrawer)/_layout.tsx
import { Drawer } from 'expo-router/drawer';
import { DrawerToggleButton } from '@react-navigation/drawer';
import ProfileDrawer from '@/app/components/profileDrawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function ProfileLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer 
        drawerContent={() => <ProfileDrawer />}
        screenOptions={{
          headerLeft: () => <DrawerToggleButton tintColor="#A45EE5" />,
        }}
      >
        <Drawer.Screen 
          name="index" 
          options={{ 
            drawerLabel: 'Profile', 
            headerShown: false,
            title: "Profile"
          }} 
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
