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
import type { EstablishmentDTO, ComplianceTag } from '../types';

interface EstablishmentCardProps {
  item: EstablishmentDTO;
  onPress?: (item: EstablishmentDTO) => void;
  onAdd?: (item: EstablishmentDTO) => void;
  onEdit?: (item: EstablishmentDTO) => void;
  onDelete?: (item: EstablishmentDTO) => void;
}

const TAG_STYLES: Record<ComplianceTag, { bg: string; text: string; icon: string }> = {
  'Air Monitoring':   { bg: '#e0f0f8', text: '#2c7da0', icon: 'partly-sunny-outline' },
  'Water Monitoring': { bg: '#ddf3e4', text: '#2d7a52', icon: 'water-outline' },
  'Hazwaste':         { bg: '#fce8e8', text: '#c0392b', icon: 'warning-outline' },
  'Survey':           { bg: '#fef3cd', text: '#8a6200', icon: 'leaf-outline' },
  'EIA':              { bg: '#ede9fe', text: '#5b21b6', icon: 'globe-outline' },
};

const MAX_VISIBLE_TAGS = 3;

// Full-size action buttons revealed by swiping the card left — sized for a
// comfortable tap target (unlike the old cramped inline pill buttons).
const ACTION_WIDTH = 72;
const REVEAL_WIDTH = ACTION_WIDTH * 3;
const OPEN_THRESHOLD = REVEAL_WIDTH * 0.4;

export const EstablishmentCard: React.FC<EstablishmentCardProps> = ({
  item,
  onPress,
  onAdd,
  onEdit,
  onDelete,
}) => {
  const visibleTags = item.complianceTags.slice(0, MAX_VISIBLE_TAGS);
  const overflowCount = item.complianceTags.length - MAX_VISIBLE_TAGS;

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
      translateX.value = Math.min(0, Math.max(-REVEAL_WIDTH, startX.value + e.translationX));
    })
    .onEnd(() => {
      translateX.value = withTiming(
        translateX.value < -OPEN_THRESHOLD ? -REVEAL_WIDTH : 0,
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
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionEdit]}
          onPress={() => handleAction(onEdit)}
          activeOpacity={0.8}>
          <Ionicons name="pencil" size={20} color={Colors.textWhite} />
          <Text style={styles.actionEditText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionDelete]}
          onPress={() => handleAction(onDelete)}
          activeOpacity={0.8}>
          <Ionicons name="trash-outline" size={20} color={Colors.textWhite} />
          <Text style={styles.actionDeleteText}>Delete</Text>
        </TouchableOpacity>
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
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>

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
                <View style={styles.syncRow}>
                  <Ionicons name="alert-circle-outline" size={10} color={Colors.conflict} />
                  <Text style={[styles.syncText, { color: Colors.conflict }]}>Sync conflict</Text>
                </View>
              )}

              {/* Compliance tags */}
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
