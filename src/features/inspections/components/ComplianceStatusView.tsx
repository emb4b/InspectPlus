import React from 'react';
import { View, Text } from 'react-native';
import { FormSection, TextField } from '../../../components/form';
import type { ComplianceView, ChecklistGroup } from '../hooks/useInspectionReport';
import { WaterComplianceEditSections } from '../water/WaterComplianceEditSections';
import {
  SimpleTable,
  ChecklistList,
  ConditionsList,
  NarrativeAndDocuments,
  styles,
} from './ComplianceReadPrimitives';

interface ComplianceStatusViewProps {
  reportId: string;
  compliance: ComplianceView;
  onSaved: () => void;
}

const ChecklistGroups: React.FC<{ groups: ChecklistGroup[] }> = ({ groups }) => {
  const populated = groups.filter(g => g.items.length > 0);
  if (populated.length === 0) return <Text style={styles.emptyText}>No checklist entries recorded.</Text>;
  return (
    <View>
      {populated.map(group => (
        <View key={group.title} style={styles.checklistGroup}>
          <Text style={styles.checklistGroupTitle}>{group.title}</Text>
          <ChecklistList items={group.items} />
        </View>
      ))}
    </View>
  );
};

// ── Empty state ─────────────────────────────────────────────────────────────

const EmptyCompliance: React.FC = () => (
  <FormSection icon="information-circle-outline" title="Compliance Status">
    <Text style={styles.emptyText}>No compliance data has been recorded for this report yet.</Text>
  </FormSection>
);

// ── Type-specific views ──────────────────────────────────────────────────────

const HazwasteComplianceView: React.FC<{ c: Extract<ComplianceView, { kind: 'hazwaste' }> }> = ({ c }) => (
  <View>
    <FormSection icon="warning-outline" title="Hazardous Waste Generator">
      <View style={styles.row}>
        <TextField label="Hazardous Waste ID No." value={c.hazwasteGeneratorId || '—'} readOnly />
        <TextField label="Date Issued" value={c.hazwasteIdDateIssued || '—'} readOnly />
      </View>
    </FormSection>

    <FormSection icon="cube-outline" title="Waste Types Generated">
      <SimpleTable
        columns={[
          { key: 'waste_generating_process', label: 'Generating Process' },
          { key: 'type_of_hazardous_waste', label: 'Type of Waste' },
          { key: 'quantity', label: 'Quantity' },
          { key: 'unit', label: 'Unit' },
        ]}
        rows={c.wasteTypesGenerated}
      />
    </FormSection>

    <FormSection icon="checkbox-outline" title="Compliance Checklists — DAO 2013-22">
      <ChecklistGroups groups={c.checklists} />
    </FormSection>

    <FormSection icon="document-text-outline" title="HWID Conditions">
      <ConditionsList items={c.hwidConditions} />
    </FormSection>

    <NarrativeAndDocuments
      otherObservations={c.otherObservations}
      remarksRecommendations={c.remarksRecommendations}
      documentsReviewed={c.documentsReviewed}
    />
  </View>
);

const AirComplianceView: React.FC<{ c: Extract<ComplianceView, { kind: 'air' }> }> = ({ c }) => (
  <View>
    <FormSection icon="partly-sunny-outline" title="Emission Sources">
      <SimpleTable
        columns={[
          { key: 'source_no', label: 'Source No.' },
          { key: 'type', label: 'Type' },
          { key: 'fuel_type', label: 'Fuel Type' },
          { key: 'rated_capacity', label: 'Rated Capacity' },
        ]}
        rows={c.emissionSources}
      />
    </FormSection>

    <FormSection icon="checkbox-outline" title="Compliance Checklists">
      <ChecklistGroups groups={c.checklists} />
    </FormSection>

    <FormSection icon="document-text-outline" title="Permit to Operate Conditions">
      <ConditionsList items={c.ptoConditions} />
    </FormSection>

    <NarrativeAndDocuments
      otherObservations={c.otherObservations}
      remarksRecommendations={c.remarksRecommendations}
      documentsReviewed={c.documentsReviewed}
    />
  </View>
);

const EiaComplianceView: React.FC<{ c: Extract<ComplianceView, { kind: 'eia' }> }> = ({ c }) => (
  <View>
    <FormSection icon="list-outline" title="Checklist — Revised DAO 2003-30">
      <ChecklistList items={c.checklistDao200330} />
    </FormSection>

    <FormSection icon="document-text-outline" title="ECC / EMP Conditions">
      <ConditionsList items={c.eccEmpConditions} />
    </FormSection>

    <NarrativeAndDocuments
      otherObservations={c.otherObservations}
      remarksRecommendations={c.remarksRecommendations}
      documentsReviewed={c.documentsReviewed}
    />
  </View>
);

export const ComplianceStatusView: React.FC<ComplianceStatusViewProps> = ({ reportId, compliance, onSaved }) => {
  switch (compliance.kind) {
    case 'water':
      return (
        <WaterComplianceEditSections
          reportId={reportId}
          compliance={compliance}
          onSaved={onSaved}
        />
      );
    case 'hazwaste':
      return <HazwasteComplianceView c={compliance} />;
    case 'air':
      return <AirComplianceView c={compliance} />;
    case 'eia':
      return <EiaComplianceView c={compliance} />;
    default:
      return <EmptyCompliance />;
  }
};
