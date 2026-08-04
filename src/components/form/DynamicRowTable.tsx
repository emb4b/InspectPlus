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
import { Colors } from '../../constants/colors';
import { focusInput } from './focusInput';

export interface DynamicColumn {
  key: string;
  label: string;
  width: number;
  type?: 'text' | 'number' | 'select';
  options?: string[];
  placeholder?: string;
}

export type DynamicRow = Record<string, string>;

interface DynamicRowTableProps {
  columns: DynamicColumn[];
  rows: DynamicRow[];
  onChange: (rows: DynamicRow[]) => void;
  addLabel?: string;
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
  addLabel = '+ Add Row',
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
    next[rowIndex] = { ...next[rowIndex], [key]: value };
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
          <View style={styles.headerRow}>
            {columns.map(col => (
              <Text key={col.key} style={[styles.headerCell, { width: col.width }]}>
                {col.label}
              </Text>
            ))}
            <View style={{ width: 40 }} />
          </View>

          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.dataRow}>
              {columns.map(col => {
                const key = cellKey(rowIndex, col.key);
                const isLastFocusable =
                  focusableCells.length > 0 &&
                  focusableCells[focusableCells.length - 1].rowIndex === rowIndex &&
                  focusableCells[focusableCells.length - 1].colKey === col.key;
                return (
                  <View key={col.key} style={{ width: col.width, paddingHorizontal: 3 }}>
                    {col.type === 'select' ? (
                      <TouchableOpacity
                        style={styles.selectCell}
                        onPress={() => setPickerFor({ rowIndex, column: col })}>
                        <Text style={styles.selectCellText} numberOfLines={1}>
                          {row[col.key] || col.placeholder || '—'}
                        </Text>
                        <Ionicons name="chevron-down" size={12} color={Colors.textMuted} />
                      </TouchableOpacity>
                    ) : (
                      <TextInput
                        ref={el => { cellRefs.current[key] = el; }}
                        style={styles.cellInput}
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

      <TouchableOpacity style={styles.addBtn} activeOpacity={0.7} onPress={addRow}>
        <Ionicons name="add" size={14} color={Colors.green} />
        <Text style={styles.addBtnText}>{addLabel}</Text>
      </TouchableOpacity>

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
              data={pickerFor?.column.options ?? []}
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
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: Colors.bgMuted,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.border,
    paddingVertical: 8,
  },
  headerCell: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    paddingHorizontal: 3,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingVertical: 6,
  },
  cellInput: {
    fontSize: 12,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: Colors.white,
  },
  selectCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: Colors.white,
  },
  selectCellText: {
    fontSize: 12,
    color: Colors.textPrimary,
    flex: 1,
  },
  removeBtn: {
    width: 40,
    alignItems: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: Colors.greenLight,
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.green,
  },
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    maxHeight: '60%',
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: 10,
  },
  option: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  optionText: {
    fontSize: 13,
    color: Colors.textPrimary,
  },
});
