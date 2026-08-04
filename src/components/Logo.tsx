import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

interface LogoProps {
  width?: number;
  height?: number;
}

export const Logo: React.FC<LogoProps> = ({ width = 220, height = 68 }) => {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/inspect_plus_logo.png')}
        style={{ width, height }}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
});
