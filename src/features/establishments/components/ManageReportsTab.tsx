import React, { useState, useCallback, useMemo, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Modal,
  StyleSheet,
} from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../../../constants/colors';
import { SelectField, DateField } from '../../../components/form';
import { ReportListCard } from './ReportListCard';
import {
  useAllReports,
  useEstablishmentFilterOptions,
  AllReportItem,
  ReportStatusFilter,
  ReportFilters,
  ReportSortOrder,
  INSPECTION_TYPE_LABELS,
} from '../hooks/useEstablishment';

const PAGE_SIZE = 5;
const ALL_OPTION = 'All';

const STATUS_FILTERS: { key: ReportStatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'submitted', label: 'Submitted' },
];

const REPORT_TYPE_OPTIONS = Object.entries(INSPECTION_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const SORT_OPTIONS: { key: ReportSortOrder; label: string }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
];

// The date range fields below are plain TextInputs that can be typed into
// directly (not just via the calendar picker), so the numeric keypad can pop
// up while this sheet is open. RN's Modal doesn't resize for the keyboard on
// its own — same issue NewEstablishmentModal solved — so the bottom-anchored
// sheet needs to shift up manually or the keyboard covers the date row.
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export interface ManageReportsTabHandle {
  refresh: () => Promise<void>;
}

