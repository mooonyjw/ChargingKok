// src/screens/LoginScreen.js  (변경 부분 포함 전체)
import React, { useState, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import PrimaryButton from '../components/PrimaryButton';
import AppHeader from '../components/AppHeader';

export default function LoginScreen() {
  const navigation = useNavigation();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const pwRef = useRef(null);

  const canLogin = id.trim().length > 0 && pw.trim().length > 0;
  const onLogin = () => {
    if (!canLogin) return;
    console.log('로그인 시도', { id: id.trim(), pw: pw.trim() });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        keyboardVerticalOffset={Platform.select({ ios: 0, android: 0 })}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <AppHeader showBack={false} />

          <View style={styles.greeting}>
            <Text style={styles.helloBold}>안녕하세요 :)</Text>
            <Text style={styles.helloBold}>충전콕입니다.</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="아이디"
              placeholderTextColor="#999999"
              value={id}
              onChangeText={setId}
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => pwRef.current?.focus()}
            />
            <TextInput
              ref={pwRef}
              style={[styles.input, { marginTop: 18 }]}
              placeholder="비밀번호"
              placeholderTextColor="#999999"
              value={pw}
              onChangeText={setPw}
              secureTextEntry
              returnKeyType="done"
            />
          </View>

          <View style={styles.linksRow}>
            <Pressable
              hitSlop={6}
              onPress={() => navigation.navigate('SignUp')}
            >
              <Text style={styles.linkText}>회원가입</Text>
            </Pressable>
            <Text style={styles.dot}>·</Text>
            <Pressable hitSlop={6} onPress={() => console.log('아이디 찾기')}>
              <Text style={styles.linkText}>아이디 찾기</Text>
            </Pressable>
            <Text style={styles.dot}>·</Text>
            <Pressable hitSlop={6} onPress={() => console.log('비밀번호 찾기')}>
              <Text style={styles.linkText}>비밀번호 찾기</Text>
            </Pressable>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            title="로그인"
            onPress={onLogin}
            disabled={!id || !pw}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { paddingHorizontal: 20 },
  greeting: { marginTop: 90, marginBottom: 16 },
  helloBold: { fontSize: 25, color: '#111827', fontWeight: '800' },
  form: { marginTop: 12 },
  input: {
    height: 65,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#999999',
    shadowColor: 'transparent',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  linksRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  linkText: { color: '#111827', fontSize: 14 },
  dot: { color: '#9CA3AF', marginHorizontal: 8, fontSize: 16, lineHeight: 16 },
  footer: { paddingHorizontal: 20, paddingBottom: 50, alignItems: 'center' },
});
