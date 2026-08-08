import React, { useState, useCallback, useRef } from 'react';
import { View, ScrollView, Alert, StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import { router } from 'expo-router';
import { Colors } from '../../../constants/colors';
import { database, collections } from '../../../db/database';
import { useAuthContext } from '../../../core/providers/AuthProvider';
import { generateId } from '../../../utils/crypto';
import { getDeviceId } from '../../../utils/device';
import { EstablishmentPickerStep } from '../components/EstablishmentPickerStep';
import { NewEstablishmentModal } from '../components/NewEstablishmentModal';
import { ReportFormHeader, ReportFormTabKey } from '../components/ReportFormHeader';
import { GeneralInformationTab } from '../components/GeneralInformationTab';
import { PurposeOfInspectionTab } from '../components/PurposeOfInspectionTab';
import { SaveBar } from '../components/SaveBar';
import { useReportFormState } from '../hooks/useReportFormState';
import { createEstablishmentRecord } from '../establishmentPersistence';
import { buildGeneralInfoFromEstablishment, GeneralInfoFormState, PurposeFormState } from '../types';
import { WaterComplianceTab } from './WaterComplianceTab';
import { emptyWaterComplianceForm, WaterComplianceFormState } from './waterTypes';
import type { EstablishmentDTO } from '../../establishments/types';
import { useHeaderScroll } from '../../home/context/HeaderScrollContext';
import { useScreenFooter } from '../../home/context/ScreenFooterContext';

const REPORT_TYPE = 'water_monitoring';

export interface ShellStart {
  estabId: string | null; // null when creating a brand-new establishment
  initialGeneralInfo: GeneralInfoFormState;
  initialInspectionDate?: string;
  initialPurpose?: PurposeFormState;
  initialControlNumber?: string;
}

export function WaterFormShell({ start }: { start: ShellStart }) {
  const [activeTab, setActiveTab] = useState<ReportFormTabKey>('geninfo');
  const [waterCompliance, setWaterCompliance] = useState<WaterComplianceFormState>(
    emptyWaterComplianceForm,
  );
  const scrollRef = useRef<ScrollView>(null);
  const { onScroll } = useHeaderScroll();

  const { generalInfo, setGeneralInfo, purpose, setPurpose, saving, save } = useReportFormState({
    estabId: start.estabId,
    initialGeneralInfo: start.initialGeneralInfo,
    initialInspectionDate: start.initialInspectionDate,
    initialPurpose: start.initialPurpose,
    initialControlNumber: start.initialControlNumber,
    reportType: REPORT_TYPE,
  });

  const handleSave = useCallback(
    async (status: 'draft' | 'submitted') => {
      try {
        await save(status, async ({ reportId }) => {
          const complianceId = generateId();
          await collections.complianceWater.create(rec => {
            rec._raw.id = complianceId;
            rec.complianceId = complianceId;
            rec.reportId = reportId;
            rec.waterSources = waterCompliance.waterSources.filter(r => r.source_type?.trim());
            rec.wastewaterSources = waterCompliance.wastewaterSources.filter(r => r.use_type?.trim());
            rec.abstractedWaterQuality = waterCompliance.abstractedWaterQuality.filter(r => r.source?.trim());
            rec.hasWwtp = waterCompliance.hasWwtp === 'yes';
            rec.wwtpType = waterCompliance.wwtpType || null;
            rec.wwtpDetails = waterCompliance.wwtpDetails;
            rec.wwtpComponents = waterCompliance.wwtpComponents;
            rec.wwtpCondition = waterCompliance.wwtpCondition || null;
            rec.wwtpUnderConstruction = waterCompliance.wwtpUnderConstruction === 'yes';
            rec.samplingPoints = waterCompliance.samplingPoints;
            rec.previousInspectionSummary = waterCompliance.previousInspection.dateOfSampling
              ? waterCompliance.previousInspection
              : {};
            rec.checklistDao200510 = waterCompliance.checklistDao200510.map((v, i) => ({
              legal_ref: `Section ${i + 3}`,
              compliant: v.compliant,
              remarks: v.remarks,
            }));
            rec.dpConditions = waterCompliance.dpConditions.filter(c => c.description?.trim());
            rec.otherObservations = waterCompliance.otherObservations || null;
            rec.remarksRecommendations = waterCompliance.remarksRecommendations || null;
            rec.documentsReviewed = waterCompliance.documentsReviewed;
            rec.syncState = 'pending_create';
          });
        });

        Alert.alert(
          status === 'draft' ? 'Draft saved' : 'Report submitted',
          status === 'draft'
            ? 'Your water inspection report has been saved as a draft.'
            : 'Your water inspection report has been submitted.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
      } catch (err) {
        // Alert only ever shows err.message — log the full error (stack
        // included) so it's visible in the Metro/logcat console, since the
        // one-line message alone isn't enough to locate the actual failure.
        console.error('[WaterInspectionFormScreen] Save failed:', err);
        Alert.alert(
          'Save failed',
          err instanceof Error ? err.message : 'Something went wrong while saving this report.',
        );
      }
    },
    [save, waterCompliance],
  );

  // Rendered by AppChrome as a sibling of the collapsing header rather than
  // inline here — see useScreenFooter for why nesting it below the header
  // caused it to visibly lag the collapse/expand animation.
  useScreenFooter(
    () => (
      <SaveBar
        establishmentName={generalInfo.name || 'New Establishment'}
        typeLabel="Water Monitoring"
        saving={saving}
        onDiscard={() => router.back()}
        onSaveDraft={() => handleSave('draft')}
        onSubmit={() => handleSave('submitted')}
      />
    ),
    [generalInfo.name, saving, handleSave]
  );

  return (
    <View style={styles.flex}>
      <ReportFormHeader
        establishmentName={generalInfo.name || 'New Establishment'}
        establishmentLocation={[generalInfo.city, generalInfo.province].filter(Boolean).join(', ')}
        typeLabel="Water Monitoring"
        typeColor={Colors.water.text}
        typeBgColor={Colors.water.bg}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <KeyboardAwareScrollView
        ref={scrollRef as unknown as React.Ref<KeyboardAwareScrollViewRef>}
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        bottomOffset={150}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}>
        {activeTab === 'geninfo' && (
          <GeneralInformationTab value={generalInfo} onChange={setGeneralInfo} />
        )}
        {activeTab === 'purpose' && (
          <PurposeOfInspectionTab value={purpose} onChange={setPurpose} />
        )}
        {activeTab === 'compliance' && (
          <WaterComplianceTab value={waterCompliance} onChange={setWaterCompliance} />
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

export const WaterInspectionFormScreen: React.FC = () => {
  const [start, setStart] = useState<ShellStart | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const { session } = useAuthContext();
  const inspectorUid = (session as { user?: { id?: string } } | null)?.user?.id ?? '';

  const handlePickExisting = useCallback((estab: EstablishmentDTO) => {
    setStart({ estabId: estab.estabId, initialGeneralInfo: buildGeneralInfoFromEstablishment(estab) });
  }, []);

  const handleCreateNew = useCallback(
    async (initialGeneralInfo: GeneralInfoFormState, initialInspectionDate: string) => {
      try {
        const estabId = generateId();
        const deviceId = await getDeviceId();
        await database.write(async () => {
          await createEstablishmentRecord({ estabId, inspectorUid, deviceId, generalInfo: initialGeneralInfo });
        });
        setCreatingNew(false);
        setStart({ estabId, initialGeneralInfo, initialInspectionDate });
      } catch (err) {
        console.error('[WaterInspectionFormScreen] Failed to create establishment:', err);
        Alert.alert(
          'Save failed',
          err instanceof Error ? err.message : 'Could not save the establishment. Please try again.',
        );
      }
    },
    [inspectorUid],
  );

  return (
    <View style={styles.flex}>
      {start ? (
        <WaterFormShell start={start} />
      ) : (
        <EstablishmentPickerStep onPick={handlePickExisting} onCreateNew={() => setCreatingNew(true)} />
      )}
      <NewEstablishmentModal
        visible={creatingNew}
        onCancel={() => setCreatingNew(false)}
        onCreate={handleCreateNew}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 40,
  },
});
