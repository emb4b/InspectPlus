import React, { forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  KeyboardTypeOptions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { applyTextCase, stripTrailingSpaces, TextCaseMode } from '../../utils/textCase';

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  // Distinct from `hint` (static instructional text) — flags that this
  // field's value has drifted from another source of truth (e.g. the live
  // establishment record), so it's styled to stand out rather than blend in.
  changeNote?: string;
  readOnly?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: KeyboardTypeOptions;
  style?: object;
  // Default text-case behavior applied as the user types: 'sentence'
  // (default) capitalizes the start of each sentence, 'upper' forces
  // uppercase (establishment name, permit/serial numbers), 'none' leaves
  // input untouched (emails, and other case-sensitive values).
  textCase?: TextCaseMode;
  // Keyboard navigation — wired up by callers via refs/useScrollToInput so
  // "next" on the on-screen keyboard advances focus and the focused field
  // scrolls above the keyboard instead of being hidden behind it.
  returnKeyType?: TextInputProps['returnKeyType'];
  blurOnSubmit?: TextInputProps['blurOnSubmit'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  onFocus?: TextInputProps['onFocus'];
}

export const TextField = forwardRef<TextInput, TextFieldProps>(({
  label,
  value,
  onChangeText,
  placeholder,
  required,
  hint,
  changeNote,
  readOnly,
  multiline,
  numberOfLines,
  keyboardType,
  style,
  textCase = 'sentence',
  returnKeyType,
  blurOnSubmit,
  onSubmitEditing,
  onFocus,
}, ref) => {
  const handleChangeText = (text: string) => {
    onChangeText?.(applyTextCase(text, textCase));
  };

  const handleBlur = () => {
    const trimmed = stripTrailingSpaces(value);
    if (trimmed !== value) onChangeText?.(trimmed);
  };

  return (
  <View style={[styles.group, style]}>
    <Text style={styles.label}>
      {label}
      {required && <Text style={styles.req}> *</Text>}
    </Text>
    <TextInput
      ref={ref}
      style={[
        styles.input,
        multiline && { minHeight: 80, textAlignVertical: 'top', paddingTop: 9 },
        readOnly && styles.inputReadOnly,
      ]}
      value={value}
      onChangeText={handleChangeText}
      onBlur={handleBlur}
      placeholder={placeholder}
      placeholderTextColor={Colors.textLight}
      editable={!readOnly}
      multiline={multiline}
      numberOfLines={numberOfLines}
      keyboardType={keyboardType}
      autoCapitalize={textCase === 'upper' ? 'characters' : textCase === 'none' ? 'none' : 'sentences'}
      returnKeyType={returnKeyType}
      blurOnSubmit={blurOnSubmit}
      onSubmitEditing={onSubmitEditing}
      onFocus={onFocus}
    />
    {hint && <Text style={styles.hint}>{hint}</Text>}
    {changeNote && (
      <View style={styles.changeNoteRow}>
        <Ionicons name="information-circle" size={12} color={Colors.warning.text} />
        <Text style={styles.changeNote}>{changeNote}</Text>
      </View>
    )}
  </View>
  );
});
TextField.displayName = 'TextField';

const styles = StyleSheet.create({
  group: {
    marginBottom: 16,
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  req: {
    color: Colors.conflict,
  },
  input: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 8,
    fontSize: 13,
    color: Colors.textPrimary,
    backgroundColor: Colors.bgMuted,
  },
  inputReadOnly: {
    backgroundColor: Colors.bgDisabled,
    color: Colors.textMuted,
  },
  hint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  changeNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  changeNote: {
    fontSize: 11,
    color: Colors.warning.text,
    fontWeight: '600',
    flexShrink: 1,
  },
});
