// src/screens/ChatbotScreen.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Platform,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import RobotIcon from '../assets/icons/Robot.svg';

const BLUE = '#3879F1';

export default function ChatbotScreen({ navigation }) {
  const tabBarHeight = useBottomTabBarHeight();
  const [messages, setMessages] = useState([]);
  const listRef = useRef(null);

  const pushMessage = useCallback((role, text) => {
    setMessages(prev => [
      ...prev,
      { id: String(Date.now() + Math.random()), role, text },
    ]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 0);
  }, []);

  useEffect(() => {
    pushMessage('bot', '정워니워니님, 안녕하세요!\n무엇이 궁금하신가요?');
  }, [pushMessage]);

  const onNearCharger = () => {
    pushMessage('user', '내 근처 충전소 추천');
    pushMessage('bot', '현재 위치 기준 가까운 충전소를 보여드리겠습니다.');
  };

  const onMyCarInfo = () => {
    pushMessage('user', '내 차량 정보');
    pushMessage('bot', '차량 정보 보여주기.');
  };

  const onAgent = () => {
    pushMessage('user', '상담원 연결하기');
    pushMessage('bot', '상담원 연결 기능은 준비 중입니다 :)');
  };

  const renderItem = ({ item }) => (
    <MessageBubble role={item.role} text={item.text} />
  );

  return (
    <SafeAreaView style={styles.root}>
      {/* 헤더 */}
      <View style={styles.header}>
        <RobotIcon
          width={24}
          height={24}
          fill="#000"
          style={styles.headerIcon}
        />
        <Text style={styles.headerTitle}>콕봇</Text>
      </View>

      {/* 채팅 리스트 */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: true })
        }
        onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
        keyboardShouldPersistTaps="handled"
      />

      {/* 하단 시나리오 시트 */}
      <View style={[styles.sheet, { paddingBottom: tabBarHeight + 30 }]}>
        <ScenarioButton label="내 근처 충전소 추천" onPress={onNearCharger} />
        <ScenarioButton label="내 차량 정보" onPress={onMyCarInfo} />
        <ScenarioButton label="상담원 연결하기" onPress={onAgent} />
      </View>
    </SafeAreaView>
  );
}

function MessageBubble({ role, text }) {
  const isUser = role === 'user';
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

function ScenarioButton({ label, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
      onPress={onPress}
    >
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  // 헤더
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 50, // 상단 패딩 늘림
    paddingBottom: 12, // 하단도 약간 여유
  },
  headerIcon: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center', // 중앙 정렬
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
    // 길이에 따라 자동 줄바꿈/크기: maxWidth만 제한, 나머지는 내용에 맞게
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
  bubbleBot: { backgroundColor: '#E5E7EB' }, // 왼쪽(봇)
  bubbleUser: { backgroundColor: BLUE }, // 오른쪽(나)
  // 코너 라운드(꼬리 느낌)
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
  bubbleTextUser: { color: '#FFFFFF' }, // 내 말풍선: 흰 글씨

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
  btnPressed: { opacity: 0.85 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#111827' },
});
