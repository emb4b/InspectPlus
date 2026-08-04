import React, { useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { database, collections } from '../../../db/database';
import {
  FormSection,
  TextField,
  SelectField,
  DateField,
  RadioGroup,
  DynamicRowTable,
  ChecklistTable,
  YesNoNAToggle,
  CheckboxRow,
  focusInput,
} from '../../../components/form';
import type { DynamicRow, ChecklistValue } from '../../../components/form';
import { SectionEditActions } from '../components/SectionEditActions';
import { useEditableSection } from '../hooks/useEditableSection';
import {
  SimpleTable,
  DetailCard,
  ChecklistList,
  ConditionsList,
  DocumentsChips,
  styles as sharedStyles,
} from '../components/ComplianceReadPrimitives';
import type { WaterComplianceView as WaterComplianceData } from '../hooks/useInspectionReport';
import {
  DAO_2005_10_CHECKLIST,
  DOCUMENTS_REVIEWED_OPTIONS,
  WATER_SOURCE_TYPES,
  WASTEWATER_USE_TYPES,
  WWTP_TYPE_OPTIONS,
  WWTP_CONDITION_OPTIONS,
} from './waterChecklistData';
import {
  WwtpDetailCard,
  WwtpComponentCard,
  SamplingPointCard,
  SamplingParameterRow,
  DpConditionRow,
  PreviousInspectionState,
  emptyWwtpDetail,
  emptyWwtpComponent,
  emptySamplingPoint,
  emptySamplingParameter,
  emptyDpCondition,
} from './waterTypes';
import type { ComplianceWater } from '../../../db/models';

const YES_NO = [
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' },
];

async function patchComplianceWater(complianceId: string, patch: Partial<ComplianceWater>) {
  await database.write(async () => {
    const rec = await collections.complianceWater.find(complianceId);
    await rec.update(r => {
      Object.assign(r, patch);
    });
  });
}

const AddCardButton: React.FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => (
  <TouchableOpacity style={styles.addBtn} activeOpacity={0.7} onPress={onPress}>
    <Ionicons name="add" size={13} color={Colors.green} />
    <Text style={styles.addBtnText}>{label}</Text>
  </TouchableOpacity>
);

// ── Water Sources ───────────────────────────────────────────────────────────

const WaterSourcesSection: React.FC<{
  complianceId: string;
  value: DynamicRow[];
  onSaved: () => void;
}> = ({ complianceId, value, onSaved }) => {
  const section = useEditableSection<DynamicRow[]>({
    value,
    onSave: async rows => {
      await patchComplianceWater(complianceId, {
        waterSources: rows.filter(r => r.source_type?.trim()),
      });
      onSaved();
    },
  });

  return (
    <FormSection
      icon="water-outline"
      title="Water Sources"
      headerRight={
        <SectionEditActions editing={section.editing} saving={section.saving} onStartEdit={section.startEdit} onCancel={section.cancel} onSave={section.save} />
      }>
      {section.editing ? (
        <DynamicRowTable
          columns={[
            { key: 'source_type', label: 'Source Type', width: 140, type: 'select', options: WATER_SOURCE_TYPES },
            { key: 'daily_m3', label: 'Daily Volume (m³)', width: 100, type: 'number', placeholder: '0' },
            { key: 'annual_m3', label: 'Annual Volume (m³)', width: 100, type: 'number', placeholder: '0' },
            { key: 'specify', label: 'Specify', width: 140, placeholder: 'Details' },
          ]}
          rows={section.draft}
          onChange={rows => section.setDraft(rows)}
          addLabel="+ Add Water Source"
        />
      ) : (
        <SimpleTable
          columns={[
            { key: 'source_type', label: 'Source Type' },
            { key: 'daily_m3', label: 'Daily (m³)' },
            { key: 'annual_m3', label: 'Annual (m³)' },
            { key: 'specify', label: 'Specify' },
          ]}
          rows={section.draft}
        />
      )}
      {section.error && <Text style={styles.errorText}>{section.error}</Text>}
    </FormSection>
  );
};

// ── Wastewater Sources ──────────────────────────────────────────────────────

const WastewaterSourcesSection: React.FC<{
  complianceId: string;
  value: DynamicRow[];
  onSaved: () => void;
}> = ({ complianceId, value, onSaved }) => {
  const section = useEditableSection<DynamicRow[]>({
    value,
    onSave: async rows => {
      await patchComplianceWater(complianceId, {
        wastewaterSources: rows.filter(r => r.use_type?.trim()),
      });
      onSaved();
    },
  });

  return (
    <FormSection
      icon="business-outline"
      title="Wastewater Sources"
      headerRight={
        <SectionEditActions editing={section.editing} saving={section.saving} onStartEdit={section.startEdit} onCancel={section.cancel} onSave={section.save} />
      }>
      {section.editing ? (
        <DynamicRowTable
          columns={[
            { key: 'use_type', label: 'Use Type', width: 130, type: 'select', options: WASTEWATER_USE_TYPES },
            { key: 'consumed_m3_day', label: 'Consumed (m³/day)', width: 110, type: 'number', placeholder: '0' },
            { key: 'generated_m3_day', label: 'Generated (m³/day)', width: 110, type: 'number', placeholder: '0' },
            { key: 'outlet_info', label: 'Outlet Info', width: 150, placeholder: 'Outlet No./Location' },
          ]}
          rows={section.draft}
          onChange={rows => section.setDraft(rows)}
          addLabel="+ Add Wastewater Source"
        />
      ) : (
        <SimpleTable
          columns={[
            { key: 'use_type', label: 'Use Type' },
            { key: 'consumed_m3_day', label: 'Consumed (m³/day)' },
            { key: 'generated_m3_day', label: 'Generated (m³/day)' },
            { key: 'outlet_info', label: 'Outlet Info' },
          ]}
          rows={section.draft}
        />
      )}
      {section.error && <Text style={styles.errorText}>{section.error}</Text>}
    </FormSection>
  );
};

// ── Abstracted Water Quality ─────────────────────────────────────────────────

const AbstractedWaterQualitySection: React.FC<{
  complianceId: string;
  value: DynamicRow[];
  onSaved: () => void;
}> = ({ complianceId, value, onSaved }) => {
  const section = useEditableSection<DynamicRow[]>({
    value,
    onSave: async rows => {
      await patchComplianceWater(complianceId, {
        abstractedWaterQuality: rows.filter(r => r.source?.trim()),
      });
      onSaved();
    },
  });

  return (
    <FormSection
      icon="flask-outline"
      title="Abstracted Water Quality"
      headerRight={
        <SectionEditActions editing={section.editing} saving={section.saving} onStartEdit={section.startEdit} onCancel={section.cancel} onSave={section.save} />
      }>
      {section.editing ? (
        <DynamicRowTable
          columns={[
            { key: 'source', label: 'Source', width: 120, placeholder: 'e.g. Deep well' },
            { key: 'bod_cod', label: 'BOD/COD', width: 90, placeholder: 'mg/L' },
            { key: 'tss', label: 'TSS', width: 80, placeholder: 'mg/L' },
            { key: 'avfp', label: 'AVFP', width: 80, placeholder: 'mg/L' },
            { key: 'heavy_metal', label: 'Heavy Metal', width: 110, placeholder: 'mg/L' },
            { key: 'specify', label: 'Specify', width: 120, placeholder: 'Details' },
          ]}
          rows={section.draft}
          onChange={rows => section.setDraft(rows)}
          addLabel="+ Add Water Quality Entry"
        />
      ) : (
        <SimpleTable
          columns={[
            { key: 'source', label: 'Source' },
            { key: 'bod_cod', label: 'BOD/COD' },
            { key: 'tss', label: 'TSS' },
            { key: 'heavy_metal', label: 'Heavy Metal' },
          ]}
          rows={section.draft}
        />
      )}
      {section.error && <Text style={styles.errorText}>{section.error}</Text>}
    </FormSection>
  );
};

// ── Wastewater Treatment Plant (WWTP) ──────────────────────────────────────

interface WwtpFields {
  hasWwtp: boolean | null;
  wwtpType: string | null;
  wwtpCondition: string | null;
  wwtpUnderConstruction: boolean | null;
  wwtpDetails: WwtpDetailCard[];
  wwtpComponents: WwtpComponentCard[];
}

const WwtpSection: React.FC<{
  complianceId: string;
  value: WwtpFields;
  onSaved: () => void;
}> = ({
  complianceId,
  value,
  onSaved,
}) => {
  const fieldRefs = useRef<Record<string, TextInput | null>>({});
  const focus = (key: string) => focusInput(fieldRefs.current[key]);
  const setRef = (key: string) => (el: TextInput | null) => { fieldRefs.current[key] = el; };

  const section = useEditableSection<WwtpFields>({
    value,
    onSave: async fields => {
      await patchComplianceWater(complianceId, {
        hasWwtp: fields.hasWwtp,
        wwtpType: fields.wwtpType || null,
        wwtpDetails: fields.wwtpDetails,
        wwtpComponents: fields.wwtpComponents,
        wwtpCondition: fields.wwtpCondition || null,
        wwtpUnderConstruction: fields.wwtpUnderConstruction,
      });
      onSaved();
    },
  });

  const updateDetail = (i: number, patch: Partial<WwtpDetailCard>) => {
    const rows = section.draft.wwtpDetails.slice();
    rows[i] = { ...rows[i], ...patch };
    section.setDraft(d => ({ ...d, wwtpDetails: rows }));
  };
  const removeDetail = (i: number) => section.setDraft(d => ({ ...d, wwtpDetails: d.wwtpDetails.filter((_, idx) => idx !== i) }));
  const addDetail = () => section.setDraft(d => ({ ...d, wwtpDetails: [...d.wwtpDetails, emptyWwtpDetail(String(d.wwtpDetails.length + 1))] }));

  const updateComponent = (i: number, patch: Partial<WwtpComponentCard>) => {
    const rows = section.draft.wwtpComponents.slice();
    rows[i] = { ...rows[i], ...patch };
    section.setDraft(d => ({ ...d, wwtpComponents: rows }));
  };
  const removeComponent = (i: number) => section.setDraft(d => ({ ...d, wwtpComponents: d.wwtpComponents.filter((_, idx) => idx !== i) }));
  const addComponent = () => section.setDraft(d => ({ ...d, wwtpComponents: [...d.wwtpComponents, emptyWwtpComponent(String(d.wwtpComponents.length + 1))] }));

  return (
    <FormSection
      icon="cog-outline"
      title="Wastewater Treatment Plant (WWTP)"
      headerRight={
        <SectionEditActions editing={section.editing} saving={section.saving} onStartEdit={section.startEdit} onCancel={section.cancel} onSave={section.save} />
      }>
      <View style={styles.row}>
        {section.editing ? (
          <RadioGroup
            label="Has WWTP?"
            options={YES_NO}
            value={section.draft.hasWwtp == null ? null : section.draft.hasWwtp ? 'yes' : 'no'}
            onChange={v => section.setDraft(d => ({ ...d, hasWwtp: v === 'yes' }))}
          />
        ) : (
          <TextField label="Has WWTP?" value={section.draft.hasWwtp == null ? '—' : section.draft.hasWwtp ? 'Yes' : 'No'} readOnly />
        )}
        {section.editing ? (
          <SelectField label="WWTP Type" value={section.draft.wwtpType || ''} options={WWTP_TYPE_OPTIONS} onSelect={v => section.setDraft(d => ({ ...d, wwtpType: v }))} />
        ) : (
          <TextField label="WWTP Type" value={section.draft.wwtpType || '—'} readOnly />
        )}
      </View>
      <View style={styles.row}>
        {section.editing ? (
          <SelectField label="WWTP Condition" value={section.draft.wwtpCondition || ''} options={WWTP_CONDITION_OPTIONS} onSelect={v => section.setDraft(d => ({ ...d, wwtpCondition: v }))} />
        ) : (
          <TextField label="WWTP Condition" value={section.draft.wwtpCondition || '—'} readOnly />
        )}
        {section.editing ? (
          <RadioGroup
            label="Under Construction / Rehabilitation?"
            options={YES_NO}
            value={section.draft.wwtpUnderConstruction == null ? null : section.draft.wwtpUnderConstruction ? 'yes' : 'no'}
            onChange={v => section.setDraft(d => ({ ...d, wwtpUnderConstruction: v === 'yes' }))}
          />
        ) : (
          <TextField
            label="Under Construction?"
            value={section.draft.wwtpUnderConstruction == null ? '—' : section.draft.wwtpUnderConstruction ? 'Yes' : 'No'}
            readOnly
          />
        )}
      </View>

      <Text style={sharedStyles.subTitle}>WWTP Details (per outlet)</Text>
      {section.draft.wwtpDetails.length === 0 && !section.editing && (
        <Text style={sharedStyles.emptyText}>No WWTP outlet details recorded.</Text>
      )}
      {section.draft.wwtpDetails.map((d, i) => {
        const k = (field: string) => `wwtpDetail:${i}:${field}`;
        return section.editing ? (
          <View key={i} style={styles.editCard}>
            <View style={styles.editCardHeader}>
              <Text style={styles.editCardTitle}>Outlet {d.outletNo}</Text>
              <TouchableOpacity onPress={() => removeDetail(i)}>
                <Ionicons name="trash-outline" size={16} color={Colors.conflict} />
              </TouchableOpacity>
            </View>
            <View style={styles.row}>
              <TextField
                ref={setRef(k('outletNo'))}
                label="Outlet No."
                value={d.outletNo}
                onChangeText={t => updateDetail(i, { outletNo: t })}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => focus(k('wwtpDetail'))}

              />
              <TextField
                ref={setRef(k('wwtpDetail'))}
                label="WWTP Detail"
                value={d.wwtpDetail}
                onChangeText={t => updateDetail(i, { wwtpDetail: t })}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => focus(k('dateOfInstallation'))}

              />
            </View>
            <View style={styles.row}>
              <DateField
                ref={setRef(k('dateOfInstallation'))}
                label="Date of Installation"
                value={d.dateOfInstallation}
                onChange={t => updateDetail(i, { dateOfInstallation: t })}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => focus(k('designCapacity'))}

              />
              <TextField
                ref={setRef(k('designCapacity'))}
                label="Design Capacity"
                value={d.designCapacity}
                onChangeText={t => updateDetail(i, { designCapacity: t })}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => focus(k('annualMaintenanceCost'))}

              />
            </View>
            <View style={styles.row}>
              <TextField
                ref={setRef(k('annualMaintenanceCost'))}
                label="Annual Maintenance Cost"
                value={d.annualMaintenanceCost}
                onChangeText={t => updateDetail(i, { annualMaintenanceCost: t })}
                keyboardType="numeric"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => focus(k('outletLocation'))}

              />
              <TextField
                ref={setRef(k('outletLocation'))}
                label="Outlet Location"
                value={d.outletLocation}
                onChangeText={t => updateDetail(i, { outletLocation: t })}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => focus(k('receivingBodyOfWater'))}

              />
            </View>
            <View style={styles.row}>
              <TextField
                ref={setRef(k('receivingBodyOfWater'))}
                label="Receiving Body of Water"
                value={d.receivingBodyOfWater}
                onChangeText={t => updateDetail(i, { receivingBodyOfWater: t })}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => focus(k('flowMeterDevice'))}

              />
              <TextField
                ref={setRef(k('flowMeterDevice'))}
                label="Flow Meter Device"
                value={d.flowMeterDevice}
                onChangeText={t => updateDetail(i, { flowMeterDevice: t })}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => focus(k('flowRate'))}

              />
            </View>
            <View style={styles.row}>
              <TextField
                ref={setRef(k('flowRate'))}
                label="Flow Rate"
                value={d.flowRate}
                onChangeText={t => updateDetail(i, { flowRate: t })}
                returnKeyType="done"

              />
            </View>
          </View>
        ) : (
          <DetailCard
            key={i}
            title={`Outlet ${d.outletNo}`}
            fields={[
              { label: 'WWTP Detail', value: d.wwtpDetail },
              { label: 'Date of Installation', value: d.dateOfInstallation },
              { label: 'Design Capacity', value: d.designCapacity },
              { label: 'Annual Maintenance Cost', value: d.annualMaintenanceCost },
              { label: 'Outlet Location', value: d.outletLocation },
              { label: 'Receiving Body of Water', value: d.receivingBodyOfWater },
              { label: 'Flow Meter Device', value: d.flowMeterDevice },
              { label: 'Flow Rate', value: d.flowRate },
            ]}
          />
        );
      })}
      {section.editing && <AddCardButton label="+ Add WWTP Outlet Detail" onPress={addDetail} />}

      <Text style={[sharedStyles.subTitle, sharedStyles.subTitleSpaced]}>WWTP Treatment Components (per outlet)</Text>
      {section.draft.wwtpComponents.length === 0 && !section.editing && (
        <Text style={sharedStyles.emptyText}>No treatment components recorded.</Text>
      )}
      {section.draft.wwtpComponents.map((c, i) => {
        const k = (field: string) => `wwtpComponent:${i}:${field}`;
        return section.editing ? (
          <View key={i} style={styles.editCard}>
            <View style={styles.editCardHeader}>
              <Text style={styles.editCardTitle}>Outlet {c.outletNo}</Text>
              <TouchableOpacity onPress={() => removeComponent(i)}>
                <Ionicons name="trash-outline" size={16} color={Colors.conflict} />
              </TouchableOpacity>
            </View>
            <View style={styles.row}>
              <TextField
                ref={setRef(k('outletNo'))}
                label="Outlet No."
                value={c.outletNo}
                onChangeText={t => updateComponent(i, { outletNo: t })}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => focus(k('primaryTreatment'))}

              />
              <TextField
                ref={setRef(k('primaryTreatment'))}
                label="Primary Treatment"
                value={c.primaryTreatment}
                onChangeText={t => updateComponent(i, { primaryTreatment: t })}
                hint="Comma-separated"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => focus(k('biologicalTreatment'))}

              />
            </View>
            <View style={styles.row}>
              <TextField
                ref={setRef(k('biologicalTreatment'))}
                label="Biological Treatment"
                value={c.biologicalTreatment}
                onChangeText={t => updateComponent(i, { biologicalTreatment: t })}
                hint="Comma-separated"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => focus(k('chemicalTreatment'))}

              />
              <TextField
                ref={setRef(k('chemicalTreatment'))}
                label="Chemical Treatment"
                value={c.chemicalTreatment}
                onChangeText={t => updateComponent(i, { chemicalTreatment: t })}
                hint="Comma-separated"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => focus(k('otherTreatment'))}

              />
            </View>
            <View style={styles.row}>
              <TextField
                ref={setRef(k('otherTreatment'))}
                label="Other Treatment"
                value={c.otherTreatment}
                onChangeText={t => updateComponent(i, { otherTreatment: t })}
                returnKeyType="done"

              />
            </View>
          </View>
        ) : (
          <DetailCard
            key={i}
            title={`Outlet ${c.outletNo}`}
            fields={[
              { label: 'Primary Treatment', value: c.primaryTreatment },
              { label: 'Biological Treatment', value: c.biologicalTreatment },
              { label: 'Chemical Treatment', value: c.chemicalTreatment },
              { label: 'Other Treatment', value: c.otherTreatment },
            ]}
          />
        );
      })}
      {section.editing && <AddCardButton label="+ Add WWTP Treatment Components" onPress={addComponent} />}
      {section.error && <Text style={styles.errorText}>{section.error}</Text>}
    </FormSection>
  );
};

