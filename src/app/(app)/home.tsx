import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { HomeTabs, HomeTab } from '../../features/home/components/HomeTabs';
import { CreateNewReportTab } from '../../features/inspections/components/CreateNewReportTab';
import {
  ManageEstablishmentsTab,
  ManageEstablishmentsTabHandle,
} from '../../features/establishments/components/ManageEstablishmentsTab';
import {
  ManageReportsTab,
  ManageReportsTabHandle,
} from '../../features/establishments/components/ManageReportsTab';

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
  const [refreshing, setRefreshing] = useState(false);
  const manageEstablishmentsRef = useRef<ManageEstablishmentsTabHandle>(null);
  const manageReportsRef = useRef<ManageReportsTabHandle>(null);

  const renderTab = () => {
    switch (activeTab) {
      case 'create':
        return <CreateNewReportTab />;
      case 'manageEstablishments':
        return <ManageEstablishmentsTab ref={manageEstablishmentsRef} />;
      case 'manageReports':
        return <ManageReportsTab ref={manageReportsRef} />;
      case 'export':
        return <ImportExportTab />;
    }
  };

  // Pull-to-refresh reloads the active tab's data. The "create" and "export"
  // tabs are static, so the gesture just settles back for those.
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'manageEstablishments') {
        await manageEstablishmentsRef.current?.refresh();
      } else if (activeTab === 'manageReports') {
        await manageReportsRef.current?.refresh();
      }
    } finally {
      setRefreshing(false);
    }
  }, [activeTab]);

  return (
    <View style={styles.screen}>
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
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.navy}
            colors={[Colors.navy]}
          />
        }>
        {renderTab()}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
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
