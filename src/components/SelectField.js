// src/components/SelectField.js
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';

export default function SelectField({
  label,
  value,
  placeholder = '미선택',
  onPress,
}) {
  return (
    <TouchableOpacity style={styles.box} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text
          numberOfLines={1}
          style={[
            styles.value,
            !value || value === '전체' ? styles.placeholder : null,
          ]}
        >
          {value ?? placeholder}
        </Text>
        <Text style={styles.chev}>⌵</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  label: { fontSize: 15, color: '#666666', marginBottom: 2 },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: { fontSize: 15, color: '#111827', maxWidth: '85%' },
  placeholder: { color: '#666666' },
  chev: { fontSize: 16, color: '#6B7280' },
});
