import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { EstablishmentCard } from './EstablishmentCard';
import {
  MOCK_ESTABLISHMENTS,
} from '../data/mockEstablishments';

const PAGE_SIZE = 5;

export const ManageReportsTab: React.FC = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return MOCK_ESTABLISHMENTS;
    return MOCK_ESTABLISHMENTS.filter(
      e =>
        e.name.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q),
    );
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = (text: string) => {
    setSearch(text);
    setPage(1);
  };

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
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Section label */}
      <Text style={styles.sectionLabel}>EXISTING ESTABLISHMENTS</Text>

      {/* Establishment list */}
      {paginated.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="business-outline" size={40} color={Colors.border} />
          <Text style={styles.emptyText}>No establishments found.</Text>
        </View>
      ) : (
        paginated.map(item => (
          <EstablishmentCard
            key={item.id}
            item={item}
            onAdd={id => console.log('Add report for:', id)}
            onEdit={id => console.log('Edit:', id)}
            onDelete={id => console.log('Delete:', id)}
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
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
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
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.textMuted,
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 48,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
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
