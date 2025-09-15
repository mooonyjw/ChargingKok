// src/components/BottomTabBar.js
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BLUE = '#3879F1';
const BAR_BG = '#F1F1F1';

// 보기 좋게 살짝 줄임 (원 40)
const CIRCLE = 40;

export default function BottomTabBar({ active, onChange, style }) {
  const insets = useSafeAreaInsets();

  const Item = ({ k, icon, label }) => {
    const focused = active === k;
    return (
      <TouchableOpacity
        onPress={() => onChange?.(k)}
        style={styles.item}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ selected: focused }}
      >
        <View style={[styles.circle, focused && styles.circleActive]}>
          <Text style={[styles.icon, focused && styles.iconActive]}>
            {icon}
          </Text>
        </View>
        {label ? (
          <Text style={[styles.label, focused && styles.labelActive]}>
            {label}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    // ⬇︎ safe area 패딩은 바 "밖"에 두기
    <View
      style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 10) }]}
    >
      <View style={[styles.wrap, style]}>
        <Item k="chatbot" icon="🤖" label="챗봇" />
        <Item k="charge" icon="⚡" label="충전소" />
        <Item k="profile" icon="👤" label="내 정보" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    pointerEvents: 'box-none',
    alignItems: 'stretch',
  },
  wrap: {
    backgroundColor: BAR_BG, // #F1F1F1
    borderRadius: 30,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 70,
    overflow: 'hidden',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActive: {
    backgroundColor: BLUE, // 선택시 파란 원
  },
  icon: {
    fontSize: 18,
    color: '#111',
    opacity: 0.9,
  },
  iconActive: {
    color: '#FFF',
    opacity: 1,
  },
  label: {
    fontSize: 15,
    lineHeight: 17,
    color: '#6B7280',
  },
  labelActive: {
    color: '#111827',
    fontWeight: '700',
  },
});
