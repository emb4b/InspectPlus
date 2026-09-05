import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { Colors } from '../../design/colors';
import { Spacing } from '../../design/spacing';
import { Type } from '../../design/typography';
import { useAuthContext } from '../../core/providers/AuthProvider';
import { HomeTabs, HomeTab } from '../../features/home/components/HomeTabs';
import {
  ManageEstablishmentsTab,
  ManageEstablishmentsTabHandle,
} from '../../features/establishments/components/ManageEstablishmentsTab';
import {
  ManageReportsTab,
  ManageReportsTabHandle,
} from '../../features/establishments/components/ManageReportsTab';
import {
  ExportReportsTab,
  ExportReportsTabHandle,
} from '../../features/establishments/components/ExportReportsTab';
import { subscribeToSyncDataChanged } from '../../services/sync/syncEvents';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getFormattedTime(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { fullName } = useAuthContext();
  const [activeTab, setActiveTab] = useState<HomeTab>('manageReports');
  const [refreshing, setRefreshing] = useState(false);
  const manageEstablishmentsRef = useRef<ManageEstablishmentsTabHandle>(null);
  const manageReportsRef = useRef<ManageReportsTabHandle>(null);
  const exportReportsRef = useRef<ExportReportsTabHandle>(null);
  const firstName = fullName?.trim().split(/\s+/)[0] ?? 'Inspector';

  // Ticks the header clock once a second — cheap enough given it's just one
  // small Text re-render, and keeps the displayed time actually live.
  const [currentTime, setCurrentTime] = useState(getFormattedTime());
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(getFormattedTime()), 1000);
    return () => clearInterval(id);
  }, []);

  // A sync can complete while Home is already mounted and focused (the
  // manual "Sync Now" button, or the post-login sync landing right as this
  // screen appears) — pull-to-refresh alone wouldn't pick that up, so all
  // three tabs also refetch whenever local data changes for any reason.
  useEffect(() => {
    return subscribeToSyncDataChanged(() => {
      manageEstablishmentsRef.current?.refresh();
      manageReportsRef.current?.refresh();
      exportReportsRef.current?.refresh();
    });
  }, []);

  const renderTab = () => {
    switch (activeTab) {
      case 'manageReports':
        return <ManageReportsTab ref={manageReportsRef} />;
      case 'manageEstablishments':
        return <ManageEstablishmentsTab ref={manageEstablishmentsRef} />;
      case 'exportReports':
        return <ExportReportsTab ref={exportReportsRef} />;
    }
  };

  // Pull-to-refresh reloads the active tab's data.
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'manageEstablishments') {
        await manageEstablishmentsRef.current?.refresh();
      } else if (activeTab === 'manageReports') {
        await manageReportsRef.current?.refresh();
      } else if (activeTab === 'exportReports') {
        await exportReportsRef.current?.refresh();
      }
    } finally {
      setRefreshing(false);
    }
  }, [activeTab]);

  return (
    <View style={styles.screen}>
      {/* Welcome section + sticky tab bar */}
      <View style={styles.welcomeWrap}>
        <Text style={styles.welcomeText}>Welcome back, {firstName}!</Text>
        <Text style={styles.dateText}>
          {getFormattedDate()} · {currentTime} · EMB Region 4-B
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
  },
  welcomeText: {
    fontSize: Type.display.fontSize,
    lineHeight: Type.display.lineHeight,
    fontWeight: '800',
    color: Colors.navy,
    fontStyle: 'italic',
  },
  dateText: {
    fontSize: Type.label.fontSize,
    lineHeight: Type.label.lineHeight,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
