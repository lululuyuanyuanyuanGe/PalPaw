import { View, Text, Image } from 'react-native'
import React from 'react'
import {Tabs} from 'expo-router'
import icons from '@/constants/icons'


const TabIcon = ({focused, icon, title}: {focused: boolean; icon:any; title:string}) => (
    <View className='flex-1 mt-2 flex flex-col items-center'>
        <Image source={icon} tintColor={focused ? '#8B5CF6': '#666876'} resizeMode="contain" className="size-6"/>
        <Text className={`${focused ? 'text-purple-500 font-rubik-medium': 'text-black-200 font-rubik'} text-xs w-full text-center`}>{title}</Text>
    </View>
)

const TabsLayout = () => {
  return (


    <Tabs
        screenOptions= {{
            tabBarShowLabel: false,
            tabBarStyle: {
                backgroundColor: 'white',
                position: 'absolute',
                borderTopColor: '#0061FF1A',
                borderTopWidth: 1,
                minHeight: 70,
            }
        }}
    >    
        <Tabs.Screen 
            name="(home)" 
            options={{
                title: 'Home',
                headerShown: false,
                tabBarIcon: ({focused}) => (
                    <TabIcon icon={icons.home} focused={focused} title="Home"/> 
                )
            }}/>

        <Tabs.Screen 
            name="market" 
            options={{
                title: 'Shop',
                headerShown: false,
                tabBarIcon: ({focused}) => (
                    <TabIcon icon={icons.wallet} focused={focused} title="Market"/> 
                )
            }}/>

        <Tabs.Screen 
            name="explorer" 
            options={{
                title: 'Explore',
                headerShown: false,
                tabBarIcon: ({focused}) => (
                    <TabIcon icon={icons.search} focused={focused} title="Explore"/> 
                )
            }}/>

        <Tabs.Screen 
            name="(profile)" 
            options={{
                title: 'Profile',
                headerShown: false,
                tabBarIcon: ({focused}) => (
                    <TabIcon icon={icons.person} focused={focused} title="Profile"/> 
                )
            }}/>

        <Tabs.Screen 
            name="(posts)" 
            options={{
                title: 'Posts',
                headerShown: false,
                tabBarIcon: ({focused}) => (
                    <TabIcon icon={icons.person} focused={focused} title="posts"/> 
                )
            }}/>
    </Tabs>
  )
}

export default TabsLayout