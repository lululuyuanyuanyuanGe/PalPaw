// app/(tabs)/(homeDrawer)/_layout.tsx
import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import CustomDrawerContent from '../../../components/searchDrawer';
import { DrawerToggleButton } from '@react-navigation/drawer';

export default function HomeDrawerLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer 
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerLeft: () => <DrawerToggleButton tintColor="#0061ff" />,
        }}
      >
        <Drawer.Screen name="index" options={{ 
            drawerLabel: 'Home', 
            headerShown: false, }} />
      </Drawer>
    </GestureHandlerRootView>
  );
}
