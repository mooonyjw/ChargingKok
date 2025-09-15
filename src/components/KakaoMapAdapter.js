// // src/components/KakaoMapAdapter.js
// import React, { useEffect, useMemo, useRef } from 'react';
// import { View, StyleSheet, Platform, PermissionsAndroid } from 'react-native';
// import * as KakaoMapPkg from '@react-native-kakao/map';
// import { NativeModules } from 'react-native';

// // src/components/KakaoMapAdapter.js
// import React from 'react';
// import { View, Text, StyleSheet } from 'react-native';

// export default function KakaoMapAdapter({ style }) {
//   return (
//     <View style={[styles.box, style]}>
//       <Text style={styles.txt}>지도 기능은 추후 연결 예정</Text>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   box: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: '#EEE',
//     borderRadius: 12,
//   },
//   txt: { color: '#666' },
// });

// // const { KakaoMap, KakaoMapView, KakaoMapMarker } = KakaoMapPkg;

// // const ANDROID_NATIVE_APP_KEY =
// //   Platform.OS === 'android'
// //     ? NativeModules?.RNDeviceInfo?.appName && 'e7e282e8d9a51ad828ac70918d007ead' // 폴백
// //     : null;

// // // 위치 권한(선택)
// // async function ensureLocationPermission() {
// //   if (Platform.OS !== 'android') return true;
// //   const granted = await PermissionsAndroid.request(
// //     PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
// //   );
// //   return granted === PermissionsAndroid.RESULTS.GRANTED;
// // }

// // export default function KakaoMapAdapter({
// //   style,
// //   initialCenter = { lat: 37.5665, lng: 126.978 }, // 서울 시청 기본값
// //   initialLevel = 5,
// //   markers = [],
// //   showScaleBar = true,
// //   showCompass = true,
// //   poiEnabled = true,
// // }) {
// //   const mapRef = useRef(null);

// //   useEffect(() => {
// //     // SDK 초기화는 앱 생애주기에서 1회만 수행되면 충분
// //     if (Platform.OS === 'android' && KakaoMap?.initializeKakaoMapSDK) {
// //       KakaoMap.initializeKakaoMapSDK(ANDROID_NATIVE_APP_KEY);
// //     }
// //     // (선택) 위치 권한 요청
// //     ensureLocationPermission().catch(() => {});
// //   }, []);

// //   const initialCamera = useMemo(
// //     () => ({
// //       lat: initialCenter.lat,
// //       lng: initialCenter.lng,
// //       zoomLevel: initialLevel,
// //     }),
// //     [initialCenter, initialLevel],
// //   );

// //   return (
// //     <View style={[styles.nativeWrap, style]}>
// //       <KakaoMapView
// //         ref={mapRef}
// //         style={StyleSheet.absoluteFill}
// //         initialCamera={initialCamera}
// //         isShowScaleBar={showScaleBar}
// //         isShowCompass={showCompass}
// //         poiEnabled={poiEnabled}
// //         // onMapReady={() => console.log('KakaoMap ready')}
// //       >
// //         {markers.map(m => (
// //           <KakaoMapMarker
// //             key={m.id ?? `${m.lat},${m.lng}`}
// //             coordinate={{ lat: m.lat, lng: m.lng }}
// //             title={m.name || '충전소'}
// //             description={m.status || ''}
// //           />
// //         ))}
// //       </KakaoMapView>
// //     </View>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   nativeWrap: { flex: 1, backgroundColor: '#fff' },
// // });
