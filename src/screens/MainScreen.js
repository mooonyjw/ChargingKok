// src/screens/MainScreen.js
import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
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
import Geolocation from 'react-native-geolocation-service';
import FilterSheet from '../components/FilterSheet';
import SelectField from '../components/SelectField';

// ---- Backend base URL ----
const BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';

// === 프론트 → 백엔드 필터 매핑 ===
const mapStatusToEnum = label => {
  if (label === '사용가능') return 'AVAILABLE';
  if (label === '충전중') return 'CHARGING';
  if (label === '사용불가') return 'UNAVAILABLE';
  return null; // '전체'
};
const mapChargerToTypes = label => {
  if (label === '완속') return ['AC_SLOW'];
  if (label === '급속') return ['DC_COMBO', 'CHADEMO', 'DC_FAST', 'HPC'];
  return null; // '전체'
};
const mapFeeToEnum = label => {
  if (label === '무료') return 'FREE';
  if (label === '유료') return 'PAID';
  return null; // '전체'
};

// ---- 성능 도움: Marker 메모이제이션 ----
const MarkerItem = React.memo(function MarkerItem({ m, pinColor }) {
  return (
    <Marker
      key={m.id}
      coordinate={{ latitude: m.lat, longitude: m.lng }}
      pinColor={pinColor}
      tracksViewChanges={false}
      stopPropagation
    >
      <Callout tooltip>
        <View style={styles.calloutWrap}>
          <Text style={styles.coTitle}>{m.name || '충전소'}</Text>
          <Text style={styles.coRow}>📍 {m.address || '주소 정보 없음'}</Text>
          <Text style={styles.coRow}>
            🧩 대수: {m.chargers ?? '-'}
            {typeof m.available === 'number' ? ` (가능 ${m.available})` : ''}
          </Text>
          <Text style={styles.coRow}>⚡ 유형: {m.speed || '정보 없음'}</Text>
          <Text style={styles.coRow}>💰 금액: {m.price || '정보 없음'}</Text>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: pinColor }]}>
              <Text style={styles.badgeText}>{m.status || '상태 미확인'}</Text>
            </View>
          </View>
        </View>
      </Callout>
    </Marker>
  );
});

