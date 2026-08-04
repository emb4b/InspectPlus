import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import type { MockEstablishment, ComplianceTag } from '../data/mockEstablishments';

interface EstablishmentCardProps {
  item: MockEstablishment;
  onAdd?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const TAG_STYLES: Record<ComplianceTag, { bg: string; text: string; icon: string }> = {
  'Air Monitoring':   { bg: '#e0f0f8', text: '#2c7da0', icon: 'partly-sunny-outline' },
  'Water Monitoring': { bg: '#ddf3e4', text: '#2d7a52', icon: 'water-outline' },
  'Hazwaste':         { bg: '#fce8e8', text: '#c0392b', icon: 'warning-outline' },
  'Survey':           { bg: '#fef3cd', text: '#8a6200', icon: 'leaf-outline' },
  'EIA':              { bg: '#ede9fe', text: '#5b21b6', icon: 'globe-outline' },
};

const MAX_VISIBLE_TAGS = 3;

export const EstablishmentCard: React.FC<EstablishmentCardProps> = ({
  item,
  onAdd,
  onEdit,
  onDelete,
}) => {
  const visibleTags = item.tags.slice(0, MAX_VISIBLE_TAGS);
  const overflowCount = item.tags.length - MAX_VISIBLE_TAGS;

  return (
    <View style={styles.card}>
      {/* Left: establishment icon */}
      <View style={styles.iconWrap}>
        <Ionicons name="business" size={22} color="#94a3b8" />
      </View>

      {/* Center: content */}
      <View style={styles.content}>
        {/* Top row: name + action buttons */}
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.btnAdd}
              onPress={() => onAdd?.(item.id)}
              activeOpacity={0.75}>
              <Text style={styles.btnAddText}>+ Add</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnEdit}
              onPress={() => onEdit?.(item.id)}
              activeOpacity={0.75}>
              <Ionicons name="pencil" size={10} color={Colors.textWhite} />
              <Text style={styles.btnEditText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnDelete}
              onPress={() => onDelete?.(item.id)}
              activeOpacity={0.75}>
              <Ionicons name="trash-outline" size={12} color={Colors.textWhite} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Location */}
        <View style={styles.locationRow}>
          <Ionicons name="location" size={10} color="#e74c3c" />
          <Text style={styles.location}>{item.location}</Text>
        </View>

        {/* Tags */}
        <View style={styles.tagRow}>
          {visibleTags.map(tag => {
            const s = TAG_STYLES[tag];
            return (
              <View key={tag} style={[styles.tag, { backgroundColor: s.bg }]}>
                <Ionicons name={s.icon as any} size={9} color={s.text} />
                <Text style={[styles.tagText, { color: s.text }]}>{tag}</Text>
              </View>
            );
          })}
          {overflowCount > 0 && (
            <View style={styles.tagOverflow}>
              <Text style={styles.tagOverflowText}>+{overflowCount} more</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
    gap: 6,
  },
  name: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
    flexShrink: 0,
  },
  btnAdd: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  btnAddText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  btnEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: Colors.navy,
  },
  btnEditText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textWhite,
  },
  btnDelete: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: '#e74c3c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 7,
  },
  location: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '600',
  },
  tagOverflow: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
  },
  tagOverflowText: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textMuted,
  },
});
