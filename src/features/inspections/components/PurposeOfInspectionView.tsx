import React, { useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Keyboard, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { database, collections } from '../../../db/database';
import { FormSection, TextField, focusInput } from '../../../components/form';
import { SectionEditActions } from './SectionEditActions';
import { useEditableSection } from '../hooks/useEditableSection';
import type { PurposeFormState, VerifyInfoRowState, CommitmentRowState } from '../types';
import type { VerifyInfoListItem, CheckCommitmentsListItem } from '../../../services/sync/syncTypes';
import type { PurposeOfInspection } from '../../../db/models';

interface PurposeOfInspectionViewProps {
  purposeId: string;
  value: PurposeFormState;
  canEdit: boolean;
  onSaved: () => void;
}

async function patchPurpose(purposeId: string, patch: Partial<PurposeOfInspection>) {
  await database.write(async () => {
    const rec = await collections.purposeOfInspection.find(purposeId);
    await rec.update(r => {
      Object.assign(r, patch);
      r.updatedAt = new Date().toISOString();
      r.syncState = 'pending_update';
    });
  });
}

// ── Static check/uncheck row (view mode, and toggleable in edit mode) ─────────

const ToggleCheck: React.FC<{ checked: boolean; label: string; editable: boolean; onToggle: () => void }> = ({
  checked,
  label,
  editable,
  onToggle,
}) => {
  const content = (
    <View style={styles.checkRow}>
      <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={18} color={checked ? Colors.green : Colors.textMuted} />
      <Text style={styles.checkLabel}>{label}</Text>
    </View>
  );
  if (!editable) return content;
  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
      {content}
    </TouchableOpacity>
  );
};

const RemarksText: React.FC<{ remarks: string | null | undefined }> = ({ remarks }) => (
  <Text style={[styles.remarksText, !remarks && styles.remarksEmpty]}>{remarks || 'No remarks'}</Text>
);

// ── Verification of Application ────────────────────────────────────────────

interface VerifyInfoFields {
  verifyInfo: boolean;
  verifyInfoRows: VerifyInfoRowState[];
}

const VerifyInfoSection: React.FC<{
  purposeId: string;
  value: VerifyInfoFields;
  canEdit: boolean;
  onSaved: () => void;
}> = ({
  purposeId,
  value,
  canEdit,
  onSaved,
}) => {
  const remarksRefs = useRef<Record<number, TextInput | null>>({});

  const section = useEditableSection<VerifyInfoFields>({
    value,
    onSave: async fields => {
      const verifyInfoList: VerifyInfoListItem[] = fields.verifyInfoRows
        .filter(r => r.status || r.remarks.trim())
        .map(r => ({ item_key: r.itemKey, status: r.status, remarks: r.remarks || null }));
      await patchPurpose(purposeId, { verifyInfo: fields.verifyInfo, verifyInfoList });
      onSaved();
    },
  });

  const setRow = (index: number, patch: Partial<VerifyInfoRowState>) => {
    const rows = section.draft.verifyInfoRows.slice();
    rows[index] = { ...rows[index], ...patch };
    section.setDraft(d => ({ ...d, verifyInfoRows: rows }));
  };

  const focusNext = (fromIndex: number) => {
    for (let i = fromIndex + 1; i < section.draft.verifyInfoRows.length; i++) {
      if (section.draft.verifyInfoRows[i].status != null) {
        focusInput(remarksRefs.current[i]);
        return;
      }
    }
    Keyboard.dismiss();
  };

  return (
    <FormSection
      icon="bookmark-outline"
      title="Verification of Application"
      headerRight={
        <SectionEditActions editing={section.editing} saving={section.saving} onStartEdit={section.startEdit} onCancel={section.cancel} onSave={section.save} canEdit={canEdit} />
      }>
      <ToggleCheck
        checked={section.draft.verifyInfo}
        label="Verify accuracy of information submitted by the establishment"
        editable={section.editing}
        onToggle={() => section.setDraft(d => ({ ...d, verifyInfo: !d.verifyInfo }))}
      />

      {section.draft.verifyInfoRows.map((row, i) => (
        <View key={row.itemKey} style={styles.verifyRow}>
          <View style={styles.verifyTopLine}>
            <Text style={styles.verifyLabel}>{row.label}</Text>
            {section.editing ? (
              <View style={styles.statusBtns}>
                <StatusChip label="New" active={row.status === 'new'} onPress={() => setRow(i, { status: row.status === 'new' ? null : 'new' })} />
                <StatusChip label="Renewal" active={row.status === 'renewal'} onPress={() => setRow(i, { status: row.status === 'renewal' ? null : 'renewal' })} />
              </View>
            ) : (
              <View style={[styles.statusBadge, { backgroundColor: row.status ? Colors.greenMuted : Colors.bgLight }]}>
                <Text style={[styles.statusBadgeText, { color: row.status ? Colors.green : Colors.textLight }]}>
                  {row.status === 'new' ? 'New' : row.status === 'renewal' ? 'Renewal' : 'Not applicable'}
                </Text>
              </View>
            )}
          </View>
          {section.editing ? (
            <TextInput
              ref={el => { remarksRefs.current[i] = el; }}
              style={styles.remarksInput}
              value={row.remarks}
              onChangeText={remarks => setRow(i, { remarks })}
              placeholder="Remarks"
              placeholderTextColor={Colors.textLight}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => focusNext(i)}

            />
          ) : (
            <RemarksText remarks={row.remarks} />
          )}
        </View>
      ))}
      {section.error && <Text style={styles.errorText}>{section.error}</Text>}
    </FormSection>
  );
};

