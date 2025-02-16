import React from "react";
import { View, Image, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import placeholder from "../assets/images/defaultAvatar.png"
import { colors } from "./color.js";

export const Avatar = ({ 
    uri, onButtonPress, aviOnly = false .valueOf.apply. props}) =>{
    return(
    <View>
        <TouchableOpacity onPress={onButtonPress}>
        <Image
            source={ uri? { uri } : placeholder }
            style={[
                styles.image,
                aviOnly && { height: 35, width: 35, borderWidth: 0 }]} />
        {!aviOnly && (
            <TouchableOpacity style={styles.editButton} onPress={onButtonPress}>
                <MaterialCommunityIcons
                    name="camera-outline"
                    size={30}
                    color={colors.primary}/>
            </TouchableOpacity>
        )}
        </TouchableOpacity>
    </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        position: "relative",
        backgroundColor: "#ffffff"
    },
    image: {
        borderRadius: 75,
        width: 150,
        height: 150,
        borderColor: "rgba(0,0,0,0.5)",
        borderWidth: 5,
    },
    editButton: {
        backgroundColor: "rgba(0,0,0,0.5)",
        borderRadius: 24,
        padding: 8,
        position: "absolute",
        right: 5,
        bottom: 5,
    },
});

export default Avatar;