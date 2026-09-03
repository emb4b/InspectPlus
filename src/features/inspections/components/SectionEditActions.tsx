import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from '../../../components/Button';

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
    return <Button label="Edit" icon="pencil" variant="outline" onPress={onStartEdit} />;
  }
  return (
    <View style={styles.row}>
      <Button label="Cancel" variant="subtle" onPress={onCancel} disabled={saving} />
      {/* minWidth so swapping the label for the spinner doesn't resize the
          button and shift Cancel sideways mid-save. */}
      <Button label="Save" variant="success" onPress={onSave} loading={saving} style={styles.save} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  save: {
    minWidth: 68,
  },
});
