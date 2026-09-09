import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  Keyboard,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../design/colors';
import { Radius } from '../../design/radius';
import { Spacing } from '../../design/spacing';
import { FONT_SCALING, Type } from '../../design/typography';
import { focusInput } from './focusInput';
import { AppText } from '../AppText';
import { AddRowButton } from '../AddRowButton';

export interface DynamicColumn {
  key: string;
  label: string;
  width: number;
  // 'select' is pick-only; 'combo' is the same picker over a live text
  // input, for lists that cannot anticipate every real-world answer.
  type?: 'text' | 'number' | 'select' | 'combo';
  // A function here makes the column's choices depend on the rest of its
  // own row - the caller receives the row and returns the options catered
  // to it. Pair it with `dependsOn` so the cascade also knows which
  // column invalidates this one.
  options?: string[] | ((row: DynamicRow) => string[]);
  // Key of the column this one's options are catered to. When that column
  // changes to something whose catered list excludes the value held here,
  // this cell is cleared - see updateCell for why that is narrower than
  // "cleared whenever the parent changes".
  dependsOn?: string;
  placeholder?: string;
}

export type DynamicRow = Record<string, string>;

interface DynamicRowTableProps {
  columns: DynamicColumn[];
  rows: DynamicRow[];
  onChange: (rows: DynamicRow[]) => void;
  addLabel?: string;
}

// Static `options` and row-dependent ones collapse to one list here, so
// neither the cell nor the picker sheet has to know which kind it got.
function resolveOptions(column: DynamicColumn, row: DynamicRow): string[] {
  return (typeof column.options === 'function' ? column.options(row) : column.options) ?? [];
}

function emptyRow(columns: DynamicColumn[]): DynamicRow {
  return Object.fromEntries(columns.map(c => [c.key, '']));
}

function cellKey(rowIndex: number, colKey: string): string {
  return `${rowIndex}:${colKey}`;
}