// ── Sampling Points ─────────────────────────────────────────────────────────

const SamplingPointsSection: React.FC<{
  complianceId: string;
  value: SamplingPointCard[];
  onSaved: () => void;
}> = ({
  complianceId,
  value,
  onSaved,
}) => {
  const fieldRefs = useRef<Record<string, TextInput | null>>({});
  const focus = (key: string) => focusInput(fieldRefs.current[key]);
  const setRef = (key: string) => (el: TextInput | null) => { fieldRefs.current[key] = el; };

  const section = useEditableSection<SamplingPointCard[]>({
    value,
    onSave: async samplingPoints => {
      await patchComplianceWater(complianceId, { samplingPoints });
      onSaved();
    },
  });

  const updatePoint = (i: number, patch: Partial<SamplingPointCard>) => {
    const rows = section.draft.slice();
    rows[i] = { ...rows[i], ...patch };
    section.setDraft(rows);
  };
  const removePoint = (i: number) => section.setDraft(section.draft.filter((_, idx) => idx !== i));
  const addPoint = () => section.setDraft([...section.draft, emptySamplingPoint(String(section.draft.length + 1))]);

  const addParameter = (pointIndex: number) => {
    const rows = section.draft.slice();
    rows[pointIndex] = { ...rows[pointIndex], parameters: [...rows[pointIndex].parameters, emptySamplingParameter()] };
    section.setDraft(rows);
  };
  const updateParameter = (pointIndex: number, paramIndex: number, patch: Partial<SamplingParameterRow>) => {
    const rows = section.draft.slice();
    const params = rows[pointIndex].parameters.slice();
    params[paramIndex] = { ...params[paramIndex], ...patch };
    rows[pointIndex] = { ...rows[pointIndex], parameters: params };
    section.setDraft(rows);
  };
  const removeParameter = (pointIndex: number, paramIndex: number) => {
    const rows = section.draft.slice();
    rows[pointIndex] = { ...rows[pointIndex], parameters: rows[pointIndex].parameters.filter((_, idx) => idx !== paramIndex) };
    section.setDraft(rows);
  };

  if (section.draft.length === 0 && !section.editing) {
    return null;
  }

  return (
    <FormSection
      icon="stats-chart-outline"
      title="Sampling Points"
      headerRight={
        <SectionEditActions editing={section.editing} saving={section.saving} onStartEdit={section.startEdit} onCancel={section.cancel} onSave={section.save} />
      }>
      {section.draft.map((pt, i) => {
        const k = (field: string) => `samplingPoint:${i}:${field}`;
        const pk = (pi: number, field: string) => `samplingParam:${i}:${pi}:${field}`;
        return section.editing ? (
          <View key={i} style={styles.editCard}>
            <View style={styles.editCardHeader}>
              <Text style={styles.editCardTitle}>Point {pt.pointNo}</Text>
              <TouchableOpacity onPress={() => removePoint(i)}>
                <Ionicons name="trash-outline" size={16} color={Colors.conflict} />
              </TouchableOpacity>
            </View>
            <View style={styles.row}>
              <TextField
                ref={setRef(k('pointNo'))}
                label="Point No."
                value={pt.pointNo}
                onChangeText={t => updatePoint(i, { pointNo: t })}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => focus(k('samplingStation'))}

              />
              <TextField
                ref={setRef(k('samplingStation'))}
                label="Sampling Station"
                value={pt.samplingStation}
                onChangeText={t => updatePoint(i, { samplingStation: t })}
                placeholder="e.g. Influent"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => focus(k('samplingTime'))}

              />
            </View>
            <View style={styles.row}>
              <TextField
                ref={setRef(k('samplingTime'))}
                label="Sampling Time"
                value={pt.samplingTime}
                onChangeText={t => updatePoint(i, { samplingTime: t })}
                placeholder="e.g. 9:00 AM"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => focus(k('typeOfSample'))}

              />
              <TextField
                ref={setRef(k('typeOfSample'))}
                label="Sample Type"
                value={pt.typeOfSample}
                onChangeText={t => updatePoint(i, { typeOfSample: t })}
                placeholder="Grab / Composite"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => focus(k('remarks'))}

              />
            </View>
            <View style={styles.row}>
              <TextField
                ref={setRef(k('remarks'))}
                label="Remarks"
                value={pt.remarks}
                onChangeText={t => updatePoint(i, { remarks: t })}
                returnKeyType={pt.parameters.length > 0 ? 'next' : 'done'}
                blurOnSubmit={pt.parameters.length === 0}
                onSubmitEditing={() => focus(pk(0, 'name'))}

              />
            </View>

            <Text style={styles.paramHeading}>Parameters</Text>
            {pt.parameters.map((param, pi) => {
              const isLastParam = pi === pt.parameters.length - 1;
              return (
                <View key={pi} style={styles.paramEditRow}>
                  <View style={styles.paramTopLine}>
                    <TextInput
                      ref={setRef(pk(pi, 'name'))}
                      style={styles.paramNameInput}
                      value={param.parameterName}
                      onChangeText={t => updateParameter(i, pi, { parameterName: t })}
                      placeholder="Parameter name"
                      placeholderTextColor={Colors.textLight}
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => focus(pk(pi, 'value'))}

                    />
                    <YesNoNAToggle value={param.compliant} onChange={c => updateParameter(i, pi, { compliant: c })} />
                    <TouchableOpacity onPress={() => removeParameter(i, pi)}>
                      <Ionicons name="close-circle" size={18} color={Colors.conflict} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.paramFieldsRow}>
                    <TextInput
                      ref={setRef(pk(pi, 'value'))}
                      style={styles.paramSmallInput}
                      value={param.value}
                      onChangeText={t => updateParameter(i, pi, { value: t })}
                      placeholder="Value"
                      placeholderTextColor={Colors.textLight}
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => focus(pk(pi, 'unit'))}

                    />
                    <TextInput
                      ref={setRef(pk(pi, 'unit'))}
                      style={styles.paramSmallInput}
                      value={param.unit}
                      onChangeText={t => updateParameter(i, pi, { unit: t })}
                      placeholder="Unit"
                      placeholderTextColor={Colors.textLight}
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => focus(pk(pi, 'standard'))}

                    />
                    <TextInput
                      ref={setRef(pk(pi, 'standard'))}
                      style={styles.paramSmallInput}
                      value={param.denrStandard}
                      onChangeText={t => updateParameter(i, pi, { denrStandard: t })}
                      placeholder="DENR Standard"
                      placeholderTextColor={Colors.textLight}
                      returnKeyType={isLastParam ? 'done' : 'next'}
                      blurOnSubmit={isLastParam}
                      onSubmitEditing={() => focus(pk(pi + 1, 'name'))}

                    />
                  </View>
                </View>
              );
            })}
            <AddCardButton label="+ Add Parameter" onPress={() => addParameter(i)} />
          </View>
        ) : (
          <View key={i} style={sharedStyles.samplingCard}>
            <Text style={sharedStyles.detailCardTitle}>Point {pt.pointNo} — {pt.samplingStation || '—'}</Text>
            <Text style={sharedStyles.samplingMeta}>{pt.samplingTime || '—'} · {pt.typeOfSample || '—'}</Text>
            {!!pt.remarks && <Text style={sharedStyles.checklistRemarks}>{pt.remarks}</Text>}
            {pt.parameters.map((param, pi) => (
              <View key={pi} style={sharedStyles.paramRow}>
                <View style={sharedStyles.checklistTopLine}>
                  <Text style={sharedStyles.checklistRequirement}>{param.parameterName || '—'}</Text>
                  <Text style={styles.paramValueText}>{param.value} {param.unit}</Text>
                </View>
                <Text style={sharedStyles.checklistRef}>Standard: {param.denrStandard || '—'}</Text>
              </View>
            ))}
          </View>
        );
      })}
      {section.editing && <AddCardButton label="+ Add Sampling Point" onPress={addPoint} />}
      {section.error && <Text style={styles.errorText}>{section.error}</Text>}
    </FormSection>
  );
};

