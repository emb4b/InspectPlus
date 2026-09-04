import React from 'react';
import { View, Text, TouchableOpacity, Modal, Keyboard, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { SelectField, DateField } from '../../../components/form';
import { Colors } from '../../../design/colors';
import { Radius } from '../../../design/radius';
import { Spacing } from '../../../design/spacing';
import { Type } from '../../../design/typography';
import { INSPECTION_TYPE_LABELS, ReportSortOrder } from '../hooks/useEstablishment';
import { UseReportBrowserReturn } from '../hooks/useReportBrowser';

const ALL_OPTION = 'All';

const REPORT_TYPE_OPTIONS = Object.entries(INSPECTION_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const SORT_OPTIONS: { key: ReportSortOrder; label: string }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
];

// The date fields can be typed into directly, so the numeric keypad can open
// while this sheet is up. RN's Modal doesn't resize for the keyboard on its
// own — same issue NewEstablishmentModal solved — so the bottom-anchored
// sheet shifts up manually or the keyboard covers the date row.
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface ReportFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  browser: UseReportBrowserReturn;
  // The inspector's own assigned municipalities — narrows the (already
  // province-wide-visible) list further, it's not an access boundary. Passed
  // in because both consumers already hold it from useAuthContext.
  municipalities: string[];
}

export const ReportFilterSheet: React.FC<ReportFilterSheetProps> = ({
  visible,
  onClose,
  browser,
  municipalities,
}) => {
  const { height: keyboardHeight } = useReanimatedKeyboardAnimation();
  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    // keyboardHeight.value is <= 0 while shown, so negating it gives the
    // padding needed to push the flex-end-anchored sheet above the keyboard.
    paddingBottom: -keyboardHeight.value,
  }));

  const {
    state,
    provinceOptions,
    setProvince,
    setCity,
    setReportType,
    setDateFrom,
    setDateTo,
    setSortOrder,
    clearFilters,
  } = browser;

  const selectedReportTypeLabel =
    REPORT_TYPE_OPTIONS.find(o => o.value === state.reportType)?.label ?? ALL_OPTION;
  const selectedSortLabel =
    SORT_OPTIONS.find(o => o.key === state.sortOrder)?.label ?? SORT_OPTIONS[0].label;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <AnimatedTouchableOpacity
        style={[styles.overlay, overlayAnimatedStyle]}
        activeOpacity={1}
        onPress={() => {
          // With both the sheet and keyboard open, a tap outside should only
          // dismiss the keyboard — closing the sheet too would be a second,
          // unrequested action from one tap.
          if (Keyboard.isVisible()) {
            Keyboard.dismiss();
          } else {
            onClose();
          }
        }}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filter reports</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close filters">
              <Ionicons name="close" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <SelectField
            label="Region"
            value={state.province || ALL_OPTION}
            options={[ALL_OPTION, ...provinceOptions]}
            onSelect={v => setProvince(v === ALL_OPTION ? '' : v)}
            style={styles.filterField}
          />

          {municipalities.length > 0 && (
            <SelectField
              label="Municipality"
              value={state.city || ALL_OPTION}
              options={[ALL_OPTION, ...municipalities]}
              onSelect={v => setCity(v === ALL_OPTION ? '' : v)}
              style={styles.filterField}
            />
          )}

          <SelectField
            label="Inspection report type"
            value={selectedReportTypeLabel}
            options={[ALL_OPTION, ...REPORT_TYPE_OPTIONS.map(o => o.label)]}
            onSelect={v =>
              setReportType(
                v === ALL_OPTION ? '' : REPORT_TYPE_OPTIONS.find(o => o.label === v)?.value ?? '',
              )
            }
            style={styles.filterField}
          />

          <View style={styles.dateRow}>
            <DateField label="From" value={state.dateFrom} onChange={setDateFrom} style={styles.dateField} />
            <DateField label="To" value={state.dateTo} onChange={setDateTo} style={styles.dateField} />
          </View>

          <SelectField
            label="Sort by date"
            value={selectedSortLabel}
            options={SORT_OPTIONS.map(o => o.label)}
            onSelect={v => setSortOrder(SORT_OPTIONS.find(o => o.label === v)?.key ?? 'newest')}
            style={styles.filterField}
          />

          <TouchableOpacity style={styles.clearBtn} onPress={clearFilters} activeOpacity={0.75}>
            <Text style={styles.clearBtnText}>Clear all filters</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </AnimatedTouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    maxHeight: '80%',
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
  // SelectField's own `group` style sets flex: 1 for side-by-side form rows.
  // Stacked standalone here, that flex-basis-0 sizing collapses the field to
  // near-zero height, because this column parent only has a maxHeight cap and
  // no definite height for it to grow into. Clearing it back to Yoga's
  // content-sized default fixes the squished layout.
  filterField: {
    flex: undefined,
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  // Unlike filterField, these two DO keep flex: 1 — they share a row (a
  // definite-width flex container), so it splits width 50/50 rather than
  // collapsing height.
  dateField: {
    flex: 1,
  },
  clearBtn: {
    alignSelf: 'center',
    marginTop: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  clearBtnText: {
    fontSize: Type.bodySm.fontSize,
    lineHeight: Type.bodySm.lineHeight,
    fontWeight: '700',
    color: Colors.conflict,
  },
});
