import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '../../../components/Button';
import { Colors } from '../../../design/colors';
import { Elevation } from '../../../design/elevation';
import { Radius } from '../../../design/radius';
import { Spacing } from '../../../design/spacing';
import { Type } from '../../../design/typography';
import { GENERATE_BOTTOM_GAP } from '../exportLayout';
import type { ExportPhase } from '../hooks/useExportReports';

interface ExportProgressBarProps {
  phase: ExportPhase;
  onCancel: () => void;
  onRetry: () => void;
  onDismiss: () => void;
}

// Replaces the selection bar while an export runs and until its outcome is
// dismissed. Registered through useScreenFooter by ExportReportsTab.
export const ExportProgressBar: React.FC<ExportProgressBarProps> = ({ phase, onCancel, onRetry, onDismiss }) => {
  if (phase.status === 'running') {
    const { index, total, title } = phase.progress;
    const fraction = total > 0 ? Math.max(0, index - 1) / total : 0;
    return (
      <View style={styles.bar}>
        <Text style={styles.heading}>{index > 0 ? `Generating ${index} of ${total}` : 'Preparing…'}</Text>
        {!!title && <Text style={styles.detail} numberOfLines={1}>{title}</Text>}
        <View style={styles.track}><View style={[styles.fill, { width: `${Math.round(fraction * 100)}%` }]} /></View>
        <Button label="Cancel" onPress={onCancel} variant="outline" size="md" fullWidth />
      </View>
    );
  }
  if (phase.status === 'error') {
    return (
      <View style={styles.bar}>
        <Text style={styles.heading}>Export failed</Text>
        <Text style={styles.detail}>{phase.message}</Text>
        <View style={styles.actions}>
          <Button label="Retry" onPress={onRetry} variant="primary" size="md" style={styles.action} />
          <Button label="Dismiss" onPress={onDismiss} variant="outline" size="md" style={styles.action} />
        </View>
      </View>
    );
  }
  if (phase.status === 'done') {
    const { succeeded, failures, skippedPhotos, cancelled } = phase.result;
    const summary = [
      cancelled ? 'Cancelled — ' : '',
      `${succeeded} ${succeeded === 1 ? 'report' : 'reports'} generated`,
      skippedPhotos > 0 ? `, ${skippedPhotos} ${skippedPhotos === 1 ? 'photo' : 'photos'} not downloaded` : '',
    ].join('');
    return (
      <View style={styles.bar}>
        <Text style={styles.heading}>{summary}</Text>
        {failures.map(f => (
          <Text key={f.key} style={styles.failure}>{`${f.title}: ${f.reason}`}</Text>
        ))}
        <View style={styles.actions}>
          {failures.length > 0 && <Button label="Retry failed" onPress={onRetry} variant="primary" size="md" style={styles.action} />}
          <Button label="Done" onPress={onDismiss} variant="outline" size="md" style={styles.action} />
        </View>
      </View>
    );
  }
  return null;
};

const styles = StyleSheet.create({
  // This bar replaces the selection bar during a run, and paddingTop/paddingHorizontal
  // stay Spacing.lg like it — but paddingBottom matches GENERATE_BOTTOM_GAP so
  // Cancel/Retry/Done don't jump relative to where Generate sat (see exportLayout.ts).
  bar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingBottom: GENERATE_BOTTOM_GAP,
    gap: Spacing.sm,
    ...Elevation.overlay,
  },
  heading: { fontSize: Type.subheading.fontSize, lineHeight: Type.subheading.lineHeight, fontWeight: '700', color: Colors.textPrimary },
  detail: { fontSize: Type.bodySm.fontSize, lineHeight: Type.bodySm.lineHeight, color: Colors.textMuted },
  failure: { fontSize: Type.caption.fontSize, lineHeight: Type.caption.lineHeight, color: Colors.conflict },
  track: { height: 6, borderRadius: Radius.pill, backgroundColor: Colors.bgLight, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: Colors.accent },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  action: { flex: 1 },
});
