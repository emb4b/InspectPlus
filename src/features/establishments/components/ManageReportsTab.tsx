import React, { useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../../../constants/colors';
import { ReportListCard } from './ReportListCard';
import { useAllReports, AllReportItem, ReportStatusFilter } from '../hooks/useEstablishment';

const PAGE_SIZE = 5;

const STATUS_FILTERS: { key: ReportStatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'submitted', label: 'Submitted' },
];

export interface ManageReportsTabHandle {
  refresh: () => Promise<void>;
}

export const ManageReportsTab = forwardRef<ManageReportsTabHandle>((_props, ref) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>('all');
  const [page, setPage] = useState(1);

  const { reports, loading, error, refetch } = useAllReports(search, statusFilter);

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
      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={14} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by establishment, report, or control no..."
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
            {search || statusFilter !== 'all' ? 'No reports match your filters.' : 'No reports yet.'}
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    paddingVertical: 0,
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
