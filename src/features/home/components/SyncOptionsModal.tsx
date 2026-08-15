import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { RadioGroup } from '../../../components/form';

export type SyncDirection = 'both' | 'pull' | 'push';

const DIRECTION_OPTIONS = [
  { label: 'Pull only', value: 'pull' },
  { label: 'Push only', value: 'push' },
  { label: 'Pull & Push', value: 'both' },
];

interface SyncOptionsModalProps {
  visible: boolean;
  syncing: boolean;
  onCancel: () => void;
  onSync: (direction: SyncDirection) => void;
}

export const SyncOptionsModal: React.FC<SyncOptionsModalProps> = ({
  visible,
  syncing,
  onCancel,
  onSync,
}) => {
  const [direction, setDirection] = useState<SyncDirection>('both');

  // Reset back to the default choice each time the modal is reopened,
  // rather than remembering the last selection across syncs.
  useEffect(() => {
    if (visible) {
      setDirection('both');
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      {/* Tapping the dimmed backdrop dismisses the modal, same as the close
          button/Cancel — but not while a sync is in flight, so a stray tap
          can't abandon the request. The inner TouchableWithoutFeedback is a
          no-op that just claims the touch first so taps on the card itself
          don't fall through to the backdrop's handler. Modal's content must
          stay a plain View at the root (not a Touchable) for correct
          layout, so the touch handling is layered around it instead of
          replacing it. */}
      <TouchableWithoutFeedback onPress={onCancel} disabled={syncing}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.card}>
              <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                  <Ionicons name="sync-outline" size={16} color={Colors.textWhite} />
                  <Text style={styles.headerTitle}>Sync with Server</Text>
                </View>
                <TouchableOpacity onPress={onCancel} style={styles.closeBtn} disabled={syncing}>
                  <Ionicons name="close" size={16} color={Colors.textWhite} />
                </TouchableOpacity>
              </View>

              <View style={styles.body}>
                <RadioGroup
                  label="Sync Direction"
                  options={DIRECTION_OPTIONS}
                  value={direction}
                  onChange={value => setDirection(value as SyncDirection)}
                  // RadioGroup's own wrapper style sets flex: 1, which is
                  // harmless in the ScrollView it's normally used in but
                  // makes it try to fill the (content-sized, non-scrolling)
                  // modal body here — overriding it back to flex: 0 stops
                  // it from overlapping the hint text below.
                  style={styles.radioGroup}
                />
                <Text style={styles.hint}>
                  {direction === 'pull' && 'Downloads the latest changes from the server without uploading anything from this device.'}
                  {direction === 'push' && 'Uploads changes made on this device without downloading anything from the server.'}
                  {direction === 'both' && 'Uploads changes from this device, then downloads the latest changes from the server.'}
                </Text>
              </View>

              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onCancel}
                  disabled={syncing}
                  activeOpacity={0.7}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.syncBtn, syncing && styles.syncBtnDisabled]}
                  onPress={() => onSync(direction)}
                  disabled={syncing}
                  activeOpacity={0.85}>
                  {syncing ? (
                    <ActivityIndicator size="small" color={Colors.textWhite} />
                  ) : (
                    <>
                      <Text style={styles.syncText}>Start Sync</Text>
                      <Ionicons name="arrow-forward" size={14} color={Colors.textWhite} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: Colors.navy,
    borderBottomWidth: 3,
    borderBottomColor: Colors.green,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textWhite,
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 18,
  },
  radioGroup: {
    flex: 0,
  },
  hint: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 15,
    marginTop: -4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.bgLight,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.green,
  },
  syncBtnDisabled: {
    backgroundColor: Colors.borderLight,
  },
  syncText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textWhite,
  },
});
