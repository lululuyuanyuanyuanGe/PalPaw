import { View, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";

import Login from "./Screens/Login.js"; 
import Register from "./Screens/Register.js"
import Dashboard from "./Screens/Dashboard.js"
import RootStack from '../navigators/RootStack.js'
import UploadPic from "../components/UploadPic";


export default function App() {
   //return <Login />;
    return <Register />;
//<NavigationContainer>
        //<RootStack />
    //</NavigationContainer>
};


