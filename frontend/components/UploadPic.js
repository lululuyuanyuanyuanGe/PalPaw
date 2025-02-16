import React from "react";
import { Modal, View, Pressable, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { colors } from "./color.js";
import StyledText from "./StyledText.js";

const UploadPic = ({
    modalVisible,
    onBackPress,
    onCameraPress,
    onGalleryPress,
    onUploadPress,
    isLoading = false,
}) => {
    return (
        <Modal animationType="slide" visible={modalVisible} transparent={true}>
            <Pressable style={styles.container} onPress={onBackPress}>
                {isLoading && <ActivityIndicator size={70} color={colors.tertiary} />}

                {!isLoading && (
                    <View style={[styles.modalView, { backgroundColor: "#ffffff" }]}>
                        <StyledText big style={{ marginBottom: 10 }}>
                            Profile Photo
                        </StyledText>

                        {/* Camera Option */}
                        <View style={styles.decisionRow}>
                            <TouchableOpacity style={styles.optionBtn} onPress={onCameraPress}>
                                <MaterialCommunityIcons
                                    name="camera-outline"
                                    size={30}
                                    color={colors.accent}
                                />
                                <StyledText small>Camera</StyledText>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.uploadBtn} onPress={onUploadPress}>
                                <MaterialCommunityIcons name="upload" size={24} color="#ffffff" />
                                <StyledText small style={{ color: "#ffffff" }}>Upload</StyledText>
                            </TouchableOpacity>

                            {/* Gallery Option */}
                            <TouchableOpacity style={styles.optionBtn} onPress={onGalleryPress}>
                                <MaterialCommunityIcons
                                    name="image-outline"
                                    size={30}
                                    color={colors.accent}
                                />
                                <StyledText small>Gallery</StyledText>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor:"rgba(0,0,0,0.1)"
    },
    modalView: {
        width: 300,
        padding: 20,
        borderRadius: 10,
        alignItems: "center",
        backgroundColor:"#ffffff",
    },
    decisionRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        backgroundColor:"#ffffff",
        marginTop: 15,
    },
    optionBtn: {
        alignItems: "center",
        padding: 10,
    },
});

export default UploadPic;
