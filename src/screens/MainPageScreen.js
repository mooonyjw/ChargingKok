// src/screens/MainPageScreen.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import BottomTabBar from '../components/BottomTabBar';

// 탭 화면들
// import ChatbotScreen from './ChatbotScreen'; // TODO: 화면 연결
import MainScreen from './MainScreen';
// import MyPageScreen from './MyPageScreen'; // TODO: 화면 연결

const Tab = createBottomTabNavigator();

export default function MainPageScreen() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={props => (
        <BottomTabBar
          // 현재 활성 라우트명
          active={props.state.routeNames[props.state.index]}
          // 탭 전환
          onChange={k => props.navigation.navigate(k)}
        />
      )}
    >
      {/* <Tab.Screen name="chatbot" component={ChatbotScreen} /> */}
      <Tab.Screen name="charge" component={MainScreen} />
      {/* <Tab.Screen name="mypage" component={MyPageScreen} /> */}
    </Tab.Navigator>
  );
}
