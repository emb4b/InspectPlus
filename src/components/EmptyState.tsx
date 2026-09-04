import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../design/colors';
import { Spacing } from '../design/spacing';
import { Type } from '../design/typography';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, message, action }) => (
  <View style={styles.container}>
    {/* Decorative — the message beside it carries the meaning. */}
    <Ionicons name={icon} size={40} color={Colors.border} importantForAccessibility="no" />
    <Text style={styles.message}>{message}</Text>
    {action}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: Spacing.xxxl,
    gap: Spacing.sm,
  },
  message: {
    fontSize: Type.bodySm.fontSize,
    lineHeight: Type.bodySm.lineHeight,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
