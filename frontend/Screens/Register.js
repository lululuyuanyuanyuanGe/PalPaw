import React from "react";
import { Formik } from "formik";
import { View, StatusBar, Alert } from "react-native";
import { Octicons, Ionicons, Fontisto } from "@expo/vector-icons";
import axios from "axios";

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
 
  const handleRegister = async (values) => {
    const { username, password } = values;

    try {
      const response = await axios.post("http://<your-server-ip>:5001/register", {
        username,
        password,
      });

      if (response.data.data === "username already exists!") {
        Alert.alert("Error", "Username already exists!");
      } else {
        Alert.alert("Success", "User registered successfully!");
        navigation.navigate("Login"); // Redirect to login page after successful registration
      }
    } catch (error) {
      console.error("Registration error:", error);
      Alert.alert("Error", "Failed to register user.");
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
          onSubmit={handleRegister} // Use handleRegister for form submission
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

              <MsgBox>...</MsgBox>

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