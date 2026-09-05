import React from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { Button } from './Button';

interface AddRowButtonProps {
  label: string;
  onPress: () => void;
  // Matches the compact treatment WaterExtraFormSections' bespoke
  // AddCardButton used inside an already-dense per-row context (e.g. a
  // sampling parameter nested under a sampling point). Maps onto Button's
  // own smaller size rather than inventing a third one.
  small?: boolean;
  // Callers that need their own spacing against a sibling (a table above,
  // an error message below) pass it here rather than this component baking
  // in one fixed margin that wouldn't fit every context.
  style?: StyleProp<ViewStyle>;
}

// The app's one "add a row / add a card" action. Before this, five
// components — DynamicRowTable, both water form sections' AddCardButton,
// and both DenrPermits sections — each drew their own dashed-border
// touchable with a hand-rolled "+ " glued onto the front of the label,
// right next to an Ionicons "add" glyph that already says the same thing.
// That's what put "⊕ + Add Parameter" on screen. This wraps the app's
// single Button primitive instead, so every add action gets the same 48dp
// target, the same accessibility contract, and Button's dashed-green `add`
// variant (restoring the dashed/green treatment these five buttons had
// before an earlier consolidation flattened them to solid navy outline) —
// one place to change if the treatment moves again, and no leading "+" left
// to double up with the icon.
export const AddRowButton: React.FC<AddRowButtonProps> = ({ label, onPress, small, style }) => (
  <Button
    label={label}
    icon="add"
    variant="add"
    size={small ? 'sm' : 'md'}
    onPress={onPress}
    style={[styles.selfStart, style]}
  />
);

const styles = StyleSheet.create({
  // Every call site previously set alignSelf: 'flex-start' by hand — this
  // is always a left-aligned, content-width control, never a full-width one.
  selfStart: {
    alignSelf: 'flex-start',
  },
});
