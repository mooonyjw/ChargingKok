// src/screens/ChatbotScreen.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking} from 'react-native';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Platform,
  ActivityIndicator,
} from 'react-native';
import RobotIcon from '../assets/icons/Robot.svg';
import PointIcon from '../assets/icons/Point.svg'; 
import { getGeminiAnswer } from '../chatbot/GeminiService';
import { useNavigation } from '@react-navigation/native';
const BLUE = '#3879F1';

export default function ChatBotScreen() {
  const navigation = useNavigation();
  const tabBarHeight = 0;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  const pushMessage = useCallback(
    (role, text, type = 'text', actions = {}) => {
      setMessages(prev => [
        ...prev,
        {
          id: String(Date.now() + Math.random()),
          role,
          text,
          type,
          ...actions,
        },
      ]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 0);
    },
    []
  );
  useEffect(() => {
    pushMessage('bot', '정워니워니님, 안녕하세요!\n무엇이 궁금하신가요?');
  }, [pushMessage]);

  // 공통: 사용자 발화 -> Gemini 호출 -> 봇 답변 추가
  const askGemini = useCallback(async (userText) => {
    if (loading) return; // 중복 방지
    pushMessage('user', userText);
    setLoading(true);
    try {
      const answer = await getGeminiAnswer([
        { role: 'user', parts: [{ text: userText }] },
      ]);
      pushMessage('bot', answer || '응답이 비어있어요 😅');
    } catch (e) {
      console.log('Gemini error:', e);
      pushMessage('bot', '서버 통신 중 문제가 발생했어요. 잠시 후 다시 시도해주세요 🙏');
    } finally {
      setLoading(false);
    }
  }, [loading, pushMessage]);

  // 시나리오 버튼 핸들러들
  const onNearCharger = () => {
    askGemini('내 근처 전기차 충전소를 추천해줘. 거리와 운영시간도 간단히 알려줘.');
  };

  const onMyCarInfo = async () => {
    pushMessage('user', '내 차량 정보');
    try {
      const raw = await AsyncStorage.getItem('selectedVehicle');
      if (!raw) {
        pushMessage('bot', '아직 차량을 선택하지 않으셨어요!');
        return;
      }
      const car = JSON.parse(raw);

      // LLM 프롬프트에 차량 정보 전달
      const carInfoText = `
      내 차량 정보:
      - 모델명: ${car.model}
      - 제조사: ${car.제조사 ?? car.company}
      - 1회 충전 주행거리(상온): ${car['1회충전주행거리_상온']} km
      - 배터리: ${car.배터리}
      - 국고보조금: ${car.국고보조금}
      `;

      const answer = await getGeminiAnswer([
        { role: 'user', parts: [{ text: `내 차량 정보를 설명해줘. 
  단, Markdown 문법(별표 **, #, - 등)은 쓰지 말고 
  일반 텍스트로만 정리해서 친철하게 대답해. \n\n${carInfoText}` }] }
      ]);

      pushMessage('bot', answer);
    } catch (e) {
      pushMessage('bot', '차량 정보를 불러오는데 오류가 났어요 😢');
    }
  };
  const dial = (phone) => Linking.openURL(`tel:${phone}`);

  const onAgent = () => {
    pushMessage('user', '상담원 연결해줘.');
    pushMessage('bot', '상담원 연결을 진행하시겠습니까?', 'confirm', {
      onYes: () => dial('tel:5000'),
      onNo: () => pushMessage('bot', '취소되었습니다.'),
    });
  };

  // 메시지 리스트
  const renderItem = ({ item }) => (
    <MessageBubble
      role={item.role}
      text={item.text}
      type={item.type}
      onYes={item.onYes}
      onNo={item.onNo}
    />
  );
  return (
    <SafeAreaView style={styles.root}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.getParent()?.navigate('MainPageScreen');
            }
          }}
        >
          <PointIcon
            width={24}
            height={24}
            style={{ transform: [{ scaleX: -1 }] }} // 좌우 반전
            fill="#000"
          />
        </Pressable>

        <RobotIcon width={24} height={24} fill="#000" style={styles.headerIcon} />
        <Text style={styles.headerTitle}>콕봇</Text>
      </View>

      {/* 채팅 리스트 */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={
          loading ? (
            <View style={{ paddingVertical: 8, alignItems: 'flex-start' }}>
              <TypingBubble />
            </View>
          ) : null
        }
      />

      {/* 하단 시나리오 시트 */}
      <View style={[styles.sheet, { paddingBottom: tabBarHeight + 30 }]}>
        <ScenarioButton label="내 근처 충전소 추천" onPress={onNearCharger} disabled={loading} />
        <ScenarioButton label="내 차량 정보" onPress={onMyCarInfo} disabled={loading} />
        <ScenarioButton label="상담원 연결하기" onPress={onAgent} disabled={loading} />
      </View>
    </SafeAreaView>
  );
}

function MessageBubble({ role, text, type, onYes, onNo }) {
  const isUser = role === 'user';

  if (type === 'confirm') {
    return (
      <View style={[styles.msgRow, styles.rowLeft]}>
        <View style={[styles.bubble, styles.bubbleBot, styles.bubbleBotCorners]}>
          <Text style={styles.bubbleText}>{text}</Text>
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            <Pressable style={styles.confirmBtn} onPress={onYes}>
              <Text style={styles.confirmBtnText}>예</Text>
            </Pressable>
            <Pressable style={styles.confirmBtn} onPress={onNo}>
              <Text style={styles.confirmBtnText}>아니오</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // 기본 메시지
  return (
    <View style={[styles.msgRow, isUser ? styles.rowRight : styles.rowLeft]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleBot,
          isUser ? styles.bubbleUserCorners : styles.bubbleBotCorners,
        ]}
      >
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
          {text}
        </Text>
      </View>
    </View>
  );
}

function ScenarioButton({ label, onPress, disabled }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.btn, (pressed || disabled) && styles.btnPressed]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

// 로딩(타이핑) 말풍선
function TypingBubble() {
  return (
    <View style={[styles.bubble, styles.bubbleBot, styles.bubbleBotCorners]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <ActivityIndicator size="small" />
        <Text style={[styles.bubbleText, { marginLeft: 8 }]}>입력 중...</Text>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 12,
  },
  backBtn: {
    marginRight: 100,
    padding: 6,
  },
  headerIcon: { marginRight: 10 },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A'
  },

  // 리스트
  listContent: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12 },

  // 메시지 한 줄 컨테이너
  msgRow: {
    width: '100%',
    marginVertical: 6,
    flexDirection: 'row',
  },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },

  // 말풍선
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 2 },
    }),
  },
  bubbleBot: { backgroundColor: '#E5E7EB' },
  bubbleUser: { backgroundColor: BLUE },
  bubbleBotCorners: {
    borderTopLeftRadius: 6,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  bubbleUserCorners: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 6,
  },
  bubbleText: { color: '#111827', fontSize: 15, lineHeight: 21 },
  bubbleTextUser: { color: '#FFFFFF' },

  // 하단 시나리오 시트
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -6 },
      },
      android: { elevation: 20 },
    }),
  },

  // 시나리오 버튼
  btn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#DFE9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  btnPressed: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#111827' },
  confirmBtn: {
    backgroundColor: BLUE,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  confirmBtnText: { color: '#fff', fontWeight: '600' },
});