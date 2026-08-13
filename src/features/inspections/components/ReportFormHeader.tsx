import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../../../constants/colors';
import { TwoRowTabs, TwoRowMainTabDef } from './TwoRowTabs';

interface ReportFormHeaderProps {
  establishmentName: string;
  establishmentLocation: string;
  typeLabel: string;
  typeColor: string;
  typeBgColor: string;
  tabs: TwoRowMainTabDef[];
  activeMain: string;
  onMainChange: (key: string) => void;
}

export const ReportFormHeader: React.FC<ReportFormHeaderProps> = ({
  establishmentName,
  establishmentLocation,
  typeLabel,
  typeColor,
  typeBgColor,
  tabs,
  activeMain,
  onMainChange,
}) => (
  <View style={styles.container}>
    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
      <Ionicons name="chevron-back" size={16} color={Colors.navy} />
      <Text style={styles.backText}>Back</Text>
    </TouchableOpacity>

    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name="business" size={16} color={Colors.green} />
      </View>
      <View style={styles.titleInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{establishmentName}</Text>
          <View style={[styles.pill, { backgroundColor: typeBgColor }]}>
            <Ionicons name="water" size={11} color={typeColor} />
            <Text style={[styles.pillText, { color: typeColor }]}>{typeLabel}</Text>
          </View>
        </View>
        <Text style={styles.location} numberOfLines={1}>{establishmentLocation}</Text>
      </View>
    </View>

    <View style={styles.tabRow}>
      <TwoRowTabs tabs={tabs} activeMain={activeMain} onMainChange={onMainChange} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
  },
  backText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.navy,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 12,
    marginTop: 4,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: Colors.textPrimary,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: Colors.greenMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.navy,
    flexShrink: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  location: {
    fontSize: 11.5,
    color: Colors.textMuted,
    marginTop: 2,
  },
  tabRow: {
    marginTop: 8,
    paddingBottom: 8,
  },
});
