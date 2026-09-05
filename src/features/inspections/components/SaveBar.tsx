import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from '../../../components/Button';
import { Colors } from '../../../design/colors';
import { Spacing } from '../../../design/spacing';

interface SaveBarProps {
  saving: boolean;
  onDiscard: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
}

export const SaveBar: React.FC<SaveBarProps> = ({
  saving,
  onDiscard,
  onSaveDraft,
  onSubmit,
}) => (
  <View style={styles.bar}>
    <Button label="Discard" variant="subtle" onPress={onDiscard} disabled={saving} style={styles.discardBtn} />
    <Button label="Save Draft" variant="outline" onPress={onSaveDraft} disabled={saving} style={styles.draftBtn} />
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
);

const styles = StyleSheet.create({
  bar: {
    backgroundColor: Colors.white,
    borderTopWidth: 2,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  // Discard is the least consequential action, so it gets the smallest
  // share of the row. Save Draft and Submit Report are equally weighted —
  // both are "real" outcomes of the screen — so they share the same ratio.
  // Widths come entirely from flex, not from a minWidth fighting it, so
  // Submit swapping its label for a loading spinner mid-save can't resize
  // the button or shift its neighbours (see SaveBar.test.tsx's
  // no-resize-during-save guarantee).
  discardBtn: {
    flex: 1,
  },
  draftBtn: {
    flex: 1.3,
  },
  submitBtn: {
    flex: 1.3,
  },
});
