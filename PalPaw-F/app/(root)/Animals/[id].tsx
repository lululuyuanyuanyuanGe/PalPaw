import { View, Text } from 'react-native'
import React from 'react'
import { useLocalSearchParams } from 'expo-router'

const Animals = () => {
  const { id } = useLocalSearchParams();

  return (
    <View>
      <Text>Animals {id}</Text>
    </View>
  )
}

export default Animals