import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Keyboard, ScrollView, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TextField } from '../../../components/form';
import { Button } from '../../../components/Button';
import { Colors } from '../../../design/colors';
import { Radius } from '../../../design/radius';
import { Spacing } from '../../../design/spacing';
import { Type } from '../../../design/typography';
import type { Signatories } from '../types';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface SignatorySheetProps {
  visible: boolean;
  initial: Signatories;
  onCancel: () => void;
  onConfirm: (signatories: Signatories) => void;
}

// Asked before every export and remembered, so the second time it's a
// glance and a tap. Positions and the supervisor are free text until the
// admin-defined chain of command exists — see signatories.ts.
export const SignatorySheet: React.FC<SignatorySheetProps> = ({ visible, initial, onCancel, onConfirm }) => {
  const [value, setValue] = useState<Signatories>(initial);
  // `initial` can change identity while the sheet stays open (e.g. an
  // AsyncStorage load resolving after mount) — that shouldn't stomp on
  // edits the user already made. Only reset when the sheet actually opens.
  const initialRef = useRef(initial);
  initialRef.current = initial;
  useEffect(() => { if (visible) setValue(initialRef.current); }, [visible]);
  const { height: keyboardHeight } = useReanimatedKeyboardAnimation();
  const overlayStyle = useAnimatedStyle(() => ({ paddingBottom: -keyboardHeight.value }));
  const set = (key: keyof Signatories) => (text: string) => setValue(v => ({ ...v, [key]: text }));
  const canGenerate = value.inspectorName.trim().length > 0;
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <AnimatedTouchableOpacity
        style={[styles.overlay, overlayStyle]}
        activeOpacity={1}
        onPress={() => (Keyboard.isVisible() ? Keyboard.dismiss() : onCancel())}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>Signatories</Text>
            <TouchableOpacity onPress={onCancel} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <TextField label="Inspector name" value={value.inspectorName} onChangeText={set('inspectorName')} required style={styles.field} />
            <TextField label="Inspector position/designation" value={value.inspectorPosition} onChangeText={set('inspectorPosition')} style={styles.field} />
            <TextField label="Immediate supervisor name" value={value.supervisorName} onChangeText={set('supervisorName')} style={styles.field} />
            <TextField label="Supervisor position/designation" value={value.supervisorPosition} onChangeText={set('supervisorPosition')} style={styles.field} />
            <Text style={styles.sectionHeading}>Approvers</Text>
            <TextField label="Recommending approval — name" value={value.recommendingName} onChangeText={set('recommendingName')} style={styles.field} />
            <TextField label="Recommending approval — position" value={value.recommendingPosition} onChangeText={set('recommendingPosition')} style={styles.field} />
            <TextField label="Approved by — name" value={value.approverName} onChangeText={set('approverName')} style={styles.field} />
            <TextField label="Approved by — position" value={value.approverPosition} onChangeText={set('approverPosition')} style={styles.field} />
            <Text style={styles.hint}>Names and positions are remembered on this phone.</Text>
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: Spacing.lg + insets.bottom }]}>
            <Button label="Generate" onPress={() => onConfirm({
              inspectorName: value.inspectorName.trim(),
              inspectorPosition: value.inspectorPosition.trim(),
              supervisorName: value.supervisorName.trim(),
              supervisorPosition: value.supervisorPosition.trim(),
              recommendingName: value.recommendingName.trim(),
              recommendingPosition: value.recommendingPosition.trim(),
              approverName: value.approverName.trim(),
              approverPosition: value.approverPosition.trim(),
              additionalInspectors: value.additionalInspectors,
            })} variant="primary" size="md" fullWidth disabled={!canGenerate} />
          </View>
        </TouchableOpacity>
      </AnimatedTouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.white, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, height: '85%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, marginBottom: Spacing.md },
  title: { fontSize: Type.subheading.fontSize, lineHeight: Type.subheading.lineHeight, fontWeight: '700', color: Colors.navy },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  field: { flex: undefined },
  sectionHeading: {
    fontSize: Type.label.fontSize,
    lineHeight: Type.label.lineHeight,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: Spacing.sm,
  },
  hint: { fontSize: Type.caption.fontSize, lineHeight: Type.caption.lineHeight, color: Colors.textMuted, marginBottom: Spacing.md },
  footer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
});