const StatusChip: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({ label, active, onPress }) => (
  <Text onPress={onPress} style={[styles.chip, active && styles.chipActive]} suppressHighlighting>
    {label}
  </Text>
);

// ── Compliance & Investigation ─────────────────────────────────────────────

interface ComplianceInvestigationFields {
  determineCompliance: boolean;
  investigateComplaints: boolean;
}

const ComplianceInvestigationSection: React.FC<{
  purposeId: string;
  value: ComplianceInvestigationFields;
  canEdit: boolean;
  onSaved: () => void;
}> = ({ purposeId, value, canEdit, onSaved }) => {
  const section = useEditableSection<ComplianceInvestigationFields>({
    value,
    onSave: async fields => {
      await patchPurpose(purposeId, fields);
      onSaved();
    },
  });

  return (
    <FormSection
      icon="search-outline"
      title="Compliance & Investigation"
      headerRight={
        <SectionEditActions editing={section.editing} saving={section.saving} onStartEdit={section.startEdit} onCancel={section.cancel} onSave={section.save} canEdit={canEdit} />
      }>
      <ToggleCheck
        checked={section.draft.determineCompliance}
        label="Determine compliance with regulations and permit conditions"
        editable={section.editing}
        onToggle={() => section.setDraft(d => ({ ...d, determineCompliance: !d.determineCompliance }))}
      />
      <ToggleCheck
        checked={section.draft.investigateComplaints}
        label="Investigate community complaint"
        editable={section.editing}
        onToggle={() => section.setDraft(d => ({ ...d, investigateComplaints: !d.investigateComplaints }))}
      />
      {section.error && <Text style={styles.errorText}>{section.error}</Text>}
    </FormSection>
  );
};

// ── Voluntary Commitment ────────────────────────────────────────────────────

interface CommitmentFields {
  checkCommitments: boolean;
  commitmentRows: CommitmentRowState[];
}

