import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface SelectFieldProps {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  style?: object;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  options,
  onSelect,
  placeholder = 'Select…',
  required,
  style,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? options.filter(o => o.toLowerCase().includes(q)) : options;
  }, [options, search]);

  return (
    <View style={[styles.group, style]}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.req}> *</Text>}
      </Text>
      <TouchableOpacity
        style={styles.input}
        activeOpacity={0.7}
        onPress={() => {
          // Dismiss first so this Modal's window doesn't open while the
          // keyboard is still transitioning — on Android, two native
          // windows racing over the same keyboard-resize event is what
          // makes the modal underneath jitter.
          Keyboard.dismiss();
          setOpen(true);
        }}>
        <Text style={value ? styles.value : styles.placeholder} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            {options.length > 6 && (
              <TextInput
                style={styles.search}
                placeholder="Search…"
                placeholderTextColor={Colors.textLight}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
              />
            )}
            <FlatList
              data={filtered}
              keyExtractor={item => item}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    onSelect(item);
                    setSearch('');
                    setOpen(false);
                  }}>
                  <Text style={item === value ? styles.optionTextActive : styles.optionText}>
                    {item}
                  </Text>
                  {item === value && (
                    <Ionicons name="checkmark" size={16} color={Colors.green} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.empty}>No matches.</Text>
              }
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

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
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: Colors.bgMuted,
  },
  value: {
    fontSize: 13,
    color: Colors.textPrimary,
    flex: 1,
  },
  placeholder: {
    fontSize: 13,
    color: Colors.textLight,
    flex: 1,
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
    maxHeight: '70%',
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
  search: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 8,
    color: Colors.textPrimary,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  optionText: {
    fontSize: 13,
    color: Colors.textPrimary,
  },
  optionTextActive: {
    fontSize: 13,
    color: Colors.green,
    fontWeight: '700',
  },
  empty: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
