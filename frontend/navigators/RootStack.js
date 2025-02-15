// React navigation

import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// screens

import Login from '../Screens/Login';
import Register from '../Screens/Register';
import Dashboard from '../Screens/Dashboard'
import UploadPic from '@/components/UploadPic';

const Stack = createStackNavigator();

const RootStack = () => {
    return(
            <Stack.Navigator
                screenOptions={{
                    headerStyle:{
                        backgroundColor: 'transparent',
                    },
                    headerTitle:'',
                    headerLeftContainerStyle:{
                        paddingLeft:20
                    }
                }}
                initialRouteName="Login">
                <Stack.Screen name="Login" component={Login} options={{ headerShown: false }}/>
                <Stack.Screen name="Register" component={Register} options={{ headerShown: false }} />
                <Stack.Screen name="UploadPic" component={UploadPic} options={{ headerShown: false }} />
                <Stack.Screen name="Dashboard" component={Dashboard} options={{ headerShown: false }} />
            </Stack.Navigator>
    )
}

export default RootStack;
