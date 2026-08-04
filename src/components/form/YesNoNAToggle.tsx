import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

export type YnValue = 'Y' | 'N' | 'NA' | null;

interface YesNoNAToggleProps {
  value: YnValue;
  onChange: (value: YnValue) => void;
}

const OPTIONS: { key: Exclude<YnValue, null>; label: string; color: string }[] = [
  { key: 'Y', label: 'Y', color: Colors.synced },
  { key: 'N', label: 'N', color: Colors.conflict },
  { key: 'NA', label: 'NA', color: Colors.pending },
];

export const YesNoNAToggle: React.FC<YesNoNAToggleProps> = ({ value, onChange }) => (
  <View style={styles.row}>
    {OPTIONS.map(opt => {
      const active = value === opt.key;
      return (
        <TouchableOpacity
          key={opt.key}
          style={[
            styles.btn,
            active && { borderColor: opt.color, backgroundColor: `${opt.color}1a` },
          ]}
          activeOpacity={0.7}
          onPress={() => onChange(active ? null : opt.key)}>
          <Text style={[styles.btnText, active && { color: opt.color }]}>{opt.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  btnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
  },
});