export const DynamicRowTable: React.FC<DynamicRowTableProps> = ({
  columns,
  rows,
  onChange,
  addLabel = 'Add Row',
}) => {
  const [pickerFor, setPickerFor] = useState<{ rowIndex: number; column: DynamicColumn } | null>(null);
  const cellRefs = useRef<Record<string, TextInput | null>>({});

  // Flat left-to-right, top-to-bottom order of every typed (non-select)
  // cell — "next" on the keyboard walks this list, wrapping into the next
  // row, and dismisses after the last cell of the last row.
  const focusableCells = useMemo(() => {
    const list: { rowIndex: number; colKey: string }[] = [];
    rows.forEach((_, rowIndex) => {
      columns.forEach(col => {
        if (col.type !== 'select') list.push({ rowIndex, colKey: col.key });
      });
    });
    return list;
  }, [rows, columns]);

  const focusNextCell = (rowIndex: number, colKey: string) => {
    const idx = focusableCells.findIndex(c => c.rowIndex === rowIndex && c.colKey === colKey);
    const next = idx >= 0 ? focusableCells[idx + 1] : undefined;
    if (next) {
      focusInput(cellRefs.current[cellKey(next.rowIndex, next.colKey)]);
    } else {
      Keyboard.dismiss();
    }
  };

  const updateCell = (rowIndex: number, key: string, value: string) => {
    const next = rows.slice();
    const row = { ...next[rowIndex], [key]: value };
    // Changing a parent can strand what its dependent cell holds, so clear
    // it - but only when the new parent value actually contradicts it. Two
    // cases must survive, and both are real: re-picking the same parent
    // (an easy accidental tap), and a parent typed off-list, which offers
    // no catered list at all. The second is why this can't simply clear on
    // every change - a parent combo fires per keystroke, so that rule
    // would wipe the dependent answer the moment you edited the parent.
    if (next[rowIndex]?.[key] !== value) {
      columns.forEach(col => {
        if (col.dependsOn !== key) return;
        const held = row[col.key];
        if (!held) return;
        const offered = resolveOptions(col, row);
        if (offered.length > 0 && !offered.includes(held)) row[col.key] = '';
      });
    }
    next[rowIndex] = row;
    onChange(next);
  };

  const removeRow = (rowIndex: number) => {
    if (rows.length <= 1) return;
    onChange(rows.filter((_, i) => i !== rowIndex));
  };

  const addRow = () => onChange([...rows, emptyRow(columns)]);

  const totalWidth = columns.reduce((sum, c) => sum + c.width, 0) + 40;

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ minWidth: totalWidth }}>
          {/* Every text node in this grid opts out of OS font scaling
              (FONT_SCALING.tabular). Type.tabular already holds the size
              down to 12 for these fixed-width columns, but that only
              controls the size *this app* asks for — the OS accessibility
              font setting multiplies it afterwards, so a user at 130%
              would get exactly the clipped cells the token exists to
              prevent. The size floor and the scaling opt-out are two
              halves of the same decision; neither works alone. The columns
              are fixed pixel widths inside a horizontal ScrollView, so
              scaled-up text cannot reflow out of its own cell — it can
              only clip. Prose elsewhere in this file (the picker sheet
              below) is not in a fixed-width box and keeps scaling. */}
          <View style={styles.headerRow}>
            {columns.map(col => (
              <Text
                key={col.key}
                style={[styles.headerCell, { width: col.width }]}
                allowFontScaling={FONT_SCALING.tabular}>
                {col.label}
              </Text>
            ))}
            <View style={{ width: 40 }} />
          </View>

          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.dataRow}>
              {columns.map(col => {
                const key = cellKey(rowIndex, col.key);
                // Empty for a dependent column whose parent is still
                // unanswered: there is nothing to choose from yet, so the
                // cell stays inert and shows its placeholder instead of
                // opening an empty sheet.
                const options =
                  col.type === 'select' || col.type === 'combo' ? resolveOptions(col, row) : [];
                const canPick = options.length > 0;
                const isLastFocusable =
                  focusableCells.length > 0 &&
                  focusableCells[focusableCells.length - 1].rowIndex === rowIndex &&
                  focusableCells[focusableCells.length - 1].colKey === col.key;
                return (
                  <View key={col.key} style={[styles.cellWrap, { width: col.width }]}>
                    {col.type === 'select' ? (
                      <TouchableOpacity
                        style={[styles.selectCell, !canPick && styles.selectCellInert]}
                        disabled={!canPick}
                        onPress={() => canPick && setPickerFor({ rowIndex, column: col })}>
                        <AppText
                          variant="single"
                          text={row[col.key] || col.placeholder || '—'}
                          style={styles.selectCellText}
                          containerStyle={styles.selectCellTextContainer}
                          allowFontScaling={FONT_SCALING.tabular}
                        />
                        <Ionicons name="chevron-down" size={12} color={Colors.textMuted} />
                      </TouchableOpacity>
                    ) : col.type === 'combo' ? (
                      <View style={styles.comboCell}>
                        <TextInput
                          ref={el => { cellRefs.current[key] = el; }}
                          style={styles.comboInput}
                          allowFontScaling={FONT_SCALING.tabular}
                          value={row[col.key] ?? ''}
                          onChangeText={text => updateCell(rowIndex, col.key, text)}
                          placeholder={col.placeholder}
                          placeholderTextColor={Colors.textLight}
                          returnKeyType={isLastFocusable ? 'done' : 'next'}
                          blurOnSubmit={isLastFocusable}
                          onSubmitEditing={() => focusNextCell(rowIndex, col.key)}
                        />
                        {/* Only the chevron goes inert when nothing is on
                            offer - the input beside it stays live, because
                            an off-list source is exactly the case a combo
                            column exists to record. */}
                        <TouchableOpacity
                          style={styles.comboChevron}
                          disabled={!canPick}
                          onPress={() => canPick && setPickerFor({ rowIndex, column: col })}>
                          <Ionicons
                            name="chevron-down"
                            size={12}
                            color={canPick ? Colors.textMuted : Colors.borderLight}
                          />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TextInput
                        ref={el => { cellRefs.current[key] = el; }}
                        style={styles.cellInput}
                        allowFontScaling={FONT_SCALING.tabular}
                        value={row[col.key] ?? ''}
                        onChangeText={text => updateCell(rowIndex, col.key, text)}
                        placeholder={col.placeholder}
                        placeholderTextColor={Colors.textLight}
                        keyboardType={col.type === 'number' ? 'numeric' : 'default'}
                        returnKeyType={isLastFocusable ? 'done' : 'next'}
                        blurOnSubmit={isLastFocusable}
                        onSubmitEditing={() => focusNextCell(rowIndex, col.key)}
                      />
                    )}
                  </View>
                );
              })}
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeRow(rowIndex)}
                disabled={rows.length <= 1}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={rows.length <= 1 ? Colors.borderLight : Colors.conflict}
                />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      <AddRowButton label={addLabel} onPress={addRow} small style={styles.addBtn} />

      <Modal
        visible={!!pickerFor}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerFor(null)}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setPickerFor(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{pickerFor?.column.label}</Text>
            <FlatList
              data={pickerFor ? resolveOptions(pickerFor.column, rows[pickerFor.rowIndex] ?? {}) : []}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    if (pickerFor) updateCell(pickerFor.rowIndex, pickerFor.column.key, item);
                    setPickerFor(null);
                  }}>
                  <Text style={styles.optionText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    // Same bare-10 / block-separating-margin resolution as ChecklistTable's
    // `wrap` — see the comment there.
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: Colors.bgMuted,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.border,
    paddingVertical: Spacing.sm,
  },
  // Deliberately Type.tabular (12), NOT Type.body (14) — see the token's own
  // comment in typography.ts. This grid's columns are fixed pixel widths
  // (set per call site, 80-160) inside a horizontal ScrollView: a wide
  // table scrolls rather than squeezing, but text inside one column can't
  // scroll away from its own cell, so body-sized text here would clip
  // instead of helping.
  headerCell: {
    fontSize: Type.tabular.fontSize,
    lineHeight: Type.tabular.lineHeight,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    // Bare 3 rounds up to the nearest token, xs (4) — a 1px-per-side nudge
    // that doesn't affect the totalWidth math below (that sum is driven
    // entirely by each column's own `width`, not this inner padding).
    paddingHorizontal: Spacing.xs,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    // Bare 6, not an icon/text gap - resolves to sm (8) per spacing.ts's
    // documented rule for that value.
    paddingVertical: Spacing.sm,
  },
  // The per-column cell wrapper. `width` stays an inline per-column value
  // (it comes from the `columns` prop, not the token scale) — only the
  // inner padding is tokenized here, same rounding as headerCell above.
  cellWrap: {
    paddingHorizontal: Spacing.xs,
  },
  // Type.tabular, not Type.body - same fixed-width-column reasoning as
  // headerCell.
  cellInput: {
    fontSize: Type.tabular.fontSize,
    lineHeight: Type.tabular.lineHeight,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    // Bare 6, resolves to sm (8) - see dataRow above.
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
  },
  selectCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
  },
  // Wears the same chrome as selectCell so a row of pickers reads as one
  // control type, but carries no vertical padding of its own - the input
  // inside supplies it, and doubling the two would make combo cells taller
  // than the select cells beside them.
  comboCell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingRight: Spacing.sm,
    backgroundColor: Colors.white,
  },
  // Type.tabular, not Type.body - same fixed-width-column reasoning as
  // headerCell/cellInput. Borderless: comboCell above draws the box.
  comboInput: {
    flex: 1,
    fontSize: Type.tabular.fontSize,
    lineHeight: Type.tabular.lineHeight,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  comboChevron: {
    justifyContent: 'center',
  },
  // A dependent cell whose parent is still blank. Muted like a disabled
  // control so the row reads as "answer the column to my left first"
  // rather than as a field that simply refuses to open.
  selectCellInert: {
    backgroundColor: Colors.bgMuted,
    borderColor: Colors.borderLight,
  },
  // Type.tabular, not Type.body - same fixed-width-column reasoning as
  // headerCell/cellInput. This is the guard: promoting this to Type.body
  // would clip the selected value inside its fixed-width column.
  selectCellText: {
    fontSize: Type.tabular.fontSize,
    lineHeight: Type.tabular.lineHeight,
    color: Colors.textPrimary,
  },
  selectCellTextContainer: {
    flex: 1,
  },
  removeBtn: {
    // Tied to the `+ 40` in totalWidth's calc above and the header's own
    // 40-wide spacer — a structural layout constant shared between three
    // places, not a spacing value (40 isn't on the Spacing scale at all),
    // so it stays a literal rather than being forced onto a nearby token.
    width: 40,
    alignItems: 'center',
  },
  addBtn: {
    marginTop: Spacing.sm,
  },
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  sheet: {
    backgroundColor: Colors.white,
    // Bare 14 sat between lg (12) and xl (16); resolved to xl to match the
    // larger radius this app already uses for other floating modal-scale
    // surfaces (see Elevation.modal's equivalent weight tier).
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    maxHeight: '60%',
  },
  sheetTitle: {
    fontSize: Type.body.fontSize,
    lineHeight: Type.body.lineHeight,
    fontWeight: '700',
    color: Colors.navy,
    // Bare 10, block-separating margin (title from the option list below)
    // - resolves to md (12), same role as the file-level `wrap` margins.
    marginBottom: Spacing.md,
  },
  option: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  optionText: {
    fontSize: Type.bodySm.fontSize,
    lineHeight: Type.bodySm.lineHeight,
    color: Colors.textPrimary,
  },
});
