// src/screens/WelcomeScreen.js
import React from 'react';
import { SafeAreaView, View, Text, StyleSheet } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
import { useNavigation } from '@react-navigation/native';

export default function WelcomeScreen({ onStart }) {
  const navigation = useNavigation();
  const handleStart = () => navigation.navigate('Login');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.titleWrap}>
          <Text
            style={styles.title}
            accessibilityRole="header"
            accessibilityLevel={1}
          >
            충전콕
          </Text>
        </View>

        <PrimaryButton
          title="시작하기"
          onPress={handleStart}
          style={styles.bottomButton}
          testID="start-button"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 50,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWrap: { alignItems: 'center', marginTop: 28 },
  title: { fontSize: 40, fontWeight: '800', color: '#111827', marginTop: 50 },
});