// ── Previous Inspection Summary ─────────────────────────────────────────────

const PreviousInspectionSection: React.FC<{
  complianceId: string;
  value: PreviousInspectionState;
  onSaved: () => void;
}> = ({ complianceId, value, onSaved }) => {
  const fieldRefs = useRef<Record<string, TextInput | null>>({});
  const focus = (key: string) => focusInput(fieldRefs.current[key]);
  const setRef = (key: string) => (el: TextInput | null) => { fieldRefs.current[key] = el; };

  const section = useEditableSection<PreviousInspectionState>({
    value,
    onSave: async fields => {
      await patchComplianceWater(complianceId, {
        previousInspectionSummary: fields.dateOfSampling ? fields : {},
      });
      onSaved();
    },
  });

  const addParameter = () =>
    section.setDraft(d => ({ ...d, parameters: [...d.parameters, emptySamplingParameter()] }));
  const updateParameter = (i: number, patch: Partial<SamplingParameterRow>) => {
    const params = section.draft.parameters.slice();
    params[i] = { ...params[i], ...patch };
    section.setDraft(d => ({ ...d, parameters: params }));
  };
  const removeParameter = (i: number) =>
    section.setDraft(d => ({ ...d, parameters: d.parameters.filter((_, idx) => idx !== i) }));

  const hasData = !!section.draft.dateOfSampling || section.draft.parameters.length > 0;

  return (
    <FormSection
      icon="time-outline"
      title="Previous Inspection Summary"
      headerRight={
        <SectionEditActions editing={section.editing} saving={section.saving} onStartEdit={section.startEdit} onCancel={section.cancel} onSave={section.save} />
      }>
      {!hasData && !section.editing ? (
        <Text style={sharedStyles.emptyText}>No previous inspection summary recorded.</Text>
      ) : (
        <>
          <View style={styles.row}>
            {section.editing ? (
              <DateField
                ref={setRef('dateOfSampling')}
                label="Date of Sampling"
                value={section.draft.dateOfSampling}
                onChange={t => section.setDraft(d => ({ ...d, dateOfSampling: t }))}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => focus('samplingStation')}
              />
            ) : (
              <TextField label="Date of Sampling" value={section.draft.dateOfSampling || '—'} readOnly />
            )}
            <TextField
              ref={setRef('samplingStation')}
              label="Sampling Station"
              value={section.draft.samplingStation}
              readOnly={!section.editing}
              onChangeText={t => section.setDraft(d => ({ ...d, samplingStation: t }))}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => focus('samplingTime')}
            />
          </View>
          <View style={styles.row}>
            <TextField
              ref={setRef('samplingTime')}
              label="Sampling Time"
              value={section.draft.samplingTime}
              readOnly={!section.editing}
              onChangeText={t => section.setDraft(d => ({ ...d, samplingTime: t }))}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => focus('typeOfSample')}
            />
            <TextField
              ref={setRef('typeOfSample')}
              label="Sample Type"
              value={section.draft.typeOfSample}
              readOnly={!section.editing}
              onChangeText={t => section.setDraft(d => ({ ...d, typeOfSample: t }))}
              returnKeyType="done"
            />
          </View>

          <Text style={styles.paramHeading}>Parameters</Text>
          {section.editing ? (
            <>
              {section.draft.parameters.map((param, pi) => {
                const isLastParam = pi === section.draft.parameters.length - 1;
                const pk = (field: string) => `prevparam:${pi}:${field}`;
                return (
                  <View key={pi} style={styles.paramEditRow}>
                    <View style={styles.paramTopLine}>
                      <TextInput
                        ref={setRef(pk('name'))}
                        style={styles.paramNameInput}
                        value={param.parameterName}
                        onChangeText={t => updateParameter(pi, { parameterName: t })}
                        placeholder="Parameter name"
                        placeholderTextColor={Colors.textLight}
                        returnKeyType="next"
                        blurOnSubmit={false}
                        onSubmitEditing={() => focus(pk('value'))}

                      />
                      <YesNoNAToggle value={param.compliant} onChange={c => updateParameter(pi, { compliant: c })} />
                      <TouchableOpacity onPress={() => removeParameter(pi)}>
                        <Ionicons name="close-circle" size={18} color={Colors.conflict} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.paramFieldsRow}>
                      <TextInput
                        ref={setRef(pk('value'))}
                        style={styles.paramSmallInput}
                        value={param.value}
                        onChangeText={t => updateParameter(pi, { value: t })}
                        placeholder="Value"
                        placeholderTextColor={Colors.textLight}
                        returnKeyType="next"
                        blurOnSubmit={false}
                        onSubmitEditing={() => focus(pk('unit'))}

                      />
                      <TextInput
                        ref={setRef(pk('unit'))}
                        style={styles.paramSmallInput}
                        value={param.unit}
                        onChangeText={t => updateParameter(pi, { unit: t })}
                        placeholder="Unit"
                        placeholderTextColor={Colors.textLight}
                        returnKeyType="next"
                        blurOnSubmit={false}
                        onSubmitEditing={() => focus(pk('standard'))}

                      />
                      <TextInput
                        ref={setRef(pk('standard'))}
                        style={styles.paramSmallInput}
                        value={param.denrStandard}
                        onChangeText={t => updateParameter(pi, { denrStandard: t })}
                        placeholder="DENR Standard"
                        placeholderTextColor={Colors.textLight}
                        returnKeyType={isLastParam ? 'done' : 'next'}
                        blurOnSubmit={isLastParam}
                        onSubmitEditing={() => focus(`prevparam:${pi + 1}:name`)}

                      />
                    </View>
                  </View>
                );
              })}
              <AddCardButton label="+ Add Parameter" onPress={addParameter} />
            </>
          ) : (
            section.draft.parameters.map((param, pi) => (
              <View key={pi} style={sharedStyles.paramRow}>
                <View style={sharedStyles.checklistTopLine}>
                  <Text style={sharedStyles.checklistRequirement}>{param.parameterName || '—'}</Text>
                  <Text style={styles.paramValueText}>{param.value} {param.unit}</Text>
                </View>
                <Text style={sharedStyles.checklistRef}>Standard: {param.denrStandard || '—'}</Text>
              </View>
            ))
          )}
        </>
      )}
      {section.error && <Text style={styles.errorText}>{section.error}</Text>}
    </FormSection>
  );
};

