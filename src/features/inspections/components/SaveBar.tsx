import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { AppText } from '../../../components/AppText';

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
      <TouchableOpacity style={styles.ghostBtn} onPress={onDiscard} disabled={saving} activeOpacity={0.7}>
        <Text style={styles.ghostText}>Discard</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.outlineBtn} onPress={onSaveDraft} disabled={saving} activeOpacity={0.7}>
        <Text style={styles.outlineText}>Save Draft</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.submitBtn} onPress={onSubmit} disabled={saving} activeOpacity={0.85}>
        {saving ? (
          <ActivityIndicator size="small" color={Colors.textWhite} />
        ) : (
          <>
            <Text style={styles.submitText}>Submit Report</Text>
            <Ionicons name="checkmark" size={14} color={Colors.textWhite} />
          </>
        )}
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  bar: {
    backgroundColor: Colors.white,
    borderTopWidth: 2,
    borderTopColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 11.5,
    color: Colors.textMuted,
  },
  infoStrong: {
    fontSize: 11.5,
    color: Colors.navy,
    fontWeight: '700',
  },
  infoNameContainer: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  ghostBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: Colors.bgLight,
  },
  ghostText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
  },
  outlineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  outlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: Colors.green,
    minWidth: 120,
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textWhite,
  },
});
