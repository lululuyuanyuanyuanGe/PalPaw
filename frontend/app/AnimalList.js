import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert } from "react-native";
import axios from "axios";

const API_URL = "http://localhost:4000/api/animals"; 

export default function AnimalList() {
    const [animals, setAnimals] = useState([]);
    const [species, setSpecies] = useState("");
    const [quantity, setQuantity] = useState("");
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchAnimals();
    }, []);

    const fetchAnimals = async (query = "") => {
        try {
            const response = await axios.get(query ? `${API_URL}?species=${query}` : API_URL);
            setAnimals(response.data);
        } catch (error) {
            console.error("Error fetching animals:", error);
        }
    };

    const handleAddAnimal = async () => {
        if (!species || !quantity) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        try {
            await axios.post(API_URL, { species, quantity: parseInt(quantity) });
            fetchAnimals();
            setSpecies("");
            setQuantity("");
        } catch (error) {
            Alert.alert("Error", "Failed to add animal");
        }
    };

    const handleUpdateQuantity = async () => {
        if (!species || !quantity) {
            Alert.alert("Error", "Please enter species and quantity");
            return;
        }

        try {
            await axios.patch(`${API_URL}/${species}`, { quantity: parseInt(quantity) });
            fetchAnimals();
            setSpecies("");
            setQuantity("");
        } catch (error) {
            Alert.alert("Error", "Failed to update quantity");
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Animal Adoption System</Text>

            {/* Search Input */}
            <TextInput
                style={styles.input}
                placeholder="Search species..."
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={() => fetchAnimals(search)}
            />

            {/* List of Animals */}
            <FlatList
                data={animals}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <Text style={styles.item}>
                        {item.species} - {item.quantity} available
                    </Text>
                )}
            />

            {/* Input Fields */}
            <TextInput
                style={styles.input}
                placeholder="Animal Species"
                value={species}
                onChangeText={setSpecies}
            />
            <TextInput
                style={styles.input}
                placeholder="Quantity"
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
            />

            {/* Add & Update Buttons */}
            <Button title="Add Animal" onPress={handleAddAnimal} color="green" />
            <Button title="Update Quantity" onPress={handleUpdateQuantity} color="orange" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: "#f5f5f5",
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        padding: 10,
        marginBottom: 10,
        borderRadius: 5,
        backgroundColor: "white",
    },
    item: {
        padding: 10,
        fontSize: 18,
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
    },
});