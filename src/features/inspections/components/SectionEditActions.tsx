import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';

interface SectionEditActionsProps {
  editing: boolean;
  saving: boolean;
  onStartEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  // False for a report the current inspector isn't allowed to edit (not the
  // creator, or the report is no longer a draft) — renders nothing instead
  // of an Edit button, so the section is plain read-only. See
  // InspectionReportDetailScreen's canEdit.
  canEdit?: boolean;
}

// Edit/Save/Cancel trio for a single FormSection, passed as its
// `headerRight`. Each FormSection on the report detail screen owns one of
// these independently via useEditableSection.
export const SectionEditActions: React.FC<SectionEditActionsProps> = ({
  editing,
  saving,
  onStartEdit,
  onCancel,
  onSave,
  canEdit = true,
}) => {
  if (!canEdit) {
    return null;
  }
  if (!editing) {
    return (
      <TouchableOpacity style={styles.editBtn} onPress={onStartEdit} activeOpacity={0.75}>
        <Ionicons name="pencil" size={11} color={Colors.navy} />
        <Text style={styles.editBtnText}>Edit</Text>
      </TouchableOpacity>
    );
  }
  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.75} disabled={saving}>
        <Text style={styles.cancelBtnText}>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.saveBtn} onPress={onSave} activeOpacity={0.8} disabled={saving}>
        {saving ? (
          <ActivityIndicator size="small" color={Colors.textWhite} />
        ) : (
          <Text style={styles.saveBtnText}>Save</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: Colors.navy,
    backgroundColor: Colors.white,
  },
  editBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.navy,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: Colors.bgLight,
  },
  cancelBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  saveBtn: {
    minWidth: 52,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: Colors.green,
  },
  saveBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.textWhite,
  },
});
