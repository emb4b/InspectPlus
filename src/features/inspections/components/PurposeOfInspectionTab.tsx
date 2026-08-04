import React, { useRef } from 'react';
import { View, Text, TextInput, Keyboard, StyleSheet } from 'react-native';
import { Colors } from '../../../constants/colors';
import { FormSection, TextField, CheckboxRow, focusInput } from '../../../components/form';
import type { PurposeFormState } from '../types';

interface PurposeOfInspectionTabProps {
  value: PurposeFormState;
  onChange: (value: PurposeFormState) => void;
}

export const PurposeOfInspectionTab: React.FC<PurposeOfInspectionTabProps> = ({
  value,
  onChange,
}) => {
  // verifyInfoRows/commitmentRows are fixed-length, toggle-visibility lists
  // (not user-addable), so a stable index-keyed ref map is safe here.
  const verifyRefs = useRef<Record<number, TextInput | null>>({});
  const commitmentRefs = useRef<Record<number, TextInput | null>>({});
  const othersRef = useRef<TextInput>(null);

  const setVerifyRow = (index: number, patch: Partial<PurposeFormState['verifyInfoRows'][number]>) => {
    const rows = value.verifyInfoRows.slice();
    rows[index] = { ...rows[index], ...patch };
    onChange({ ...value, verifyInfoRows: rows });
  };

  const setCommitmentRow = (index: number, patch: Partial<PurposeFormState['commitmentRows'][number]>) => {
    const rows = value.commitmentRows.slice();
    rows[index] = { ...rows[index], ...patch };
    onChange({ ...value, commitmentRows: rows });
  };

  const focusNextVerify = (fromIndex: number) => {
    for (let i = fromIndex + 1; i < value.verifyInfoRows.length; i++) {
      if (value.verifyInfoRows[i].status != null) {
        focusInput(verifyRefs.current[i]);
        return;
      }
    }
    Keyboard.dismiss();
  };

  const focusNextCommitment = (fromIndex: number) => {
    for (let i = fromIndex + 1; i < value.commitmentRows.length; i++) {
      if (value.commitmentRows[i].checked) {
        focusInput(commitmentRefs.current[i]);
        return;
      }
    }
    focusInput(othersRef.current);
  };

  return (
    <View>
      <FormSection icon="bookmark-outline" title="Verification of Application">
        <CheckboxRow
          label="Verify accuracy of information submitted by the establishment"
          subLabel="Pertaining to new permit applications, renewals, or modifications"
          checked={value.verifyInfo}
          onToggle={() => onChange({ ...value, verifyInfo: !value.verifyInfo })}
        />

        {value.verifyInfo && value.verifyInfoRows.map((row, i) => (
          <View key={row.itemKey} style={styles.verifyRow}>
            <View style={styles.verifyTopLine}>
              <Text style={styles.verifyLabel}>{row.label}</Text>
              <View style={styles.statusBtns}>
                <StatusChip
                  label="New"
                  active={row.status === 'new'}
                  onPress={() => setVerifyRow(i, { status: row.status === 'new' ? null : 'new' })}
                />
                <StatusChip
                  label="Renewal"
                  active={row.status === 'renewal'}
                  onPress={() => setVerifyRow(i, { status: row.status === 'renewal' ? null : 'renewal' })}
                />
              </View>
            </View>
            {row.status != null && (
              <TextInput
                ref={el => { verifyRefs.current[i] = el; }}
                style={styles.remarksInput}
                value={row.remarks}
                onChangeText={remarks => setVerifyRow(i, { remarks })}
                placeholder="Remarks"
                placeholderTextColor={Colors.textLight}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => focusNextVerify(i)}

              />
            )}
          </View>
        ))}
      </FormSection>

      <FormSection icon="search-outline" title="Compliance & Investigation">
        <CheckboxRow
          label="Determine compliance with regulations and permit conditions"
          checked={value.determineCompliance}
          onToggle={() => onChange({ ...value, determineCompliance: !value.determineCompliance })}
        />
        <CheckboxRow
          label="Investigate community complaint"
          checked={value.investigateComplaints}
          onToggle={() => onChange({ ...value, investigateComplaints: !value.investigateComplaints })}
        />
      </FormSection>

      <FormSection icon="people-outline" title="Voluntary Commitment">
        <CheckboxRow
          label="Check status of voluntary commitment program"
          checked={value.checkCommitments}
          onToggle={() => onChange({ ...value, checkCommitments: !value.checkCommitments })}
        />
        {value.checkCommitments && value.commitmentRows.map((row, i) => (
          <View key={row.itemKey} style={styles.commitmentRow}>
            <CheckboxRow
              label={row.label}
              checked={row.checked}
              onToggle={() => setCommitmentRow(i, { checked: !row.checked })}
            />
            {row.checked && (
              <TextInput
                ref={el => { commitmentRefs.current[i] = el; }}
                style={styles.remarksInput}
                value={row.remarks}
                onChangeText={remarks => setCommitmentRow(i, { remarks })}
                placeholder="Remarks"
                placeholderTextColor={Colors.textLight}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => focusNextCommitment(i)}

              />
            )}
          </View>
        ))}
      </FormSection>

      <FormSection icon="create-outline" title="Others">
        <TextField
          ref={othersRef}
          label="Specify other purpose"
          value={value.others}
          onChangeText={others => onChange({ ...value, others })}
          multiline
          placeholder="Describe any other purpose of this inspection…"
          returnKeyType="done"

        />
      </FormSection>
    </View>
  );
};

const StatusChip: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({
  label,
  active,
  onPress,
}) => (
  <Text
    onPress={onPress}
    style={[styles.chip, active && styles.chipActive]}
    suppressHighlighting>
    {label}
  </Text>
);

const styles = StyleSheet.create({
  verifyRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  verifyTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  verifyLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.navy,
    flex: 1,
  },
  statusBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  chipActive: {
    color: Colors.green,
    borderColor: Colors.green,
    backgroundColor: Colors.greenMuted,
  },
  remarksInput: {
    fontSize: 12,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: Colors.white,
  },
  commitmentRow: {
    marginBottom: 4,
  },
});
