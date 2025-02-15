import { View } from 'react-native';
import React from 'react';
import { Button, Text } from 'react-native-elements';
import { useRouter } from "expo-router";
import center_login from './center_login';
import center_register from './center_register';


export default function Welcome() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#eacf7c' }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', color: "#624607" }}>Welcome to Palpaw family! </Text>
      <Button
      title="Login" 
      titleStyle={{ color: "#b97422" }}
      buttonStyle={{ backgroundColor: "white"}}
      containerStyle={{ marginVertical: 10, width: 200}} 
      onPress={() => router.push('/center_login')} 
      />
      <Button 
      title="Register" 
      titleStyle={{ color: "#b97422" }}
      buttonStyle={{ backgroundColor: "white" }}
      containerStyle={{ width: 200}} 
      onPress={() => router.push('/center_register')} />
    </View>
  );

}
