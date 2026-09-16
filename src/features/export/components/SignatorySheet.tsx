import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Keyboard, ScrollView, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TextField } from '../../../components/form';
import { Button } from '../../../components/Button';
import { AddRowButton } from '../../../components/AddRowButton';
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
  // True when the selection driving this run spans more than one report
  // type — the approvers shown here (prefilled/remembered for only ONE of
  // those types) still apply to every report the run produces, since
  // there's just one Generate for the whole selection.
  mixedTypes?: boolean;
}

// Asked before every export and remembered, so the second time it's a
// glance and a tap. Positions and the supervisor are free text until the
// admin-defined chain of command exists — see signatories.ts.
export const SignatorySheet: React.FC<SignatorySheetProps> = ({ visible, initial, onCancel, onConfirm, mixedTypes = false }) => {
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

  const updateInspector = (index: number, key: 'name' | 'position', text: string) =>
    setValue(v => ({
      ...v,
      additionalInspectors: v.additionalInspectors.map((insp, i) => (i === index ? { ...insp, [key]: text } : insp)),
    }));
  const removeInspector = (index: number) =>
    setValue(v => ({ ...v, additionalInspectors: v.additionalInspectors.filter((_, i) => i !== index) }));
  const addInspector = () =>
    setValue(v => ({ ...v, additionalInspectors: [...v.additionalInspectors, { name: '', position: '' }] }));

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
            {value.additionalInspectors.map((inspector, index) => (
              // eslint-disable-next-line react/no-array-index-key -- rows have no stable id; index is fine since only appends/removes at the end matter and React doesn't need to preserve keyboard focus across a reorder here
              <View key={index} style={styles.inspectorRow}>
                <View style={styles.inspectorFields}>
                  <TextField
                    label={`Additional inspector ${index + 1} — name`}
                    value={inspector.name}
                    onChangeText={text => updateInspector(index, 'name', text)}
                    style={styles.field}
                  />
                  <TextField
                    label={`Additional inspector ${index + 1} — position`}
                    value={inspector.position}
                    onChangeText={text => updateInspector(index, 'position', text)}
                    style={styles.field}
                  />
                </View>
                <TouchableOpacity
                  onPress={() => removeInspector(index)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove inspector ${index + 1}`}
                  style={styles.removeInspectorBtn}>
                  <Ionicons name="close-circle-outline" size={22} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
            <AddRowButton label="Add inspector" onPress={addInspector} style={styles.addInspectorBtn} />
            <TextField label="Immediate supervisor name" value={value.supervisorName} onChangeText={set('supervisorName')} style={styles.field} />
            <TextField label="Supervisor position/designation" value={value.supervisorPosition} onChangeText={set('supervisorPosition')} style={styles.field} />
            <Text style={styles.sectionHeading}>Approvers</Text>
            <TextField label="Recommending approval — name" value={value.recommendingName} onChangeText={set('recommendingName')} style={styles.field} />
            <TextField label="Recommending approval — position" value={value.recommendingPosition} onChangeText={set('recommendingPosition')} style={styles.field} />
            <TextField label="Approved by — name" value={value.approverName} onChangeText={set('approverName')} style={styles.field} />
            <TextField label="Approved by — position" value={value.approverPosition} onChangeText={set('approverPosition')} style={styles.field} />
            <Text style={styles.hint}>Names and positions are remembered on this phone.</Text>
            {mixedTypes && (
              <Text style={styles.hint}>Approvers apply to every report in this run.</Text>
            )}
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
              additionalInspectors: value.additionalInspectors
                .map(i => ({ name: i.name.trim(), position: i.position.trim() }))
                .filter(i => i.name.length > 0),
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
  inspectorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  inspectorFields: { flex: 1 },
  removeInspectorBtn: { marginTop: Spacing.md, padding: Spacing.xs },
  addInspectorBtn: { marginBottom: Spacing.md },
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
