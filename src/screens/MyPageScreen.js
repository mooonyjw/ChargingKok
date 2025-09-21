// src/screens/MyPageScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Image,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import TabBar from '../components/TabBar';
import HeadphoneIcon from '../assets/icons/Headphone.svg';
import PointIcon from '../assets/icons/Point.svg';
import StarIcon from '../assets/icons/Star.svg';

const BLUE = '#3879F1';

const API_BASE =
  Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';

export default function MyPageScreen() {
  const [profileImage, setProfileImage] = useState(null);

  // 차량 데이터 & 선택 상태
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchErr, setFetchErr] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null); // 선택된 차량 객체

  // 최초 실행 시: 선택값 복원 + 차량 목록 로드
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('selectedVehicle');
        if (saved) setSelectedVehicle(JSON.parse(saved));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setFetchErr(null);
      try {
        const res = await fetch(`${API_BASE}/api/vehicles`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setVehicles(Array.isArray(json) ? json : []);
      } catch (e) {
        setFetchErr(String(e?.message || e));
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleAvatarPress = () => {
    launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (response?.assets?.length > 0) {
        setProfileImage(response.assets[0].uri);
      }
    });
  };

  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((v) => {
      const maker = (v.제조사 || v.company || '').toLowerCase();
      const model = (v.model || '').toLowerCase();
      return maker.includes(q) || model.includes(q);
    });
  }, [search, vehicles]);

  const onPickVehicle = async (item) => {
    setSelectedVehicle(item);
    setVehicleModalVisible(false);
    try {
      await AsyncStorage.setItem('selectedVehicle', JSON.stringify(item));
    } catch {}
  };

  // 카드 표시값
  const displayModel = selectedVehicle?.model ?? '모델을 선택하세요';
  const displayMaker = selectedVehicle?.제조사 ?? selectedVehicle?.company ?? '—';
  const displayRange =
    selectedVehicle?.['1회충전주행거리_상온'] != null
      ? `${selectedVehicle['1회충전주행거리_상온']}km`
      : '—';

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 프로필 영역 */}
        <View style={styles.profileWrap}>
          <TouchableOpacity style={styles.avatar} activeOpacity={0.8} onPress={handleAvatarPress}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar} />
            )}
          </TouchableOpacity>
          <Text style={styles.nickname}>정워니워니</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.editBtn}
            onPress={() => setVehicleModalVisible(true)}
          >
            <Text style={styles.editBtnText}>내 정보 수정</Text>
          </TouchableOpacity>
        </View>

        {/* 즐겨찾는 충전소 / 고객센터 */}
        <View style={styles.quickWrap}>
          <TouchableOpacity style={styles.quickItem} activeOpacity={0.9}>
            <StarIcon width={30} height={30} style={{ marginBottom: 6 }} />
            <Text style={styles.quickText}>즐겨찾는 충전소</Text>
          </TouchableOpacity>

          <View style={styles.vDivider} />

          <TouchableOpacity style={styles.quickItem} activeOpacity={0.9}>
            <HeadphoneIcon width={30} height={30} style={{ marginBottom: 6 }} />
            <Text style={styles.quickText}>고객센터</Text>
          </TouchableOpacity>
        </View>

        {/* 내 차 정보 카드 */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.cardHeader}
            activeOpacity={0.8}
            onPress={() => setVehicleModalVisible(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', flex: 1 }}>
              <Text style={styles.cardTitle}>내 차 정보</Text>
              <PointIcon width={16} height={16} style={{ marginLeft: 6 }} />
            </View>
          </TouchableOpacity>

          <View style={styles.row}>
            <Text style={styles.label}>모델명</Text>
            <Text style={styles.value}>{displayModel}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>제조사</Text>
            <Text style={styles.value}>{displayMaker}</Text>
          </View>
          <View style={[styles.row, { marginBottom: 10 }]}>
            <Text style={styles.label}>1회 충전 주행거리(상온)</Text>
            <Text style={styles.value}>{displayRange}</Text>
          </View>

          <Text style={styles.notice}>
            주행거리는 상온 기준이며 실제와는 다를 수 있습니다.
          </Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* 차량 선택 모달 */}
      <Modal
        visible={vehicleModalVisible}
        animationType="slide"
        onRequestClose={() => setVehicleModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 50, paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', marginBottom: 12 }}>내 차 선택</Text>

          <TextInput
            placeholder="제조사/모델 검색 (예: 기아, EV3)"
            value={search}
            onChangeText={setSearch}
            style={{
              height: 44,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#ddd',
              paddingHorizontal: 12,
              marginBottom: 10,
            }}
          />

          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator />
              <Text style={{ marginTop: 8, color: '#666' }}>차량 정보를 불러오는 중…</Text>
            </View>
          ) : fetchErr ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: 'tomato', marginBottom: 8 }}>불러오기 실패: {fetchErr}</Text>
              <TouchableOpacity
                onPress={() => {
                  setVehicleModalVisible(false);
                }}
                style={{
                  paddingHorizontal: 16,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: '#eee',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text>닫기</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredData}
              keyExtractor={(item, idx) => `${item.model}-${idx}`}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => {
                const isSelected =
                  selectedVehicle?.model === item.model &&
                  (selectedVehicle?.제조사 ?? selectedVehicle?.company) ===
                    (item.제조사 ?? item.company);
                return (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => onPickVehicle(item)}
                    style={{
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: isSelected ? '#3879F1' : '#eee',
                      padding: 12,
                      backgroundColor: isSelected ? '#E6EFFF' : '#fff',
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={{ fontSize: 15, fontWeight: '800' }}>{item.model}</Text>
                        <Text style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
                          {(item.제조사 ?? item.company) || '—'} · {item.승차인원 ?? '—'}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                          1회충전(상온): {item['1회충전주행거리_상온'] ?? '—'}km · 배터리: {item.배터리 ?? '—'}
                        </Text>
                      </View>
                      {/* 라디오 */}
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          borderWidth: 2,
                          borderColor: isSelected ? '#3879F1' : '#bbb',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginTop: 6,
                        }}
                      >
                        {isSelected ? (
                          <View
                            style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#3879F1' }}
                          />
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingTop: 30 }}>
                  <Text style={{ color: '#666' }}>조건에 맞는 차량이 없습니다.</Text>
                </View>
              }
            />
          )}

          <TouchableOpacity
            style={{
              height: 48,
              borderRadius: 12,
              backgroundColor: '#3879F1',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 12,
              marginBottom: 24,
            }}
            onPress={() => setVehicleModalVisible(false)}
          >
            <Text style={{ color: '#fff', fontWeight: '800' }}>닫기</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <TabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { paddingHorizontal: 20, paddingTop: 80 },

  /* 프로필 */
  profileWrap: { alignItems: 'center', marginBottom: 18 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 30,
    backgroundColor: '#D9D9D9',
    ...shadow(4),
  },
  nickname: { marginTop: 14, fontSize: 24, fontWeight: '800', color: '#111' },
  editBtn: {
    marginTop: 20,
    paddingHorizontal: 14,
    height: 30,
    borderRadius: 20,
    backgroundColor: '#D9D9D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: { fontSize: 13, color: '#353535ff', fontWeight: '600' },

  /* 퀵 액션 */
  quickWrap: {
    marginTop: 14,
    backgroundColor: BLUE,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    ...shadow(6),
  },
  quickItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  vDivider: { width: 1, height: 60, backgroundColor: '#D9D9D9' },
  quickText: { fontSize: 14, color: '#fff', fontWeight: '600' },

  /* 카드 */
  card: {
    marginTop: 18,
    backgroundColor: '#E6EFFF',
    borderRadius: 20,
    padding: 18,
    ...shadow(4),
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1C1C1C' },

  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  label: { fontSize: 15, color: '#2A2A2A', fontWeight: '700' },
  value: { fontSize: 15, color: '#111', fontWeight: '800' },
  notice: { marginTop: 6, fontSize: 12, color: '#6B7280', textAlign: 'right' },
});

/* 공통 그림자 */
function shadow(level = 4) {
  const ios = {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: level,
    shadowOffset: { width: 0, height: Math.ceil(level / 2) },
  };
  const android = { elevation: level };
  return Platform.select({ ios, android });
}