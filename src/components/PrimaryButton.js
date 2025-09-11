// src/components/PrimaryButton.js
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';

const ENABLED = '#3879F1';
const DISABLED = '#999999';

export default function PrimaryButton({ title, onPress, disabled = false }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      style={[
        styles.base,
        { backgroundColor: disabled ? DISABLED : ENABLED }, // 색상 한 줄 결정
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <Text style={styles.label}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 400,
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    // Figma shadow: blur 15, opacity 15%, position (0,0)
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 0 },
    ...Platform.select({ android: { elevation: 8 } }),
  },
  label: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
});
