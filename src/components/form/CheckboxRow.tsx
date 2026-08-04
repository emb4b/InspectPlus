import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface CheckboxRowProps {
  label: string;
  subLabel?: string;
  checked: boolean;
  onToggle: () => void;
}

export const CheckboxRow: React.FC<CheckboxRowProps> = ({
  label,
  subLabel,
  checked,
  onToggle,
}) => (
  <TouchableOpacity
    style={[styles.row, checked && styles.rowChecked]}
    activeOpacity={0.7}
    onPress={onToggle}>
    <Ionicons
      name={checked ? 'checkbox' : 'square-outline'}
      size={18}
      color={checked ? Colors.green : Colors.textMuted}
    />
    <View style={styles.textWrap}>
      <Text style={styles.label}>{label}</Text>
      {subLabel && <Text style={styles.subLabel}>{subLabel}</Text>}
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: Colors.white,
  },
  rowChecked: {
    borderColor: Colors.green,
    backgroundColor: Colors.greenMuted,
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.navy,
  },
  subLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
