import React, { forwardRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  ReturnKeyTypeOptions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../design/colors';
import { Radius } from '../../design/radius';
import { Spacing } from '../../design/spacing';
import { FONT_SCALING, Type } from '../../design/typography';

interface ComboInputProps {
  // Names the sheet, since the input itself carries no label - it sits in
  // dense rows (a parameter line) where a label would double the height.
  title: string;
  value: string;
  options: string[];
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  returnKeyType?: ReturnKeyTypeOptions;
  blurOnSubmit?: boolean;
  onSubmitEditing?: () => void;
}

// A picker over a live text input - the same shape as DynamicRowTable's
// `combo` column, for rows that table can't express (a parameter line has
// a Y/N/NA toggle and a remove button beside the name). The list is a
// convenience, not a constraint: an off-list parameter is exactly what a
// combo exists to record, so only the chevron goes inert when there is
// nothing to offer and the input beside it stays live.
export const ComboInput = forwardRef<TextInput, ComboInputProps>(({
  title,
  value,
  options,
  onChangeText,
  placeholder,
  style,
  inputStyle,
  returnKeyType,
  blurOnSubmit,
  onSubmitEditing,
}, ref) => {
  const [open, setOpen] = useState(false);
  const canPick = options.length > 0;

  return (
    <View style={[styles.cell, style]}>
      <TextInput
        ref={ref}
        style={[styles.input, inputStyle]}
        allowFontScaling={FONT_SCALING.tabular}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textLight}
        returnKeyType={returnKeyType}
        blurOnSubmit={blurOnSubmit}
        onSubmitEditing={onSubmitEditing}
      />
      <TouchableOpacity
        style={styles.chevron}
        disabled={!canPick}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPress={() => canPick && setOpen(true)}>
        <Ionicons name="chevron-down" size={12} color={canPick ? Colors.textMuted : Colors.borderLight} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <FlatList
              data={options}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    onChangeText(item);
                    setOpen(false);
                  }}>
                  <Text style={styles.optionText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
});

ComboInput.displayName = 'ComboInput';

// Cell, sheet and option styles mirror DynamicRowTable's combo column so a
// combo reads the same whether it sits in a table or on its own line.
const styles = StyleSheet.create({
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingRight: Spacing.sm,
    backgroundColor: Colors.white,
  },
  input: {
    flex: 1,
    fontSize: Type.tabular.fontSize,
    lineHeight: Type.tabular.lineHeight,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  chevron: {
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  sheet: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    maxHeight: '60%',
  },
  sheetTitle: {
    fontSize: Type.body.fontSize,
    lineHeight: Type.body.lineHeight,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: Spacing.md,
  },
  option: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  optionText: {
    fontSize: Type.bodySm.fontSize,
    lineHeight: Type.bodySm.lineHeight,
    color: Colors.textPrimary,
  },
});
