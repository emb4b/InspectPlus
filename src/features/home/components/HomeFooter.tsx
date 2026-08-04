import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../../constants/colors';

interface HomeFooterProps {
  // Full credits line is only for non-authenticated pages (e.g. login).
  // Authenticated pages get the plain bar with no text.
  showCredits?: boolean;
}

export const HomeFooter: React.FC<HomeFooterProps> = ({ showCredits = false }) => {
  return (
    <LinearGradient
      colors={[Colors.navy, '#0a7a3e']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={showCredits ? styles.footer : styles.bar}>
      {showCredits && (
        <>
          <Text style={styles.line}>
            © 2026 EMB - Environmental Management Bureau, Region 4-B
          </Text>
          <Text style={styles.line}>
            Ideated by PEMU Oriental Mindoro, Abram Alexander Asi
          </Text>
          <Text style={styles.line}>
            Developed by Jonathan Remonte and Stephanie Kim Pineda
          </Text>
          <Text style={styles.line}>All Rights Reserved</Text>
        </>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  footer: {
    paddingVertical: 4,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  bar: {
    height: 20,
  },
  line: {
    fontSize: 7.5,
    lineHeight: 9,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
});
