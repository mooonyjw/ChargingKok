// src/services/LocationService.js
import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import Config from 'react-native-config';

export class LocationService {
  // === 권한 요청 ===
  static async requestLocationPermission() {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: '위치 권한 요청',
          message: '근처 충전소 추천을 위해 위치 권한이 필요합니다.',
          buttonPositive: '허용',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  // === 현재 위치 가져오기 ===
  static async getCurrentLocation() {
    const hasPermission = await this.requestLocationPermission();
    if (!hasPermission) {
      throw new Error('위치 권한이 거부되었습니다.');
    }

    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          const isDefaultLocation = (
            (latitude === 37.4219983 && longitude === -122.084) || // Google 기본값 1
            (latitude === 37.4419 && longitude === -122.1419) ||   // Google 기본값 2
            (latitude === 0 && longitude === 0)                    // 완전한 기본값
          );
          
          if (isDefaultLocation) {
            console.log('Detected default coordinates, using Seoul fallback');
            resolve({
              latitude: 37.5665,  // 서울시청
              longitude: 126.9780,
              isEmulatorFallback: true,
            });
          } else {
            // 유효한 좌표라면 그대로 사용
            console.log(`Using GPS coordinates: ${latitude}, ${longitude}`);
            resolve({ latitude, longitude });
          }
        },
        (error) => {
          console.warn('LocationService error:', error);

          // Android 에뮬레이터 fallback -> 서울시청
          console.log('Location error, fallback to Seoul City Hall');
          resolve({
            latitude: 37.5665,
            longitude: 126.9780,
            isEmulatorFallback: true,
          });
        },
        {
          enableHighAccuracy: true,  // 높은 정확도 사용
          timeout: 15000,           // 15초까지 기다림
          maximumAge: 5000,         // 5초까지는 캐시된 위치 사용
          forceRequestLocation: true, // 강제로 위치 요청
          showLocationDialog: true,   // 위치 활성화 다이얼로그 표시
        }
      );
    });
  }

  // === 좌표 → 주소 변환 (Reverse Geocoding) ===
  static async getAddressFromCoords(latitude, longitude) {
    try {
    const key = Config.KAKAO_REST_API_KEY;
    const response = await fetch(
    `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${longitude}&y=${latitude}`,
    { headers: { Authorization: `KakaoAK ${key}` } }
    );

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        return data.results[0].formatted_address;
      }
      return `위도 ${latitude.toFixed(4)}, 경도 ${longitude.toFixed(4)}`;
    } catch (error) {
      console.warn('Address fetch error:', error);
      return `위도 ${latitude.toFixed(4)}, 경도 ${longitude.toFixed(4)}`;
    }
  }

  // === 현재 위치 + 주소 한 번에 ===
  static async getLocationWithAddress() {
    const loc = await this.getCurrentLocation();
    const address = await this.getAddressFromCoords(loc.latitude, loc.longitude);
    return { ...loc, address };
  }
}