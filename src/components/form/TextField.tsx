import React, { forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  KeyboardTypeOptions,
} from 'react-native';
import { Colors } from '../../constants/colors';

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  readOnly?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: KeyboardTypeOptions;
  style?: object;
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
  readOnly,
  multiline,
  numberOfLines,
  keyboardType,
  style,
  returnKeyType,
  blurOnSubmit,
  onSubmitEditing,
  onFocus,
}, ref) => (
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
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={Colors.textLight}
      editable={!readOnly}
      multiline={multiline}
      numberOfLines={numberOfLines}
      keyboardType={keyboardType}
      returnKeyType={returnKeyType}
      blurOnSubmit={blurOnSubmit}
      onSubmitEditing={onSubmitEditing}
      onFocus={onFocus}
    />
    {hint && <Text style={styles.hint}>{hint}</Text>}
  </View>
));
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
    backgroundColor: Colors.bgLight,
    color: Colors.textMuted,
  },
  hint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
});
