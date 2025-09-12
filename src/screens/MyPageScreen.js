// src/screens/MyPageScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import TabBar from '../components/TabBar';
import HeadphoneIcon from '../assets/icons/Headphone.svg';
import PointIcon from '../assets/icons/Point.svg';
import StarIcon from '../assets/icons/Star.svg';

export default function MyPageScreen() {
  const [profileImage, setProfileImage] = useState(null);

  const handleAvatarPress = () => {
    launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (response && response.assets && response.assets.length > 0) {
        setProfileImage(response.assets[0].uri);
      }
    });
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
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
          <TouchableOpacity activeOpacity={0.8} style={styles.editBtn}>
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
          <TouchableOpacity style={styles.cardHeader} activeOpacity={0.8}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', flex: 1 }}>
              <Text style={styles.cardTitle}>내 차 정보</Text>
              <PointIcon width={16} height={16} style={{ marginLeft: 6 }} />
            </View>
          </TouchableOpacity>

          <View style={styles.row}>
            <Text style={styles.label}>모델명</Text>
            <Text style={styles.value}>IONIQ 5</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>제조사</Text>
            <Text style={styles.value}>현대</Text>
          </View>
          <View style={[styles.row, { marginBottom: 10 }]}>
            <Text style={styles.label}>1회 충전 주행거리</Text>
            <Text style={styles.value}>158km</Text>
          </View>

          <Text style={styles.notice}>
            주행거리는 평균치이며 실제와는 다를 수 있습니다.
          </Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <TabBar />
    </View>
  );
}

const BLUE = '#3879F1';
const BG = '#F6F7FB';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { paddingHorizontal: 20, paddingTop: 80},

  /* 프로필 */
  profileWrap: { alignItems: 'center', marginBottom: 18},
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
  quickIcon: { fontSize: 20, color: '#fff', marginBottom: 6 },
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
  cardArrow: { marginLeft: 6, fontSize: 18, color: '#1C1C1C' },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
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
