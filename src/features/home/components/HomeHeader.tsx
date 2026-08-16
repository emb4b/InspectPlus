import React, { useEffect, useState } from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Reanimated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { Logo } from '../../../components/Logo';
import { useAuthContext } from '../../../core/providers/AuthProvider';
import { runManagedSync } from '../../../services/sync/syncOrchestrator';
import { UpdateRequiredError } from '../../../services/sync/appVersionGate';
import { subscribeToUpdateRequired } from '../../../services/sync/syncEvents';
import { SyncOptionsModal, SyncDirection } from './SyncOptionsModal';

interface HomeHeaderProps {
  // Hide the avatar/logout control on pages with no active session (e.g. login).
  showAccountButton?: boolean;
  // Scroll-driven collapse progress (0 = expanded, 1 = collapsed), shared
  // with whatever screen is currently mounted below — see HeaderScrollContext.
  // A shared value (not React state) so the animation runs entirely on the
  // UI thread instead of racing the scroll handler for JS-thread time.
  collapsed?: SharedValue<number>;
  // Home always shows the full header regardless of scroll state.
  disableCollapse?: boolean;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  showAccountButton = true,
  collapsed,
  disableCollapse = false,
}) => {
  const { session, signOut } = useAuthContext();
  const [syncing, setSyncing] = useState(false);
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const uid = (session as { user?: { id?: string } } | null)?.user?.id;

  // Manual trigger — goes through the same runManagedSync path as the
  // post-login sync, so a manual tap also picks up a user switch on a
  // shared device and notifies listeners (e.g. the home lists) the same way.
  // The direction (pull only / push only / both) comes from SyncOptionsModal.
  const handleSyncNow = async (direction: SyncDirection) => {
    if (syncing || !uid) return;
    setSyncing(true);
    try {
      const result = await runManagedSync(uid, {
        skipPush: direction === 'pull',
        skipPull: direction === 'push',
      });
      setSyncModalVisible(false);
      if (!result) {
        Alert.alert('Sync skipped', 'No internet connection right now.');
        return;
      }
      Alert.alert(
        'Sync complete',
        `Pushed: ${result.pushed ? 'yes' : 'no changes'}\nPulled: ${result.pulled ? 'yes' : 'no'}`
      );
    } catch (err) {
      if (err instanceof UpdateRequiredError) {
        Alert.alert(
          'Update required',
          `This app version is no longer supported for sync. Please update to at least version ${err.minVersion}.`
        );
        return;
      }
      console.error('[HomeHeader] Sync failed:', err);
      Alert.alert('Sync failed', err instanceof Error ? err.message : 'Something went wrong while syncing.');
    } finally {
      setSyncing(false);
    }
  };

  // Surfaces the same failure when it happens from the post-login sync
  // (AuthProvider), which runs in the background and has no UI of its own
  // to report through — mirrors how other screens use
  // subscribeToSyncDataChanged for their own refetch-on-sync behavior.
  useEffect(() => {
    return subscribeToUpdateRequired(minVersion => {
      Alert.alert(
        'Update required',
        `This app version is no longer supported for sync. Please update to at least version ${minVersion}.`
      );
    });
  }, []);

  const handleLogout = async () => {
    try {
      // No manual navigation here — this component is rendered several
      // navigator levels deep (root Stack → (app) group → its inner Stack),
      // so an imperative root-level redirect from here can silently
      // misfire. RootNavigator (the true root) reactively redirects to
      // '/' as soon as signOut() clears the session below.
      await signOut();
    } catch (err) {
      console.warn('[HomeHeader] signOut encountered an error:', err);
      Alert.alert('Sign out failed', 'Something went wrong while signing out. Please try again.');
    }
  };

  // Single derived value so every interpolation below reacts to the same
  // number — recomputed on the UI thread whenever `collapsed` changes, and
  // pinned to 0 on screens (home) that opt out of collapsing altogether.
  const progress = useDerivedValue(() => {
    return disableCollapse || !collapsed ? 0 : collapsed.value;
  }, [disableCollapse, collapsed]);

  // paddingTop/paddingBottom on `row` used to animate too, but that's a
  // second Yoga-affecting node recomputing on every scroll frame right next
  // to the two below — folded into a static value so only the height
  // animations (which actually need to reclaim layout space) pay that cost.
  // logosStyle/subtitleStyle still animate `height` (not transform) because
  // they need to genuinely reclaim layout space as the header collapses —
  // but avatarStyle has no such requirement, so it's transform/opacity only
  // (compositor-only, zero Yoga relayout) to keep at least one of these off
  // the layout thread entirely.
  const logosStyle = useAnimatedStyle(() => ({
    height: interpolate(progress.value, [0, 1], [30, 0], Extrapolation.CLAMP),
    opacity: interpolate(progress.value, [0, 0.6, 1], [1, 0, 0], Extrapolation.CLAMP),
  }));
  const subtitleStyle = useAnimatedStyle(() => ({
    height: interpolate(progress.value, [0, 1], [16, 0], Extrapolation.CLAMP),
    opacity: interpolate(progress.value, [0, 0.6, 1], [1, 0, 0], Extrapolation.CLAMP),
  }));
  const avatarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 30 / 38], Extrapolation.CLAMP) }],
  }));

  return (
    <LinearGradient
      colors={[Colors.navy, '#0a7a3e']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.header}>

      <View style={styles.row}>
        {/* Left: wordmark + small agency logos + subtitle */}
        <View style={styles.left}>
          <View style={styles.logoRow}>
            <Logo dark variant="plain" fontSize={19} />
            <Reanimated.View style={[styles.logosRow, logosStyle]}>
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
            </Reanimated.View>
          </View>
          <Reanimated.View style={[styles.subtitleWrap, subtitleStyle]}>
            <Text style={styles.subtitle} numberOfLines={1}>
              EMB4B INSPECTION & MONITORING SYSTEM
            </Text>
          </Reanimated.View>
        </View>

        {/* Right: sync + avatar/logout buttons */}
        {showAccountButton && (
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => setSyncModalVisible(true)} activeOpacity={0.8} disabled={syncing}>
              <Reanimated.View style={[styles.avatarBtn, avatarStyle]}>
                <Ionicons
                  name={syncing ? 'sync-circle-outline' : 'cloud-upload-outline'}
                  size={22}
                  color={Colors.textWhite}
                />
              </Reanimated.View>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} activeOpacity={0.8}>
              <Reanimated.View style={[styles.avatarBtn, avatarStyle]}>
                <Ionicons name="person-circle-outline" size={26} color={Colors.textWhite} />
              </Reanimated.View>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <SyncOptionsModal
        visible={syncModalVisible}
        syncing={syncing}
        onCancel={() => setSyncModalVisible(false)}
        onSync={handleSyncNow}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 8,
  },
  left: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  agencyLogo: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  subtitleWrap: {
    overflow: 'hidden',
  },
  subtitle: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 3,
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    // Fixed size — avatarStyle scales this down visually via transform
    // rather than animating width/height, so it never triggers a layout
    // relayout while the header collapse animation is running.
    borderWidth: 1.5,
    borderColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
});
