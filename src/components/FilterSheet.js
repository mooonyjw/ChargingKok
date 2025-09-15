// src/components/FilterSheet.js
import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';

export default function FilterSheet({
  title,
  options,
  value,
  onSelect,
  onClose,
}) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={styles.sheet}>
        <Text style={styles.title}>{title}</Text>
        <FlatList
          data={options}
          keyExtractor={item => item}
          renderItem={({ item }) => {
            const selected = item === value;
            return (
              <TouchableOpacity
                style={[styles.opt, selected && styles.optSel]}
                onPress={() => onSelect(item)}
              >
                <Text style={[styles.optTxt, selected && styles.optTxtSel]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerStyle={{ paddingVertical: 12 }}
        />
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeTxt}>닫기</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  opt: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  optSel: { backgroundColor: '#EEF4FF', borderColor: '#3879F1' },
  optTxt: { fontSize: 16, color: '#111827' },
  optTxtSel: { color: '#1F4FD8', fontWeight: '700' },
  closeBtn: {
    alignSelf: 'center',
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  closeTxt: { fontSize: 16, color: '#6B7280' },
});
