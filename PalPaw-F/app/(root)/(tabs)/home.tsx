import { View, Text, TouchableOpacity} from 'react-native'
import {Link} from 'expo-router'
import React from 'react'

const home = () => {
  return (
    <View className='flex-1 items-center justify-center'>
      <Text className='text-xl font-bold'>Several entries for demo only</Text>
      <Link href="/(root)/(auth)/login" asChild>
        <TouchableOpacity className='mt-5 px-5 py-3 rounded-lg' style={{backgroundColor: '#715D47'}}>
          <Text className='text-white text-lg font-semibold'>Login</Text>
        </TouchableOpacity>
      </Link>
      <Link href="/(root)/(tabs)/profile" asChild>
        <TouchableOpacity className='mt-5 px-5 py-3 rounded-lg' style={{backgroundColor: '#715D47'}}>
          <Text className='text-white text-lg font-semibold'>Profile</Text>
        </TouchableOpacity>
      </Link>
    </View>
  )
}

export default home
