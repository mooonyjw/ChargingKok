// src/screens/SignUpScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
import AppHeader from '../components/AppHeader';

const BLUE = '#3879F1';
const VERIFY_SLOT_HEIGHT = 98; // 전송 전 고정 여백

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // 이메일 인증 상태
  const [sending, setSending] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0); // 초
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const emailValid = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    [email],
  );
  const usernameValid = useMemo(
    () => /^[A-Za-z0-9]{1,20}$/.test(username),
    [username],
  );
  const passwordValid = useMemo(
    () => /^[A-Za-z0-9]{8,20}$/.test(password),
    [password],
  );

  const canProceed = emailVerified && usernameValid && passwordValid;

  useEffect(() => {
    if (!codeSent || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft(t => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [codeSent, timeLeft]);

  useEffect(() => {
    // 이메일 바뀌면 인증 상태 초기화
    setEmailVerified(false);
    setCode('');
    setCodeSent(false);
    setTimeLeft(0);
  }, [email]);

  const onSendCode = async () => {
    if (!emailValid || sending) return;
    try {
      setSending(true);
      // TODO: 전송 API
      await new Promise(r => setTimeout(r, 400));
      setCodeSent(true);
      setTimeLeft(300); // 5분
    } finally {
      setSending(false);
    }
  };

  const onConfirmCode = async () => {
    if (!code || timeLeft === 0 || verifying) return;
    try {
      setVerifying(true);
      // TODO: 확인 API
      await new Promise(r => setTimeout(r, 400));
      setEmailVerified(true);
    } finally {
      setVerifying(false);
    }
  };

  const onNext = () => {
    if (!canProceed) return;
    // TODO: 다음 단계
  };

  const mm = String(Math.floor(timeLeft / 60));
  const ss = String(timeLeft % 60).padStart(2, '0');

  const sendEnabled = emailValid && !sending && !emailVerified;
  const confirmEnabled = !!code && timeLeft > 0 && !verifying && !emailVerified;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* 내용은 ScrollView로 감싸서 footer를 하단 고정 */}
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <AppHeader showBack />

          <View style={styles.container}>
            <Text style={styles.sectionTitle}>회원가입</Text>

            {/* 이메일 + 전송 버튼 */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                이메일 주소 <Text style={styles.required}>*</Text>
              </Text>
              <Text style={styles.helper}>
                인증을 위해 이메일 주소를 입력해주세요.
              </Text>

              <View style={styles.row}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="jamit@jamitdam.co.kr"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.input, { flex: 1 }]}
                  editable={!emailVerified}
                />

                <TouchableOpacity
                  onPress={onSendCode}
                  disabled={!sendEnabled}
                  style={[
                    styles.smallBtnBase,
                    sendEnabled
                      ? styles.smallBtnPrimary
                      : styles.smallBtnDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.smallBtnText,
                      sendEnabled
                        ? styles.smallBtnTextWhite
                        : styles.smallBtnTextDark,
                    ]}
                  >
                    {sending ? '전송중...' : '인증번호 전송'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 인증 슬롯: 전송 전엔 빈 공간 */}
              {!codeSent ? (
                <View style={{ height: VERIFY_SLOT_HEIGHT }} />
              ) : (
                <View style={{ minHeight: VERIFY_SLOT_HEIGHT }}>
                  <View style={styles.verifyRow}>
                    {/* 언더라인 입력칸 */}
                    <View style={styles.codeInputWrap}>
                      <TextInput
                        value={code}
                        onChangeText={setCode}
                        placeholder="인증번호 입력"
                        keyboardType="number-pad"
                        style={styles.codeInput}
                        editable={!emailVerified && timeLeft > 0}
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>

                    <View style={styles.verifyRight}>
                      {/* 타이머: 버튼 위, 오른쪽 정렬 */}
                      <Text style={styles.timerText}>
                        {timeLeft > 0 ? `${mm}분 ${ss}초` : '만료'}
                      </Text>

                      <TouchableOpacity
                        onPress={onConfirmCode}
                        disabled={!confirmEnabled}
                        style={[
                          styles.smallBtnBase,
                          confirmEnabled
                            ? styles.smallBtnPrimary
                            : styles.smallBtnDisabled,
                          { alignSelf: 'flex-end' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.smallBtnText,
                            confirmEnabled
                              ? styles.smallBtnTextWhite
                              : styles.smallBtnTextDark,
                          ]}
                        >
                          인증번호 확인
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {emailVerified && (
                <Text style={styles.verifiedText}>
                  이메일 인증이 완료되었습니다.
                </Text>
              )}
            </View>

            {/* 아이디 */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                아이디 <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                value={username}
                onChangeText={t => setUsername(t.trim())}
                placeholder="영어+숫자 최대 20글자"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                maxLength={20}
              />
              {!usernameValid && username.length > 0 && (
                <Text style={styles.errorText}>
                  아이디는 영어+숫자 조합 1~20자여야 합니다.
                </Text>
              )}
            </View>

            {/* 비밀번호 */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                비밀번호 <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="영어+숫자 최대 20글자"
                secureTextEntry
                autoCapitalize="none"
                style={styles.input}
                maxLength={20}
              />
              {!passwordValid && password.length > 0 && (
                <Text style={styles.errorText}>
                  비밀번호는 영어+숫자 8~20자여야 합니다.
                </Text>
              )}
            </View>
          </View>
        </ScrollView>

        {/* 하단 고정 버튼 (LoginScreen과 동일 위치) */}
        <View style={styles.footer}>
          <PrimaryButton title="다음" onPress={onNext} disabled={!canProceed} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  // ScrollView 컨테이너
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    flexGrow: 1, // 내용이 적을 때도 하단까지 채워 footer 고정
  },

  container: { paddingTop: 0 },

  sectionTitle: {
    marginTop: 90,
    fontSize: 25,
    fontWeight: '800',
    marginBottom: 16,
    color: '#111',
  },

  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 6 },
  required: { color: '#ff375f' },
  helper: { fontSize: 12, color: '#6b7280', marginBottom: 10 },

  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },

  input: {
    height: 65,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  // ── 인증 영역 UI ─────────────────────────────
  verifyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  // 언더라인 입력칸
  codeInputWrap: {
    flex: 1,
    borderBottomWidth: 1,
    borderColor: '#111827',
    paddingBottom: 6,
    height: 70,
    justifyContent: 'flex-end',
  },
  codeInput: {
    fontSize: 16,
    lineHeight: 20,
    paddingVertical: 0,
    paddingHorizontal: 2,
    backgroundColor: 'transparent',
    includeFontPadding: false,
  },

  verifyRight: {
    width: 130,
    alignItems: 'flex-end',
  },
  timerText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8, // 버튼 위에 붙도록
  },

  // 작은 버튼 (활성/비활성 색상 명확화)
  smallBtnBase: {
    paddingHorizontal: 14,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  smallBtnPrimary: { backgroundColor: BLUE },
  smallBtnDisabled: { backgroundColor: '#E5E7EB' },
  smallBtnText: { fontSize: 13, fontWeight: '700' },
  smallBtnTextWhite: { color: '#fff' },
  smallBtnTextDark: { color: '#111' },

  footer: { paddingHorizontal: 20, paddingBottom: 50, alignItems: 'center' },

  errorText: { marginTop: 6, fontSize: 12, color: '#dc2626' },
  verifiedText: { marginTop: 8, fontSize: 12, color: BLUE, fontWeight: '700' },
});
