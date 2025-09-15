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
import FilterSheet from '../components/FilterSheet';
import SelectField from '../components/SelectField';

export default function MainScreen() {
  const [visibleSheet, setVisibleSheet] = useState(null); // 'charger' | 'fee' | 'status' | 'region'
  const [chargerType, setChargerType] = useState('전체');
  const [feeType, setFeeType] = useState('전체');
  const [liveStatus, setLiveStatus] = useState('전체');
  const [region, setRegion] = useState('전체');
  const [markers, setMarkers] = useState([]);

  // 탭바 높이로 아래 여백 확보
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

  const onSearch = useCallback(async () => {
    const demo = [
      {
        id: '1',
        lat: 37.4999,
        lng: 127.0365,
        name: '강남구청 급속',
        status: '사용가능',
      },
      {
        id: '2',
        lat: 37.495,
        lng: 127.028,
        name: '역삼역 공영주차장',
        status: '충전중',
      },
      {
        id: '3',
        lat: 37.507,
        lng: 127.03,
        name: '선릉공원 완속',
        status: '사용가능',
      },
    ];
    const filtered = demo.filter(
      m => liveStatus === '전체' || m.status === liveStatus,
    );
    setMarkers(filtered);
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

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
        bounces={false}
      >
        <Text style={styles.title}>EV 충전소 찾기</Text>

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
});
