import React from "react";
import { Text, StyleSheet } from "react-native";

// Define a reusable StyledText component
const StyledText = ({ children, style, big, bold, small, ...props }) => {
    return (
        <Text
            style={[
                styles.defaultText,
                big && styles.bigText,
                bold && styles.boldText,
                small && styles.smallText,
                style, // Allow custom styles to be passed
            ]}
            {...props}
        >
            {children}
        </Text>
    );
};

const styles = StyleSheet.create({
    defaultText: {
        fontSize: 16,
        color: "#333",
    },
    bigText: {
        fontSize: 22,
    },
    boldText: {
        fontWeight: "bold",
    },
    smallText: {
        fontSize: 12,
    },
});

export default StyledText;