const CommitmentSection: React.FC<{
  purposeId: string;
  value: CommitmentFields;
  canEdit: boolean;
  onSaved: () => void;
  othersRef?: React.RefObject<TextInput | null>;
}> = ({
  purposeId,
  value,
  canEdit,
  onSaved,
  othersRef,
}) => {
  const remarksRefs = useRef<Record<number, TextInput | null>>({});

  const section = useEditableSection<CommitmentFields>({
    value,
    onSave: async fields => {
      const checkCommitmentsList: CheckCommitmentsListItem[] = fields.commitmentRows
        .filter(r => r.checked)
        .map(r => ({ item_key: r.itemKey, remarks: r.remarks || null }));
      await patchPurpose(purposeId, { checkCommitments: fields.checkCommitments, checkCommitmentsList });
      onSaved();
    },
  });

  const setRow = (index: number, patch: Partial<CommitmentRowState>) => {
    const rows = section.draft.commitmentRows.slice();
    rows[index] = { ...rows[index], ...patch };
    section.setDraft(d => ({ ...d, commitmentRows: rows }));
  };

  const focusNext = (fromIndex: number) => {
    for (let i = fromIndex + 1; i < section.draft.commitmentRows.length; i++) {
      if (section.draft.commitmentRows[i].checked) {
        focusInput(remarksRefs.current[i]);
        return;
      }
    }
    focusInput(othersRef?.current);
  };

  const visibleRows = section.editing
    ? section.draft.checkCommitments
      ? section.draft.commitmentRows
      : []
    : section.draft.commitmentRows.filter(row => row.checked);

  return (
    <FormSection
      icon="people-outline"
      title="Voluntary Commitment"
      headerRight={
        <SectionEditActions editing={section.editing} saving={section.saving} onStartEdit={section.startEdit} onCancel={section.cancel} onSave={section.save} canEdit={canEdit} />
      }>
      <ToggleCheck
        checked={section.draft.checkCommitments}
        label="Check status of voluntary commitment program"
        editable={section.editing}
        onToggle={() => section.setDraft(d => ({ ...d, checkCommitments: !d.checkCommitments }))}
      />
      {!section.editing && visibleRows.length === 0 && (
        <Text style={styles.emptyText}>No voluntary commitment programs recorded.</Text>
      )}
      {visibleRows.map(row => {
        const i = section.draft.commitmentRows.indexOf(row);
        return (
          <View key={row.itemKey} style={styles.commitmentRow}>
            {section.editing ? (
              <ToggleCheck checked={row.checked} label={row.label} editable onToggle={() => setRow(i, { checked: !row.checked })} />
            ) : (
              <View style={styles.checkRow}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.green} />
                <Text style={styles.checkLabel}>{row.label}</Text>
              </View>
            )}
            {section.editing ? (
              row.checked && (
                <TextInput
                  ref={el => { remarksRefs.current[i] = el; }}
                  style={styles.remarksInput}
                  value={row.remarks}
                  onChangeText={remarks => setRow(i, { remarks })}
                  placeholder="Remarks"
                  placeholderTextColor={Colors.textLight}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => focusNext(i)}

                />
              )
            ) : (
              <RemarksText remarks={row.remarks} />
            )}
          </View>
        );
      })}
      {section.error && <Text style={styles.errorText}>{section.error}</Text>}
    </FormSection>
  );
};

// ── Others ──────────────────────────────────────────────────────────────────

const OthersSection = React.forwardRef<TextInput, { purposeId: string; value: string; canEdit: boolean; onSaved: () => void }>(({
  purposeId,
  value,
  canEdit,
  onSaved,
}, ref) => {
  const section = useEditableSection<string>({
    value,
    onSave: async others => {
      await patchPurpose(purposeId, { others: others.trim() || null });
      onSaved();
    },
  });

  return (
    <FormSection
      icon="create-outline"
      title="Others"
      headerRight={
        <SectionEditActions editing={section.editing} saving={section.saving} onStartEdit={section.startEdit} onCancel={section.cancel} onSave={section.save} canEdit={canEdit} />
      }>
      {section.editing ? (
        <TextField
          ref={ref}
          label="Specify other purpose"
          value={section.draft}
          onChangeText={section.setDraft}
          multiline
          placeholder="Describe any other purpose of this inspection…"
          returnKeyType="done"
        />
      ) : (
        <RemarksText remarks={value} />
      )}
      {section.error && <Text style={styles.errorText}>{section.error}</Text>}
    </FormSection>
  );
});
OthersSection.displayName = 'OthersSection';

// ── Top-level ─────────────────────────────────────────────────────────────

export const PurposeOfInspectionView: React.FC<PurposeOfInspectionViewProps> = ({ purposeId, value, canEdit, onSaved }) => {
  const othersRef = useRef<TextInput>(null);

  return (
    <View>
      <VerifyInfoSection
        purposeId={purposeId}
        value={{ verifyInfo: value.verifyInfo, verifyInfoRows: value.verifyInfoRows }}
        canEdit={canEdit}
        onSaved={onSaved}
      />
      <ComplianceInvestigationSection
        purposeId={purposeId}
        value={{ determineCompliance: value.determineCompliance, investigateComplaints: value.investigateComplaints }}
        canEdit={canEdit}
        onSaved={onSaved}
      />
      <CommitmentSection
        purposeId={purposeId}
        value={{ checkCommitments: value.checkCommitments, commitmentRows: value.commitmentRows }}
        canEdit={canEdit}
        onSaved={onSaved}
        othersRef={othersRef}
      />
      <OthersSection ref={othersRef} purposeId={purposeId} value={value.others} canEdit={canEdit} onSaved={onSaved} />
    </View>
  );
};

const styles = StyleSheet.create({
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  checkLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.navy,
  },
  verifyRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  verifyTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
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
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    flexShrink: 0,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
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
    marginBottom: 10,
    paddingLeft: 2,
  },
  remarksText: {
    fontSize: 11.5,
    color: Colors.textSecondary,
  },
  remarksEmpty: {
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 11.5,
    color: Colors.conflict,
    marginTop: 4,
  },
});
