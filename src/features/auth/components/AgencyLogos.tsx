import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

export const AgencyLogos: React.FC = () => {
  return (
    <View style={styles.row}>
      <Image
        source={require('../../../../assets/denr_logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Image
        source={require('../../../../assets/bagong_pilipinas_logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    paddingTop: 24,
  },
  logo: {
    width: 64,
    height: 64,
  },
});