// ── Checklist — DAO 2005-10 ─────────────────────────────────────────────────

const ChecklistSection: React.FC<{
  complianceId: string;
  value: ChecklistValue[];
  onSaved: () => void;
}> = ({
  complianceId,
  value,
  onSaved,
}) => {
  const section = useEditableSection<ChecklistValue[]>({
    value,
    onSave: async fields => {
      await patchComplianceWater(complianceId, {
        checklistDao200510: fields.map((v, i) => ({
          legal_ref: `Section ${i + 3}`,
          compliant: v.compliant,
          remarks: v.remarks,
        })),
      });
      onSaved();
    },
  });

  return (
    <FormSection
      icon="list-outline"
      title="Checklist — DAO 2005-10 (Water Quality)"
      headerRight={
        <SectionEditActions editing={section.editing} saving={section.saving} onStartEdit={section.startEdit} onCancel={section.cancel} onSave={section.save} />
      }>
      {section.editing ? (
        <ChecklistTable
          items={DAO_2005_10_CHECKLIST}
          values={section.draft}
          onChange={(i, patch) => {
            const rows = section.draft.slice();
            rows[i] = { ...rows[i], ...patch };
            section.setDraft(rows);
          }}
        />
      ) : (
        <ChecklistList
          items={DAO_2005_10_CHECKLIST.map((def, i) => ({
            legal_ref: def.ref,
            requirement: def.requirement,
            compliant: section.draft[i]?.compliant ?? null,
            remarks: section.draft[i]?.remarks ?? null,
          }))}
        />
      )}
      {section.error && <Text style={styles.errorText}>{section.error}</Text>}
    </FormSection>
  );
};

