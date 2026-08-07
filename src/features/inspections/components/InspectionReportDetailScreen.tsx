import React, { useCallback, useRef, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../../../constants/colors';
import { useAuthContext } from '../../../core/providers/AuthProvider';
import { useInspectionReport } from '../hooks/useInspectionReport';
import { deleteInspectionReportRecord } from '../reportPersistence';
import { INSPECTION_TYPE_LABELS, canManageAllRecords } from '../../establishments/hooks/useEstablishment';
import { InspectionReportHeader, ReportDetailTabKey } from './InspectionReportHeader';
import { GeneralInformationView } from './GeneralInformationView';
import { PurposeOfInspectionView } from './PurposeOfInspectionView';
import { ComplianceStatusView } from './ComplianceStatusView';
import { useHeaderScroll } from '../../home/context/HeaderScrollContext';

interface InspectionReportDetailScreenProps {
  reportId: string;
}

export const InspectionReportDetailScreen: React.FC<InspectionReportDetailScreenProps> = ({ reportId }) => {
  const [activeTab, setActiveTab] = useState<ReportDetailTabKey>('geninfo');
  const { report, purpose, compliance, loading, error, refetch } = useInspectionReport(reportId);
  const scrollRef = useRef<ScrollView>(null);
  const { onScroll } = useHeaderScroll();
  const { session, role } = useAuthContext();
  const currentUid = (session as { user?: { id?: string } } | null)?.user?.id ?? '';
  // Developer accounts get unrestricted write access — including editing
  // submitted reports and reports they don't own — see canManageAllRecords.
  const isDeveloper = canManageAllRecords(role ?? '');

  // Only the inspector who created the report can edit it, and only while
  // it's still a draft — jurisdiction-visible reports from other inspectors
  // (or a report that's already been submitted) render read-only, unless
  // the current user is a Developer. See SectionEditActions.
  const canEdit =
    !!report && (isDeveloper || (report.inspectorUid === currentUid && report.reportStatus === 'draft'));

  // Delete, unlike edit, isn't restricted to drafts — matches the "own
  // record" delete RLS policy on the backend, which only checks ownership.
  const handleDelete = useCallback(() => {
    if (!report) return;
    Alert.alert(
      'Delete report?',
      `This ${INSPECTION_TYPE_LABELS[report.reportType] ?? report.reportType} report will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteInspectionReportRecord(report.reportId);
              router.back();
            } catch (err) {
              console.error('[InspectionReportDetailScreen] Failed to delete report:', err);
              Alert.alert('Delete failed', err instanceof Error ? err.message : 'Something went wrong.');
            }
          },
        },
      ],
    );
  }, [report]);

  if (loading) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator size="large" color={Colors.navy} />
        <Text style={styles.stateText}>Loading inspection report...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredState}>
        <Ionicons name="alert-circle-outline" size={40} color={Colors.conflict} />
        <Text style={styles.stateText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={refetch} activeOpacity={0.8}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.centeredState}>
        <Ionicons name="document-outline" size={40} color={Colors.border} />
        <Text style={styles.stateText}>Inspection report not found.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.retryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const location = [
    report.establishmentSnapshot.address_line,
    report.establishmentSnapshot.city,
    report.establishmentSnapshot.province,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View style={styles.flex}>
      <InspectionReportHeader
        establishmentName={report.establishmentSnapshot.name}
        establishmentLocation={location}
        reportType={report.reportType}
        reportControlNo={report.reportControlNo}
        inspectionDate={report.inspectionDate}
        reportStatus={report.reportStatus}
        inspectorUid={report.inspectorUid}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onBack={() => router.back()}
        onDelete={handleDelete}
      />

      <View style={styles.noteBar}>
        <Ionicons name="information-circle-outline" size={13} color={Colors.navy} />
        <Text style={styles.noteText}>
          {canEdit ? (
            <>
              Use <Text style={styles.noteTextStrong}>Edit</Text> on any section below to make changes, then{' '}
              <Text style={styles.noteTextStrong}>Save</Text> to update just that section.
            </>
          ) : (
            <>
              This report is <Text style={styles.noteTextStrong}>view only</Text> — only the inspector who
              created it can make changes{report.reportStatus === 'submitted' ? ', and it has already been submitted' : ''}.
            </>
          )}
        </Text>
      </View>

      <KeyboardAwareScrollView
        ref={scrollRef as unknown as React.Ref<KeyboardAwareScrollViewRef>}
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        bottomOffset={150}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}>
        {activeTab === 'geninfo' && (
          <GeneralInformationView
            reportId={report.reportId}
            snapshot={report.establishmentSnapshot}
            permits={report.permitsSnapshot}
            canEdit={canEdit}
            onSaved={refetch}
          />
        )}
        {activeTab === 'purpose' &&
          (purpose ? (
            <PurposeOfInspectionView
              purposeId={report.purposeId}
              value={purpose}
              canEdit={canEdit}
              onSaved={refetch}
            />
          ) : (
            <Text style={styles.stateText}>No purpose of inspection recorded for this report.</Text>
          ))}
        {activeTab === 'compliance' && (
          <ComplianceStatusView
            reportId={report.reportId}
            compliance={compliance}
            canEdit={canEdit}
            onSaved={refetch}
          />
        )}
      </KeyboardAwareScrollView>
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
  noteBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderBottomWidth: 1,
    borderBottomColor: '#bfdbfe',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 11,
    color: '#1e40af',
  },
  noteTextStrong: {
    fontWeight: '700',
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  stateText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: Colors.navy,
    borderRadius: 8,
    marginTop: 4,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textWhite,
  },
});
