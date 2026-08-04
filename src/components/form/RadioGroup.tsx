import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface RadioOption {
  label: string;
  value: string;
}

interface RadioGroupProps {
  label?: string;
  options: RadioOption[];
  value: string | null;
  onChange: (value: string) => void;
  required?: boolean;
  style?: object;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  label,
  options,
  value,
  onChange,
  required,
  style,
}) => (
  <View style={[styles.group, style]}>
    {label && (
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.req}> *</Text>}
      </Text>
    )}
    <View style={styles.row}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.pill, active && styles.pillActive]}
            activeOpacity={0.7}
            onPress={() => onChange(opt.value)}>
            <View style={[styles.dot, active && styles.dotActive]} />
            <Text style={[styles.pillText, active && styles.pillTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

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
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: Colors.white,
  },
  pillActive: {
    borderColor: Colors.green,
    backgroundColor: Colors.greenMuted,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.textLight,
  },
  dotActive: {
    borderColor: Colors.green,
    backgroundColor: Colors.green,
  },
  pillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.navy,
  },
  pillTextActive: {
    color: Colors.green,
  },
});