// ── Discharge Permit Conditions ────────────────────────────────────────────

const DpConditionsSection: React.FC<{
  complianceId: string;
  value: DpConditionRow[];
  onSaved: () => void;
}> = ({
  complianceId,
  value,
  onSaved,
}) => {
  const fieldRefs = useRef<Record<string, TextInput | null>>({});
  const focus = (key: string) => focusInput(fieldRefs.current[key]);
  const setRef = (key: string) => (el: TextInput | null) => { fieldRefs.current[key] = el; };

  const section = useEditableSection<DpConditionRow[]>({
    value,
    onSave: async fields => {
      await patchComplianceWater(complianceId, {
        dpConditions: fields.filter(c => c.description?.trim()),
      });
      onSaved();
    },
  });

  const updateCondition = (i: number, patch: Partial<DpConditionRow>) => {
    const rows = section.draft.slice();
    rows[i] = { ...rows[i], ...patch };
    section.setDraft(rows);
  };
  const removeCondition = (i: number) => section.setDraft(section.draft.filter((_, idx) => idx !== i));
  const addCondition = () => section.setDraft([...section.draft, emptyDpCondition(String(section.draft.length + 1))]);

  return (
    <FormSection
      icon="document-text-outline"
      title="Discharge Permit Conditions"
      headerRight={
        <SectionEditActions editing={section.editing} saving={section.saving} onStartEdit={section.startEdit} onCancel={section.cancel} onSave={section.save} />
      }>
      {section.editing ? (
        <>
          {section.draft.map((c, i) => {
            const isLast = i === section.draft.length - 1;
            const k = (field: string) => `dp:${i}:${field}`;
            return (
              <View key={i} style={styles.dpRow}>
                <View style={styles.dpTopLine}>
                  <TextInput
                    ref={setRef(k('no'))}
                    style={styles.dpConditionNo}
                    value={c.conditionNo}
                    onChangeText={t => updateCondition(i, { conditionNo: t })}
                    placeholder="No."
                    placeholderTextColor={Colors.textLight}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => focus(k('desc'))}

                  />
                  <TextInput
                    ref={setRef(k('desc'))}
                    style={styles.dpDescription}
                    value={c.description}
                    onChangeText={t => updateCondition(i, { description: t })}
                    placeholder="Condition description"
                    placeholderTextColor={Colors.textLight}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => focus(k('remarks'))}

                  />
                  <YesNoNAToggle value={c.compliant} onChange={v => updateCondition(i, { compliant: v })} />
                  <TouchableOpacity onPress={() => removeCondition(i)}>
                    <Ionicons name="close-circle" size={18} color={Colors.conflict} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  ref={setRef(k('remarks'))}
                  style={styles.dpRemarks}
                  value={c.remarks}
                  onChangeText={t => updateCondition(i, { remarks: t })}
                  placeholder="Remarks"
                  placeholderTextColor={Colors.textLight}
                  returnKeyType={isLast ? 'done' : 'next'}
                  blurOnSubmit={isLast}
                  onSubmitEditing={() => focus(`dp:${i + 1}:no`)}

                />
              </View>
            );
          })}
          <AddCardButton label="+ Add Condition" onPress={addCondition} />
        </>
      ) : (
        <ConditionsList
          items={section.draft.map(c => ({
            condition_no: c.conditionNo,
            description: c.description,
            compliant: c.compliant,
            remarks: c.remarks,
          }))}
        />
      )}
      {section.error && <Text style={styles.errorText}>{section.error}</Text>}
    </FormSection>
  );
};

