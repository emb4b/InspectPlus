import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReportType } from '../../../constants/reportTypes';
import { useGuardedPress } from '../../../utils/useGuardedPress';
import { AppText } from '../../../components/AppText';

interface ReportTypeCardProps {
  item: ReportType;
}

// Every thumbnail — SVG illustration or icon-font fallback — renders at this
// exact box so the grid reads as uniform regardless of each source's own
// aspect ratio or viewBox.
const ICON_SIZE = 40;

export const ReportTypeCard: React.FC<ReportTypeCardProps> = ({ item }) => {
  const IconComponent = item.iconLibrary === 'MaterialCommunityIcons' ? MaterialCommunityIcons : Ionicons;
  const IconAsset = item.iconAsset;
  const handlePress = useGuardedPress(() => router.push(item.route as any));

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
      onPress={handlePress}>
      <View style={styles.iconWrap}>
        {IconAsset ? (
          <IconAsset width={ICON_SIZE} height={ICON_SIZE} />
        ) : (
          <IconComponent name={item.iconName as any} size={ICON_SIZE} color={item.textColor} />
        )}
      </View>
      <AppText
        variant="single"
        text={item.law}
        style={[styles.law, { color: item.textColor }]}
        containerStyle={styles.lawContainer}
      />
      <AppText variant="multiline" text={item.title} style={styles.title} lines={4} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    marginBottom: 10,
    height: ICON_SIZE,
    width: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  law: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  lawContainer: {
    marginBottom: 4,
  },
  title: {
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 16,
  },
});
