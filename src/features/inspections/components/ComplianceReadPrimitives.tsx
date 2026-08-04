import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../../constants/colors';
import { FormSection, TextField } from '../../../components/form';
import type { YnValue } from '../../../components/form';
import type { ChecklistEntry, ConditionEntry } from '../hooks/useInspectionReport';

// Read-only rendering primitives shared by ComplianceStatusView (hazwaste/air/
// eia, and the water dispatcher) and WaterComplianceEditSections (water's
// view-mode rendering, alongside its own editors). Kept in their own module
// so those two files can both import them without an import cycle.

export const YN_LABEL: Record<Exclude<YnValue, null>, string> = { Y: 'Y', N: 'N', NA: 'NA' };
export const YN_COLOR: Record<Exclude<YnValue, null>, string> = {
  Y: Colors.synced,
  N: Colors.conflict,
  NA: Colors.pending,
};

export const YnBadge: React.FC<{ value: YnValue }> = ({ value }) => {
  if (!value) return <Text style={styles.ynEmpty}>—</Text>;
  return (
    <View style={[styles.ynBadge, { borderColor: YN_COLOR[value], backgroundColor: `${YN_COLOR[value]}1a` }]}>
      <Text style={[styles.ynBadgeText, { color: YN_COLOR[value] }]}>{YN_LABEL[value]}</Text>
    </View>
  );
};

export function formatValue(v: unknown): string {
  if (v == null || v === '') return '—';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  return String(v);
}

export const SimpleTable: React.FC<{ columns: { key: string; label: string }[]; rows: Record<string, unknown>[] }> = ({
  columns,
  rows,
}) => {
  if (rows.length === 0) return <Text style={styles.emptyText}>None recorded.</Text>;
  return (
    <View style={styles.table}>
      <View style={styles.tableHeaderRow}>
        {columns.map(col => (
          <Text key={col.key} style={[styles.tableHeaderCell, styles.tableCellFlex]}>{col.label}</Text>
        ))}
      </View>
      {rows.map((row, i) => (
        <View key={i} style={styles.tableRow}>
          {columns.map(col => (
            <Text key={col.key} style={[styles.tableCell, styles.tableCellFlex]} numberOfLines={2}>
              {formatValue(row[col.key])}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
};

export const DetailCard: React.FC<{ title: string; fields: { label: string; value: unknown }[] }> = ({
  title,
  fields,
}) => (
  <View style={styles.detailCard}>
    <Text style={styles.detailCardTitle}>{title}</Text>
    {fields.map((f, i) => (
      <View key={i} style={styles.detailRow}>
        <Text style={styles.detailLabel}>{f.label}</Text>
        <Text style={styles.detailValue} numberOfLines={2}>{formatValue(f.value)}</Text>
      </View>
    ))}
  </View>
);

export const ChecklistList: React.FC<{ items: ChecklistEntry[] }> = ({ items }) => {
  if (items.length === 0) return <Text style={styles.emptyText}>No checklist entries recorded.</Text>;
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={styles.checklistRow}>
          <View style={styles.checklistTopLine}>
            {item.legal_ref ? <Text style={styles.checklistRef}>{item.legal_ref}</Text> : <View />}
            <YnBadge value={item.compliant} />
          </View>
          {item.requirement && <Text style={styles.checklistRequirement}>{item.requirement}</Text>}
          {!!item.remarks && <Text style={styles.checklistRemarks}>{item.remarks}</Text>}
        </View>
      ))}
    </View>
  );
};

export const ConditionsList: React.FC<{ items: ConditionEntry[] }> = ({ items }) => {
  if (items.length === 0) return <Text style={styles.emptyText}>No conditions recorded.</Text>;
  return (
    <View>
      {items.map((item, i) => {
        const label = item.description || item.requirement || `Condition ${item.condition_no ?? i + 1}`;
        const subLabel = [item.relevant_ecc_no, item.ecc_description].filter(Boolean).join(' — ');
        const note = item.remarks || item.proof_of_compliance;
        return (
          <View key={i} style={styles.checklistRow}>
            <View style={styles.checklistTopLine}>
              <Text style={styles.checklistRequirement}>
                {item.condition_no ? `${item.condition_no}. ` : ''}{label}
              </Text>
              <YnBadge value={item.compliant} />
            </View>
            {!!subLabel && <Text style={styles.checklistRef}>{subLabel}</Text>}
            {!!note && <Text style={styles.checklistRemarks}>{note}</Text>}
          </View>
        );
      })}
    </View>
  );
};

export const DocumentsChips: React.FC<{ documents: string[] }> = ({ documents }) => {
  if (documents.length === 0) return <Text style={styles.emptyText}>No documents marked as reviewed.</Text>;
  return (
    <View style={styles.chipsWrap}>
      {documents.map(doc => (
        <View key={doc} style={styles.chip}>
          <Text style={styles.chipText}>{doc}</Text>
        </View>
      ))}
    </View>
  );
};

export const NarrativeAndDocuments: React.FC<{
  otherObservations: string | null;
  remarksRecommendations: string | null;
  documentsReviewed: string[];
}> = ({ otherObservations, remarksRecommendations, documentsReviewed }) => (
  <FormSection icon="clipboard-outline" title="Observations & Recommendations">
    <TextField label="Other Observations" value={otherObservations || '—'} readOnly multiline />
    <TextField label="Remarks & Recommendations" value={remarksRecommendations || '—'} readOnly multiline />
    <Text style={styles.docsLabel}>Documents Reviewed</Text>
    <DocumentsChips documents={documentsReviewed} />
  </FormSection>
);

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 14,
  },
  emptyText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  subTitleSpaced: {
    marginTop: 14,
  },
  table: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: Colors.bgMuted,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.border,
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tableCell: {
    fontSize: 12,
    color: Colors.textPrimary,
  },
  tableCellFlex: {
    flex: 1,
  },
  detailCard: {
    backgroundColor: Colors.bgMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  detailCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 5,
  },
  detailLabel: {
    fontSize: 10.5,
    color: Colors.textMuted,
  },
  detailValue: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.textPrimary,
    flexShrink: 1,
    textAlign: 'right',
  },
  samplingCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  samplingMeta: {
    fontSize: 10.5,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  paramRow: {
    backgroundColor: Colors.bgMuted,
    borderRadius: 7,
    padding: 8,
    marginBottom: 6,
  },
  checklistGroup: {
    marginBottom: 16,
  },
  checklistGroupTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: Colors.navy,
    marginBottom: 6,
  },
  checklistRow: {
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  checklistTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  checklistRef: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: Colors.textLight,
    flexShrink: 1,
  },
  checklistRequirement: {
    fontSize: 12.5,
    color: Colors.navy,
    flex: 1,
    lineHeight: 17,
  },
  checklistRemarks: {
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  ynBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1.5,
    flexShrink: 0,
  },
  ynBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  ynEmpty: {
    fontSize: 11,
    color: Colors.textLight,
  },
  docsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: 0.3,
    marginBottom: 8,
    marginTop: 4,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: Colors.bgMuted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