export default function MainScreen() {
  const mapRef = useRef(null);

  const [visibleSheet, setVisibleSheet] = useState(null); // 'charger' | 'fee' | 'status' | 'region'
  const [chargerType, setChargerType] = useState('전체');
  const [feeType, setFeeType] = useState('전체');
  const [liveStatus, setLiveStatus] = useState('전체');
  const [region, setRegion] = useState('전체');

  const [markers, setMarkers] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  // 초기엔 null → 첫 위치 획득 후 설정(첫 렌더에서 내 위치로)
  const [mapRegion, setMapRegion] = useState(null);

  const tabBarHeight = useBottomTabBarHeight();
  const [isLoading, setIsLoading] = useState(false);
  const pendingReq = useRef(false); // 검색 중복 방지

  // "이 지역에서 검색하기" 배너 컨트롤
  const [hasSearched, setHasSearched] = useState(false); // ✅ 최초 검색 전엔 배너 비활성
  const lastSearchedRegionRef = useRef(null);
  const [showSearchHere, setShowSearchHere] = useState(false);
  const regionIdleTimer = useRef(null);

  const [isLocating, setIsLocating] = useState(false);

  const open = key => () => setVisibleSheet(key);
  const close = () => setVisibleSheet(null);

  const onReset = useCallback(() => {
    setChargerType('전체');
    setFeeType('전체');
    setLiveStatus('전체');
    setRegion('전체');
    setMarkers([]);
    setLastUpdated(null);
    lastSearchedRegionRef.current = null;
    setShowSearchHere(false);
    setHasSearched(false);
  }, []);

  // === 위치 권한 ===
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
    const next = {
      latitude: lat,
      longitude: lng,
      latitudeDelta: zoom,
      longitudeDelta: zoom,
    };

    // 1) 애니메이션으로 즉시 화면 이동 (체감 확실)
    if (mapRef.current?.animateToRegion) {
      mapRef.current.animateToRegion(next, 350);
    }

    // 2) 상태도 업데이트(제어형 region 유지)
    setMapRegion(prev => (prev ? { ...prev, ...next } : next));
  }, []);

  const locateMe = useCallback(
    async ({ alsoSearch = false } = {}) => {
      const ok = await requestLocationPermission();
      if (!ok) {
        Alert.alert('권한 필요', '설정에서 위치 권한을 허용해주세요.');
        return;
      }
      setIsLocating(true);

      Geolocation.getCurrentPosition(
        async pos => {
          const { latitude, longitude } = pos.coords;
          moveTo(latitude, longitude, 0.02);
          setIsLocating(false);
          if (alsoSearch) {
            setTimeout(() => onSearch({ force: false }), 120);
          }
        },
        err => {
          setIsLocating(false);
          console.warn('[geo] getCurrentPosition error:', err);
          // 실패 시: fallback (서울시청)
          moveTo(37.5665, 126.978, 0.05);
          Alert.alert(
            '위치 확인 실패',
            err?.message ?? '현재 위치를 가져오지 못했습니다.',
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 3000,
          forceRequestLocation: true,
          showLocationDialog: true,
        },
      );
    },
    [moveTo, onSearch, requestLocationPermission],
  );

  // === 앱 첫 진입: 내 위치로 포커스 + 자동 검색
  useEffect(() => {
    locateMe({ alsoSearch: true });
  }, [locateMe]);

  // ====== 검색 ======
  // 줌 → 반경(m)
  const calcRadiusMeters = useCallback(latDelta => {
    const meters = latDelta * 111000;
    return Math.max(3000, Math.min(25000, Math.round(meters * 0.8)));
  }, []);

  const onSearch = useCallback(
    async (opts = { force: false }) => {
      if (!mapRegion) return;
      if (pendingReq.current) return;
      pendingReq.current = true;
      setIsLoading(true);
      setHasSearched(true); // ✅ 이 순간부터 지도 이동 시 배너 표시 로직 활성화

      try {
        const { latitude, longitude, latitudeDelta } = mapRegion;

        const statusEnum = mapStatusToEnum(liveStatus);
        const types = mapChargerToTypes(chargerType);
        const feeEnum = mapFeeToEnum(feeType);

        const qs = new URLSearchParams({
          lat: String(latitude),
          lng: String(longitude),
          radius: String(calcRadiusMeters(latitudeDelta)),
        });
        if (statusEnum) qs.set('status', statusEnum);
        if (feeEnum) qs.set('fee', feeEnum);
        if (Array.isArray(types) && types.length)
          qs.set('type', types.join(','));

        const url = `${BASE_URL}/stations/live?${qs.toString()}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { items, updatedAt } = await res.json();

        if (Array.isArray(items) && items.length > 0) {
          const same =
            items.length === markers.length &&
            items.every((it, i) => it.id === markers[i]?.id);
          if (!same) setMarkers(items);
          setLastUpdated(updatedAt || null);

          // 이 지점을 검색한 것으로 기록 → 배너 숨김
          lastSearchedRegionRef.current = mapRegion;
          setShowSearchHere(false);
        } else {
          Alert.alert('결과 없음', '조건에 맞는 실시간 충전소가 없습니다.');
        }
      } catch (e) {
        Alert.alert('검색 실패', '실시간 데이터를 불러오지 못했습니다.');
        console.error(e);
      } finally {
        setIsLoading(false);
        pendingReq.current = false;
      }
    },
    [
      mapRegion,
      liveStatus,
      chargerType,
      feeType,
      markers,
      calcRadiusMeters,
      BASE_URL,
    ],
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

  // ====== 시트 옵션 ======
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

          if (v === '내 근처') {
            await locateMe();
          } else {
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

  // ====== 마커 색상 ======
  const pinColorOf = status => {
    if (status === '사용가능') return '#10B981'; // green
    if (status === '충전중') return '#F59E0B'; // orange
    if (status === '정보없음') return '#FACC15'; // yellow
    return '#EF4444'; // red (사용불가 등)
  };

  // ====== 화면 내 마커만 렌더 + 격자 샘플링 ======
  const visibleMarkers = useMemo(() => {
    if (!markers.length || !mapRegion) return [];
    const { latitude, longitude, latitudeDelta, longitudeDelta } = mapRegion;

    const pad = 0.1;
    const minLat = latitude - latitudeDelta * (0.5 + pad);
    const maxLat = latitude + latitudeDelta * (0.5 + pad);
    const minLng = longitude - longitudeDelta * (0.5 + pad);
    const maxLng = longitude + longitudeDelta * (0.5 + pad);

    const inView = markers.filter(
      m =>
        m.lat >= minLat &&
        m.lat <= maxLat &&
        m.lng >= minLng &&
        m.lng <= maxLng,
    );

    const MAX_RENDER = 400;
    if (inView.length <= MAX_RENDER) return inView;

    const cell = Math.max(latitudeDelta, longitudeDelta) * 0.04;
    const bucket = new Map();
    for (const m of inView) {
      const ky = `${Math.floor(m.lat / cell)}:${Math.floor(m.lng / cell)}`;
      if (!bucket.has(ky)) bucket.set(ky, m);
    }
    return Array.from(bucket.values()).slice(0, MAX_RENDER);
  }, [markers, mapRegion]);

  // ====== 렌더 ======
  const fallbackRegion = {
    latitude: 37.5665, // 서울시청
    longitude: 126.978,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

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
              style={[
                styles.btn,
                styles.btnPrimary,
                isLoading && { opacity: 0.7 },
              ]}
              onPress={() => onSearch({ force: false })}
              disabled={isLoading}
            >
              <Text style={[styles.btnText, styles.btnPrimaryText]}>
                {isLoading ? '검색중...' : '검색'}
              </Text>
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
              ref={mapRef}
              style={{ flex: 1 }}
              provider={PROVIDER_GOOGLE}
              region={mapRegion || fallbackRegion} // ✅ 초기엔 fallback, 위치 획득 후 내 위치
              onRegionChangeComplete={r => {
                setMapRegion(prev => (prev ? { ...prev, ...r } : r));
                if (!hasSearched) return; // ✅ 첫 검색 전엔 배너 숨김

                // 사용자가 멈춘 뒤 판단(디바운스)
                if (regionIdleTimer.current)
                  clearTimeout(regionIdleTimer.current);
                regionIdleTimer.current = setTimeout(() => {
                  const last = lastSearchedRegionRef.current;
                  setShowSearchHere(isRegionSignificantlyDifferent(r, last));
                }, 350);
              }}
              showsUserLocation
              showsMyLocationButton={false}
              toolbarEnabled={false}
              moveOnMarkerPress={false}
            >
              {visibleMarkers.map(m => (
                <MarkerItem key={m.id} m={m} pinColor={pinColorOf(m.status)} />
              ))}
            </MapView>

            {/* === 오버레이: 하단 중앙 배너 + 우측 하단 내 위치 === */}
            <View style={styles.mapOverlay} pointerEvents="box-none">
              {/* 하단 중앙 "이 지역에서 검색하기" */}
              {hasSearched && showSearchHere && (
                <View
                  style={styles.searchHereCenterWrap}
                  pointerEvents="box-none"
                >
                  <TouchableOpacity
                    style={styles.searchHereCenterBtn}
                    onPress={() => onSearch({ force: false })}
                  >
                    <Text style={styles.searchHereText}>
                      이 지역에서 검색하기
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 우측 하단: 내 위치 버튼 */}
              <View style={styles.fabsBottomRight}>
                <TouchableOpacity
                  style={[styles.fabLocate, isLocating && { opacity: 0.7 }]}
                  onPress={() => locateMe({ alsoSearch: true })}
                  disabled={isLocating}
                >
                  <Text style={styles.locateIcon}>◎</Text>
                </TouchableOpacity>
              </View>
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

// 센터/줌 변화가 충분한지 판단
function isRegionSignificantlyDifferent(a, b) {
  if (!a || !b) return true;
  const centerDiffLat = Math.abs(a.latitude - b.latitude);
  const centerDiffLng = Math.abs(a.longitude - b.longitude);
  const zoomDiffLat = Math.abs(a.latitudeDelta - b.latitudeDelta);
  const zoomDiffLng = Math.abs(a.longitudeDelta - b.longitudeDelta);
  const centerMoved =
    centerDiffLat > a.latitudeDelta * 0.15 ||
    centerDiffLng > a.longitudeDelta * 0.15;
  const zoomChanged =
    zoomDiffLat > a.latitudeDelta * 0.3 || zoomDiffLng > a.longitudeDelta * 0.3;
  return centerMoved || zoomChanged;
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

  // === 오버레이 레이어 ===
  mapOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 5,
  },

  // 하단 중앙 배너
  searchHereCenterWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
    alignItems: 'center',
  },
  searchHereCenterBtn: {
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  searchHereText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },

  // 우측 하단 FAB 영역
  fabsBottomRight: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    gap: 10,
    alignItems: 'flex-end',
  },
  fabLocate: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  locateIcon: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    includeFontPadding: false,
  },

  // Callout
  calloutWrap: {
    maxWidth: 260,
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 12,
  },
  coTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  coRow: { color: '#E5E7EB', fontSize: 13, marginTop: 2 },
  badges: { flexDirection: 'row', gap: 8, marginTop: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  liveRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveText: { fontSize: 12, color: '#6B7280', paddingHorizontal: 2 },

  btnMini: {
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 16,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnMiniText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
