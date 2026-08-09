import React, { useCallback, useRef, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
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

// Pixels of scroll over which the establishment card fully collapses —
// small enough that an initial swipe reads as "collapse the card" before
// the form content underneath has scrolled far, but wide enough that the
// motion reads as an actual shrink rather than a snap.
const COLLAPSE_RANGE = 110;
// How much of the remaining gap to close per frame — lower is smoother
// (more of a gentle catch-up) but laggier; higher tracks the raw scroll
// target more tightly but transmits more of its noise. 0.14 keeps a real,
// sustained swipe feeling essentially immediate (it closes the gap within
// a couple of frames of visual perception either way) while noticeably
// softening the motion compared to snapping straight to the target.
const SMOOTHING = 0.14;

export const InspectionReportDetailScreen: React.FC<InspectionReportDetailScreenProps> = ({ reportId }) => {
  const [activeTab, setActiveTab] = useState<ReportDetailTabKey>('geninfo');
  const { report, purpose, compliance, loading, error, refetch } = useInspectionReport(reportId);
  const scrollRef = useRef<ScrollView>(null);
  const { collapsed } = useHeaderScroll();

  // The card's collapse is tied directly to scroll position instead of
  // HeaderScrollContext's threshold-triggered onScroll (used elsewhere in
  // the app) — that system reacts to a scroll *gesture* crossing a distance
  // threshold, animated afterward on its own timer, which is disconnected
  // from where the content actually is. That's fine for the top app bar's
  // small collapse, but for this card it meant the swipe that starts a
  // collapse also kept scrolling the form underneath, instead of the swipe
  // going toward collapsing the card first. Mapping collapsed directly from
  // contentOffset.y means the first COLLAPSE_RANGE px of swipe visibly and
  // proportionally collapses the card (and symmetrically expands it back on
  // the way up), with no separate timed animation or state to fall out of
  // sync — collapsed always exactly matches the current scroll position.
  //
  // Reaching offset 0 after scrolling back up can overshoot/settle with a
  // few quick rubber-band-style corrections rather than landing exactly at
  // rest in one step — with COLLAPSE_RANGE as small as 80px, that's enough
  // swing to snap collapsed all the way between 0 and 1 several times in
  // under a second. Nudging toward the target instead of assigning it
  // outright absorbs that kind of fast back-and-forth into a much smaller
  // wobble while still tracking a real, sustained swipe (which moves the
  // offset over hundreds of ms, far slower than this filter's response)
  // essentially immediately. This is applied here, at the source, rather
  // than inside InspectionReportHeader — HomeHeader reads the same shared
  // collapsed value directly, so smoothing it only on the card's side would
  // leave the two headers visibly out of step with each other.
  //
  // targetProgress holds the raw, unsmoothed value; collapsed is nudged
  // toward it by a separate per-frame tick (useFrameCallback) rather than
  // inside onScroll itself. onScroll only fires while a scroll event is
  // actually arriving — if the scroll settles (or a bounce sequence stops)
  // before collapsed had fully caught up to 0, there would be no further
  // event to close that last bit of gap, leaving the header permanently
  // stuck slightly short of fully expanded. Ticking every rendered frame
  // instead guarantees collapsed keeps converging on whatever targetProgress
  // currently is even after scrolling has completely stopped.
  const targetProgress = useSharedValue(0);
  const handleScroll = useAnimatedScrollHandler({
    onScroll: event => {
      targetProgress.value = interpolate(
        event.contentOffset.y,
        [0, COLLAPSE_RANGE],
        [0, 1],
        Extrapolation.CLAMP,
      );
    },
  });
  useFrameCallback(() => {
    const diff = targetProgress.value - collapsed.value;
    collapsed.value = Math.abs(diff) < 0.001 ? targetProgress.value : collapsed.value + diff * SMOOTHING;
  });
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
        collapsed={collapsed}
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
        onScroll={handleScroll}
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
