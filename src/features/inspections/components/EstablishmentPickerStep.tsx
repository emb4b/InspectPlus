import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  StyleSheet,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../../../constants/colors';
import { useEstablishments } from '../../establishments/hooks/useEstablishment';
import type { EstablishmentDTO } from '../../establishments/types';
import { useHeaderScroll } from '../../home/context/HeaderScrollContext';

interface EstablishmentPickerStepProps {
  onPick: (establishment: EstablishmentDTO) => void;
  onCreateNew: () => void;
}

// Shown before the report-form tabs unlock — no working path currently hands
// this screen an estabId (ManageEstablishmentsTab's "+Add" wiring is dead
// code), so this is a standalone entry point until that's built properly.
export const EstablishmentPickerStep: React.FC<EstablishmentPickerStepProps> = ({
  onPick,
  onCreateNew,
}) => {
  const [search, setSearch] = useState('');
  const { establishments, loading, error } = useEstablishments(search);
  const { onScroll } = useHeaderScroll();

  const handleBack = useCallback(() => router.back(), []);

  return (
    <View style={styles.flex}>
      <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={16} color={Colors.navy} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}>
        <Text style={styles.title}>Select Establishment</Text>
        <Text style={styles.subtitle}>
          Choose the establishment this water quality inspection report is for.
        </Text>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={14} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by establishment name…"
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
        </View>

        <TouchableOpacity style={styles.newBtn} activeOpacity={0.75} onPress={onCreateNew}>
          <Ionicons name="add-circle" size={16} color={Colors.green} />
          <Text style={styles.newBtnText}>New Establishment</Text>
        </TouchableOpacity>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.navy} />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Ionicons name="alert-circle-outline" size={32} color={Colors.conflict} />
            <Text style={styles.stateText}>{error}</Text>
          </View>
        ) : establishments.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="business-outline" size={32} color={Colors.border} />
            <Text style={styles.stateText}>
              {search ? 'No establishments match your search.' : 'No establishments yet.'}
            </Text>
          </View>
        ) : (
          establishments.map(item => (
            <TouchableOpacity
              key={item.estabId}
              style={styles.item}
              activeOpacity={0.75}
              onPress={() => onPick(item)}>
              <View style={styles.itemIcon}>
                <Ionicons name="business" size={18} color={Colors.textMuted} />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.itemMeta} numberOfLines={1}>
                  {item.addressLine}, {item.city}, {item.province}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
            </TouchableOpacity>
          ))
        )}
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  backText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.navy,
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  container: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.navy,
  },
  subtitle: {
    fontSize: 12.5,
    color: Colors.textMuted,
    marginTop: 4,
    marginBottom: 16,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgLight,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: Colors.greenLight,
    borderStyle: 'dashed',
    borderRadius: 8,
    marginBottom: 14,
  },
  newBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.green,
  },
  centered: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 8,
  },
  stateText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.bgLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
  },
  itemMeta: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
