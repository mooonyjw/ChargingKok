// src/components/TabBar.js
import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import RobotIcon from '../assets/icons/Robot.svg';
import LightIcon from '../assets/icons/Light.svg';
import PersonIcon from '../assets/icons/Person.svg';
console.log(RobotIcon);
export default function TabBar({ active = 'mypage', onPress }) {
  const [selected, setSelected] = useState(active);

  const handlePress = (tab) => {
    setSelected(tab);
    onPress?.(tab);
  };

  return (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tabBtn, selected === 'chatbot' && styles.tabActive]}
        onPress={() => handlePress('chatbot')}
      >
        <RobotIcon
          width={24}
          height={24}
          fill={selected === 'chatbot' ? '#fff' : '#000'}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabBtn, selected === 'charging' && styles.tabActive]}
        onPress={() => handlePress('charging')}
      >
        <LightIcon
          width={24}
          height={24}
          fill={selected === 'charging' ? '#fff' : '#000'}  
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabBtn, selected === 'mypage' && styles.tabActive]}
        onPress={() => handlePress('mypage')}
      >
        <PersonIcon
          width={26}
          height={26}
          fill={selected === 'mypage' ? '#fff' : '#000'}
        />
      </TouchableOpacity>
    </View>
  );
}

const BLUE = '#3879F1';

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 80,
    right: 80,
    bottom: 30,
    height: 60,
    backgroundColor: '#F1F1F1',
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 14
  },
  tabBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: { fontSize: 22 },
  tabActive: { backgroundColor: BLUE },
  tabActiveIcon: { color: '#fff' },
});

