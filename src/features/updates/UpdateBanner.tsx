import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../design/colors';
import { Radius } from '../../design/radius';
import { Spacing } from '../../design/spacing';
import { Type } from '../../design/typography';

interface UpdateBannerProps {
  version: string;
  url: string;
  onDismiss: () => void;
}

// A slim notice on Home that a newer APK is published. Download hands the
// link to the browser: Android downloads the file and the inspector taps
// the download notification to install over the current version (same
// signing key, so the local database is kept). Dismissing hides this
// version's notice until a later one appears — see useUpdateCheck.
export const UpdateBanner: React.FC<UpdateBannerProps> = ({ version, url, onDismiss }) => (
  <View style={styles.banner} accessibilityRole="alert">
    <Ionicons name="arrow-down-circle-outline" size={18} color={Colors.green} importantForAccessibility="no" />
    <Text style={styles.message} numberOfLines={2}>
      {/* A template literal so the sentence is one text node (JSX would
          split it into three), matching how the export bar phrases counts. */}
      <Text style={styles.strong}>{`Version ${version} is available.`}</Text> Install it to keep syncing smoothly.
    </Text>
    <TouchableOpacity
      onPress={() => { void Linking.openURL(url); }}
      activeOpacity={0.7}
      hitSlop={HIT_SLOP}
      accessibilityRole="link"
      accessibilityLabel={`Download version ${version}`}>
      <Text style={styles.download}>Download</Text>
    </TouchableOpacity>
    <TouchableOpacity
      onPress={onDismiss}
      activeOpacity={0.7}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel="Dismiss update notice">
      <Ionicons name="close" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  </View>
);

// The two controls are text/glyph-sized; hitSlop brings each up to the
// 48dp Android target without inflating the banner.
const HIT_SLOP = { top: 12, bottom: 12, left: 8, right: 8 };

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.greenMuted,
  },
  message: {
    flex: 1,
    fontSize: Type.bodySm.fontSize,
    lineHeight: Type.bodySm.lineHeight,
    color: Colors.textSecondary,
  },
  strong: {
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  download: {
    fontSize: Type.bodySm.fontSize,
    lineHeight: Type.bodySm.lineHeight,
    fontWeight: '700',
    color: Colors.green,
  },
});
