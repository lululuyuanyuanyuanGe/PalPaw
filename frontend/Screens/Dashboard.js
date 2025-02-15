import React, { useState } from "react";
import { View, Button, Image, StyleSheet, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";

import Avatar from "../components/Avatar";
import UploadPic from "../components/UploadPic";


export const Dashboard = () =>{
    const navigation = useNavigation();
    const [modalVisible, setModalVisible] = useState(false);
    const [image, setImage] = useState();
    
    const showUploadModal = () => {
        console.log("Edit button pressed. Showing modal..."); // Debugging log
        setPicVisible(true); // Open modal
    };

    const uploadImage = async (mode) => {
        try {
            let result = {};
            if(mode == "gallery"){
                await ImagePicker.requestCameraPermissionsAsync();
                result = await ImagePicker;
                await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ["images"],
                    allowsEditing: true,
                    aspect:[1,1],
                    quality: 1,
                });
            }else{
                await ImagePicker.requestCameraPermissionsAsync();
                let result = await ImagePicker.launchCameraAsync({
                    cameraType: ImagePicker.CameraType.front, 
                    allowsEditing: true, 
                    aspect: [1, 1], 
                    quality: 1, 
                });
        
                if (!result.canceled) {
                    await saveImage(result.assets[0].uri);
                }
            }
        } catch (error) {
            console.error("Error picking an image:", error);
            setModalVisible(false);
        }
    };

    const saveImage = async(image) =>{
        try {    
            setImage(image);
            setModalVisible(false);
        } catch (error) {
            console.error("Error picking an image:", error);
        }
    }
    
    return(
        <View style={styles.container}>

        <Avatar uri={image} onButtonPress={() => setModalVisible(true)} />

        {/* Upload Modal */}
        <UploadPic
            modalVisible={modalVisible}
            onBackPress={() => setModalVisible(false)}
            onCameraPress={() => uploadImage("camera")}
            onGalleryPress={() => uploadImage("gallery")}
            onRemovePress={() => setImage(null)}
        />
    </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
});


export default Dashboard;