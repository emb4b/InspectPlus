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
import { EstablishmentCard } from './EstablishmentCard';
import { useEstablishments } from '../hooks/useEstablishment';
import type { EstablishmentDTO } from '../types';

const PAGE_SIZE = 5;

export interface ManageEstablishmentsTabHandle {
  refresh: () => Promise<void>;
}

export const ManageEstablishmentsTab = forwardRef<ManageEstablishmentsTabHandle>((_props, ref) => {
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);

  // Real WatermelonDB query — replaces MOCK_ESTABLISHMENTS
  const { establishments, loading, error, refetch } = useEstablishments(search);

  // Exposes an awaitable refresh to the parent screen's pull-to-refresh.
  useImperativeHandle(ref, () => ({ refresh: refetch }), [refetch]);

  const totalPages = Math.max(1, Math.ceil(establishments.length / PAGE_SIZE));
  const paginated  = establishments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    setPage(1);
  }, []);

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
      {/* Search */}
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
            {search ? 'No establishments match your search.' : 'No establishments yet.'}
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    paddingVertical: 0,
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
