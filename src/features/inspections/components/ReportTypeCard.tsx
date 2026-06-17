import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReportType } from '../../../constants/reportTypes';

interface ReportTypeCardProps {
  item: ReportType;
}

export const ReportTypeCard: React.FC<ReportTypeCardProps> = ({ item }) => {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: item.bgColor,
          borderColor: item.borderColor,
        },
      ]}
      activeOpacity={0.75}
      onPress={() => router.push(item.route as any)}>
      <View style={styles.iconWrap}>
        <Ionicons
          name={item.iconName as any}
          size={28}
          color={item.textColor}
        />
      </View>
      <Text style={[styles.law, { color: item.textColor }]}>{item.law}</Text>
      <Text style={styles.title}>{item.title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  iconWrap: {
    marginBottom: 8,
  },
  law: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 3,
    textAlign: 'center',
  },
  title: {
    fontSize: 10,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 14,
  },
});
