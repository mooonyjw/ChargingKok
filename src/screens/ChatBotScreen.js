// src/screens/ChatbotScreen.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';
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
import { getGeminiAnswer } from '../chatbot/GeminiService';
import { useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { LocationService } from '../services/LocationService';   // ✅ 추가됨

const BLUE = '#3879F1';
const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';

// 거리계산 (하버사인)
function distMeters(a, b) {
  const R = 6371000;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(s1), Math.sqrt(1 - s1));
}

// 서버 호출 헬퍼들
async function fetchLiveStations({ lat, lng, radius }) {
  const qs = new URLSearchParams({ lat: String(lat), lng: String(lng), radius: String(radius) });
  const res = await fetch(`${BASE_URL}/stations/live?${qs.toString()}`);
  if (!res.ok) throw new Error(`KECO HTTP ${res.status}`);
  const json = await res.json();
  return json.items || [];
}
async function fetchDbStations({ lat, lng, radius, limit = 2000 }) {
  const qs = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius: String(radius),
    limit: String(limit),
  });
  const res = await fetch(`${BASE_URL}/api/stations?${qs.toString()}`);
  if (!res.ok) throw new Error(`DB HTTP ${res.status}`);
  const json = await res.json();
  return (json.stations || []).map(s => ({
    id: s.id,
    name: s.name || '충전소',
    address: s.address || '',
    lat: s.lat,
    lng: s.lng,
    status: s.status || '정보없음',
    chargers: s.chargers ?? 0,
    available: s.available ?? 0,
    speed: s.speed || '정보없음',
    price: s.price || '',
  }));
}

// 스마트 호출: KECO -> 없으면 DB
async function getStationsSmart({ lat, lng, radius }) {
  try {
    const live = await fetchLiveStations({ lat, lng, radius });
    if (live.length) return { items: live, source: 'KECO' };
  } catch (e) {
    console.log('KECO 실패, DB로 폴백:', e?.message || e);
  }
  const db = await fetchDbStations({ lat, lng, radius });
  return { items: db, source: 'DB' };
}

