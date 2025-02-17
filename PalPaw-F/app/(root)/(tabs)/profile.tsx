import React from "react";
import {
  View,
  Text,
  Image,
  ImageBackground,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import cats from "@/constants/images";

const user = {
  name: "Alfredo_Yu",
  id: "1234568",
  bio: "Hi there! I'm a proud pet parent of three adorable cats: Mochi, Luna, and Tiger! 🐱🐯🐾",
  avatar: require("../../../assets/images/loginPic.jpg"),
  background: require("../../../assets/images/japan.png"),
};

const posts = [
  { id: "1", image: require("../../../assets/images/cat1.jpg"), title: "Morning with Mochi" },
  { id: "2", image: require("../../../assets/images/cat1.jpg"), title: "Luna in the Bag" },
  { id: "3", image: require("../../../assets/images/cat2.jpg"), title: "Mochi’s Show Time!" },
  { id: "4", image: require("../../../assets/images/cat2.jpg"), title: "Tiger is here" },
  { id: "5", image: require("../../../assets/images/cat3.jpg"), title: "Mochi’s Nap" },
  { id: "6", image: require("../../../assets/images/cat3.jpg"), title: "Tiger's Playtime" },
  { id: "7", image: require("../../../assets/images/cat4.jpg"), title: "Luna Chilling" },
  { id: "8", image: require("../../../assets/images/cat4.jpg"), title: "Mochi & Luna" },
  { id: "9", image: require("../../../assets/images/cat4.jpg"), title: "Tiger on the Move" },
  { id: "10", image: require("../../../assets/images/cat2.jpg"), title: "Tiger on the Move" },
];

const numColumns = 2;

// ** Get screen width for responsive sizing ** //
const screenWidth = Dimensions.get("window").width;
const itemSize = screenWidth / numColumns - 12;

// Dynamically Add "Create New Post" Button at the End
const postsWithButton = [...posts, { id: "newPost", isButton: true, title: "", image: null }];

const ProfileScreen = () => {
  return (
    <View className="flex-1 bg-white">
      {/*  FlatList with Scrolling Profile Header */}
      <FlatList
        data={postsWithButton}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        contentContainerStyle={{ paddingBottom: 50, paddingHorizontal: 8 }}
        showsVerticalScrollIndicator={false}
        //  Profile Section as Header
        ListHeaderComponent={
          <View>
            {/* Background Image Fully Covers the Top */}
            <View className="w-full h-52 relative">
              <Image
                source={user.background}
                className="absolute top-0 left-0 w-full h-full"
                resizeMode="cover"
              />
              <View className="absolute inset-0 bg-black opacity-20" /> {/* Dark overlay for contrast */}
              <View>
                <View className="absolute top-10 left-5 flex-row items-center">
                  <Image
                    source={user.avatar}
                    className="w-20 h-20 rounded-full border-4 border-white shadow-lg"
                  />
                  <View className="ml-4">
                    <Text className="text-lg font-bold text-white">{user.name}</Text>
                    <Text className="text-sm text-gray-300">ID: {user.id}</Text>
                  </View>
                </View>
              </View>
              <View className="px-5 absolute bottom-5">
                <Text className="text-white text-sm leading-tight">{user.bio}</Text>
              </View>
            </View>
          </View>
        }
        // Render Each Post and New Post Button
        renderItem={({ item }) => (
          <View className="w-1/2 p-1">
            {item.isButton ? (
              //"Create New Post" Button
              <TouchableOpacity className="h-36 items-center justify-center bg-gray-200 rounded-lg">
                <Text className="text-3xl font-bold text-gray-800">+</Text>
              </TouchableOpacity>
            ) : (
              // Regular Post
              <View className="bg-white rounded-lg shadow-md">
                <Image source={item.image} className="w-full h-36 rounded-md" />
                <Text className="text-xs text-gray-800 font-semibold text-center mt-1">{item.title}</Text>
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
};

export default ProfileScreen;