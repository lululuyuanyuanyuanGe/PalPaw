import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';

export default function PostNotice() {
    const router = useRouter();
    const [notice, setNotice] = useState('');
    const [statusMessage, setStatusMessage] = useState('');

    const handlePostNotice = async () => {
        try {
            const response = await fetch('http://localhost:8080/api/notice/notify', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ content: notice })
            });
            const result = await response.json();
            if (response.ok) {
                setStatusMessage(result.message);
                setNotice("");
            } else {
                setStatusMessage(result.message || result.error);
            }
        } catch (err) {
            setStatusMessage("A network error Occured. Please try again.");
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Post A Volunteer Recruit Notice</Text>
            
            <TextInput
                value={notice}
                onChangeText={setNotice}
                placeholder="Describe the volunteer recruiting details"
                placeholderTextColor="#888"
                style={styles.input}
                multiline
            />

            {statusMessage !== '' && (
                            <View style={styles.statusContainer}>
                                <Text style={styles.statusMessage}>{statusMessage}</Text>
                            </View>
            )}

            <TouchableOpacity style={styles.button} onPress={handlePostNotice}>
                <Text style={styles.buttonText}>Submit Notice</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/home')}>
                <Text style={styles.switchText}> Back to Home</Text>
            </TouchableOpacity>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: 20, 
        backgroundColor: '#eeeee4' },
    header: { 
        fontSize: 22, 
        fontWeight: 'bold', 
        marginBottom: 20, 
        color: '#333', textAlign: 'center' },
    input: { 
        width: '90%', 
        height: 100, 
        borderWidth: 1, 
        borderRadius: 8, 
        borderColor: '#eab676', 
        backgroundColor: '#fff', 
        marginBottom: 15, 
        padding: 10, 
        textAlignVertical: 'top' },
    button: { 
        backgroundColor: '#eab676', 
        paddingVertical: 12, 
        paddingHorizontal: 30, 
        borderRadius: 10, 
        marginTop: 15, 
        shadowColor: '#000', 
        shadowOpacity: 0.2, 
        shadowOffset: { width: 0, height: 2 }, 
        shadowRadius: 4, 
        elevation: 3 },
    buttonText: { 
        color: 'white', 
        fontSize: 18, 
        fontWeight: 'bold' },
    statusContainer: { 
        marginTop: 5, 
        padding: 3, 
        borderWidth: 1, 
        backgroundColor: '#eeeee4', 
        borderRadius: 5, 
        borderColor: '#eeeee4', 
        alignItems: 'center' },
    statusMessage: { 
        fontSize: 14, 
        textAlign: 'center',
        color: '#333'  },
    switchText: { 
        marginTop: 15, 
        fontSize: 16, 
        color: '#eab676', 
        textDecorationLine: 'underline', 
        fontWeight: 'bold' }
});