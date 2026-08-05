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
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../../../constants/colors';
import { SelectField } from '../../../components/form';
import { EstablishmentCard } from './EstablishmentCard';
import {
  useEstablishments,
  useEstablishmentFilterOptions,
  EstablishmentFilters,
} from '../hooks/useEstablishment';
import type { EstablishmentDTO, ComplianceTag } from '../types';

const PAGE_SIZE = 5;
const ALL_OPTION = 'All';
const COMPLIANCE_TAG_OPTIONS: ComplianceTag[] = [
  'Air Monitoring',
  'Water Monitoring',
  'Hazwaste',
  'EIA',
  'Survey',
];

export interface ManageEstablishmentsTabHandle {
  refresh: () => Promise<void>;
}

export const ManageEstablishmentsTab = forwardRef<ManageEstablishmentsTabHandle>((_props, ref) => {
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [province, setProvince] = useState('');
  const [inspectorUid, setInspectorUid] = useState('');
  const [complianceTag, setComplianceTag] = useState<ComplianceTag | ''>('');

  const { provinceOptions, inspectorOptions } = useEstablishmentFilterOptions();

  // Stable reference so the filter object only changes when a filter
  // value actually changes — a fresh object literal on every render would
  // re-trigger the data-fetching effect in useEstablishments on a loop.
  const filters: EstablishmentFilters = useMemo(
    () => ({ province, inspectorUid, complianceTag }),
    [province, inspectorUid, complianceTag],
  );
  const activeFilterCount = [province, inspectorUid, complianceTag].filter(Boolean).length;

  // Real WatermelonDB query — replaces MOCK_ESTABLISHMENTS
  const { establishments, loading, error, refetch } = useEstablishments(search, filters);

  // Exposes an awaitable refresh to the parent screen's pull-to-refresh.
  useImperativeHandle(ref, () => ({ refresh: refetch }), [refetch]);

  const totalPages = Math.max(1, Math.ceil(establishments.length / PAGE_SIZE));
  const paginated  = establishments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setProvince('');
    setInspectorUid('');
    setComplianceTag('');
    setPage(1);
  }, []);

  const selectedInspectorName =
    inspectorOptions.find(o => o.uid === inspectorUid)?.name ?? ALL_OPTION;

  // ── Action handlers ─────────────────────────────────────────────────────────
  // Tap the card itself → open the establishment detail screen.
  const handleOpen = useCallback((item: EstablishmentDTO) => {
    router.push({ pathname: '/establishment/[id]', params: { id: item.estabId } });
  }, []);

  // + Add → navigate to report type selection, carrying the establishment id
  // as a param so the form can pre-fill the snapshot from the master record.
  const handleAdd = useCallback((item: EstablishmentDTO) => {
    router.push({
      pathname: '/report/new',
      params: { estabId: item.estabId },
    });
  }, []);

  const handleEdit = useCallback((item: EstablishmentDTO) => {
    // TODO: navigate to establishment edit screen
    console.log('[ManageReports] Edit establishment:', item.estabId);
  }, []);

  const handleDelete = useCallback((item: EstablishmentDTO) => {
    // TODO: show confirmation modal then soft-delete
    console.log('[ManageReports] Delete establishment:', item.estabId);
  }, []);

  // ── Render states ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator size="large" color={Colors.navy} />
        <Text style={styles.stateText}>Loading establishments...</Text>
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

      {/* Section label + count */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionLabel}>EXISTING ESTABLISHMENTS</Text>
        <Text style={styles.sectionCount}>{establishments.length} total</Text>
      </View>

      {/* List */}
      {paginated.length === 0 ? (
        <View style={styles.centeredState}>
          <Ionicons name="business-outline" size={40} color={Colors.border} />
          <Text style={styles.stateText}>
            {search || activeFilterCount > 0
              ? 'No establishments match your search or filters.'
              : 'No establishments yet.'}
          </Text>
        </View>
      ) : (
        paginated.map(item => (
          <EstablishmentCard
            key={item.estabId}
            item={item}
            onPress={handleOpen}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
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
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setFiltersOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filter establishments</Text>
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
              label="Inspector assigned"
              value={selectedInspectorName}
              options={[ALL_OPTION, ...inspectorOptions.map(o => o.name)]}
              onSelect={v => {
                setInspectorUid(v === ALL_OPTION ? '' : inspectorOptions.find(o => o.name === v)?.uid ?? '');
                setPage(1);
              }}
              style={styles.filterField}
            />

            <SelectField
              label="Compliance / inspection type"
              value={complianceTag || ALL_OPTION}
              options={[ALL_OPTION, ...COMPLIANCE_TAG_OPTIONS]}
              onSelect={v => {
                setComplianceTag(v === ALL_OPTION ? '' : (v as ComplianceTag));
                setPage(1);
              }}
              style={styles.filterField}
            />

            <TouchableOpacity style={styles.clearBtn} onPress={clearFilters} activeOpacity={0.75}>
              <Text style={styles.clearBtnText}>Clear all filters</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
});

ManageEstablishmentsTab.displayName = 'ManageEstablishmentsTab';

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
    marginBottom: 14,
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
