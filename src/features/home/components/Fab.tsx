import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Touchable } from '../../../components/Touchable';
import { Colors } from '../../../design/colors';
import { Elevation } from '../../../design/elevation';
import { Duration, useMotion } from '../../../design/motion';
import { Radius } from '../../../design/radius';

// Exported so SpeedDial can stack its rows clear of the trigger without
// duplicating the number.
export const FAB_SIZE = 56;

const ICON_SIZE = 26;
const OPEN_ROTATION = 45;

interface FabProps {
  open: boolean;
  onPress: () => void;
}

export const Fab: React.FC<FabProps> = ({ open, onPress }) => {
  const { timing } = useMotion();
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = timing(open ? OPEN_ROTATION : 0, { duration: Duration.short });
  }, [open, rotation, timing]);

  // The plus rotates into a cross rather than swapping glyphs, so the
  // control reads as one object changing state instead of two buttons.
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={open ? 'Close report type menu' : 'Create new report'}
      accessibilityState={{ expanded: open }}
      onPress={onPress}
      style={styles.fab}>
      <Animated.View style={iconStyle}>
        <Ionicons name="add" size={ICON_SIZE} color={Colors.textWhite} />
      </Animated.View>
    </Touchable>
  );
};

const styles = StyleSheet.create({
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: Radius.pill,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    ...Elevation.fab,
  },
});
