import React, { useRef } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { YesNoNAToggle, YnValue } from './YesNoNAToggle';
import { focusInput } from './focusInput';

export interface ChecklistItemDef {
  ref: string;
  requirement: string;
}

export interface ChecklistValue {
  compliant: YnValue;
  remarks: string;
}

interface ChecklistTableProps {
  items: ChecklistItemDef[];
  values: ChecklistValue[];
  onChange: (index: number, patch: Partial<ChecklistValue>) => void;
}

export const ChecklistTable: React.FC<ChecklistTableProps> = ({ items, values, onChange }) => {
  const remarksRefs = useRef<Record<number, TextInput | null>>({});

  return (
    <View style={styles.wrap}>
      {items.map((item, i) => {
        const v = values[i] ?? { compliant: null, remarks: '' };
        const isLast = i === items.length - 1;
        return (
          <View key={item.ref} style={styles.row}>
            <View style={styles.topLine}>
              <Text style={styles.ref}>{item.ref}</Text>
              <YesNoNAToggle
                value={v.compliant}
                onChange={compliant => onChange(i, { compliant })}
              />
            </View>
            <Text style={styles.requirement}>{item.requirement}</Text>
            <TextInput
              ref={el => { remarksRefs.current[i] = el; }}
              style={styles.remarks}
              value={v.remarks}
              onChangeText={remarks => onChange(i, { remarks })}
              placeholder="Remarks"
              placeholderTextColor={Colors.textLight}
              returnKeyType={isLast ? 'done' : 'next'}
              blurOnSubmit={isLast}
              onSubmitEditing={() => focusInput(remarksRefs.current[i + 1])}
            />
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 10,
  },
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  ref: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: Colors.textLight,
  },
  requirement: {
    fontSize: 12.5,
    color: Colors.navy,
    marginBottom: 6,
    lineHeight: 17,
  },
  remarks: {
    fontSize: 12,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: Colors.white,
  },
});
