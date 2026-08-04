import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReportType } from '../../../constants/reportTypes';

interface ReportTypeCardProps {
  item: ReportType;
}

// Every thumbnail — SVG illustration or icon-font fallback — renders at this
// exact box so the grid reads as uniform regardless of each source's own
// aspect ratio or viewBox.
const ICON_SIZE = 44;

export const ReportTypeCard: React.FC<ReportTypeCardProps> = ({ item }) => {
  const IconComponent = item.iconLibrary === 'MaterialCommunityIcons' ? MaterialCommunityIcons : Ionicons;
  const IconAsset = item.iconAsset;

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
        {IconAsset ? (
          <IconAsset width={ICON_SIZE} height={ICON_SIZE} />
        ) : (
          <IconComponent name={item.iconName as any} size={ICON_SIZE} color={item.textColor} />
        )}
      </View>
      <Text style={[styles.law, { color: item.textColor }]}>{item.law}</Text>
      <Text style={styles.title}>{item.title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    minHeight: 150,
    justifyContent: 'center',
  },
  iconWrap: {
    marginBottom: 12,
    height: ICON_SIZE,
    width: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  law: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  title: {
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 16,
  },
});
