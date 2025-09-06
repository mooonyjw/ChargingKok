// /**
//  * Sample React Native App
//  * https://github.com/facebook/react-native
//  *
//  * @format
//  */

// import { NewAppScreen } from '@react-native/new-app-screen';
// import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
// import {
//   SafeAreaProvider,
//   useSafeAreaInsets,
// } from 'react-native-safe-area-context';

// function App() {
//   const isDarkMode = useColorScheme() === 'dark';

//   return (
//     <SafeAreaProvider>
//       <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
//       <AppContent />
//     </SafeAreaProvider>
//   );
// }

// function AppContent() {
//   const safeAreaInsets = useSafeAreaInsets();

//   return (
//     <View style={styles.container}>
//       <NewAppScreen
//         templateFileName="App.tsx"
//         safeAreaInsets={safeAreaInsets}
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
// });

// export default App;
import React, {useState} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Button,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';

type Vehicle = {
  make: string;
  model: string;
  batteryKwh: number;
  soc: number; // %
};

export default function App() {
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 샘플 차량 정보 (추후 AsyncStorage/서버로 교체 예정)
  const vehicle: Vehicle = { make: 'Hyundai', model: 'IONIQ 5', batteryKwh: 72, soc: 55 };
  const estRangeKm = Math.round((vehicle.soc / 100) * 480); // 임시 계산식

  // Opendatasoft 차량 모델 API 호출 예시
  const fetchVehicleModels = async (limit = 10) => {
    const url =
      'https://data.opendatasoft.com/api/explore/v2.1/catalog/datasets/all-vehicles-model@public/records?select=model&limit=' +
      limit;
    const res = await fetch(url);
    if (!res.ok) throw new Error('API request failed');
    const json = await res.json();
    return (json?.results ?? []).map((r: any) => r.model);
  };

  const onPressNearbyStations = async () => {
    // 위치 권한 없이, 우선은 API 호출 연습만
    try {
      setError(null);
      setLoading(true);
      const list = await fetchVehicleModels(10);
      setModels(list);
    } catch (e: any) {
      setError(e.message ?? 'failed');
    } finally {
      setLoading(false);
    }
  };

  const onPressMyVehicle = () => {
    Alert.alert(
      '내 차량 정보',
      `제조사: ${vehicle.make}\n모델: ${vehicle.model}\n배터리: ${vehicle.batteryKwh} kWh\n잔량: ${vehicle.soc}%\n예상 주행거리: ${estRangeKm} km`,
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>충전콕</Text>
        <Text style={styles.subtitle}>무엇을 도와드릴까요?</Text>

        <View style={styles.buttons}>
          <View style={styles.button}>
            <Button title="내 근처 충전소 추천 (샘플 호출)" onPress={onPressNearbyStations} />
          </View>
          <View style={styles.button}>
            <Button title="내 차량 정보" onPress={onPressMyVehicle} />
          </View>
        </View>

        {loading && <ActivityIndicator style={{ marginTop: 16 }} />}

        {error && <Text style={styles.error}>에러: {error}</Text>}

        <FlatList
          style={{ marginTop: 12 }}
          data={models}
          keyExtractor={(item, idx) => item + idx}
          renderItem={({ item }) => <Text style={styles.item}>• {item}</Text>}
          ListEmptyComponent={!loading ? <Text style={styles.empty}>불러온 데이터가 없습니다.</Text> : null}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: '800', marginTop: 8 },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4, marginBottom: 16 },
  buttons: { gap: 12 },
  button: { borderRadius: 8, overflow: 'hidden' },
  item: { fontSize: 16, paddingVertical: 6 },
  error: { color: 'red', marginTop: 8 },
  empty: { color: '#888', marginTop: 8 },
});