import React, { useRef } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Colors } from '../../design/colors';
import { Radius } from '../../design/radius';
import { Spacing } from '../../design/spacing';
import { Type } from '../../design/typography';
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
    // Bare 10 sat off the 4dp rhythm and between two tokens (sm=8, md=12).
    // This margin separates the whole table from whatever follows it, the
    // same role EstablishmentCard's rowWrap and Section's header margin
    // play at Spacing.md — resolved here the same way rather than to the
    // tighter sm, which is reserved below for padding inside a row.
    marginBottom: Spacing.md,
  },
  row: {
    // Same bare-10 case as `wrap`, but this is internal row padding, not a
    // block-separating margin — resolves to the tighter sm (8) so the
    // row doesn't pick up extra bulk on top of the requirement line's
    // fontSize going from 12.5 to Type.body (14).
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  // Was a bare 10/monospace, below the type scale's 11 floor. Raised to
  // Type.caption — the floor itself, not further — since the ref code is a
  // secondary label next to the toggle, not the thing being read.
  ref: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    fontFamily: 'monospace',
    color: Colors.textLight,
  },
  // The point of this migration: this is the highest-volume reading task in
  // the app, laid out stacked (nothing shares a row with this text), so it
  // gets the full legibility win from 12.5 straight to Type.body (14) with
  // no horizontal risk.
  requirement: {
    fontSize: Type.body.fontSize,
    lineHeight: Type.body.lineHeight,
    color: Colors.navy,
    // Bare 6, not an icon/text gap — per spacing.ts's own documented
    // resolution for that value, it lands on sm (8), not xs.
    marginBottom: Spacing.sm,
  },
  // Follows the normal scale: 12 already lands exactly on Type.label.
  remarks: {
    fontSize: Type.label.fontSize,
    lineHeight: Type.label.lineHeight,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    // Bare 6, not an icon/text gap - resolves to sm (8), same rule as above.
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
  },
});
