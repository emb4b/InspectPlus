import React, { useCallback, useEffect } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '../../../constants/colors';
import { useAuthContext } from '../../../core/providers/AuthProvider';
import { useInspectorName } from '../../../core/hooks/useInspectorName';
import { useGuardedPress } from '../../../utils/useGuardedPress';
import {
  useEstablishment,
  useEstablishmentReports,
  EstablishmentReportItem,
  INSPECTION_TYPE_LABELS,
  canManageAllRecords,
} from '../hooks/useEstablishment';
import { deleteInspectionReportRecord } from '../../inspections/reportPersistence';
import { EstablishmentHeaderCard } from './EstablishmentHeaderCard';
import { EstablishmentInfoSections } from './EstablishmentInfoSections';
import { EstablishmentReportsSection } from './EstablishmentReportsSection';
import { useHeaderScroll } from '../../home/context/HeaderScrollContext';
import { subscribeToSyncDataChanged } from '../../../services/sync/syncEvents';

interface EstablishmentDetailScreenProps {
  estabId: string;
}

export const EstablishmentDetailScreen: React.FC<EstablishmentDetailScreenProps> = ({ estabId }) => {
  const { fullName, session, role } = useAuthContext();
  const { onScroll } = useHeaderScroll();
  const { establishment, loading, error, refetch } = useEstablishment(estabId);
  const { reports, loading: reportsLoading, refetch: refetchReports } = useEstablishmentReports(estabId);

  // fullName is only the SIGNED-IN user's own name — an establishment can be
  // assigned to a different inspector, so it can't be used as a blanket
  // fallback (that's how a raw uid used to leak into the UI). Resolve any
  // other inspector's name via the shared cache/RPC instead.
  const currentUid = (session as { user?: { id?: string } } | null)?.user?.id ?? '';
  const isSelf = !!establishment && establishment.inspectorUid === currentUid;
  // Developer accounts get unrestricted write access on top of ownership —
  // see canManageAllRecords. Kept separate from isSelf, which stays a pure
  // ownership check used for inspector-name resolution below.
  const isDeveloper = canManageAllRecords(role ?? '');
  const canManageEstablishment = isSelf || isDeveloper;
  const { name: resolvedInspectorName, loading: inspectorNameLoading } = useInspectorName(
    !isSelf ? establishment?.inspectorUid : undefined,
  );
  const inspectorLabel = isSelf
    ? fullName || 'You'
    : resolvedInspectorName ?? (inspectorNameLoading ? 'Loading…' : establishment ? 'Unknown inspector' : '—');

  const handleAddReport = useGuardedPress(
    useCallback(() => {
      router.push({ pathname: '/report/new', params: { estabId } });
    }, [estabId]),
  );

  const handleEdit = useGuardedPress(
    useCallback(() => {
      router.push({ pathname: '/establishment/edit', params: { estabId } });
    }, [estabId]),
  );

  // The native Stack doesn't remount this screen when navigating back to
  // it, so without this the card/info sections — and the reports list below
  // them — would keep showing stale data after saving/submitting a report
  // (or editing the establishment) from a screen stacked on top of this one.
  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchReports();
    }, [refetch, refetchReports]),
  );

  // Mirrors Home's dual-trigger approach (see home.tsx): the notifier fires
  // the moment a report is saved, before the user navigates back, so data
  // is already fresh by the time useFocusEffect above re-runs. This also
  // covers a background sync landing while this screen is already open.
  useEffect(() => {
    return subscribeToSyncDataChanged(() => {
      refetch();
      refetchReports();
    });
  }, [refetch, refetchReports]);

  const handleUpdatePermits = useCallback(() => {
    // TODO: navigate to permits edit flow
    console.log('[EstablishmentDetail] Update permits:', estabId);
  }, [estabId]);

  const handleOpenReport = useGuardedPress((item: EstablishmentReportItem) => {
    if (item.kind === 'inspection') {
      router.push({ pathname: '/inspection/[id]', params: { id: item.reportId } });
    } else {
      router.push({ pathname: '/survey/[id]', params: { id: item.reportId } });
    }
  });

  // Only inspection reports are deletable here (survey reports aren't in
  // scope for this feature) — EstablishmentReportsSection already hides the
  // delete button for survey rows and for reports owned by another
  // inspector, unless the current user is a Developer (see showDelete
  // there), so reaching this with a disallowed item shouldn't happen, but
  // the guard keeps it safe if a future caller wires the callback
  // differently.
  const handleDeleteReport = useCallback((item: EstablishmentReportItem) => {
    if (item.kind !== 'inspection' || !(item.inspectorUid === currentUid || isDeveloper)) return;
    Alert.alert(
      'Delete report?',
      `This ${INSPECTION_TYPE_LABELS[item.reportType] ?? item.reportType} report will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteInspectionReportRecord(item.reportId);
              refetchReports();
            } catch (err) {
              console.error('[EstablishmentDetail] Failed to delete report:', err);
              Alert.alert('Delete failed', err instanceof Error ? err.message : 'Something went wrong.');
            }
          },
        },
      ],
    );
  }, [currentUid, isDeveloper, refetchReports]);

  if (loading) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator size="large" color={Colors.navy} />
        <Text style={styles.stateText}>Loading establishment...</Text>
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

  if (!establishment) {
    return (
      <View style={styles.centeredState}>
        <Ionicons name="business-outline" size={40} color={Colors.border} />
        <Text style={styles.stateText}>Establishment not found.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.retryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={16} color={Colors.navy} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}>
        <EstablishmentHeaderCard
          establishment={establishment}
          inspectorLabel={inspectorLabel}
          onAddReport={handleAddReport}
          onEdit={canManageEstablishment ? handleEdit : undefined}
        />

        <EstablishmentInfoSections
          establishment={establishment}
          onUpdatePermits={canManageEstablishment ? handleUpdatePermits : undefined}
        />

        <EstablishmentReportsSection
          reports={reports}
          loading={reportsLoading}
          currentUid={currentUid}
          canManageAll={isDeveloper}
          onAddReport={handleAddReport}
          onOpenReport={handleOpenReport}
          onDeleteReport={handleDeleteReport}
        />
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  backText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.navy,
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
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
