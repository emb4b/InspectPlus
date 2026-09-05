import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '../../../components/Button';
import { AppText } from '../../../components/AppText';
import { Colors } from '../../../design/colors';
import { Spacing } from '../../../design/spacing';
import { Type } from '../../../design/typography';

interface SaveBarProps {
  establishmentName: string;
  typeLabel: string;
  saving: boolean;
  onDiscard: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
}

export const SaveBar: React.FC<SaveBarProps> = ({
  establishmentName,
  typeLabel,
  saving,
  onDiscard,
  onSaveDraft,
  onSubmit,
}) => (
  <View style={styles.bar}>
    {/* Split into three pieces (rather than one numberOfLines Text) so a
        long establishment name can marquee-scroll on its own while "Report
        for" and "· {typeLabel}" stay put — see the marquee usage rule in
        AppText's module comment. */}
    <View style={styles.info}>
      <Text style={styles.infoLabel}>Report for </Text>
      <AppText variant="marquee" text={establishmentName} style={styles.infoStrong} containerStyle={styles.infoNameContainer} />
      <Text style={styles.infoLabel}> · {typeLabel}</Text>
    </View>
    <View style={styles.actions}>
      <Button label="Discard" variant="subtle" onPress={onDiscard} disabled={saving} style={styles.discardBtn} />
      <Button label="Save Draft" variant="outline" onPress={onSaveDraft} disabled={saving} style={styles.draftBtn} />
      {/* minWidth so swapping the label for the loading spinner doesn't
          resize the button and shift its neighbours sideways mid-save. */}
      <Button
        label="Submit Report"
        variant="success"
        icon="checkmark"
        onPress={onSubmit}
        disabled={saving}
        loading={saving}
        style={styles.submitBtn}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  bar: {
    backgroundColor: Colors.white,
    borderTopWidth: 2,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'column',
    gap: Spacing.sm,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    color: Colors.textMuted,
  },
  infoStrong: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    color: Colors.navy,
    fontWeight: '700',
  },
  infoNameContainer: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  discardBtn: {
    flex: 1,
  },
  draftBtn: {
    flex: 1,
  },
  submitBtn: {
    flex: 1.3,
    minWidth: 120,
  },
});
