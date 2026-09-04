import React, { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Keyboard, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/EmptyState';
import { Section } from '../../../components/Section';
import { Skeleton } from '../../../components/Skeleton';
import { Colors } from '../../../design/colors';
import { Elevation } from '../../../design/elevation';
import { Radius } from '../../../design/radius';
import { Spacing } from '../../../design/spacing';
import { Type } from '../../../design/typography';
import { useAuthContext } from '../../../core/providers/AuthProvider';
import { useSetFabHidden } from '../../home/context/FabVisibilityContext';
import { useScreenFooter } from '../../home/context/ScreenFooterContext';
import { AllReportItem, canManageAllRecords } from '../hooks/useEstablishment';
import { useReportBrowser } from '../hooks/useReportBrowser';
import { ReportFilterSheet } from './ReportFilterSheet';
import { ReportListCard } from './ReportListCard';

const SKELETON_ROW_HEIGHT = 96;

export interface ExportReportsTabHandle {
  refresh: () => Promise<void>;
}

export const ExportReportsTab = forwardRef<ExportReportsTabHandle>((_props, ref) => {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const browser = useReportBrowser();
  const { reports, loading, error, refetch, activeFilterCount, state } = browser;

  const { municipalities, session, role } = useAuthContext();
  const currentUid = (session as { user?: { id?: string } } | null)?.user?.id ?? '';
  const isDeveloper = canManageAllRecords(role ?? '');

  // Derived from the live list rather than stored alongside it, so a
  // selection can't survive a filter change that removes the report.
  const selectedItems = useMemo(
    () => reports.filter(report => selectedKeys.has(report.key)),
    [reports, selectedKeys],
  );
  const draftCount = selectedItems.filter(report => report.status === 'draft').length;
  const allSelected = reports.length > 0 && selectedItems.length === reports.length;

  // The FAB would sit on top of the selection bar. Restored automatically
  // when the selection clears or the tab unmounts.
  useSetFabHidden(selectedItems.length > 0);

  const toggleSelect = (item: AllReportItem) => {
    setSelectedKeys(previous => {
      const next = new Set(previous);
      if (next.has(item.key)) {
        next.delete(item.key);
      } else {
        next.add(item.key);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedKeys(allSelected ? new Set() : new Set(reports.map(report => report.key)));
  };

  // Mirrors ManageReportsTab's handle: Home drives this from pull-to-refresh
  // and the sync-data-changed subscription. selectedKeys is deliberately left
  // untouched here — selectedItems above is already derived from the live
  // `reports` list, so a report that a refresh removes (deleted, or filtered
  // out by a change synced elsewhere) silently drops out of the selection on
  // its own, while everything still present stays picked. Clearing the whole
  // selection on every refresh would punish the common case (an unrelated
  // background sync landing while the inspector is mid-pick) far more than it
  // protects against the rare one.
  useImperativeHandle(ref, () => ({ refresh: refetch }), [refetch]);

  // Registered rather than rendered inline: this component mounts inside
  // HomeScreen's ScrollView, so an absolutely-positioned bar would anchor to
  // the scrolling content and slide away instead of pinning to the viewport.
  // See useScreenFooter for why this takes a factory plus deps.
  useScreenFooter(
    () =>
      selectedItems.length > 0 ? (
        <View style={styles.selectionBar}>
          {/* A template literal, not `{n} selected` — JSX would split that into
              two separate text child nodes ("1", " selected"), which the
              test's JSON.stringify(toJSON())-based assertion can't see as a
              contiguous "1 selected" substring. */}
          <Text style={styles.selectionCount}>{`${selectedItems.length} selected`}</Text>
          {draftCount > 0 && (
            <View style={styles.draftWarning}>
              <Badge label={draftCount === 1 ? '1 draft' : `${draftCount} drafts`} tone="warning" />
              <Text style={styles.draftWarningText}>
                {draftCount} of {selectedItems.length} selected{' '}
                {draftCount === 1 ? 'is a draft' : 'are drafts'} and may be incomplete.
              </Text>
            </View>
          )}
          <Button label="Generate" onPress={() => {}} variant="primary" size="md" disabled fullWidth />
          <Text style={styles.comingSoon}>
            Document generation arrives in a future release.
          </Text>
        </View>
      ) : null,
    [selectedItems.length, draftCount],
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Skeleton height={38} radius={Radius.pill} style={styles.skeletonRow} />
        <Skeleton height={SKELETON_ROW_HEIGHT} style={styles.skeletonRow} />
        <Skeleton height={SKELETON_ROW_HEIGHT} style={styles.skeletonRow} />
        <Skeleton height={SKELETON_ROW_HEIGHT} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="alert-circle-outline"
          message={error}
          action={<Button label="Retry" onPress={refetch} variant="outline" size="md" />}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={14} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by establishment name..."
            placeholderTextColor={Colors.textMuted}
            value={state.search}
            onChangeText={browser.setSearch}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setFiltersOpen(true)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Filter reports">
          <Ionicons
            name="options-outline"
            size={18}
            color={activeFilterCount > 0 ? Colors.textWhite : Colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      <Section
        title="SELECT REPORTS TO EXPORT"
        right={
          reports.length > 0 ? (
            <TouchableOpacity
              onPress={toggleSelectAll}
              accessibilityRole="button"
              accessibilityLabel={allSelected ? 'Clear all reports' : 'Select all reports'}>
              <Text style={styles.selectAllText}>{allSelected ? 'Clear all' : 'Select all'}</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {reports.length === 0 ? (
        <EmptyState
          icon="document-outline"
          message={
            state.search || activeFilterCount > 0
              ? 'No reports match your filters.'
              : 'No reports to export yet.'
          }
        />
      ) : (
        reports.map(item => (
          <ReportListCard
            key={item.key}
            item={item}
            currentUid={currentUid}
            canManageAll={isDeveloper}
            // Opening, editing, and deleting are all suppressed while
            // selecting — the row's only job here is to be picked.
            onPress={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
            selectable
            selected={selectedKeys.has(item.key)}
            onToggleSelect={toggleSelect}
          />
        ))
      )}

      <ReportFilterSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        browser={browser}
        municipalities={municipalities}
      />
    </View>
  );
});

ExportReportsTab.displayName = 'ExportReportsTab';

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  skeletonRow: {
    marginBottom: Spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgLight,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Type.bodySm.fontSize,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  filterBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgLight,
  },
  filterBtnActive: {
    backgroundColor: Colors.navy,
  },
  selectAllText: {
    fontSize: Type.bodySm.fontSize,
    lineHeight: Type.bodySm.lineHeight,
    fontWeight: '700',
    color: Colors.accent,
  },
  selectionBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Elevation.overlay,
  },
  selectionCount: {
    fontSize: Type.subheading.fontSize,
    lineHeight: Type.subheading.lineHeight,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  draftWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  draftWarningText: {
    flex: 1,
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    color: Colors.textMuted,
  },
  comingSoon: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
