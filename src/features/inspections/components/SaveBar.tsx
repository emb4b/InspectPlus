import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';

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
    <Text style={styles.info} numberOfLines={1}>
      Report for <Text style={styles.infoStrong}>{establishmentName}</Text> · {typeLabel}
    </Text>
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
    fontSize: 11.5,
    color: Colors.textMuted,
    flex: 1,
  },
  infoStrong: {
    color: Colors.navy,
    fontWeight: '700',
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
