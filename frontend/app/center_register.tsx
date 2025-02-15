
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from "expo-router";



export default function CenterRegister() {
    const router = useRouter();
    const [statusMessage, setStatusMessage] = useState('');
    const [centername, setCentername] = useState('');
    const [password, setPassword] = useState('');
    const apiURL = "http://localhost:8081/";

    const register = async () => {
        setStatusMessage('');
        try{
            const result = await fetch(`http://localhost:8080/api/centers/register`, {
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                credentials: "include"
                },
                credentials: 'include',
                body: JSON.stringify({ centername: centername, password: password })
                });
                const response = await result.json();
                console.log("API Response:", response); 
                if (result.ok){
                    setStatusMessage("Registered sucessfully. Welcome!");
                }
                else {
                    setStatusMessage(response.error ||response.message);
                }       
        }catch(err){
            setStatusMessage('Network Error. Please try again later or check your connection')
            }};
    
    return (
        <View style={styles.container}>
        <Text style={styles.header}>
            Join Palpaw's Wildlife Community!
        </Text>

        <TextInput
            value={centername}
            onChangeText={setCentername}
            placeholder="Wildlife Center Name"
            placeholderTextColor="#888"
            style={styles.input}
        />

        <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Set Your Password"
            placeholderTextColor="#888"
            secureTextEntry
            style={styles.input}
        />
        
        {statusMessage !== '' && (
            <View style={styles.statusContainer}>
                <Text style={[
                    styles.statusMessage
                ]}>
                    {statusMessage}
                </Text>
            </View>
        )}
        <TouchableOpacity style={styles.button} onPress={register}>
            <Text style={styles.buttonText}>Register</Text>
        </TouchableOpacity>



        <TouchableOpacity onPress={() => router.push('/center_login')}>
            <Text style={styles.switchText}>Already have an account yet? Sign up HERE</Text>
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
        backgroundColor: '#eeeee4'
    },  
    header: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    color: '#b97422', 
    textAlign: 'center' 
    },
    switchText: {
        marginTop: 15,
        fontSize: 16,
        color: '#eab676',
        textDecorationLine: 'underline',
        fontWeight: 'bold'
    },

    input:{
        width: '90%',
        height: 50,
        borderWidth: 1,
        borderRadius: 8,
        borderColor: '#eab676',
        backgroundColor: '#fff',
        marginBottom: 15
    },
        button: { 
        backgroundColor: '#eab676', 
        paddingVertical: 12, 
        paddingHorizontal: 30, 
        borderRadius: 10, 
        marginTop: 10, 
        shadowColor: '#000', 
        shadowOpacity: 0.2, 
        shadowOffset: { width: 0, height: 2 }, 
        shadowRadius: 4, 
        elevation: 3 
    },
    buttonText: { 
        color: 'white', 
        fontSize: 18, 
        fontWeight: 'bold' 
    },
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

});