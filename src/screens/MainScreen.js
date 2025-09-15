// src/screens/MainScreen.js
import React, { useMemo, useState, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import FilterSheet from '../components/FilterSheet';
import SelectField from '../components/SelectField';

export default function MainScreen() {
  const [visibleSheet, setVisibleSheet] = useState(null); // 'charger' | 'fee' | 'status' | 'region'
  const [chargerType, setChargerType] = useState('전체');
  const [feeType, setFeeType] = useState('전체');
  const [liveStatus, setLiveStatus] = useState('전체');
  const [region, setRegion] = useState('전체');
  const [markers, setMarkers] = useState([]);

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

  // TODO: 실제 백엔드 연동 시 이 부분에서 결과를 setMarkers 해주면 됨
  // TODO: 백엔드에서 [{id, latitude, longitude, stationName, address, totalCount, availableCount, fast, priceText, liveStatusText}] 식으로 넘겨주면 onSearch에서 setMarkers()로 예시처럼 매핑
  const onSearch = useCallback(async () => {
    // --- 예시: 백엔드 응답(모양은 유연하게)
    // const res = await fetch('https://api.yourserver/chargers?....');
    // const data = await res.json();
    // setMarkers(data.map(d => ({
    //   id: String(d.id),
    //   lat: d.latitude,
    //   lng: d.longitude,
    //   name: d.stationName,
    //   address: d.address,
    //   chargers: d.totalCount,                  // 총 대수
    //   available: d.availableCount,             // 사용 가능 대수
    //   speed: d.fast ? '급속' : '완속',         // 혹은 '급속/완속 혼합'
    //   price: d.priceText,                      // "300원/kWh" 등
    //   status: d.liveStatusText,                // "사용가능/충전중" 등
    // })));

    // --- 데모 데이터(현재 로직 최대한 유지)
    const demo = [
      {
        id: '1',
        lat: 37.4999,
        lng: 127.0365,
        name: '강남구청 급속',
        status: '사용가능',
        address: '서울 강남구 학동로 426',
        chargers: 6,
        available: 4,
        speed: '급속',
        price: '300원/kWh',
      },
      {
        id: '2',
        lat: 37.495,
        lng: 127.028,
        name: '역삼역 공영주차장',
        status: '충전중',
        address: '서울 강남구 테헤란로 145',
        chargers: 8,
        available: 1,
        speed: '혼합',
        price: '유료(주차요금 별도)',
      },
      {
        id: '3',
        lat: 37.507,
        lng: 127.03,
        name: '선릉공원 완속',
        status: '사용가능',
        address: '서울 강남구 삼성로 623',
        chargers: 10,
        available: 7,
        speed: '완속',
        price: '무료',
      },
    ];

    const filtered = demo.filter(
      m => liveStatus === '전체' || m.status === liveStatus,
    );
    setMarkers(filtered);

    // 검색 후 카메라를 결과 범위로 살짝 이동하고 싶으면:
    if (filtered.length > 0) {
      const latAvg = filtered.reduce((s, m) => s + m.lat, 0) / filtered.length;
      const lngAvg = filtered.reduce((s, m) => s + m.lng, 0) / filtered.length;
      setMapRegion(r => ({
        ...r,
        latitude: latAvg,
        longitude: lngAvg,
      }));
    }
  }, [liveStatus]);

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
        onSelect: v => {
          setRegion(v);
          close();
        },
      },
    }),
    [chargerType, feeType, liveStatus, region],
  );

  // TODO: status 백엔드 응답에 따라 고치기
  // 마커 색상(상태에 따라)
  const pinColorOf = status => {
    if (status === '사용가능') return '#10B981'; // green
    if (status === '충전중') return '#F59E0B'; // amber
    return '#EF4444'; // red or default
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
              style={[styles.btn, styles.btnPrimary]}
              onPress={onSearch}
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

                      {/* 주소 */}
                      <Text style={styles.coRow}>
                        📍 {m.address || '주소 정보 없음'}
                      </Text>

                      {/* 대수/가능여부 */}
                      <Text style={styles.coRow}>
                        🧩 대수: {m.chargers ?? '-'}{' '}
                        {typeof m.available === 'number'
                          ? `(가능 ${m.available})`
                          : ''}
                      </Text>

                      {/* 급/완속 */}
                      <Text style={styles.coRow}>
                        ⚡ 유형: {m.speed || '정보 없음'}
                      </Text>

                      {/* 금액 */}
                      <Text style={styles.coRow}>
                        💰 금액: {m.price || '정보 없음'}
                      </Text>

                      {/* 상태 뱃지 */}
                      <View style={styles.badges}>
                        <View
                          style={[
                            styles.badge,
                            {
                              backgroundColor: pinColorOf(m.status),
                            },
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

            {/* 줌 컨트롤 */}
            <View style={styles.fabs}>
              <TouchableOpacity
                style={styles.fab}
                onPress={() =>
                  setMapRegion(r => ({
                    ...r,
                    latitudeDelta: r.latitudeDelta * 0.7,
                    longitudeDelta: r.longitudeDelta * 0.7,
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
                    latitudeDelta: Math.min(r.latitudeDelta / 0.7, 0.3),
                    longitudeDelta: Math.min(r.longitudeDelta / 0.7, 0.3),
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

  // 지도 카드
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
    height: 360,
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

  // Callout
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
});
