import React, { useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import {
  FormSection,
  TextField,
  SelectField,
  DateField,
  RadioGroup,
  YesNoNAToggle,
  DynamicRowTable,
  ChecklistTable,
  CheckboxRow,
  focusInput,
} from '../../../components/form';
import {
  DAO_2005_10_CHECKLIST,
  DOCUMENTS_REVIEWED_OPTIONS,
  WATER_SOURCE_TYPES,
  WASTEWATER_USE_TYPES,
  WWTP_TYPE_OPTIONS,
  WWTP_CONDITION_OPTIONS,
} from './waterChecklistData';
import {
  WaterComplianceFormState,
  emptySamplingPoint,
  emptySamplingParameter,
  emptyWwtpDetail,
  emptyWwtpComponent,
  emptyDpCondition,
  SamplingParameterRow,
} from './waterTypes';
import type { WaterMainTabDef } from './waterReportTabs';

const YES_NO = [
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' },
];

interface WaterExtraFormSectionsViewProps {
  value: WaterComplianceFormState;
  onChange: (value: WaterComplianceFormState) => void;
  mainTab: WaterMainTabDef;
}

// Renders every subsection of the active main tab in template order, top to
// bottom, each headed by its marker (A-E or I-V) — sections 4 (water
// supply), 5 (wastewater pollution), and 6 (sampling and compliance
// findings) of the water report's create form. See waterReportTabs.ts for
// the tab structure and its view-mode counterpart, WaterExtraSectionsView
// in WaterComplianceEditSections.tsx.
export const WaterExtraFormSectionsView: React.FC<WaterExtraFormSectionsViewProps> = ({
  value,
  onChange,
  mainTab,
}) => {
  const fieldRefs = useRef<Record<string, TextInput | null>>({});
  const focus = (key: string) => focusInput(fieldRefs.current[key]);
  const setRef = (key: string) => (el: TextInput | null) => { fieldRefs.current[key] = el; };

  const set = <K extends keyof WaterComplianceFormState>(key: K, v: WaterComplianceFormState[K]) =>
    onChange({ ...value, [key]: v });

  // ── WWTP details / components card helpers ─────────────────────────────────
  const addWwtpDetail = () =>
    set('wwtpDetails', [...value.wwtpDetails, emptyWwtpDetail(String(value.wwtpDetails.length + 1))]);
  const updateWwtpDetail = (i: number, patch: Partial<typeof value.wwtpDetails[number]>) => {
    const rows = value.wwtpDetails.slice();
    rows[i] = { ...rows[i], ...patch };
    set('wwtpDetails', rows);
  };
  const removeWwtpDetail = (i: number) => set('wwtpDetails', value.wwtpDetails.filter((_, idx) => idx !== i));

  const addWwtpComponent = () =>
    set('wwtpComponents', [...value.wwtpComponents, emptyWwtpComponent(String(value.wwtpComponents.length + 1))]);
  const updateWwtpComponent = (i: number, patch: Partial<typeof value.wwtpComponents[number]>) => {
    const rows = value.wwtpComponents.slice();
    rows[i] = { ...rows[i], ...patch };
    set('wwtpComponents', rows);
  };
  const removeWwtpComponent = (i: number) => set('wwtpComponents', value.wwtpComponents.filter((_, idx) => idx !== i));

  // ── Sampling points + nested parameters ─────────────────────────────────────
  const addSamplingPoint = () =>
    set('samplingPoints', [...value.samplingPoints, emptySamplingPoint(String(value.samplingPoints.length + 1))]);
  const updateSamplingPoint = (i: number, patch: Partial<typeof value.samplingPoints[number]>) => {
    const rows = value.samplingPoints.slice();
    rows[i] = { ...rows[i], ...patch };
    set('samplingPoints', rows);
  };
  const removeSamplingPoint = (i: number) => set('samplingPoints', value.samplingPoints.filter((_, idx) => idx !== i));

  const addParameter = (pointIndex: number) => {
    const rows = value.samplingPoints.slice();
    rows[pointIndex] = {
      ...rows[pointIndex],
      parameters: [...rows[pointIndex].parameters, emptySamplingParameter()],
    };
    set('samplingPoints', rows);
  };
  const updateParameter = (pointIndex: number, paramIndex: number, patch: Partial<SamplingParameterRow>) => {
    const rows = value.samplingPoints.slice();
    const params = rows[pointIndex].parameters.slice();
    params[paramIndex] = { ...params[paramIndex], ...patch };
    rows[pointIndex] = { ...rows[pointIndex], parameters: params };
    set('samplingPoints', rows);
  };
  const removeParameter = (pointIndex: number, paramIndex: number) => {
    const rows = value.samplingPoints.slice();
    rows[pointIndex] = {
      ...rows[pointIndex],
      parameters: rows[pointIndex].parameters.filter((_, idx) => idx !== paramIndex),
    };
    set('samplingPoints', rows);
  };

  // ── Previous inspection summary parameters ─────────────────────────────────
  const addPrevParameter = () =>
    set('previousInspection', {
      ...value.previousInspection,
      parameters: [...value.previousInspection.parameters, emptySamplingParameter()],
    });
  const updatePrevParameter = (i: number, patch: Partial<SamplingParameterRow>) => {
    const params = value.previousInspection.parameters.slice();
    params[i] = { ...params[i], ...patch };
    set('previousInspection', { ...value.previousInspection, parameters: params });
  };
  const removePrevParameter = (i: number) =>
    set('previousInspection', {
      ...value.previousInspection,
      parameters: value.previousInspection.parameters.filter((_, idx) => idx !== i),
    });

  // ── DP conditions ────────────────────────────────────────────────────────────
  const addDpCondition = () =>
    set('dpConditions', [...value.dpConditions, emptyDpCondition(String(value.dpConditions.length + 1))]);
  const updateDpCondition = (i: number, patch: Partial<typeof value.dpConditions[number]>) => {
    const rows = value.dpConditions.slice();
    rows[i] = { ...rows[i], ...patch };
    set('dpConditions', rows);
  };
  const removeDpCondition = (i: number) => {
    if (value.dpConditions.length <= 1) return;
    set('dpConditions', value.dpConditions.filter((_, idx) => idx !== i));
  };

  const toggleDocumentReviewed = (doc: string) => {
    const has = value.documentsReviewed.includes(doc);
    set(
      'documentsReviewed',
      has ? value.documentsReviewed.filter(d => d !== doc) : [...value.documentsReviewed, doc],
    );
  };

  const renderSection = (subKey: string): React.ReactNode => {
    switch (subKey) {
      case 'waterSources':
        return (
          <FormSection icon="water-outline" title="A. Water Sources">
            <DynamicRowTable
              columns={[
                { key: 'source_type', label: 'Source Type', width: 140, type: 'select', options: WATER_SOURCE_TYPES },
                { key: 'daily_m3', label: 'Daily Volume (m³)', width: 100, type: 'number', placeholder: '0' },
                { key: 'annual_m3', label: 'Annual Volume (m³)', width: 100, type: 'number', placeholder: '0' },
                { key: 'specify', label: 'Specify', width: 140, placeholder: 'Details' },
              ]}
              rows={value.waterSources}
              onChange={waterSources => set('waterSources', waterSources)}
              addLabel="+ Add Water Source"
            />
          </FormSection>
        );

      case 'wastewaterSources':
        return (
          <FormSection icon="business-outline" title="B. Wastewater Sources">
            <DynamicRowTable
              columns={[
                { key: 'use_type', label: 'Use Type', width: 130, type: 'select', options: WASTEWATER_USE_TYPES },
                { key: 'consumed_m3_day', label: 'Consumed (m³/day)', width: 110, type: 'number', placeholder: '0' },
                { key: 'generated_m3_day', label: 'Generated (m³/day)', width: 110, type: 'number', placeholder: '0' },
                { key: 'outlet_info', label: 'Outlet Info', width: 150, placeholder: 'Outlet No./Location' },
              ]}
              rows={value.wastewaterSources}
              onChange={wastewaterSources => set('wastewaterSources', wastewaterSources)}
              addLabel="+ Add Wastewater Source"
            />
          </FormSection>
        );

      case 'abstractedWaterQuality':
        return (
          <FormSection icon="flask-outline" title="C. Quality of Abstracted Water">
            <DynamicRowTable
              columns={[
                { key: 'source', label: 'Source', width: 120, placeholder: 'e.g. Deep well' },
                { key: 'bod_cod', label: 'BOD/COD', width: 90, placeholder: 'mg/L' },
                { key: 'tss', label: 'TSS', width: 80, placeholder: 'mg/L' },
                { key: 'avfp', label: 'AVFP', width: 80, placeholder: 'mg/L' },
                { key: 'heavy_metal', label: 'Heavy Metal', width: 110, placeholder: 'mg/L' },
                { key: 'specify', label: 'Specify', width: 120, placeholder: 'Details' },
              ]}
              rows={value.abstractedWaterQuality}
              onChange={abstractedWaterQuality => set('abstractedWaterQuality', abstractedWaterQuality)}
              addLabel="+ Add Water Quality Entry"
            />
          </FormSection>
        );

      case 'treatmentSystemType':
        return (
          <FormSection icon="cog-outline" title="A. Type of Wastewater Treatment System">
            <RadioGroup label="Has WWTP?" options={YES_NO} value={value.hasWwtp} onChange={v => set('hasWwtp', v as 'yes' | 'no')} />
          </FormSection>
        );

      case 'wwtpType':
        return (
          <FormSection icon="cog-outline" title="B. Type of WWTP">
            <SelectField label="WWTP Type" value={value.wwtpType} options={WWTP_TYPE_OPTIONS} onSelect={v => set('wwtpType', v)} />
          </FormSection>
        );

      case 'wwtpDetails':
        return (
          <FormSection icon="cog-outline" title="C. WWTP Details">
            <Text style={styles.subTitle}>WWTP Details (per outlet)</Text>
            {value.wwtpDetails.map((d, i) => {
              const k = (field: string) => `wwtpDetail:${i}:${field}`;
              return (
                <View key={i} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardHeaderText}>Outlet {d.outletNo}</Text>
                    <TouchableOpacity onPress={() => removeWwtpDetail(i)}>
                      <Ionicons name="trash-outline" size={16} color={Colors.conflict} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.row}>
                    <TextField
                      ref={setRef(k('outletNo'))}
                      label="Outlet No."
                      value={d.outletNo}
                      onChangeText={t => updateWwtpDetail(i, { outletNo: t })}
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => focus(k('wwtpDetail'))}
                    />
                    <TextField
                      ref={setRef(k('wwtpDetail'))}
                      label="WWTP Detail"
                      value={d.wwtpDetail}
                      onChangeText={t => updateWwtpDetail(i, { wwtpDetail: t })}
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
                      onChange={t => updateWwtpDetail(i, { dateOfInstallation: t })}
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => focus(k('designCapacity'))}
                    />
                    <TextField
                      ref={setRef(k('designCapacity'))}
                      label="Design Capacity"
                      value={d.designCapacity}
                      onChangeText={t => updateWwtpDetail(i, { designCapacity: t })}
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
                      onChangeText={t => updateWwtpDetail(i, { annualMaintenanceCost: t })}
                      keyboardType="numeric"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => focus(k('outletLocation'))}
                    />
                    <TextField
                      ref={setRef(k('outletLocation'))}
                      label="Outlet Location"
                      value={d.outletLocation}
                      onChangeText={t => updateWwtpDetail(i, { outletLocation: t })}
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
                      onChangeText={t => updateWwtpDetail(i, { receivingBodyOfWater: t })}
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => focus(k('flowMeterDevice'))}
                    />
                    <TextField
                      ref={setRef(k('flowMeterDevice'))}
                      label="Flow Meter Device"
                      value={d.flowMeterDevice}
                      onChangeText={t => updateWwtpDetail(i, { flowMeterDevice: t })}
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
                      onChangeText={t => updateWwtpDetail(i, { flowRate: t })}
                      returnKeyType="done"
                    />
                  </View>
                </View>
              );
            })}
            <AddCardButton label="+ Add WWTP Outlet Detail" onPress={addWwtpDetail} />
          </FormSection>
        );

      case 'wwtpComponents':
        return (
          <FormSection icon="cog-outline" title="D. Components of the WWTP">
            <Text style={styles.subTitle}>WWTP Treatment Components (per outlet)</Text>
            {value.wwtpComponents.map((c, i) => {
              const k = (field: string) => `wwtpComponent:${i}:${field}`;
              return (
                <View key={i} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardHeaderText}>Outlet {c.outletNo}</Text>
                    <TouchableOpacity onPress={() => removeWwtpComponent(i)}>
                      <Ionicons name="trash-outline" size={16} color={Colors.conflict} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.row}>
                    <TextField
                      ref={setRef(k('outletNo'))}
                      label="Outlet No."
                      value={c.outletNo}
                      onChangeText={t => updateWwtpComponent(i, { outletNo: t })}
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => focus(k('primaryTreatment'))}
                    />
                    <TextField
                      ref={setRef(k('primaryTreatment'))}
                      label="Primary Treatment"
                      value={c.primaryTreatment}
                      onChangeText={t => updateWwtpComponent(i, { primaryTreatment: t })}
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
                      onChangeText={t => updateWwtpComponent(i, { biologicalTreatment: t })}
                      hint="Comma-separated"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => focus(k('chemicalTreatment'))}
                    />
                    <TextField
                      ref={setRef(k('chemicalTreatment'))}
                      label="Chemical Treatment"
                      value={c.chemicalTreatment}
                      onChangeText={t => updateWwtpComponent(i, { chemicalTreatment: t })}
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
                      onChangeText={t => updateWwtpComponent(i, { otherTreatment: t })}
                      returnKeyType="done"
                    />
                  </View>
                </View>
              );
            })}
            <AddCardButton label="+ Add WWTP Treatment Components" onPress={addWwtpComponent} />
          </FormSection>
        );

      case 'wwtpCondition':
        return (
          <FormSection icon="cog-outline" title="E. Condition of the WWTP">
            <View style={styles.row}>
              <SelectField label="WWTP Condition" value={value.wwtpCondition} options={WWTP_CONDITION_OPTIONS} onSelect={v => set('wwtpCondition', v)} />
              <RadioGroup
                label="Under Construction / Rehabilitation?"
                options={YES_NO}
                value={value.wwtpUnderConstruction}
                onChange={v => set('wwtpUnderConstruction', v as 'yes' | 'no')}
              />
            </View>
          </FormSection>
        );

      case 'samplingPoints':
        return (
          <FormSection icon="stats-chart-outline" title="I. Water Quality Sampling">
            {value.samplingPoints.map((pt, i) => {
              const k = (field: string) => `samplingPoint:${i}:${field}`;
              const pk = (pi: number, field: string) => `samplingParam:${i}:${pi}:${field}`;
              return (
                <View key={i} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardHeaderText}>Point {pt.pointNo}</Text>
                    <TouchableOpacity onPress={() => removeSamplingPoint(i)}>
                      <Ionicons name="trash-outline" size={16} color={Colors.conflict} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.row}>
                    <TextField
                      ref={setRef(k('pointNo'))}
                      label="Point No."
                      value={pt.pointNo}
                      onChangeText={t => updateSamplingPoint(i, { pointNo: t })}
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => focus(k('samplingStation'))}
                    />
                    <TextField
                      ref={setRef(k('samplingStation'))}
                      label="Sampling Station"
                      value={pt.samplingStation}
                      onChangeText={t => updateSamplingPoint(i, { samplingStation: t })}
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
                      onChangeText={t => updateSamplingPoint(i, { samplingTime: t })}
                      placeholder="e.g. 9:00 AM"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => focus(k('typeOfSample'))}
                    />
                    <TextField
                      ref={setRef(k('typeOfSample'))}
                      label="Sample Type"
                      value={pt.typeOfSample}
                      onChangeText={t => updateSamplingPoint(i, { typeOfSample: t })}
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
                      onChangeText={t => updateSamplingPoint(i, { remarks: t })}
                      returnKeyType={pt.parameters.length > 0 ? 'next' : 'done'}
                      blurOnSubmit={pt.parameters.length === 0}
                      onSubmitEditing={() => focus(pk(0, 'name'))}
                    />
                  </View>

                  <Text style={styles.paramHeading}>Parameters</Text>
                  {pt.parameters.map((param, pi) => {
                    const isLastParam = pi === pt.parameters.length - 1;
                    return (
                      <View key={pi} style={styles.paramRow}>
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
                        <TextInput
                          ref={setRef(pk(pi, 'remarks'))}
                          style={styles.paramRemarksInput}
                          value={param.remarks}
                          onChangeText={t => updateParameter(i, pi, { remarks: t })}
                          placeholder="Remarks"
                          placeholderTextColor={Colors.textLight}
                          returnKeyType={isLastParam ? 'done' : 'next'}
                          blurOnSubmit={isLastParam}
                          onSubmitEditing={() => focus(pk(pi + 1, 'name'))}
                        />
                      </View>
                    );
                  })}
                  <AddCardButton label="+ Add Parameter" onPress={() => addParameter(i)} small />
                </View>
              );
            })}
            <AddCardButton label="+ Add Sampling Point" onPress={addSamplingPoint} />
          </FormSection>
        );

      case 'previousInspection':
        return (
          <FormSection icon="time-outline" title="II. Previous Inspection">
            <View style={styles.row}>
              <DateField
                label="Date of Sampling"
                value={value.previousInspection.dateOfSampling}
                onChange={t => set('previousInspection', { ...value.previousInspection, dateOfSampling: t })}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => focus('prev:samplingStation')}
              />
              <TextField
                ref={setRef('prev:samplingStation')}
                label="Sampling Station"
                value={value.previousInspection.samplingStation}
                onChangeText={t => set('previousInspection', { ...value.previousInspection, samplingStation: t })}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => focus('prev:samplingTime')}
              />
            </View>
            <View style={styles.row}>
              <TextField
                ref={setRef('prev:samplingTime')}
                label="Sampling Time"
                value={value.previousInspection.samplingTime}
                onChangeText={t => set('previousInspection', { ...value.previousInspection, samplingTime: t })}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => focus('prev:typeOfSample')}
              />
              <TextField
                ref={setRef('prev:typeOfSample')}
                label="Sample Type"
                value={value.previousInspection.typeOfSample}
                onChangeText={t => set('previousInspection', { ...value.previousInspection, typeOfSample: t })}
                returnKeyType={value.previousInspection.parameters.length > 0 ? 'next' : 'done'}
                blurOnSubmit={value.previousInspection.parameters.length === 0}
                onSubmitEditing={() => focus('prevparam:0:name')}
              />
            </View>
            <Text style={styles.paramHeading}>Parameters</Text>
            {value.previousInspection.parameters.map((param, pi) => {
              const isLastParam = pi === value.previousInspection.parameters.length - 1;
              const pk = (field: string) => `prevparam:${pi}:${field}`;
              return (
                <View key={pi} style={styles.paramRow}>
                  <View style={styles.paramTopLine}>
                    <TextInput
                      ref={setRef(pk('name'))}
                      style={styles.paramNameInput}
                      value={param.parameterName}
                      onChangeText={t => updatePrevParameter(pi, { parameterName: t })}
                      placeholder="Parameter name"
                      placeholderTextColor={Colors.textLight}
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => focus(pk('value'))}
                    />
                    <YesNoNAToggle value={param.compliant} onChange={c => updatePrevParameter(pi, { compliant: c })} />
                    <TouchableOpacity onPress={() => removePrevParameter(pi)}>
                      <Ionicons name="close-circle" size={18} color={Colors.conflict} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.paramFieldsRow}>
                    <TextInput
                      ref={setRef(pk('value'))}
                      style={styles.paramSmallInput}
                      value={param.value}
                      onChangeText={t => updatePrevParameter(pi, { value: t })}
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
                      onChangeText={t => updatePrevParameter(pi, { unit: t })}
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
                      onChangeText={t => updatePrevParameter(pi, { denrStandard: t })}
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
            <AddCardButton label="+ Add Parameter" onPress={addPrevParameter} small />
          </FormSection>
        );

      case 'summaryOfFindings':
        return (
          <FormSection icon="list-outline" title="III. Summary of Findings">
            <ChecklistTable
              items={DAO_2005_10_CHECKLIST}
              values={value.checklistDao200510}
              onChange={(i, patch) => {
                const rows = value.checklistDao200510.slice();
                rows[i] = { ...rows[i], ...patch };
                set('checklistDao200510', rows);
              }}
            />
          </FormSection>
        );

      case 'dpConditions':
        return (
          <FormSection icon="document-text-outline" title="IV. Compliance to DP Conditions">
            {value.dpConditions.map((c, i) => {
              const isLast = i === value.dpConditions.length - 1;
              const k = (field: string) => `dp:${i}:${field}`;
              return (
                <View key={i} style={styles.dpRow}>
                  <View style={styles.dpTopLine}>
                    <TextInput
                      ref={setRef(k('no'))}
                      style={styles.dpConditionNo}
                      value={c.conditionNo}
                      onChangeText={t => updateDpCondition(i, { conditionNo: t })}
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
                      onChangeText={t => updateDpCondition(i, { description: t })}
                      placeholder="Condition description"
                      placeholderTextColor={Colors.textLight}
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => focus(k('remarks'))}
                    />
                    <YesNoNAToggle value={c.compliant} onChange={v => updateDpCondition(i, { compliant: v })} />
                    <TouchableOpacity onPress={() => removeDpCondition(i)} disabled={value.dpConditions.length <= 1}>
                      <Ionicons name="close-circle" size={18} color={value.dpConditions.length <= 1 ? Colors.borderLight : Colors.conflict} />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    ref={setRef(k('remarks'))}
                    style={styles.dpRemarks}
                    value={c.remarks}
                    onChangeText={t => updateDpCondition(i, { remarks: t })}
                    placeholder="Remarks"
                    placeholderTextColor={Colors.textLight}
                    returnKeyType={isLast ? 'done' : 'next'}
                    blurOnSubmit={isLast}
                    onSubmitEditing={() => focus(`dp:${i + 1}:no`)}
                  />
                </View>
              );
            })}
            <AddCardButton label="+ Add Condition" onPress={addDpCondition} />
          </FormSection>
        );

      case 'observations':
        return (
          <FormSection icon="clipboard-outline" title="V. Observations and Recommendations">
            <TextField
              ref={setRef('observations')}
              label="Other Observations"
              value={value.otherObservations}
              onChangeText={t => set('otherObservations', t)}
              multiline
              placeholder="Other observations noted during the inspection…"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => focus('remarksRecommendations')}
            />
            <TextField
              ref={setRef('remarksRecommendations')}
              label="Remarks & Recommendations"
              value={value.remarksRecommendations}
              onChangeText={t => set('remarksRecommendations', t)}
              multiline
              placeholder="Inspector remarks and recommendations…"
              returnKeyType="done"
            />
            <Text style={styles.label}>Documents Reviewed</Text>
            <View style={styles.docsGrid}>
              {DOCUMENTS_REVIEWED_OPTIONS.map(doc => (
                <View key={doc} style={styles.docItem}>
                  <CheckboxRow
                    label={doc}
                    checked={value.documentsReviewed.includes(doc)}
                    onToggle={() => toggleDocumentReviewed(doc)}
                  />
                </View>
              ))}
            </View>
          </FormSection>
        );

      default:
        return null;
    }
  };

  return (
    <View>
      {(mainTab.subTabs ?? []).map(sub => (
        <View key={sub.key}>{renderSection(sub.key)}</View>
      ))}
    </View>
  );
};

const AddCardButton: React.FC<{ label: string; onPress: () => void; small?: boolean }> = ({
  label,
  onPress,
  small,
}) => (
  <TouchableOpacity
    style={[styles.addBtn, small && styles.addBtnSmall]}
    activeOpacity={0.7}
    onPress={onPress}>
    <Ionicons name="add" size={13} color={Colors.green} />
    <Text style={styles.addBtnText}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 14,
  },
  subTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 10,
  },
  card: {
    backgroundColor: Colors.bgMuted,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
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
  addBtnSmall: {
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.green,
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
  paramRow: {
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
    marginBottom: 6,
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
  paramRemarksInput: {
    fontSize: 11.5,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
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
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: 0.3,
    marginBottom: 8,
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
