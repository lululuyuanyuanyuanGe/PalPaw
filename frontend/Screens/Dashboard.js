import React, { useState } from "react";
import { View, Button, Image, StyleSheet, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";

import Avatar from "../components/Avatar";
import UploadPic from "../components/UploadPic";
import WebcamComponent from "../components/WebcamComponent"; // Import the WebcamComponent
import { Platform } from 'react-native';


export const Dashboard = () =>{
    const navigation = useNavigation();
    const [modalVisible, setModalVisible] = useState(false);
    const [image, setImage] = useState();
    const [webcamVisible, setWebcamVisible] = useState(false);
    
    const showUploadModal = () => {
        console.log("Edit button pressed. Showing modal..."); // Debugging log
        setPicVisible(true); // Open modal
    };
    
    const uploadImage = async (mode) => {
        try {
            let result = {};
            if(mode == "gallery"){
                await ImagePicker.requestMediaLibraryPermissionsAsync();
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes:'Images',
                    allowsEditing: true,
                    aspect:[1,1],
                    quality: 1,
                });
                if (!result.canceled) {
                    await saveImage(result.assets[0].uri);
                }
            }else{
                if (Platform.OS === 'web') {
                    setModalVisible(false); 
                    setWebcamVisible(true); 
                    return;
                }
                const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            
                //await ImagePicker.requestCameraPermissionsAsync();

                if (permissionResult.granted === false) {
                    alert("Permission to access camera is required!");
                    return;
                }

                
                result = await ImagePicker.launchCameraAsync({
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
            setWebcamVisible(false);
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
            onUploadPress={() => handleUpload()}
            onRemovePress={() => setImage(null)}/>
            {Platform.OS === 'web' && webcamVisible && (
                <WebcamComponent onCapture={(imageSrc) => saveImage(imageSrc)} />
            )}
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