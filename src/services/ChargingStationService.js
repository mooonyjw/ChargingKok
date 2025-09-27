// src/services/ChargingStationService.js
import Config from 'react-native-config';

const API_BASE_URL = Config.BACKEND_URL || 'http://localhost:4000';

export class ChargingStationService {
  // 기본 충전소 조회 (페이지네이션)
  static async getStations(params = {}) {
    const query = new URLSearchParams({
      limit: params.limit || '20',
      offset: params.offset || '0',
      ...(params.lat && { lat: params.lat.toString() }),
      ...(params.lng && { lng: params.lng.toString() }),
      ...(params.radius && { radius: params.radius.toString() }),
    });

    try {
      const response = await fetch(`${API_BASE_URL}/api/stations?${query}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'API 호출 실패');
      }
      
      return data;
    } catch (error) {
      console.error('충전소 조회 실패:', error);
      throw error;
    }
  }

  // 실시간 충전소 상태 조회 (KECO API)
  static async getLiveStations(params = {}) {
    if (!params.lat || !params.lng) {
      throw new Error('위도와 경도가 필요합니다');
    }

    const query = new URLSearchParams({
      lat: params.lat.toString(),
      lng: params.lng.toString(),
      radius: params.radius || '10000',
      ...(params.status && { status: params.status }),
      ...(params.type && { type: params.type }),
      ...(params.fee && { fee: params.fee }),
    });

    try {
      const response = await fetch(`${API_BASE_URL}/stations/live?${query}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'API 호출 실패');
      }
      
      return data;
    } catch (error) {
      console.error('실시간 충전소 조회 실패:', error);
      throw error;
    }
  }

  // 위치 기반 근처 충전소 검색
  static async getNearbyStations(latitude, longitude, radius = 5000, limit = 10) {
    try {
      const data = await this.getStations({
        lat: latitude,
        lng: longitude,
        radius,
        limit,
      });

      // 거리 계산 및 정렬
      const stationsWithDistance = data.stations.map(station => ({
        ...station,
        distance: this.calculateDistance(latitude, longitude, station.lat, station.lng)
      })).sort((a, b) => a.distance - b.distance);

      return {
        ...data,
        stations: stationsWithDistance
      };
    } catch (error) {
      console.error('근처 충전소 검색 실패:', error);
      throw error;
    }
  }

  // 급속 충전소만 필터링
  static async getFastChargers(latitude, longitude, radius = 10000) {
    try {
      // 먼저 데이터베이스에서 검색
      const dbData = await this.getStations({
        lat: latitude,
        lng: longitude,
        radius,
        limit: 50,
      });

      // 급속 충전소 필터링
      const fastChargers = dbData.stations.filter(station => 
        station.speed && station.speed.includes('급속')
      );

      // 실시간 데이터도 시도 (KECO API)
      try {
        const liveData = await this.getLiveStations({
          lat: latitude,
          lng: longitude,
          type: '급속',
          radius,
        });

        return {
          database: fastChargers,
          live: liveData.items || [],
          total: fastChargers.length + (liveData.items?.length || 0)
        };
      } catch (liveError) {
        console.log('실시간 데이터 조회 실패, 데이터베이스 결과만 반환:', liveError);
        return {
          database: fastChargers,
          live: [],
          total: fastChargers.length
        };
      }
    } catch (error) {
      console.error('급속 충전소 검색 실패:', error);
      throw error;
    }
  }

  // 사용 가능한 충전소만 조회
  static async getAvailableStations(latitude, longitude, radius = 10000) {
    try {
      // 실시간 API로 사용 가능한 충전소 조회
      const liveData = await this.getLiveStations({
        lat: latitude,
        lng: longitude,
        status: 'avail',
        radius,
      });

      return liveData;
    } catch (error) {
      console.log('실시간 데이터 조회 실패, 데이터베이스에서 검색:', error);
      
      // 실시간 API 실패 시 데이터베이스에서 검색
      const dbData = await this.getStations({
        lat: latitude,
        lng: longitude,
        radius,
        limit: 30,
      });

      // 상태가 '사용가능'인 것만 필터링
      const available = dbData.stations.filter(station => 
        station.status === '사용가능'
      );

      return {
        ...dbData,
        stations: available
      };
    }
  }

  // 거리 계산 함수 (Haversine formula)
  static calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // 지구 반지름 (미터)
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c); // 미터 단위로 반환
  }

  static toRadians(degrees) {
    return degrees * (Math.PI/180);
  }

  // 거리를 사람이 읽기 쉬운 형태로 변환
  static formatDistance(meters) {
    if (meters < 1000) {
      return `${meters}m`;
    }
    return `${(meters/1000).toFixed(1)}km`;
  }

  // 충전소 정보를 챗봇용 텍스트로 포맷팅
  static formatStationsForChat(stations, userLocation = null) {
    if (!stations || stations.length === 0) {
      return "죄송합니다. 해당 지역에서 충전소를 찾을 수 없습니다 😅";
    }

    let response = `${stations.length}개의 충전소를 찾았습니다!\n\n`;
    
    stations.slice(0, 5).forEach((station, index) => {
      response += `${index + 1}. ${station.name}\n`;
      response += `📍 ${station.address}\n`;
      
      if (station.distance !== undefined) {
        response += `📏 거리: ${this.formatDistance(station.distance)}\n`;
      }
      
      response += `⚡ ${station.speed || '정보없음'}`;
      
      if (station.status) {
        const statusEmoji = station.status === '사용가능' ? '🟢' : 
                           station.status === '충전중' ? '🟡' : '🔴';
        response += ` | ${statusEmoji} ${station.status}`;
      }
      
      if (station.chargers > 0) {
        response += ` | 충전기 ${station.chargers}대`;
      }
      
      response += '\n\n';
    });

    if (stations.length > 5) {
      response += `그 외 ${stations.length - 5}개의 추가 충전소가 더 있어요!`;
    }

    return response;
  }

  // 실시간 데이터와 데이터베이스 데이터 병합
  static mergeStationData(dbStations, liveStations) {
    const merged = [...dbStations];
    
    // 실시간 데이터로 상태 업데이트 또는 새로운 충전소 추가
    liveStations.forEach(liveStation => {
      const existingIndex = merged.findIndex(station => 
        Math.abs(station.lat - liveStation.lat) < 0.001 && 
        Math.abs(station.lng - liveStation.lng) < 0.001
      );
      
      if (existingIndex >= 0) {
        // 기존 충전소의 실시간 정보 업데이트
        merged[existingIndex] = {
          ...merged[existingIndex],
          status: liveStation.status,
          available: liveStation.available,
          chargers: liveStation.chargers,
        };
      } else {
        // 새로운 충전소 추가
        merged.push(liveStation);
      }
    });

    return merged;
  }
}
