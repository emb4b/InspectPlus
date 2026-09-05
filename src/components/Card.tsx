import React from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { Colors } from '../design/colors';
import { Elevation } from '../design/elevation';
import { Radius } from '../design/radius';
import { Spacing } from '../design/spacing';

interface CardProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  // Cards that lay out their own internal padding (a list row with a
  // full-bleed leading element, say) opt out rather than fighting it.
  padded?: boolean;
}

export const Card: React.FC<CardProps> = ({ style, padded = true, children, ...rest }) => (
  <View style={[styles.base, padded && styles.padded, style]} {...rest}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    ...Elevation.raised,
  },
  padded: {
    padding: Spacing.lg,
  },
});
