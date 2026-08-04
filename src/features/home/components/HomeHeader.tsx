import React from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../../../constants/colors';
import { useAuthContext } from '../../../core/providers/AuthProvider';

export const HomeHeader: React.FC = () => {
  const { signOut } = useAuthContext();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.warn('[HomeHeader] signOut encountered an error:', err);
    } finally {
      // Navigate regardless — local session state is cleared either way,
      // so the user shouldn't get stuck on this screen.
      router.replace('/');
    }
  };

  return (
    <LinearGradient
      colors={[Colors.navy, '#0a7a3e']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.header}>

      <View style={styles.row}>
        {/* Left: logo + small agency logos + subtitle */}
        <View style={styles.left}>
          <View style={styles.logoRow}>
            {/* iNSPECTPlus wordmark */}
            <Image
              source={require('../../../../assets/inspect_plus_logo.png')}
              style={styles.wordmark}
              resizeMode="contain"
            />
            {/* Small agency logos inline */}
            <Image
              source={require('../../../../assets/denr_logo.png')}
              style={styles.agencyLogo}
              resizeMode="contain"
            />
            <Image
              source={require('../../../../assets/bagong_pilipinas_logo.png')}
              style={styles.agencyLogo}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Right: avatar / logout button */}
        <TouchableOpacity
          style={styles.avatarBtn}
          onPress={handleLogout}
          activeOpacity={0.8}>
          <Ionicons
            name="person-circle-outline"
            size={30}
            color={Colors.textWhite}
          />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flex: 1,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  wordmark: {
    width: 130,
    height: 40,
  },
  agencyLogo: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
});
