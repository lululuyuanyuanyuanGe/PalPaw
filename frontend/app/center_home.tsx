import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import PopupNotice from './components/PopupNotice';
import { TouchableOpacity } from 'react-native';
//import NoticeBoard from './components/RecruitBoard';
import RecruitBoard from './components/RecruitBoard';

export default function Home() {
    const [statusMessage, setStatusMessage] = useState('');
    const router = useRouter();

    const logout = async () => {
        //setStatusMessage('');
        try {
            const response = await fetch('http://localhost:8080/api/centers/logout', {
                method: 'DELETE',
                credentials: 'include'
            });
            const result = await response.json();
            if (response.ok) {
                console.log(response)
                setStatusMessage(result.message);
                //redirect to login page
                setTimeout(() => {
                    router.replace('/center_login');
                }, 1000);
            } else {
                console.log(response)
                setStatusMessage(result.error ||result.message);
            }
        } catch (error) {
            setStatusMessage('Network Error. Please try again later or check your connection')
        }
    };

    return (
        <View style={styles.container}>
            <RecruitBoard />
            <Text style={styles.header}>Welcome to PalPaw! </Text>
            <TouchableOpacity style={styles.noticeButton} onPress={() => router.push('/center_notify')}>
            <Text style={styles.noticeButtonText}> Post Notice</Text>
            </TouchableOpacity>
            <Button title="Log out" onPress={logout} color="#eacf7c" />
            {statusMessage !== '' && (
                <Text style={styles.statusMessage}>{statusMessage}</Text>
            )}

        </View>
        
    );
}

const styles = StyleSheet.create({
    statusMessage: { 
        fontSize: 14, 
        textAlign: 'center',
        color: '#333'  },
    container: { flex: 1,
         justifyContent: 'center', 
         alignItems: 'center', 
         backgroundColor: '#eeeee4', 
         padding: 20 },
    header: { 
        fontSize: 24, 
        fontWeight: 'bold', 
        color: '#b97422', 
        marginBottom: 10 },
    noticeButton: { 
        backgroundColor: '#eacf7c', 
        padding: 10,
         borderRadius: 6, 
         marginTop: 10, 
         marginBottom: 10 },
    noticeButtonText: { 
        color: 'white', 
        fontSize: 18, 
        fontWeight: 'bold' }
});