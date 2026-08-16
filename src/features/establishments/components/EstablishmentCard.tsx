import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { REPORT_TYPES, ReportTypeKey } from '../../../constants/reportTypes';
import { confirmResolveConflict } from '../../../services/sync/syncConflictResolution';
import type { EstablishmentDTO, ComplianceTag } from '../types';

interface EstablishmentCardProps {
  item: EstablishmentDTO;
  onPress?: (item: EstablishmentDTO) => void;
  onAdd?: (item: EstablishmentDTO) => void;
  onEdit?: (item: EstablishmentDTO) => void;
  onDelete?: (item: EstablishmentDTO) => void;
}

// ComplianceTag (the establishment-level rollup label — see
// REPORT_TYPE_TO_TAG in useEstablishment.ts) -> the ReportTypeKey that
// carries its law citation, color scheme, and icon in REPORT_TYPES — the
// same source InspectionReportHeader's type-flag pill reads from. One
// lookup here instead of a second, separately-hardcoded style map means a
// tag's law/colors/icon can never drift from what the report screens show
// for that same type, and a new report type only ever needs adding once.
const TAG_TO_REPORT_TYPE_KEY: Record<ComplianceTag, ReportTypeKey> = {
  'Air Monitoring': 'air',
  'Water Monitoring': 'water',
  'Hazwaste': 'hazwaste_generator',
  'EIA': 'eia',
  'Survey': 'survey',
};

function getTagMeta(tag: ComplianceTag) {
  const found = REPORT_TYPES.find(t => t.key === TAG_TO_REPORT_TYPE_KEY[tag]);
  if (!found) {
    return { label: tag, bg: Colors.bgLight, text: Colors.textMuted, IconAsset: undefined };
  }
  return { label: found.law || found.title, bg: found.bgColor, text: found.textColor, IconAsset: found.iconAsset };
}

const MAX_VISIBLE_TAGS = 3;

// Full-size action buttons revealed by swiping the card left — sized for a
// comfortable tap target (unlike the old cramped inline pill buttons).
const ACTION_WIDTH = 72;
const OPEN_THRESHOLD_RATIO = 0.4;

export const EstablishmentCard: React.FC<EstablishmentCardProps> = ({
  item,
  onPress,
  onAdd,
  onEdit,
  onDelete,
}) => {
  const visibleTags = item.complianceTags.slice(0, MAX_VISIBLE_TAGS);
  const overflowCount = item.complianceTags.length - MAX_VISIBLE_TAGS;

  // Edit/Delete are owner-only actions (see ManageEstablishmentsTab) — the
  // caller passes undefined for a jurisdiction-visible establishment that
  // isn't the current user's own, so those buttons (and the swipe distance
  // needed to reveal them) simply don't exist rather than rendering as
  // dead taps.
  const visibleActionCount = 1 + (onEdit ? 1 : 0) + (onDelete ? 1 : 0);
  const revealWidth = ACTION_WIDTH * visibleActionCount;
  const openThreshold = revealWidth * OPEN_THRESHOLD_RATIO;

  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const close = () => {
    translateX.value = withTiming(0, { duration: 200 });
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-8, 8])
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate(e => {
      translateX.value = Math.min(0, Math.max(-revealWidth, startX.value + e.translationX));
    })
    .onEnd(() => {
      translateX.value = withTiming(
        translateX.value < -openThreshold ? -revealWidth : 0,
        { duration: 200 },
      );
    });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // A tap while the row is swiped open snaps it shut instead of navigating —
  // the standard swipe-actions convention.
  const handleCardPress = () => {
    if (translateX.value < -1) {
      close();
      return;
    }
    onPress?.(item);
  };

  const handleAction = (handler?: (item: EstablishmentDTO) => void) => {
    close();
    handler?.(item);
  };

  return (
    <View style={styles.rowWrap}>
      {/* Actions revealed behind the card when swiped left */}
      <View style={styles.swipeActions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionAdd]}
          onPress={() => handleAction(onAdd)}
          activeOpacity={0.8}>
          <Ionicons name="add-circle-outline" size={22} color={Colors.textSecondary} />
          <Text style={styles.actionAddText}>Add</Text>
        </TouchableOpacity>
        {onEdit && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionEdit]}
            onPress={() => handleAction(onEdit)}
            activeOpacity={0.8}>
            <Ionicons name="pencil" size={20} color={Colors.textWhite} />
            <Text style={styles.actionEditText}>Edit</Text>
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionDelete]}
            onPress={() => handleAction(onDelete)}
            activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={20} color={Colors.textWhite} />
            <Text style={styles.actionDeleteText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Foreground card — slides left via gesture to reveal the actions */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={cardAnimatedStyle}>
          <TouchableOpacity
            style={styles.card}
            onPress={handleCardPress}
            activeOpacity={onPress ? 0.9 : 1}
            disabled={!onPress}>
            {/* Icon */}
            <View style={styles.iconWrap}>
              <Ionicons name="business" size={22} color="#94a3b8" />
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.name} numberOfLines={2}>{item.name}</Text>

              {/* Location */}
              <View style={styles.locationRow}>
                <Ionicons name="location" size={10} color="#e74c3c" />
                <Text style={styles.location}>{item.addressLine}, {item.city}, {item.province}</Text>
              </View>

              {/* Sync status indicator */}
              {item.syncStatus === 'pending' && (
                <View style={styles.syncRow}>
                  <Ionicons name="cloud-upload-outline" size={10} color={Colors.pending} />
                  <Text style={styles.syncText}>Pending sync</Text>
                </View>
              )}
              {item.syncStatus === 'conflict' && (
                <TouchableOpacity
                  style={styles.syncRow}
                  onPress={() => confirmResolveConflict('establishments', item.estabId, item.name)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Ionicons name="alert-circle-outline" size={10} color={Colors.conflict} />
                  <Text style={[styles.syncText, { color: Colors.conflict }]}>Sync conflict</Text>
                </TouchableOpacity>
              )}

              {/* Compliance tags */}
              <View style={styles.tagRow}>
                {visibleTags.map(tag => {
                  const meta = getTagMeta(tag);
                  return (
                    <View key={tag} style={[styles.tag, { backgroundColor: meta.bg }]}>
                      {meta.IconAsset && <meta.IconAsset width={9} height={9} />}
                      <Text style={[styles.tagText, { color: meta.text }]} numberOfLines={1}>
                        {meta.label}
                      </Text>
                    </View>
                  );
                })}
                {overflowCount > 0 && (
                  <View style={styles.tagOverflow}>
                    <Text style={styles.tagOverflowText}>+{overflowCount} more</Text>
                  </View>
                )}

                {/* Empty state — no reports yet */}
                {item.complianceTags.length === 0 && (
                  <Text style={styles.noTags}>No reports yet</Text>
                )}
              </View>
            </View>

            {/* Chevron */}
            <Ionicons name="chevron-forward" size={14} color={Colors.textLight} />
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  rowWrap: {
    marginBottom: 10,
  },
  swipeActions: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
  },
  actionBtn: {
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionAdd: {
    backgroundColor: '#f1f5f9',
  },
  actionAddText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  actionEdit: {
    backgroundColor: Colors.navy,
  },
  actionEditText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textWhite,
  },
  actionDelete: {
    backgroundColor: '#e74c3c',
  },
  actionDeleteText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textWhite,
  },
  card: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
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
  name: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  location: {
    fontSize: 10,
    color: Colors.textMuted,
    flex: 1,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  syncText: {
    fontSize: 9,
    color: Colors.pending,
    fontWeight: '600',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 2,
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
  noTags: {
    fontSize: 9,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
});
