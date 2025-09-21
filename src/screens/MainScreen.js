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
import FilterSheet from '../components/FilterSheet';
import SelectField from '../components/SelectField';

// ---- Backend base URL (실기기면 PC의 LAN IP로 바꾸세요) ----
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

// ---- 성능 도움: Marker 컴포넌트 메모이제이션 ----
const MarkerItem = React.memo(function MarkerItem({ m, pinColor }) {
  return (
    <Marker
      key={m.id}
      coordinate={{ latitude: m.lat, longitude: m.lng }}
      pinColor={pinColor}
      // title/description 생략해 말풍선 강제 렌더 방지
      tracksViewChanges={false}
      stopPropagation={true}
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
  const [isLoading, setIsLoading] = useState(false);
  const pendingReq = useRef(false); // 검색 중복 방지 플래그

  const open = key => () => setVisibleSheet(key);
  const close = () => setVisibleSheet(null);

  const onReset = useCallback(() => {
    setChargerType('전체');
    setFeeType('전체');
    setLiveStatus('전체');
    setRegion('전체');
    setMarkers([]);
    setLastUpdated(null);
    setShowSearchHere(false);
    lastSearchedRegionRef.current = null;
  }, []);

  // === "이 지역에서 검색" 상태 ===
  const lastSearchedRegionRef = useRef(null); // 마지막으로 검색을 수행했던 region
  const [showSearchHere, setShowSearchHere] = useState(false);
  const regionIdleTimer = useRef(null);

  // 두 영역이 충분히 다른지 판단 (센터 이동 + 줌 변화 기준)
  const isRegionSignificantlyDifferent = (a, b) => {
    if (!a || !b) return true;
    const centerDiffLat = Math.abs(a.latitude - b.latitude);
    const centerDiffLng = Math.abs(a.longitude - b.longitude);
    const zoomDiffLat = Math.abs(a.latitudeDelta - b.latitudeDelta);
    const zoomDiffLng = Math.abs(a.longitudeDelta - b.longitudeDelta);

    const centerMoved =
      centerDiffLat > a.latitudeDelta * 0.15 ||
      centerDiffLng > a.longitudeDelta * 0.15;
    const zoomChanged =
      zoomDiffLat > a.latitudeDelta * 0.3 ||
      zoomDiffLng > a.longitudeDelta * 0.3;

    return centerMoved || zoomChanged;
  };

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

  // ====== 검색 ======
  // 화면 줌에 따라 자동 반경 산정 (대략값, 최소 3km ~ 최대 25km)
  const calcRadiusMeters = useCallback(latDelta => {
    const meters = latDelta * 111000; // 위도 1도 ≒ 111km
    return Math.max(3000, Math.min(25000, Math.round(meters * 0.8)));
  }, []);

  const onSearch = useCallback(
    async (opts = { force: false }) => {
      if (pendingReq.current) return;
      pendingReq.current = true;
      setIsLoading(true);

      try {
        const { latitude, longitude, latitudeDelta } = mapRegion;

        const statusEnum = mapStatusToEnum(liveStatus);
        const types = mapChargerToTypes(chargerType);
        const feeEnum = mapFeeToEnum(feeType);

        const qs = new URLSearchParams({
          lat: String(latitude),
          lng: String(longitude),
          radius: String(calcRadiusMeters(latitudeDelta)),
          force: String(!!opts.force),
        });
        if (statusEnum) qs.set('status', statusEnum);
        if (feeEnum) qs.set('fee', feeEnum);
        if (Array.isArray(types) && types.length)
          qs.set('type', types.join(','));

        const res = await fetch(`${BASE_URL}/stations/live?${qs.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { items, updatedAt } = await res.json();

        if (Array.isArray(items) && items.length > 0) {
          const same =
            items.length === markers.length &&
            items.every((it, i) => it.id === markers[i]?.id);

          if (!same) setMarkers(items);
          setLastUpdated(updatedAt || null);

          // ✅ 이 시점이 "마지막 검색 기준"이 됨
          lastSearchedRegionRef.current = mapRegion;
          setShowSearchHere(false);

          // 결과 중심으로 부드럽게 이동 (필요할 때만)
          const latAvg = items.reduce((s, m) => s + m.lat, 0) / items.length;
          const lngAvg = items.reduce((s, m) => s + m.lng, 0) / items.length;
          if (
            Math.abs(latAvg - latitude) > mapRegion.latitudeDelta * 0.2 ||
            Math.abs(lngAvg - longitude) > mapRegion.longitudeDelta * 0.2
          ) {
            moveTo(latAvg, lngAvg, Math.min(latitudeDelta, 0.03));
          }
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
      moveTo,
      liveStatus,
      chargerType,
      feeType,
      markers,
      calcRadiusMeters,
    ],
  );

  // "이 지역에서 검색" 버튼 눌렀을 때
  const handleSearchHere = useCallback(() => {
    onSearch({ force: false });
    // onSearch 성공 시점에 lastSearchedRegionRef/버튼 상태를 갱신함
  }, [onSearch]);

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
    if (!markers.length) return [];

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
              style={{ flex: 1 }}
              provider={PROVIDER_GOOGLE}
              initialRegion={mapRegion}
              region={mapRegion}
              onRegionChangeComplete={r => {
                setMapRegion(r);

                // 사용자가 멈춘 뒤에 판단(디바운스)
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

            {/* 줌 컨트롤 */}
            <View style={styles.fabs}>
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

            {/* "이 지역에서 검색" 버튼 (네이버 지도 UX 유사) */}
            {showSearchHere && (
              <View pointerEvents="box-none" style={styles.searchHereWrap}>
                <TouchableOpacity
                  onPress={handleSearchHere}
                  activeOpacity={0.9}
                  style={styles.searchHereBtn}
                >
                  <Text style={styles.searchHereText}>
                    이 지역에서 검색하기
                  </Text>
                </TouchableOpacity>
              </View>
            )}
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

  // "이 지역에서 검색" UI
  searchHereWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    alignItems: 'center',
  },
  searchHereBtn: {
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  searchHereText: {
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
