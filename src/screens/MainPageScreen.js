// src/screens/MainPageScreen.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import TabBar from '../components/TabBar';

import MainScreen from './MainScreen';
import MyPageScreen from './MyPageScreen';

const Tab = createBottomTabNavigator();

export default function MainPageScreen() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={props => {
        const activeRouteName = props.state.routeNames[props.state.index];
        return (
          <TabBar
            active={activeRouteName}
            onPress={k => props.navigation.navigate(k)}
          />
        );
      }}
    >
      {/* <Tab.Screen name="chatbot" component={PlaceholderChatbot} /> */}
      <Tab.Screen name="charging" component={MainScreen} />
      <Tab.Screen name="mypage" component={MyPageScreen} />
    </Tab.Navigator>
  );
}
