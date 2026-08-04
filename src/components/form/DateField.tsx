import React, { forwardRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface DateFieldProps {
  label: string;
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  required?: boolean;
  style?: object;
  returnKeyType?: TextInputProps['returnKeyType'];
  blurOnSubmit?: TextInputProps['blurOnSubmit'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  onFocus?: TextInputProps['onFocus'];
}

// No date-picker library is installed in this project, so typing still goes
// through this mask — the calendar below is an additional way to fill the
// same YYYY-MM-DD value, not a replacement for it.
function maskDate(raw: string, previous: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  let out = digits.slice(0, 4);
  if (digits.length > 4) out += '-' + digits.slice(4, 6);
  if (digits.length > 6) out += '-' + digits.slice(6, 8);
  return out;
}

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

// Rejects malformed strings and impossible calendar dates (e.g. 2026-02-30)
// rather than silently clamping them.
function parseDate(value: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(year, month, day);
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return null;
  return { year, month, day };
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstWeekday(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export const DateField = forwardRef<TextInput, DateFieldProps>(({
  label,
  value,
  onChange,
  required,
  style,
  returnKeyType,
  blurOnSubmit,
  onSubmitEditing,
  onFocus,
}, ref) => {
  const today = new Date();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const selected = parseDate(value);

  const openPicker = () => {
    // Dismiss first so this Modal's window doesn't open while the
    // keyboard is still transitioning — on Android, two native windows
    // racing over the same keyboard-resize event is what makes the
    // modal underneath jitter.
    Keyboard.dismiss();
    setViewYear(selected?.year ?? today.getFullYear());
    setViewMonth(selected?.month ?? today.getMonth());
    setPickerOpen(true);
  };

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const selectDay = (day: number) => {
    onChange(formatDate(viewYear, viewMonth, day));
    setPickerOpen(false);
  };

  const selectToday = () => {
    onChange(formatDate(today.getFullYear(), today.getMonth(), today.getDate()));
    setPickerOpen(false);
  };

  const leadingBlanks = firstWeekday(viewYear, viewMonth);
  const totalDays = daysInMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

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
          onChangeText={text => onChange(maskDate(text, value))}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.textLight}
          keyboardType="number-pad"
          maxLength={10}
          returnKeyType={returnKeyType}
          blurOnSubmit={blurOnSubmit}
          onSubmitEditing={onSubmitEditing}
          onFocus={onFocus}
        />
        <TouchableOpacity style={styles.calendarBtn} onPress={openPicker} activeOpacity={0.7}>
          <Ionicons name="calendar-outline" size={18} color={Colors.navy} />
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

            <View style={styles.calHeader}>
              <TouchableOpacity style={styles.navBtn} onPress={goPrevMonth} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={18} color={Colors.navy} />
              </TouchableOpacity>
              <Text style={styles.calTitle}>{MONTH_LABELS[viewMonth]} {viewYear}</Text>
              <TouchableOpacity style={styles.navBtn} onPress={goNextMonth} activeOpacity={0.7}>
                <Ionicons name="chevron-forward" size={18} color={Colors.navy} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAY_LABELS.map(d => (
                <Text key={d} style={styles.weekLabel}>{d}</Text>
              ))}
            </View>

            <View style={styles.dayGrid}>
              {cells.map((day, idx) => {
                const isSelected =
                  day != null && !!selected &&
                  selected.year === viewYear && selected.month === viewMonth && selected.day === day;
                const isToday =
                  day != null &&
                  viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate();
                return (
                  <View key={idx} style={styles.dayCell}>
                    {day != null && (
                      <TouchableOpacity
                        style={[
                          styles.dayBtn,
                          isToday && !isSelected && styles.dayBtnToday,
                          isSelected && styles.dayBtnSelected,
                        ]}
                        onPress={() => selectDay(day)}
                        activeOpacity={0.7}>
                        <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                          {day}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>

            <TouchableOpacity style={styles.todayBtn} onPress={selectToday} activeOpacity={0.7}>
              <Text style={styles.todayBtnText}>Today</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
});
DateField.displayName = 'DateField';

const styles = StyleSheet.create({
  group: {
    marginBottom: 16,
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  req: {
    color: Colors.conflict,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 8,
    fontSize: 13,
    color: Colors.textPrimary,
    backgroundColor: Colors.bgMuted,
  },
  calendarBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: Colors.bgMuted,
  },
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  navBtn: {
    padding: 6,
  },
  calTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.navy,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10.5,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.4,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  dayBtn: {
    width: '80%',
    height: '80%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBtnToday: {
    borderWidth: 1.5,
    borderColor: Colors.green,
  },
  dayBtnSelected: {
    backgroundColor: Colors.green,
  },
  dayText: {
    fontSize: 12.5,
    color: Colors.textPrimary,
  },
  dayTextSelected: {
    color: Colors.textWhite,
    fontWeight: '700',
  },
  todayBtn: {
    alignSelf: 'center',
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  todayBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.green,
  },
});
