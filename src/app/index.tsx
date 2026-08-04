import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';
import { BrandLockup } from '../components/BrandLockup';
import { LoginForm } from '../features/auth/components/LoginForm';
import { AgencyLogos } from '../features/auth/components/AgencyLogos';
import { HomeFooter } from '../features/home/components/HomeFooter';

export default function LoginScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />

      {/* Gradient header — navy left → green right */}
      <LinearGradient
        colors={[Colors.navy, '#0a7a3e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerBar}
      />

      {/* Scrollable body */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Logo */}
        <View style={styles.logoWrap}>
          <BrandLockup />
        </View>

        {/* Login form */}
        <LoginForm />

        {/* Agency logos */}
        <AgencyLogos />
      </ScrollView>

      {/* Gradient footer with credits — non-authenticated pages only */}
      <HomeFooter showCredits />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  headerBar: {
    height: 56,
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 36,
    paddingBottom: 24,
    flexGrow: 1,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 32,
  },
});
