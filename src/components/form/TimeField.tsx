import React, { forwardRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../design/colors';
import { Radius } from '../../design/radius';
import { Spacing } from '../../design/spacing';
import { Type } from '../../design/typography';
import { TextField } from './TextField';

export type Period = 'AM' | 'PM';
export interface ClockTime {
  hour: number; // 1-12
  minute: number; // 0-59
  period: Period;
}

interface TimeFieldProps {
  label: string;
  value: string; // "h:mm AM/PM" - see formatTime
  onChange: (value: string) => void;
  required?: boolean;
  readOnly?: boolean;
  style?: object;
  returnKeyType?: TextInputProps['returnKeyType'];
  blurOnSubmit?: TextInputProps['blurOnSubmit'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  onFocus?: TextInputProps['onFocus'];
}

// The printed form says "Sampling Time: AM/PM" and the field has always been
// free text, so the value stays a plain 12-hour string - what was typed
// before the picker existed still reads and parses. Lenient on the way in
// (optional leading zero, optional space, any case), canonical on the way
// out.
export function parseTime(value: string): ClockTime | null {
  const m = /^\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*$/i.exec(value);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 1 || hour > 12 || minute > 59) return null;
  return { hour, minute, period: m[3].toUpperCase() as Period };
}

export function formatTime({ hour, minute, period }: ClockTime): string {
  return `${hour}:${String(minute).padStart(2, '0')} ${period}`;
}

function nowAsClockTime(): ClockTime {
  const d = new Date();
  const h24 = d.getHours();
  return { hour: h24 % 12 || 12, minute: d.getMinutes(), period: h24 < 12 ? 'AM' : 'PM' };
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
// Five-minute steps: a sampling time is logged to the nearest few minutes,
// and the input beside the picker takes anything finer.
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const PERIODS: Period[] = ['AM', 'PM'];

export const TimeField = forwardRef<TextInput, TimeFieldProps>(({
  label,
  value,
  onChange,
  required,
  readOnly,
  style,
  returnKeyType,
  blurOnSubmit,
  onSubmitEditing,
  onFocus,
}, ref) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draft, setDraft] = useState<ClockTime>(nowAsClockTime);

  if (readOnly) {
    return <TextField label={label} value={value || '—'} readOnly style={style} />;
  }

  const openPicker = () => {
    // Same reasoning as DateField: dismiss before the modal's own window
    // opens so the two don't race over one keyboard-resize on Android.
    Keyboard.dismiss();
    // A typed minute off the 5-minute grid keeps its hour and period but
    // snaps down so something in the minute column is highlighted.
    const parsed = parseTime(value) ?? nowAsClockTime();
    setDraft({ ...parsed, minute: parsed.minute - (parsed.minute % 5) });
    setPickerOpen(true);
  };

  const commit = (time: ClockTime) => {
    onChange(formatTime(time));
    setPickerOpen(false);
  };

  const column = <T extends number | Period>(
    items: T[],
    selected: T,
    onPick: (item: T) => void,
    render: (item: T) => string,
  ) => (
    <ScrollView style={styles.column} contentContainerStyle={styles.columnContent}>
      {items.map(item => {
        const isSelected = item === selected;
        return (
          <TouchableOpacity
            key={String(item)}
            style={[styles.cell, isSelected && styles.cellSelected]}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onPick(item)}
            activeOpacity={0.7}>
            <Text style={[styles.cellText, isSelected && styles.cellTextSelected]}>{render(item)}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  return (
    <View style={[styles.group, style]}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.req}> *</Text>}
      </Text>
      <View style={styles.inputRow}>
        <TextInput
          ref={ref}
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder="h:mm AM/PM"
          placeholderTextColor={Colors.textLight}
          autoCapitalize="characters"
          returnKeyType={returnKeyType}
          blurOnSubmit={blurOnSubmit}
          onSubmitEditing={onSubmitEditing}
          onFocus={onFocus}
        />
        <TouchableOpacity style={styles.clockBtn} onPress={openPicker} activeOpacity={0.7}>
          <Ionicons name="time-outline" size={18} color={Colors.navy} />
        </TouchableOpacity>
      </View>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)}>
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.preview}>{formatTime(draft)}</Text>

            <View style={styles.columns}>
              {column(HOURS, draft.hour, hour => setDraft(d => ({ ...d, hour })), h => String(h))}
              {column(MINUTES, draft.minute, minute => setDraft(d => ({ ...d, minute })), m => String(m).padStart(2, '0'))}
              {column(PERIODS, draft.period, period => setDraft(d => ({ ...d, period })), p => p)}
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.textBtn} onPress={() => commit(nowAsClockTime())} activeOpacity={0.7}>
                <Text style={styles.textBtnLabel}>Now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.setBtn} onPress={() => commit(draft)} activeOpacity={0.7}>
                <Text style={styles.setBtnLabel}>Set</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
});
TimeField.displayName = 'TimeField';

// Group, label, input, button and sheet styles mirror DateField's so the two
// pickers read as one family when they sit side by side on a sampling point.
const styles = StyleSheet.create({
  group: {
    marginBottom: Spacing.lg,
    flex: 1,
  },
  label: {
    fontSize: Type.label.fontSize,
    lineHeight: Type.label.lineHeight,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: 0.3,
    marginBottom: Spacing.sm,
  },
  req: {
    color: Colors.conflict,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    fontSize: Type.bodySm.fontSize,
    lineHeight: Type.bodySm.lineHeight,
    color: Colors.textPrimary,
    backgroundColor: Colors.bgMuted,
  },
  clockBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgMuted,
  },
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sheetTitle: {
    fontSize: Type.subheading.fontSize,
    lineHeight: Type.subheading.lineHeight,
    fontWeight: '700',
    color: Colors.navy,
  },
  preview: {
    fontSize: Type.heading.fontSize,
    lineHeight: Type.heading.lineHeight,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  columns: {
    flexDirection: 'row',
    gap: Spacing.sm,
    // Tall enough for a scroll column to show a handful of entries either
    // side of the selection; the whole sheet stays under half the screen.
    height: 220,
  },
  column: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Radius.md,
  },
  columnContent: {
    paddingVertical: Spacing.xs,
  },
  cell: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  cellSelected: {
    backgroundColor: Colors.green,
  },
  cellText: {
    fontSize: Type.bodySm.fontSize,
    lineHeight: Type.bodySm.lineHeight,
    color: Colors.textPrimary,
  },
  cellTextSelected: {
    color: Colors.textWhite,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  textBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  textBtnLabel: {
    fontSize: Type.label.fontSize,
    lineHeight: Type.label.lineHeight,
    fontWeight: '700',
    color: Colors.green,
  },
  setBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.navy,
  },
  setBtnLabel: {
    fontSize: Type.label.fontSize,
    lineHeight: Type.label.lineHeight,
    fontWeight: '700',
    color: Colors.textWhite,
  },
});
