// src/screens/MainScreen.js
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  PermissionsAndroid,
  Alert,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import FilterSheet from '../components/FilterSheet';
import SelectField from '../components/SelectField';

// ---- Backend base URL (adjust the IP for your dev machine when testing on device) ----
const BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:4000' // Android emulator -> host machine
    : 'http://localhost:4000'; // iOS simulator or change to your LAN IP when on device

export default function MainScreen() {
  const [visibleSheet, setVisibleSheet] = useState(null); // 'charger' | 'fee' | 'status' | 'region'
  const [chargerType, setChargerType] = useState('전체');
  const [feeType, setFeeType] = useState('전체');
  const [liveStatus, setLiveStatus] = useState('전체');
  const [region, setRegion] = useState('전체');
  const [markers, setMarkers] = useState([]);

  const [lastUpdated, setLastUpdated] = useState(null);

  const [mapRegion, setMapRegion] = useState({
    latitude: 37.3943,
    longitude: 127.1107,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  });

  const tabBarHeight = useBottomTabBarHeight();

  const open = key => () => setVisibleSheet(key);
  const close = () => setVisibleSheet(null);

  const onReset = useCallback(() => {
    setChargerType('전체');
    setFeeType('전체');
    setLiveStatus('전체');
    setRegion('전체');
    setMarkers([]);
  }, []);

  // ========== 위치 권한 & 내 위치 이동 ==========
  const requestLocationPermission = useCallback(async () => {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: '위치 권한 요청',
          message: '내 근처 충전소 표시를 위해 위치 권한이 필요합니다.',
          buttonPositive: '허용',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }, []);

  const moveTo = useCallback((lat, lng, zoom = 0.02) => {
    setMapRegion(r => ({
      ...r,
      latitude: lat,
      longitude: lng,
      latitudeDelta: zoom,
      longitudeDelta: zoom,
    }));
  }, []);

  // TODO: 실제 휴대폰에서 테스트 필요
  const locateMe = useCallback(async () => {
    const ok = await requestLocationPermission();
    if (!ok) {
      Alert.alert('권한 필요', '설정에서 위치 권한을 허용해주세요.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        moveTo(latitude, longitude, 0.02);
      },
      err => {
        Alert.alert(
          '위치 확인 실패',
          err?.message ?? '현재 위치를 가져오지 못했습니다.',
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
  }, [moveTo, requestLocationPermission]);

  // 초기 진입 시 한 번 내 위치로 이동하고 싶다면 주석 해제
  // useEffect(() => {
  //   locateMe();
  // }, [locateMe]);

  const [isLoading, setIsLoading] = useState(false);

  const onSearch = useCallback(
    async (opts = { force: false }) => {
      const { latitude, longitude, latitudeDelta } = mapRegion;
      setIsLoading(true);
      try {
        const qs = new URLSearchParams({
          lat: String(latitude),
          lng: String(longitude),
          n: '2',
          force: String(!!opts.force),
        });
        const res = await fetch(`${BASE_URL}/stations/live?${qs.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { items, updatedAt } = await res.json();

        // ★ 빈 결과면 기존 마커 유지해서 '깜빡임' 방지
        if (Array.isArray(items) && items.length > 0) {
          setMarkers(items);
          setLastUpdated(updatedAt || null);

          const latAvg = items.reduce((s, m) => s + m.lat, 0) / items.length;
          const lngAvg = items.reduce((s, m) => s + m.lng, 0) / items.length;
          moveTo(latAvg, lngAvg, Math.min(latitudeDelta, 0.03));
        } else {
          // 토스트만 안내 (기존 마커 그대로)
          Alert.alert('실시간 데이터 없음', '잠시 후 다시 시도해 주세요.');
        }
      } catch (e) {
        // 실패해도 기존 마커 유지
        Alert.alert('검색 실패', '실시간 데이터를 불러오지 못했습니다.');
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    },
    [mapRegion, moveTo],
  );
  const formatKST = iso => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      return `${hh}:${mm}:${ss}`;
    } catch {
      return '';
    }
  };

  useEffect(() => {
    if (region === '서울') {
      onSearch({ force: false }); // 캐시 허용(빠르게)
    }
  }, [region, onSearch]);
  // ========== 시트 옵션 ==========
  const sheetData = useMemo(
    () => ({
      charger: {
        title: '충전기 유형',
        options: ['전체', '급속', '완속'],
        value: chargerType,
        onSelect: v => {
          setChargerType(v);
          close();
        },
      },
      fee: {
        title: '주차료',
        options: ['전체', '무료', '유료'],
        value: feeType,
        onSelect: v => {
          setFeeType(v);
          close();
        },
      },
      status: {
        title: '실시간 상태',
        options: ['전체', '사용가능', '충전중', '사용불가'],
        value: liveStatus,
        onSelect: v => {
          setLiveStatus(v);
          close();
        },
      },
      region: {
        title: '지역',
        options: [
          '내 근처',
          '서울',
          '경기',
          '인천',
          '부산',
          '대구',
          '대전',
          '광주',
          '울산',
          '세종',
        ],
        value: region,
        onSelect: async v => {
          setRegion(v);
          close();

          // "내 근처" 선택 시 즉시 현재 위치로
          if (v === '내 근처') {
            await locateMe();
            onSearch({ force: false }); // 위치 이동 직후 캐시 기반 검색
          } else {
            // (선택) 주요 권역별 중앙 좌표 프리셋으로 점프
            const presets = {
              서울: { lat: 37.5665, lng: 126.978, zoom: 0.15 },
              경기: { lat: 37.4138, lng: 127.5183, zoom: 0.35 },
              인천: { lat: 37.4563, lng: 126.7052, zoom: 0.2 },
              부산: { lat: 35.1796, lng: 129.0756, zoom: 0.2 },
              대구: { lat: 35.8714, lng: 128.6014, zoom: 0.2 },
              대전: { lat: 36.3504, lng: 127.3845, zoom: 0.2 },
              광주: { lat: 35.1595, lng: 126.8526, zoom: 0.2 },
              울산: { lat: 35.5384, lng: 129.3114, zoom: 0.22 },
              세종: { lat: 36.48, lng: 127.289, zoom: 0.22 },
            };
            if (presets[v]) {
              const { lat, lng, zoom } = presets[v];
              moveTo(lat, lng, zoom);
            }
          }
        },
      },
    }),
    [chargerType, feeType, liveStatus, region, locateMe, moveTo],
  );

  // 마커 색상(상태에 따라)
  const pinColorOf = status => {
    if (status === '사용가능') return '#10B981'; // green
    if (status === '충전중') return '#F59E0B'; // amber
    return '#EF4444'; // red or default
  };

  // ========== 렌더 ==========
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
        bounces={false}
      >
        <Text style={styles.title}>EV 충전소 찾기</Text>

        {/* 필터 카드 */}
        <View style={styles.card}>
          <View style={styles.row}>
            <SelectField
              label="충전기 유형"
              value={chargerType}
              onPress={open('charger')}
            />
            <SelectField label="주차료" value={feeType} onPress={open('fee')} />
          </View>

          <View style={styles.row}>
            <SelectField
              label="실시간 상태"
              value={liveStatus}
              onPress={open('status')}
            />
            <SelectField label="지역" value={region} onPress={open('region')} />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => onSearch({ force: false })}
            >
              <Text style={[styles.btnText, styles.btnPrimaryText]}>검색</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnGhost]}
              onPress={onReset}
            >
              <Text style={[styles.btnText, styles.btnGhostText]}>초기화</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.liveRow}>
            <Text style={styles.liveText}>
              업데이트: {lastUpdated ? formatKST(lastUpdated) : '—'}
            </Text>
            <TouchableOpacity
              style={[styles.btnMini]}
              onPress={() => onSearch({ force: true })}
            >
              <Text style={styles.btnMiniText}>새로고침</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 지도 카드 */}
        <View style={styles.mapCard}>
          <View style={styles.mapBox}>
            <MapView
              style={{ flex: 1 }}
              provider={PROVIDER_GOOGLE}
              initialRegion={mapRegion}
              region={mapRegion}
              onRegionChangeComplete={setMapRegion}
              showsUserLocation
              showsMyLocationButton={false}
              toolbarEnabled={false}
            >
              {markers.map(m => (
                <Marker
                  key={m.id}
                  coordinate={{ latitude: m.lat, longitude: m.lng }}
                  title={m.name || '충전소'}
                  description={m.status || ''}
                  pinColor={pinColorOf(m.status)}
                >
                  <Callout tooltip>
                    <View style={styles.calloutWrap}>
                      <Text style={styles.coTitle}>{m.name || '충전소'}</Text>

                      <Text style={styles.coRow}>
                        📍 {m.address || '주소 정보 없음'}
                      </Text>

                      <Text style={styles.coRow}>
                        🧩 대수: {m.chargers ?? '-'}{' '}
                        {typeof m.available === 'number'
                          ? `(가능 ${m.available})`
                          : ''}
                      </Text>

                      <Text style={styles.coRow}>
                        ⚡ 유형: {m.speed || '정보 없음'}
                      </Text>

                      <Text style={styles.coRow}>
                        💰 금액: {m.price || '정보 없음'}
                      </Text>

                      <View style={styles.badges}>
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: pinColorOf(m.status) },
                          ]}
                        >
                          <Text style={styles.badgeText}>
                            {m.status || '상태 미확인'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Callout>
                </Marker>
              ))}
            </MapView>

            {/* 줌 컨트롤 (동작 보정) */}
            <View style={styles.fabs}>
              {/* + : 더 확대 → delta 감소 (하한선 적용) */}
              <TouchableOpacity
                style={styles.fab}
                onPress={() =>
                  setMapRegion(r => ({
                    ...r,
                    latitudeDelta: Math.max(r.latitudeDelta * 0.7, 0.004),
                    longitudeDelta: Math.max(r.longitudeDelta * 0.7, 0.004),
                  }))
                }
              >
                <Text style={styles.fabSign}>＋</Text>
              </TouchableOpacity>

              {/* − : 축소 → delta 증가 (상한선 적용) */}
              <TouchableOpacity
                style={styles.fab}
                onPress={() =>
                  setMapRegion(r => ({
                    ...r,
                    latitudeDelta: Math.min(r.latitudeDelta / 0.7, 0.6),
                    longitudeDelta: Math.min(r.longitudeDelta / 0.7, 0.6),
                  }))
                }
              >
                <Text style={styles.fabSign}>−</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {visibleSheet && (
        <FilterSheet
          title={sheetData[visibleSheet].title}
          options={sheetData[visibleSheet].options}
          value={sheetData[visibleSheet].value}
          onClose={close}
          onSelect={sheetData[visibleSheet].onSelect}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  title: {
    fontSize: 28,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 40,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#f1f1f1',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 20,
  },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: '#3879F1' },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  btnGhost: { backgroundColor: '#d9d9d9' },
  btnGhostText: { color: '#ffffff', fontWeight: '700', fontSize: 18 },
  btnText: { fontSize: 16 },

  mapCard: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  mapBox: {
    height: 470,
    borderRadius: 20,
    overflow: 'hidden',
  },
  fabs: {
    position: 'absolute',
    right: 12,
    top: 12,
    gap: 10,
  },
  fab: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0E9F6E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  fabSign: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
    includeFontPadding: false,
  },

  calloutWrap: {
    maxWidth: 260,
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 12,
  },
  coTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  coRow: {
    color: '#E5E7EB',
    fontSize: 13,
    marginTop: 2,
  },
  badges: { flexDirection: 'row', gap: 8, marginTop: 10 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  liveRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveText: {
    fontSize: 12,
    color: '#6B7280',
    paddingHorizontal: 2,
  },
  btnMini: {
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 16,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnMiniText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
});