export const ManageReportsTab = forwardRef<ManageReportsTabHandle>((_props, ref) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [province, setProvince] = useState('');
  const [reportType, setReportType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortOrder, setSortOrder] = useState<ReportSortOrder>('newest');

  const { provinceOptions } = useEstablishmentFilterOptions();

  const { height: keyboardHeight } = useReanimatedKeyboardAnimation();
  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    // keyboardHeight.value is <= 0 (negative while shown), so negating it
    // gives the padding needed to push the flex-end-anchored sheet up above
    // the keyboard instead of letting the keyboard cover it.
    paddingBottom: -keyboardHeight.value,
  }));

  // Stable reference so the filter object only changes when a filter value
  // actually changes — a fresh object literal on every render would
  // re-trigger the data-fetching effect in useAllReports on a loop.
  const filters: ReportFilters = useMemo(
    () => ({ province, reportType, dateFrom, dateTo, sortOrder }),
    [province, reportType, dateFrom, dateTo, sortOrder],
  );
  const activeFilterCount = [province, reportType, dateFrom, dateTo].filter(Boolean).length;

  const { reports, loading, error, refetch } = useAllReports(search, statusFilter, filters);

  useImperativeHandle(ref, () => ({ refresh: refetch }), [refetch]);

  const totalPages = Math.max(1, Math.ceil(reports.length / PAGE_SIZE));
  const paginated = reports.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    setPage(1);
  }, []);

  const handleFilterChange = useCallback((key: ReportStatusFilter) => {
    setStatusFilter(key);
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setProvince('');
    setReportType('');
    setDateFrom('');
    setDateTo('');
    setSortOrder('newest');
    setPage(1);
  }, []);

  const selectedReportTypeLabel =
    REPORT_TYPE_OPTIONS.find(o => o.value === reportType)?.label ?? ALL_OPTION;
  const selectedSortLabel = SORT_OPTIONS.find(o => o.key === sortOrder)?.label ?? SORT_OPTIONS[0].label;

  const handleOpen = useCallback((item: AllReportItem) => {
    if (item.kind === 'inspection') {
      router.push({ pathname: '/inspection/[id]', params: { id: item.reportId } });
    } else {
      router.push({ pathname: '/survey/[id]', params: { id: item.reportId } });
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator size="large" color={Colors.navy} />
        <Text style={styles.stateText}>Loading reports...</Text>
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

  return (
    <View style={styles.container}>
      {/* Search + filter trigger */}
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={14} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by establishment name..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={handleSearch}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setFiltersOpen(true)}
          activeOpacity={0.75}>
          <Ionicons
            name="options-outline"
            size={18}
            color={activeFilterCount > 0 ? Colors.textWhite : Colors.textMuted}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Status filter chips */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(f => {
          const isActive = statusFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => handleFilterChange(f.key)}
              activeOpacity={0.75}>
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Section label + count */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionLabel}>REPORTS</Text>
        <Text style={styles.sectionCount}>{reports.length} total</Text>
      </View>

      {/* List */}
      {paginated.length === 0 ? (
        <View style={styles.centeredState}>
          <Ionicons name="document-outline" size={40} color={Colors.border} />
          <Text style={styles.stateText}>
            {search || statusFilter !== 'all' || activeFilterCount > 0
              ? 'No reports match your filters.'
              : 'No reports yet.'}
          </Text>
        </View>
      ) : (
        paginated.map(item => (
          <ReportListCard key={item.key} item={item} onPress={handleOpen} />
        ))
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={styles.pager}>
          <TouchableOpacity
            onPress={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            activeOpacity={0.7}>
            <View style={styles.pageArrow}>
              <Ionicons
                name="chevron-back"
                size={13}
                color={page === 1 ? Colors.textLight : Colors.textMuted}
              />
              <Text style={[styles.pageArrowText, page === 1 && styles.pageDisabled]}>
                Previous
              </Text>
            </View>
          </TouchableOpacity>

          {Array.from({ length: Math.min(totalPages, 4) }, (_, i) => i + 1).map(p => (
            <TouchableOpacity key={p} onPress={() => setPage(p)} activeOpacity={0.7}>
              <View style={[styles.pageNum, p === page && styles.pageNumActive]}>
                <Text style={[styles.pageNumText, p === page && styles.pageNumTextActive]}>
                  {p}
                </Text>
              </View>
            </TouchableOpacity>
          ))}

          {totalPages > 4 && (
            <>
              <Text style={styles.pageDots}>…</Text>
              <TouchableOpacity onPress={() => setPage(totalPages)} activeOpacity={0.7}>
                <View style={[styles.pageNum, page === totalPages && styles.pageNumActive]}>
                  <Text style={[styles.pageNumText, page === totalPages && styles.pageNumTextActive]}>
                    {totalPages}
                  </Text>
                </View>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            onPress={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            activeOpacity={0.7}>
            <View style={styles.pageArrow}>
              <Text style={[styles.pageArrowText, page === totalPages && styles.pageDisabled]}>
                Next
              </Text>
              <Ionicons
                name="chevron-forward"
                size={13}
                color={page === totalPages ? Colors.textLight : Colors.textMuted}
              />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Filter sheet */}
      <Modal
        visible={filtersOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFiltersOpen(false)}>
        <AnimatedTouchableOpacity
          style={[styles.overlay, overlayAnimatedStyle]}
          activeOpacity={1}
          onPress={() => {
            // With both the sheet and keyboard open, a tap outside the
            // sheet should only dismiss the keyboard — closing the sheet
            // too would be a second, unrequested action from one tap.
            // Closing the sheet is reserved for when it's the only thing
            // open.
            if (Keyboard.isVisible()) {
              Keyboard.dismiss();
            } else {
              setFiltersOpen(false);
            }
          }}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filter reports</Text>
              <TouchableOpacity onPress={() => setFiltersOpen(false)}>
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <SelectField
              label="Region"
              value={province || ALL_OPTION}
              options={[ALL_OPTION, ...provinceOptions]}
              onSelect={v => {
                setProvince(v === ALL_OPTION ? '' : v);
                setPage(1);
              }}
              style={styles.filterField}
            />

            <SelectField
              label="Inspection report type"
              value={selectedReportTypeLabel}
              options={[ALL_OPTION, ...REPORT_TYPE_OPTIONS.map(o => o.label)]}
              onSelect={v => {
                setReportType(v === ALL_OPTION ? '' : REPORT_TYPE_OPTIONS.find(o => o.label === v)?.value ?? '');
                setPage(1);
              }}
              style={styles.filterField}
            />

            <View style={styles.dateRow}>
              <DateField label="From" value={dateFrom} onChange={v => { setDateFrom(v); setPage(1); }} style={styles.dateField} />
              <DateField label="To" value={dateTo} onChange={v => { setDateTo(v); setPage(1); }} style={styles.dateField} />
            </View>

            <SelectField
              label="Sort by date"
              value={selectedSortLabel}
              options={SORT_OPTIONS.map(o => o.label)}
              onSelect={v => {
                setSortOrder(SORT_OPTIONS.find(o => o.label === v)?.key ?? 'newest');
              }}
              style={styles.filterField}
            />

            <TouchableOpacity style={styles.clearBtn} onPress={clearFilters} activeOpacity={0.75}>
              <Text style={styles.clearBtnText}>Clear all filters</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </AnimatedTouchableOpacity>
      </Modal>
    </View>
  );
});

ManageReportsTab.displayName = 'ManageReportsTab';

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  centeredState: {
    alignItems: 'center',
    paddingTop: 48,
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  filterBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  filterBtnActive: {
    backgroundColor: Colors.navy,
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: '#e74c3c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textWhite,
  },
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
  },
  // SelectField's own `group` style sets `flex: 1` for when it's used
  // side-by-side in a form row — stacked standalone here, that flex-basis-0
  // sizing collapses the field to near-zero height (its column parent, the
  // filter sheet, only has a maxHeight cap, not a definite height, so there's
  // no resolvable "extra space" for it to grow into). Clearing it back to
  // Yoga's default (content-sized) fixes the squished/overlapping layout.
  filterField: {
    flex: undefined,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  // Unlike filterField above, these two ARE meant to keep flex: 1 — they
  // share a row (a definite-width flex container), so it correctly splits
  // width 50/50 instead of collapsing height.
  dateField: {
    flex: 1,
  },
  clearBtn: {
    alignSelf: 'center',
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.conflict,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.bgLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  filterChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  filterChipTextActive: {
    color: Colors.textWhite,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.textMuted,
    fontFamily: 'monospace',
  },
  sectionCount: {
    fontSize: 10,
    color: Colors.textLight,
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  pageArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
  },
  pageArrowText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  pageDisabled: {
    color: Colors.textLight,
  },
  pageNum: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgLight,
  },
  pageNumActive: {
    backgroundColor: Colors.navy,
  },
  pageNumText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  pageNumTextActive: {
    color: Colors.textWhite,
  },
  pageDots: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
