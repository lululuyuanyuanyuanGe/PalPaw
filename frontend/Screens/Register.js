import React from "react";
import { ErrorMessage, Formik } from "formik";
import { View, StatusBar, Alert } from "react-native";
import { Octicons, Ionicons, Fontisto } from "@expo/vector-icons";
import axios from "axios";
import { useState } from 'react';

import {
  StyledContainer,
  InnerContainer,
  PageLogo,
  Title,
  Subtitle,
  ButtonText,
  StyledButton,
  LeftIcon,
  RightIcon,
  StyledInputLabel,
  StyledTextInput,
  MsgBox,
  Line,
  TextLinkContent,
  TextLink,
  ExtraText,
  ExtraView,
} from '../components/style';

import { Colors } from '../components/style';

const { brand, darkLight, primary } = Colors;

export const Register = ({ navigation }) => {
  const [errorMessage, setErrorMessage] = useState("");
 
  const handleRegister = async (values) => {
    const { username, password } = values;

    try {
      const response = await axios.post("http://10.0.0.234:5001/register", {
        username,
        password,
      });

      if(username == '' || password == ''){
        setErrorMessage("Please fil out all fields");
      }

      if (response.data.success) {
        Alert.alert("Success", "User registered successfully!");
        navigation.navigate("Login"); // Redirect to login page after successful registration
      } else {
        setErrorMessage(response.data.message || "Username already exists");
      }
    } catch (error) {
      console.error("Registration error:", error);
      setErrorMessage("An error occurred. Please try again.");
    }
  };

  return (
    <StyledContainer>
      <StatusBar barStyle="dark-content" />
      <InnerContainer>
        <PageLogo resizeMode="cover" source={require("../assets/images/loginPic.jpg")} />
        <Title>PalPaw</Title>
        <Subtitle>Register</Subtitle>

        <Formik
          initialValues={{ username: "", password: "" }}
          onSubmit={handleRegister} 
        >
          {({ handleChange, handleBlur, handleSubmit, values }) => (
            <View>
              <TextInput
                label="Username"
                icon="person"
                placeholder="Enter your Username"
                placeholderTextColor={darkLight}
                onChangeText={handleChange("username")}
                onBlur={handleBlur("username")}
                value={values.username}
              />

              <TextInput
                label="Password"
                icon="lock"
                placeholder="Enter your Password"
                placeholderTextColor={darkLight}
                onChangeText={handleChange("password")}
                onBlur={handleBlur("password")}
                value={values.password}
                secureTextEntry={true}
                isPassword={true}
              />

              <MsgBox>{errorMessage}</MsgBox>

              <StyledButton onPress={handleSubmit}>
                <Fontisto name="arrow-right" size={24} color="white" />
                <ButtonText>Register</ButtonText>
              </StyledButton>

              <ExtraView>
                <ExtraText>Already have an account? </ExtraText>
                <TextLink onPress={() => navigation.navigate("Login")}>
                  <TextLinkContent>Login Here!</TextLinkContent>
                </TextLink>
              </ExtraView>
            </View>
          )}
        </Formik>
      </InnerContainer>
    </StyledContainer>
  );
};

const TextInput = ({ label, icon, isPassword, ...props }) => {
  return (
    <View>
      <LeftIcon>
        <Octicons name={icon} size={30} color={brand} />
      </LeftIcon>
      <StyledInputLabel>{label}</StyledInputLabel>
      <StyledTextInput {...props} />
    </View>
  );
};

export default Register;