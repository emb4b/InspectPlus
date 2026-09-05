import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Touchable } from '../../../components/Touchable';
import { ENABLED_TYPES, REPORT_TYPES, ReportType } from '../../../constants/reportTypes';
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
// Clearance from the footer stack. Deliberately well beyond the usual
// Spacing.lg gutter: the FAB is a one-handed target used in the field, and
// at 16dp then 24dp it still read as crowded against the bottom edge on
// device.
const FAB_EDGE_INSET = Spacing.xxxl;

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

  // Shared uniform pill width, computed from measurement rather than a
  // hardcoded constant so adding or renaming a report type can't desync it.
  //
  // Each row reports its own pill's natural (unconstrained) rendered width
  // here; this only ever grows to the largest one seen. That one-directional
  // rule is what keeps this from oscillating: once a row's pill is given
  // `width: pillWidth`, its next layout measurement reports exactly
  // `pillWidth` back (an explicit width pins the measured size — it no
  // longer reflects content), which is never greater than the current max,
  // so the state "update" resolves to the same value React already holds.
  // React bails out of re-rendering when a state setter returns the same
  // value it already had, so the loop terminates on its own rather than
  // needing a separate "have I already applied a width" flag.
  const [pillWidth, setPillWidth] = useState<number | null>(null);
  const handlePillMeasured = useCallback((width: number) => {
    setPillWidth(current => (current === null || width > current ? width : current));
  }, []);

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
              enabled={ENABLED_TYPES.includes(item.key)}
              pillWidth={pillWidth}
              onPillMeasured={handlePillMeasured}
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
  enabled: boolean;
  pillWidth: number | null;
  onPillMeasured: (width: number) => void;
  onPress: () => void;
}

const DialRow: React.FC<DialRowProps> = ({
  item,
  index,
  reduced,
  enabled,
  pillWidth,
  onPillMeasured,
  onPress,
}) => {
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

  const handlePillLayout = useCallback(
    (event: LayoutChangeEvent) => {
      onPillMeasured(event.nativeEvent.layout.width);
    },
    [onPillMeasured],
  );

  return (
    <Animated.View style={[styles.row, rowStyle]}>
      {/* The whole row — pill and icon together — is one touch target. The
          visible label is the short one; the accessible name is the full
          legal title, which is what a screen reader user needs. An
          unavailable type is announced as disabled rather than removed, so
          it stays visible (and still animates in) but cannot be activated. */}
      <Touchable
        accessibilityRole="button"
        accessibilityLabel={item.title}
        accessibilityState={{ disabled: !enabled }}
        disabled={!enabled}
        onPress={enabled ? onPress : undefined}
        style={[styles.rowTouchable, !enabled && styles.rowTouchableDisabled]}>
        <View
          style={[
            styles.pill,
            { backgroundColor: item.bgColor, borderColor: item.borderColor },
            pillWidth !== null ? { width: pillWidth } : null,
          ]}
          onLayout={handlePillLayout}>
          <View style={styles.pillHeader}>
            <Text style={[styles.pillTitle, { color: item.textColor }]} numberOfLines={1}>
              {item.shortTitle}
            </Text>
            {!enabled && (
              <View style={styles.soonBadge}>
                <Text style={styles.soonBadgeText}>Soon</Text>
              </View>
            )}
          </View>
          <Text style={styles.pillLaw} numberOfLines={1}>
            {item.law}
          </Text>
        </View>
        <View style={[styles.rowButton, { backgroundColor: item.bgColor, borderColor: item.borderColor }]}>
          {IconAsset ? (
            <IconAsset width={20} height={20} />
          ) : (
            <Ionicons
              name={item.iconName as keyof typeof Ionicons.glyphMap}
              size={20}
              color={item.textColor}
            />
          )}
        </View>
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
    // Layout now lives on `rowTouchable` below — this wrapper exists only
    // so the staggered entrance animation has a stable node to animate.
  },
  rowTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  // Matches Button's own disabled treatment (opacity 0.55) so a dimmed,
  // non-interactive row reads the same way everywhere in the app.
  rowTouchableDisabled: {
    opacity: 0.55,
  },
  pill: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    maxWidth: 200,
  },
  pillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  pillTitle: {
    fontSize: Type.bodySm.fontSize,
    lineHeight: Type.bodySm.lineHeight,
    fontWeight: '700',
    // Lets the title give way to the "Soon" badge sharing this row instead
    // of pushing it out past the pill's own maxWidth.
    flexShrink: 1,
  },
  pillLaw: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    color: Colors.textMuted,
  },
  soonBadge: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.xs,
    backgroundColor: Colors.bgLight,
  },
  soonBadgeText: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    fontWeight: '700',
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
