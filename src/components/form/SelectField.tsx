import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../design/colors';
import { Radius } from '../../design/radius';
import { Spacing } from '../../design/spacing';
import { Type } from '../../design/typography';
import { AppText } from '../AppText';

interface SelectFieldProps {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  // Locks the picker closed — for cascading selects (e.g. City depends on
  // Province) where there's nothing valid to choose yet.
  disabled?: boolean;
  style?: object;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  options,
  onSelect,
  placeholder = 'Select…',
  required,
  disabled,
  style,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? options.filter(o => o.toLowerCase().includes(q)) : options;
  }, [options, search]);

  return (
    <View style={[styles.group, style]}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.req}> *</Text>}
      </Text>
      <TouchableOpacity
        style={[styles.input, disabled && styles.inputDisabled]}
        activeOpacity={disabled ? 1 : 0.7}
        disabled={disabled}
        onPress={() => {
          // Dismiss first so this Modal's window doesn't open while the
          // keyboard is still transitioning — on Android, two native
          // windows racing over the same keyboard-resize event is what
          // makes the modal underneath jitter.
          Keyboard.dismiss();
          setOpen(true);
        }}>
        {value ? (
          <AppText variant="single" text={value} style={styles.value} containerStyle={styles.valueContainer} />
        ) : (
          <Text style={styles.placeholder} numberOfLines={1}>{placeholder}</Text>
        )}
        <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            {options.length > 6 && (
              <TextInput
                style={styles.search}
                placeholder="Search…"
                placeholderTextColor={Colors.textLight}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
              />
            )}
            <FlatList
              data={filtered}
              keyExtractor={item => item}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    onSelect(item);
                    setSearch('');
                    setOpen(false);
                  }}>
                  <Text style={item === value ? styles.optionTextActive : styles.optionText}>
                    {item}
                  </Text>
                  {item === value && (
                    <Ionicons name="checkmark" size={16} color={Colors.green} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.empty}>No matches.</Text>
              }
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  // `flex: 1` is intentional: side-by-side in a form row, this field
  // stretches to share the row's width evenly with its sibling. A caller
  // that stacks this field standalone (no row sibling) must override this
  // back to Yoga's default via its own `flex: undefined` style — see
  // ManageEstablishmentsTab's `filterField` for the documented case where
  // `flex: 1` otherwise collapses the field to near-zero height.
  group: {
    marginBottom: Spacing.lg,
    flex: 1,
  },
  label: {
    fontSize: Type.label.fontSize,
    lineHeight: Type.label.lineHeight,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: 0.3,
    // Bare 6, not an icon/text gap - resolves to sm (8) per spacing.ts's
    // documented rule for that value.
    marginBottom: Spacing.sm,
  },
  req: {
    color: Colors.conflict,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: Spacing.md,
    // Bare 9 sat off the 4dp rhythm, nearer to sm (8) than md (12).
    paddingVertical: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgMuted,
  },
  value: {
    fontSize: Type.bodySm.fontSize,
    lineHeight: Type.bodySm.lineHeight,
    color: Colors.textPrimary,
  },
  valueContainer: {
    flex: 1,
  },
  placeholder: {
    fontSize: Type.bodySm.fontSize,
    lineHeight: Type.bodySm.lineHeight,
    color: Colors.textLight,
    flex: 1,
  },
  inputDisabled: {
    backgroundColor: Colors.bgDisabled,
  },
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    maxHeight: '70%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sheetTitle: {
    fontSize: Type.subheading.fontSize,
    lineHeight: Type.subheading.lineHeight,
    fontWeight: '700',
    color: Colors.navy,
  },
  search: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Type.bodySm.fontSize,
    lineHeight: Type.bodySm.lineHeight,
    marginBottom: Spacing.sm,
    color: Colors.textPrimary,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  optionText: {
    fontSize: Type.bodySm.fontSize,
    lineHeight: Type.bodySm.lineHeight,
    color: Colors.textPrimary,
  },
  optionTextActive: {
    fontSize: Type.bodySm.fontSize,
    lineHeight: Type.bodySm.lineHeight,
    color: Colors.green,
    fontWeight: '700',
  },
  empty: {
    fontSize: Type.label.fontSize,
    lineHeight: Type.label.lineHeight,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
});