// ── Observations & Recommendations ─────────────────────────────────────────

interface ObservationsFields {
  otherObservations: string;
  remarksRecommendations: string;
  documentsReviewed: string[];
}

const ObservationsSection: React.FC<{
  complianceId: string;
  value: ObservationsFields;
  onSaved: () => void;
}> = ({
  complianceId,
  value,
  onSaved,
}) => {
  const observationsRef = useRef<TextInput>(null);
  const remarksRef = useRef<TextInput>(null);

  const section = useEditableSection<ObservationsFields>({
    value,
    onSave: async fields => {
      await patchComplianceWater(complianceId, {
        otherObservations: fields.otherObservations.trim() || null,
        remarksRecommendations: fields.remarksRecommendations.trim() || null,
        documentsReviewed: fields.documentsReviewed,
      });
      onSaved();
    },
  });

  const toggleDocument = (doc: string) => {
    const has = section.draft.documentsReviewed.includes(doc);
    section.setDraft(d => ({
      ...d,
      documentsReviewed: has ? d.documentsReviewed.filter(x => x !== doc) : [...d.documentsReviewed, doc],
    }));
  };

  return (
    <FormSection
      icon="clipboard-outline"
      title="Observations & Recommendations"
      headerRight={
        <SectionEditActions editing={section.editing} saving={section.saving} onStartEdit={section.startEdit} onCancel={section.cancel} onSave={section.save} />
      }>
      <TextField
        ref={observationsRef}
        label="Other Observations"
        value={section.draft.otherObservations}
        readOnly={!section.editing}
        onChangeText={t => section.setDraft(d => ({ ...d, otherObservations: t }))}
        multiline
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => focusInput(remarksRef.current)}

      />
      <TextField
        ref={remarksRef}
        label="Remarks & Recommendations"
        value={section.draft.remarksRecommendations}
        readOnly={!section.editing}
        onChangeText={t => section.setDraft(d => ({ ...d, remarksRecommendations: t }))}
        multiline
        returnKeyType="done"

      />
      <Text style={sharedStyles.docsLabel}>Documents Reviewed</Text>
      {section.editing ? (
        <View style={styles.docsGrid}>
          {DOCUMENTS_REVIEWED_OPTIONS.map(doc => (
            <View key={doc} style={styles.docItem}>
              <CheckboxRow label={doc} checked={section.draft.documentsReviewed.includes(doc)} onToggle={() => toggleDocument(doc)} />
            </View>
          ))}
        </View>
      ) : (
        <DocumentsChips documents={section.draft.documentsReviewed} />
      )}
      {section.error && <Text style={styles.errorText}>{section.error}</Text>}
    </FormSection>
  );
};