export default function ChatBotScreen() {
  const navigation = useNavigation();
  const tabBarHeight = useBottomTabBarHeight();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  // 마크다운 문법 제거 함수
  const cleanMarkdown = (text) => {
    if (!text) return text;
    return text
      .replace(/\*\*\*(.*?)\*\*\*/g, '$1')  // ***텍스트*** 제거
      .replace(/\*\*(.*?)\*\*/g, '$1')      // **텍스트** 제거
      .replace(/\*(.*?)\*/g, '$1')          // *텍스트* 제거
      .replace(/#{1,6}\s/g, '')             // # 제거
      .replace(/`{1,3}(.*?)`{1,3}/g, '$1')  // ```코드``` 제거
      .replace(/^\s*[-*+]\s/gm, '• ')       // - 를 • 로 변경
      .trim();
  };

  const pushMessage = useCallback((role, text, type = 'text', actions = {}) => {
    // bot 메시지의 경우 마크다운 제거
    const cleanText = role === 'bot' ? cleanMarkdown(text) : text;
    
    setMessages(prev => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        role,
        text: cleanText,
        type,
        ...actions,
      },
    ]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 0);
  }, []);

  useEffect(() => {
    pushMessage('bot', '정워니워니님, 안녕하세요!\n무엇이 궁금하신가요?');
  }, [pushMessage]);

  // 공통: 사용자 발화 -> Gemini 호출 -> 봇 답변 추가
  const askGemini = useCallback(
    async userText => {
      if (loading) return;
      pushMessage('user', userText);
      setLoading(true);
      try {
        const enhancedPrompt = userText + `

[중요 지시사항]
- 절대 마크다운 문법을 사용하지 마세요
- 일반 텍스트로만 답변해주세요  
- 친근하고 자연스러운 대화체로 작성해주세요`;

        const answer = await getGeminiAnswer([{ role: 'user', parts: [{ text: enhancedPrompt }] }]);
        pushMessage('bot', answer || '응답이 비어있어요 😅');
      } catch (e) {
        console.log('Gemini error:', e);
        pushMessage('bot', '서버 통신 중 문제가 발생했어요. 잠시 후 다시 시도해주세요 🙏');
      } finally {
        setLoading(false);
      }
    },
    [loading, pushMessage],
  );

  // === 내 근처 충전소 ===
  const onNearCharger = async () => {
    pushMessage('user', '내 근처 전기차 충전소를 추천해줘.');
    setLoading(true);

    try {
      // 위치 정보 가져오기
      const { latitude, longitude, address, isEmulatorFallback } =
        await LocationService.getLocationWithAddress();

      // 근처 충전소 데이터 가져오기
      const radius = 5000; // 5km
      const { items, source } = await getStationsSmart({ lat: latitude, lng: longitude, radius });

      if (!items.length) {
        pushMessage('bot', '주변 반경 5km 내에 조건에 맞는 충전소를 찾지 못했어요 😢');
        return;
      }

      // 상위 5개 충전소 정보 정리
      const center = { lat: latitude, lng: longitude };
      const topStations = items
        .map(it => ({ ...it, _d: distMeters(center, { lat: it.lat, lng: it.lng }) }))
        .sort((a, b) => a._d - b._d)
        .slice(0, 5);

      // Gemini에게 전달할 충전소 정보
      const stationData = topStations.map((station, i) => {
        const km = (station._d / 1000).toFixed(station._d < 1000 ? 2 : 1);
        return {
          순번: i + 1,
          이름: station.name,
          주소: station.address || '주소 정보 없음',
          거리: `${km}km`,
          상태: station.status || '정보없음',
          가능대수: station.available ?? '정보없음',
          충전기유형: station.speed || '정보없음',
          요금: station.price || '정보없음'
        };
      });

      const locationInfo = isEmulatorFallback 
        ? '서울시청 기준 (에뮬레이터)' 
        : `현재 위치: ${address}`;

      // Gemini에게 질문
      const promptText = `
근처 전기차 충전소 정보를 사용자 친화적으로 설명해주세요.

현재 위치: ${locationInfo}
데이터 소스: ${source === 'KECO' ? '실시간(환경부)' : 'DB'}

충전소 정보:
${JSON.stringify(stationData, null, 2)}

[답변 지침]
1. 간단한 인사와 함께 추천 시작
2. 각 충전소별로 핵심 정보 (이름, 거리, 상태) 위주로 정리
3. 친근하고 도움이 되는 톤으로 작성
4. 마지막에 추가 도움이 필요하면 말해달라고 안내

[중요 지시사항]
- 절대 마크다운 문법을 사용하지 마세요
- 일반 텍스트로만 작성해주세요
- 친근하고 자연스러운 대화체로 작성해주세요
      `;

      const answer = await getGeminiAnswer([{ role: 'user', parts: [{ text: promptText }] }]);
      pushMessage('bot', answer || '충전소 정보를 정리하는데 문제가 있었어요 😅');

    } catch (error) {
      console.log('NearCharger error:', error);
      if (error.message?.includes('권한')) {
        pushMessage('bot', '위치 권한이 필요해요. 설정에서 위치 권한을 허용해주세요 📍');
      } else {
        pushMessage('bot', '위치/데이터 확인에 문제가 있어요. 잠시 후 다시 시도해 주세요 🙏');
      }
    } finally {
      setLoading(false);
    }
  };

  // === 내 차량 정보 ===
  const onMyCarInfo = async () => {
    pushMessage('user', '내 차량 정보 알려줘');
    
    try {
      const raw = await AsyncStorage.getItem('selectedVehicle');
      if (!raw) {
        pushMessage('bot', '아직 차량을 선택하지 않으셨어요!\n\n마이페이지에서 차량을 등록해주세요 🚗');
        return;
      }
      
      const car = JSON.parse(raw);

      // Gemini에게 차량 정보를 자연스럽게 설명해달라고 요청
      const carInfoPrompt = `
다음은 내 전기차 정보입니다. 이 정보를 이해하기 쉽게 설명해주세요.

차량 정보:
- 모델명: ${car.model}
- 제조사: ${car.제조사 ?? car.company}
- 1회 충전 주행거리(상온): ${car['1회충전주행거리_상온']} km
- 배터리 용량: ${car.배터리}
- 국고보조금: ${car.국고보조금}

[답변 지침]
1. 차량에 대한 간단한 소개
2. 주요 특징 (주행거리, 배터리 등)
3. 보조금 정보
4. 실용적인 팁이나 추천사항

[중요 지시사항]
- 절대 마크다운 문법을 사용하지 마세요
- 일반 텍스트로만 작성해주세요
- 친근하고 자연스러운 대화체로 작성해주세요
      `;

      // askGemini 사용 (loading 상태 관리 포함)
      setLoading(true);
      try {
        const answer = await getGeminiAnswer([
          { role: 'user', parts: [{ text: carInfoPrompt }] }
        ]);
        pushMessage('bot', answer || '차량 정보를 정리하는데 문제가 있었어요 😅');
      } catch (e) {
        console.log('Car info Gemini error:', e);
        pushMessage('bot', '차량 정보 설명 중 문제가 발생했어요. 잠시 후 다시 시도해주세요 🙏');
      } finally {
        setLoading(false);
      }
      
    } catch (e) {
      pushMessage('bot', '차량 정보를 불러오는데 오류가 났어요 😢\n\n마이페이지에서 차량이 제대로 선택되었는지 확인해주세요.');
    }
  };

  const dial = phone => Linking.openURL(`tel:${phone}`);

  const onAgent = () => {
    pushMessage('user', '상담원 연결해줘.');
    pushMessage('bot', '상담원 연결을 진행하시겠습니까?', 'confirm', {
      onYes: () => dial('tel:5000'),
      onNo: () => pushMessage('bot', '취소되었습니다.'),
    });
  };

  // 메시지 리스트
  const renderItem = ({ item }) => (
    <MessageBubble role={item.role} text={item.text} type={item.type} onYes={item.onYes} onNo={item.onNo} />
  );

  return (
    <SafeAreaView style={styles.root}>
      {/* 헤더 */}
      <View style={styles.header}>
        {/* <Pressable
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
            style={{ transform: [{ scaleX: -1 }] }}
            fill="#000"
          />
        </Pressable> */}

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
      <View style={[styles.sheet, { paddingBottom: Math.max(tabBarHeight + 30, 100) }]}>
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

  return (
    <View style={[styles.msgRow, isUser ? styles.rowRight : styles.rowLeft]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleBot,
          isUser ? styles.bubbleUserCorners : styles.bubbleBotCorners,
        ]}
      >
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{text}</Text>
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
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    width: '100%', 
    paddingHorizontal: 20, 
    paddingTop: 50, 
    paddingBottom: 12 
  },
  backBtn: { marginRight: 100, padding: 6 },
  headerIcon: { marginRight: 10 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  listContent: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12 },
  msgRow: { width: '100%', marginVertical: 6, flexDirection: 'row' },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, ...Platform.select({
    ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
    android: { elevation: 2 },
  }) },
  bubbleBot: { backgroundColor: '#E5E7EB' },
  bubbleUser: { backgroundColor: BLUE },
  bubbleBotCorners: { borderTopLeftRadius: 6, borderTopRightRadius: 16, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  bubbleUserCorners: { borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: 16, borderBottomRightRadius: 6 },
  bubbleText: { color: '#111827', fontSize: 15, lineHeight: 21 },
  bubbleTextUser: { color: '#FFFFFF' },
  sheet: { 
    backgroundColor: '#FFFFFF', 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, 
    paddingHorizontal: 16, 
    paddingTop: 13,
    minHeight: 300,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -6 } },
      android: { elevation: 50 },
    }) 
  },
  btn: { height: 52, borderRadius: 14, backgroundColor: '#DFE9FF', alignItems: 'center', justifyContent: 'center', marginVertical: 6 },
  btnPressed: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#111827' },
  confirmBtn: { backgroundColor: BLUE, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 8 },
  confirmBtnText: { color: '#fff', fontWeight: '600' },
});