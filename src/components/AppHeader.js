// src/components/AppHeader.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const LEFT_SLOT_WIDTH = 40; // 좌/우 폭을 동일하게 맞춰 중앙 정렬 보장

export default function AppHeader({ title = '충전콕', showBack = false }) {
  const navigation = useNavigation();

  return (
    <View style={styles.wrap}>
      <View style={{ width: LEFT_SLOT_WIDTH, alignItems: 'flex-start' }}>
        {showBack ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.back}>‹</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.center}>
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={{ width: LEFT_SLOT_WIDTH }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 84, // 로그인/회원가입에서 동일한 헤더 높이
    flexDirection: 'row',
    alignItems: 'flex-end', // 아래 기준으로 맞추면 시각적으로 더 안정적
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8, // 타이틀 하단 여백
    marginTop: 40,
  },
  back: { fontSize: 28, color: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 44,
  },
});