// ── Top-level ─────────────────────────────────────────────────────────────

interface WaterComplianceEditSectionsProps {
  reportId: string;
  compliance: WaterComplianceData;
  onSaved: () => void;
}

export const WaterComplianceEditSections: React.FC<WaterComplianceEditSectionsProps> = ({ compliance, onSaved }) => {
  const checklistValues: ChecklistValue[] = DAO_2005_10_CHECKLIST.map((_, i) => ({
    compliant: compliance.checklistDao200510[i]?.compliant ?? null,
    remarks: compliance.checklistDao200510[i]?.remarks ?? '',
  }));

  return (
    <View>
      <WaterSourcesSection
        complianceId={compliance.complianceId}
        value={compliance.waterSources as DynamicRow[]}
        onSaved={onSaved}
      />
      <WastewaterSourcesSection
        complianceId={compliance.complianceId}
        value={compliance.wastewaterSources as DynamicRow[]}
        onSaved={onSaved}
      />
      <AbstractedWaterQualitySection
        complianceId={compliance.complianceId}
        value={compliance.abstractedWaterQuality as DynamicRow[]}
        onSaved={onSaved}
      />
      <WwtpSection
        complianceId={compliance.complianceId}
        value={{
          hasWwtp: compliance.hasWwtp,
          wwtpType: compliance.wwtpType,
          wwtpCondition: compliance.wwtpCondition,
          wwtpUnderConstruction: compliance.wwtpUnderConstruction,
          wwtpDetails: compliance.wwtpDetails,
          wwtpComponents: compliance.wwtpComponents,
        }}
        onSaved={onSaved}
      />
      <SamplingPointsSection complianceId={compliance.complianceId} value={compliance.samplingPoints} onSaved={onSaved} />
      <PreviousInspectionSection
        complianceId={compliance.complianceId}
        value={compliance.previousInspectionSummary}
        onSaved={onSaved}
      />
      <ChecklistSection complianceId={compliance.complianceId} value={checklistValues} onSaved={onSaved} />
      <DpConditionsSection complianceId={compliance.complianceId} value={compliance.dpConditions} onSaved={onSaved} />
      <ObservationsSection
        complianceId={compliance.complianceId}
        value={{
          otherObservations: compliance.otherObservations || '',
          remarksRecommendations: compliance.remarksRecommendations || '',
          documentsReviewed: compliance.documentsReviewed,
        }}
        onSaved={onSaved}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 14,
  },
  errorText: {
    fontSize: 11.5,
    color: Colors.conflict,
    marginTop: 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: Colors.greenLight,
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.green,
  },
  editCard: {
    backgroundColor: Colors.bgMuted,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  editCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  editCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
  },
  paramHeading: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 6,
    marginBottom: 6,
  },
  paramEditRow: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  paramTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  paramNameInput: {
    flex: 1,
    fontSize: 12,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  paramFieldsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  paramSmallInput: {
    flex: 1,
    fontSize: 11.5,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  paramValueText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  dpRow: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  dpTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  dpConditionNo: {
    width: 40,
    fontSize: 12,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 6,
    textAlign: 'center',
  },
  dpDescription: {
    flex: 1,
    fontSize: 12,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  dpRemarks: {
    fontSize: 12,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  docsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  docItem: {
    width: '48%',
  },
});
