import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Touchable } from '../../../components/Touchable';
import { REPORT_TYPES, ReportType } from '../../../constants/reportTypes';
import { Colors } from '../../../design/colors';
import { Duration, useMotion } from '../../../design/motion';
import { Radius } from '../../../design/radius';
import { Spacing } from '../../../design/spacing';
import { Type } from '../../../design/typography';
import { useGuardedPress } from '../../../utils/useGuardedPress';
import { Fab, FAB_SIZE } from './Fab';

const ROW_SIZE = 48;
const STAGGER_MS = 30;
const RISE_DISTANCE = 12;
// Exits run faster than entrances — a dismissal shouldn't make the user wait
// for the same choreography they already sat through on the way in.
const CLOSE_DURATION = Math.round(Duration.short * (2 / 3));
// Clearance from the footer stack. Deliberately more than the usual
// Spacing.lg gutter: the FAB is a one-handed target in the field, and at
// 16dp it read as crowded against the footer bar on device.
const FAB_EDGE_INSET = Spacing.xl;

interface SpeedDialProps {
  // How far AppChrome's measured footer stack (the active screen's own
  // registered footer plus HomeFooter) reaches up from the bottom of the
  // safe area. Both the trigger and its rows shift up by this amount so
  // neither ever renders underneath that chrome. Defaults to 0 so a caller
  // that hasn't measured yet (or a screen with no footer at all) keeps the
  // original Spacing.lg-from-the-bottom placement.
  bottomInset?: number;
}

export const SpeedDial: React.FC<SpeedDialProps> = ({ bottomInset = 0 }) => {
  const [open, setOpen] = useState(false);
  const { timing, reduced } = useMotion();
  const scrimOpacity = useSharedValue(0);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen(current => !current), []);

  useEffect(() => {
    scrimOpacity.value = timing(open ? 1 : 0, {
      duration: open ? Duration.short : CLOSE_DURATION,
    });
  }, [open, scrimOpacity, timing]);

  // Nothing else in this app registers a back handler, so without this the
  // dial would stay open while back navigated the screen out from under it.
  useEffect(() => {
    if (!open) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => subscription.remove();
  }, [open, close]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrimOpacity.value }));

  // One guard for all six rows: its ref is per-call-site, and since any
  // selection closes the dial, swallowing a second press in the guard window
  // is what we want anyway.
  const select = useGuardedPress((route: string) => {
    close();
    router.push(route as never);
  });

  return (
    <View style={styles.host} pointerEvents="box-none">
      {open && (
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Close report type menu"
          onPress={close}
          style={StyleSheet.absoluteFill}>
          <Animated.View style={[styles.scrim, scrimStyle]} />
        </Touchable>
      )}

      {open && (
        <View
          style={[
            styles.rows,
            // Clears the trigger and its own inset, so the first row sits
            // above the FAB rather than behind it — same relationship as
            // before, just shifted up by whatever footer chrome AppChrome
            // measured underneath both.
            { bottom: FAB_EDGE_INSET + bottomInset + FAB_SIZE + Spacing.md },
          ]}
          pointerEvents="box-none">
          {REPORT_TYPES.map((item, index) => (
            <DialRow
              key={item.key}
              item={item}
              index={index}
              reduced={reduced}
              onPress={() => select(item.route)}
            />
          ))}
        </View>
      )}

      <View
        style={[styles.fabWrap, { bottom: FAB_EDGE_INSET + bottomInset }]}
        pointerEvents="box-none">
        <Fab open={open} onPress={toggle} />
      </View>
    </View>
  );
};

interface DialRowProps {
  item: ReportType;
  index: number;
  reduced: boolean;
  onPress: () => void;
}

const DialRow: React.FC<DialRowProps> = ({ item, index, reduced, onPress }) => {
  const IconAsset = item.iconAsset;
  const progress = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(index * STAGGER_MS, withTiming(1, { duration: Duration.base }));
  }, [reduced, index, progress]);

  const rowStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * RISE_DISTANCE }],
  }));

  return (
    <Animated.View style={[styles.row, rowStyle]}>
      <View style={[styles.pill, { backgroundColor: item.bgColor, borderColor: item.borderColor }]}>
        <Text style={[styles.pillTitle, { color: item.textColor }]} numberOfLines={1}>
          {item.shortTitle}
        </Text>
        <Text style={styles.pillLaw} numberOfLines={1}>
          {item.law}
        </Text>
      </View>
      {/* The visible label is the short one; the accessible name is the full
          legal title, which is what a screen reader user needs. */}
      <Touchable
        accessibilityRole="button"
        accessibilityLabel={item.title}
        onPress={onPress}
        style={[styles.rowButton, { backgroundColor: item.bgColor, borderColor: item.borderColor }]}>
        {IconAsset ? (
          <IconAsset width={20} height={20} />
        ) : (
          <Ionicons
            name={item.iconName as keyof typeof Ionicons.glyphMap}
            size={20}
            color={item.textColor}
          />
        )}
      </Touchable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
  },
  scrim: {
    flex: 1,
    backgroundColor: Colors.overlay,
  },
  fabWrap: {
    position: 'absolute',
    right: Spacing.lg,
    // `bottom` is computed at render time from the measured footer inset —
    // see the inline style merged in above.
  },
  rows: {
    position: 'absolute',
    right: Spacing.lg,
    // `bottom` is computed at render time from the measured footer inset —
    // see the inline style merged in above.
    gap: Spacing.md,
    alignItems: 'flex-end',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pill: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    maxWidth: 200,
  },
  pillTitle: {
    fontSize: Type.bodySm.fontSize,
    lineHeight: Type.bodySm.lineHeight,
    fontWeight: '700',
  },
  pillLaw: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    color: Colors.textMuted,
  },
  rowButton: {
    width: ROW_SIZE,
    height: ROW_SIZE,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
