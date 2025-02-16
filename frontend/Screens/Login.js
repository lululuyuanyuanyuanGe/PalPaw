import React from "react";
import { Formik } from "formik";
import { View, StatusBar } from "react-native";
import { Octicons, Ionicons, Fontisto } from "@expo/vector-icons";
import loginPic from "../assets/images/loginPic.jpg";
import { useState } from 'react';
import axios from 'axios';


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

export const Login = ({ navigation }) => {

  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (values) => {
    const { username, password } = values;

    try {
      const response = await axios.post("http://localhost:5001/login", {
        username,
        password,
      });

      if (response.data.success) {
        navigation.navigate("Dashboard");
      } else {
        setErrorMessage(response.data.message || "Invalid username or password");
      }
    } catch (error) {
      console.error("Login error:", error);
      setErrorMessage("An error occurred. Please try again.");
    }
  };

  return (
    <StyledContainer>
      <StatusBar barStyle="dark-content" />
      <InnerContainer>
        <PageLogo resizeMode="cover" source={loginPic} />
        <Title>PalPaw</Title>
        <Subtitle>Login</Subtitle>

        <Formik
          initialValues={{ username: "", password: "" }}
          onSubmit={handleLogin}
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
                <ButtonText>Login</ButtonText>
              </StyledButton>

              <ExtraView>
                <ExtraText>Don't have an account yet? </ExtraText>
                <TextLink onPress={() => navigation.navigate('Register')}>
                  <TextLinkContent>Signup!</TextLinkContent>
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

export default Login;