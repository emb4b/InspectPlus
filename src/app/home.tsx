import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { HomeHeader } from '../features/home/components/HomeHeader';
import { HomeTabs, HomeTab } from '../features/home/components/HomeTabs';
import { HomeFooter } from '../features/home/components/HomeFooter';
import { CreateNewReportTab } from '../features/inspections/components/CreateNewReportTab';
import { ManageReportsTab } from '../features/establishments/components/ManageReportsTab';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ── Import/Export placeholder ─────────────────────────────────────────────────

const ImportExportTab: React.FC = () => (
  <View style={styles.placeholderWrap}>
    <Text style={styles.placeholderTitle}>Import / Export Reports</Text>
    <Text style={styles.placeholderSub}>This feature is coming soon.</Text>
  </View>
);

// ── Main screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<HomeTab>('create');

  const renderTab = () => {
    switch (activeTab) {
      case 'create':
        return <CreateNewReportTab />;
      case 'manage':
        return <ManageReportsTab />;
      case 'export':
        return <ImportExportTab />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />

      {/* Fixed gradient header */}
      <HomeHeader />

      {/* Welcome section + sticky tab bar */}
      <View style={styles.welcomeWrap}>
        <Text style={styles.welcomeText}>Welcome back, Inspector!</Text>
        <Text style={styles.dateText}>
          {getFormattedDate()} · EMB Region 4-B
        </Text>
      </View>

      {/* Sticky tab bar */}
      <HomeTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Scrollable tab content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {renderTab()}
      </ScrollView>

      {/* Fixed gradient footer */}
      <HomeFooter />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  welcomeWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: Colors.white,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.navy,
    fontStyle: 'italic',
  },
  dateText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 3,
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollContent: {
    flexGrow: 1,
  },
  placeholderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    gap: 10,
  },
  placeholderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  placeholderSub: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
