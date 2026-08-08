import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../../../constants/colors';
import { database } from '../../../db/database';
import { useEstablishment } from '../hooks/useEstablishment';
import { FormSection, TextField, SelectField, DateField, DynamicRowTable, focusInput } from '../../../components/form';
import { updateEstablishmentRecord } from '../../inspections/establishmentPersistence';
import { notifySyncDataChanged } from '../../../services/sync/syncEvents';
import { buildEditFormFromEstablishment, EditEstablishmentFormState } from '../editEstablishmentForm';
import type { EstablishmentOperatingStatus } from '../types';
import { useHeaderScroll } from '../../home/context/HeaderScrollContext';
import { useScreenFooter } from '../../home/context/ScreenFooterContext';

const OPERATING_STATUS_OPTIONS = ['Operational', 'Temporarily Close', 'Non-Operational'];

interface EditEstablishmentScreenProps {
  estabId: string;
}

export const EditEstablishmentScreen: React.FC<EditEstablishmentScreenProps> = ({ estabId }) => {
  const { establishment, loading, error, refetch } = useEstablishment(estabId);
  const { onScroll } = useHeaderScroll();

  const [form, setForm] = useState<EditEstablishmentFormState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (establishment && !form) {
      setForm(buildEditFormFromEstablishment(establishment));
    }
  }, [establishment, form]);

  const scrollRef = useRef<ScrollView>(null);
  const formerNameRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const barangayRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const provinceRef = useRef<TextInput>(null);
  const natureRef = useRef<TextInput>(null);
  const psicRef = useRef<TextInput>(null);
  const productRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);
  const hoursRef = useRef<TextInput>(null);
  const daysWeekRef = useRef<TextInput>(null);
  const daysYearRef = useRef<TextInput>(null);
  const ownerRef = useRef<TextInput>(null);
  const headRef = useRef<TextInput>(null);
  const pcoNameRef = useRef<TextInput>(null);
  const pcoAccredRef = useRef<TextInput>(null);
  const contactNameRef = useRef<TextInput>(null);
  const contactPositionRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);

  const handleBack = useCallback(() => router.back(), []);

  const handleSave = useCallback(async () => {
    if (!form) return;
    if (
      !form.name.trim() ||
      !form.addressLine.trim() ||
      !form.barangay.trim() ||
      !form.city.trim() ||
      !form.province.trim()
    ) {
      Alert.alert('Missing information', 'Establishment Name, Address, Barangay, City, and Province are required.');
      return;
    }

    setSaving(true);
    try {
      await database.write(async () => {
        await updateEstablishmentRecord({ estabId, form });
      });
      // Home's Manage Establishments/Reports tabs don't observe WatermelonDB
      // directly — without this, an edit only reaches them after a manual
      // pull-to-refresh, since going back from here only returns as far as
      // the establishment detail screen, not all the way to Home.
      notifySyncDataChanged();
      Alert.alert('Establishment updated', 'The establishment record has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      console.error('[EditEstablishmentScreen] Failed to save establishment:', err);
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Something went wrong while saving.');
    } finally {
      setSaving(false);
    }
  }, [estabId, form]);

  // Rendered by AppChrome as a sibling of the collapsing header, not nested
  // inline here — see useScreenFooter for why. `null` while there's nothing
  // to save yet (loading/error states below still return before any of this
  // reaches the screen).
  useScreenFooter(
    () =>
      form ? (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleBack} disabled={saving} activeOpacity={0.8}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}>
            {saving ? (
              <ActivityIndicator size="small" color={Colors.textWhite} />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null,
    [form, saving, handleBack, handleSave]
  );

  // `form` is seeded from `establishment` by the effect above, one render
  // after `establishment` itself arrives — treat that single-tick gap as
  // still loading, not as "not found" (it isn't a real error state, and
  // briefly flashing the not-found screen while it resolves looked broken).
  if (loading || (establishment && !form)) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator size="large" color={Colors.navy} />
        <Text style={styles.stateText}>Loading establishment...</Text>
      </View>
    );
  }

  if (error || !establishment || !form) {
    return (
      <View style={styles.centeredState}>
        <Ionicons name="alert-circle-outline" size={40} color={Colors.conflict} />
        <Text style={styles.stateText}>{error || 'Establishment not found.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={error ? refetch : handleBack} activeOpacity={0.8}>
          <Text style={styles.retryText}>{error ? 'Retry' : 'Go Back'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const location = [form.addressLine, form.city, form.province].filter(Boolean).join(', ');

  return (
    <View style={styles.flex}>
      <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={16} color={Colors.navy} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <KeyboardAwareScrollView
        ref={scrollRef as unknown as React.Ref<KeyboardAwareScrollViewRef>}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        bottomOffset={150}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}>
        <View style={styles.estabCard}>
          <View style={styles.estabIcon}>
            <Ionicons name="business" size={20} color={Colors.textWhite} />
          </View>
          <View style={styles.estabInfo}>
            <Text style={styles.estabName} numberOfLines={1}>{form.name || 'Untitled Establishment'}</Text>
            <Text style={styles.estabLocation} numberOfLines={1}>📍 {location}</Text>
          </View>
          <View style={styles.editBadge}>
            <Ionicons name="create-outline" size={11} color={Colors.warning.text} />
            <Text style={styles.editBadgeText}>Editing Master Record</Text>
          </View>
        </View>

        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={14} color="#1e40af" />
          <Text style={styles.infoBannerText}>
            You&apos;re editing the establishment master record. Changes here apply to future reports — past
            submitted reports keep their own snapshot.
          </Text>
        </View>

        <FormSection icon="business-outline" title="Establishment Details">
          <View style={styles.row}>
            <TextField
              label="Establishment Name"
              value={form.name}
              onChangeText={name => setForm({ ...form, name })}
              required
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() =>
                focusInput(form.includeFormerName ? formerNameRef.current : addressRef.current)
              }
            />
          </View>
          <View style={styles.switchRow}>
            <Switch
              value={form.includeFormerName}
              onValueChange={includeFormerName => setForm({ ...form, includeFormerName })}
              trackColor={{ false: Colors.border, true: Colors.greenLight }}
              thumbColor={Colors.white}
            />
            <Text style={styles.switchLabel}>Include former establishment name</Text>
          </View>
          {form.includeFormerName && (
            <View style={styles.row}>
              <TextField
                ref={formerNameRef}
                label="Former Establishment Name"
                value={form.formerName}
                onChangeText={formerName => setForm({ ...form, formerName })}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => focusInput(addressRef.current)}
              />
            </View>
          )}
          <View style={styles.row}>
            <TextField
              ref={addressRef}
              label="Address"
              value={form.addressLine}
              onChangeText={addressLine => setForm({ ...form, addressLine })}
              required
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => focusInput(barangayRef.current)}
            />
            <TextField
              ref={barangayRef}
              label="Barangay"
              value={form.barangay}
              onChangeText={barangay => setForm({ ...form, barangay })}
              required
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => focusInput(cityRef.current)}
            />
          </View>
          <View style={styles.row}>
            <TextField
              ref={cityRef}
              label="City / Municipality"
              value={form.city}
              onChangeText={city => setForm({ ...form, city })}
              required
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => focusInput(provinceRef.current)}
            />
            <TextField
              ref={provinceRef}
              label="Province"
              value={form.province}
              onChangeText={province => setForm({ ...form, province })}
              required
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => focusInput(natureRef.current)}
            />
          </View>
          <View style={styles.row}>
            <TextField
              ref={natureRef}
              label="Nature of Business"
              value={form.natureOfBusiness}
              onChangeText={natureOfBusiness => setForm({ ...form, natureOfBusiness })}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => focusInput(psicRef.current)}
            />
            <TextField
              ref={psicRef}
              label="PSIC Code"
              value={form.psicCode}
              onChangeText={psicCode => setForm({ ...form, psicCode })}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => focusInput(productRef.current)}
            />
          </View>
          <View style={styles.row}>
            <TextField
              ref={productRef}
              label="Product"
              value={form.product}
              onChangeText={product => setForm({ ...form, product })}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => focusInput(yearRef.current)}
            />
            <TextField
              ref={yearRef}
              label="Year Established"
              value={form.yearEstablished}
              onChangeText={yearEstablished => setForm({ ...form, yearEstablished })}
              keyboardType="numeric"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => focusInput(hoursRef.current)}
            />
          </View>
          <View style={styles.row}>
            <SelectField
              label="Status of Operation"
              value={form.operatingStatus}
              options={OPERATING_STATUS_OPTIONS}
              onSelect={operatingStatus =>
                setForm({ ...form, operatingStatus: operatingStatus as EstablishmentOperatingStatus })
              }
            />
          </View>
          <View style={styles.row}>
            <TextField
              ref={hoursRef}
              label="Hours / Day"
              value={form.operatingHoursDay}
              onChangeText={operatingHoursDay => setForm({ ...form, operatingHoursDay })}
              keyboardType="numeric"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => focusInput(daysWeekRef.current)}
            />
            <TextField
              ref={daysWeekRef}
              label="Days / Week"
              value={form.operatingDaysWeek}
              onChangeText={operatingDaysWeek => setForm({ ...form, operatingDaysWeek })}
              keyboardType="numeric"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => focusInput(daysYearRef.current)}
            />
            <TextField
              ref={daysYearRef}
              label="Days / Year"
              value={form.operatingDaysYear}
              onChangeText={operatingDaysYear => setForm({ ...form, operatingDaysYear })}
              keyboardType="numeric"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => focusInput(ownerRef.current)}
            />
          </View>
        </FormSection>

        <FormSection icon="person-outline" title="Key Personnel">
          <View style={styles.row}>
            <TextField
              ref={ownerRef}
              label="Owner Name"
              value={form.ownerName}
              onChangeText={ownerName => setForm({ ...form, ownerName })}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => focusInput(headRef.current)}
            />
            <TextField
              ref={headRef}
              label="Managing Head"
              value={form.managingHeadName}
              onChangeText={managingHeadName => setForm({ ...form, managingHeadName })}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => focusInput(pcoNameRef.current)}
            />
          </View>
          <View style={styles.row}>
            <TextField
              ref={pcoNameRef}
              label="PCO Name"
              value={form.pcoName}
              onChangeText={pcoName => setForm({ ...form, pcoName })}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => focusInput(pcoAccredRef.current)}
            />
            <TextField
              ref={pcoAccredRef}
              label="PCO Accreditation No."
              value={form.pcoAccreditationNo}
              onChangeText={pcoAccreditationNo => setForm({ ...form, pcoAccreditationNo })}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => focusInput(contactNameRef.current)}
            />
          </View>
          <View style={styles.row}>
            <DateField
              label="PCO Accreditation Effectivity"
              value={form.pcoEffectivity}
              onChange={pcoEffectivity => setForm({ ...form, pcoEffectivity })}
            />
            <TextField
              ref={contactNameRef}
              label="Contact Person"
              value={form.contactPersonName}
              onChangeText={contactPersonName => setForm({ ...form, contactPersonName })}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => focusInput(contactPositionRef.current)}
            />
          </View>
          <View style={styles.row}>
            <TextField
              ref={contactPositionRef}
              label="Contact Position"
              value={form.contactPersonPosition}
              onChangeText={contactPersonPosition => setForm({ ...form, contactPersonPosition })}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => focusInput(phoneRef.current)}
            />
            <TextField
              ref={phoneRef}
              label="Phone / Fax"
              value={form.phoneFax}
              onChangeText={phoneFax => setForm({ ...form, phoneFax })}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => focusInput(emailRef.current)}
            />
          </View>
          <View style={styles.row}>
            <TextField
              ref={emailRef}
              label="Email"
              value={form.email}
              onChangeText={email => setForm({ ...form, email })}
              keyboardType="email-address"
              returnKeyType="done"
            />
          </View>
        </FormSection>

        <FormSection icon="cube-outline" title="Product Lines">
          <DynamicRowTable
            columns={[
              { key: 'product_line', label: 'Product Line', width: 160, placeholder: 'e.g. Bottled Beer' },
              { key: 'ecc_production_rate', label: 'Declared Rate', width: 110, placeholder: '—' },
              { key: 'actual_production_rate', label: 'Actual Rate', width: 110, placeholder: '—' },
            ]}
            rows={form.productLines}
            onChange={productLines => setForm({ ...form, productLines })}
            addLabel="+ Add Row"
          />
        </FormSection>

        <View style={styles.permitsNote}>
          <Ionicons name="information-circle-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.permitsNoteText}>
            DENR Permits, Licenses &amp; Clearances are managed separately — use{' '}
            <Text style={styles.permitsNoteStrong}>Update Permits</Text> from the establishment page.
          </Text>
        </View>
      </KeyboardAwareScrollView>
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
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  stateText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: Colors.navy,
    borderRadius: 8,
    marginTop: 4,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textWhite,
  },
  estabCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.bgMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  estabIcon: {
    width: 42,
    height: 42,
    borderRadius: 9,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  estabInfo: {
    flex: 1,
    minWidth: 0,
  },
  estabName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  estabLocation: {
    fontSize: 11.5,
    color: Colors.textMuted,
    marginTop: 2,
  },
  editBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: Colors.warning.bg,
    borderWidth: 1,
    borderColor: Colors.warning.border,
    flexShrink: 0,
  },
  editBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.warning.text,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 11.5,
    color: '#1e40af',
    lineHeight: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.navy,
  },
  permitsNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.bgMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
  },
  permitsNoteText: {
    flex: 1,
    fontSize: 11.5,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  permitsNoteStrong: {
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 9,
    backgroundColor: Colors.bgLight,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  saveBtn: {
    minWidth: 130,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 9,
    backgroundColor: Colors.green,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textWhite,
  },
});
