import React from 'react';
import { TouchableOpacity } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { EstablishmentInfoSections } from './EstablishmentInfoSections';
import type { EstablishmentDTO } from '../types';

// EstablishmentInfoSections pulls in components/form's index, which pulls in
// useScrollToInput -> react-native-keyboard-controller's native binding.
// react-native-keyboard-controller ships its own jest mock for exactly this
// situation — see node_modules/react-native-keyboard-controller/jest/index.js
// — same as ReportFilterSheet.test.tsx / ExportReportsTab.test.tsx.
jest.mock('react-native-keyboard-controller', () => jest.requireActual('react-native-keyboard-controller/jest'));

type Renderer = TestRenderer.ReactTestRenderer;

const render = (element: React.ReactElement) => {
  let r!: Renderer;
  TestRenderer.act(() => { r = TestRenderer.create(element); });
  return r;
};

const flattenStyle = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...([style].flat(Infinity).filter(Boolean) as Record<string, unknown>[]));

// react-native's own TouchableOpacity module is a thin wrapper that spreads
// every prop it receives onto an inner, unexported class component of the
// same displayName, so a props-only predicate double-matches: once on the
// outer wrapper fiber, once on the inner one. Anchoring on
// `n.type === TouchableOpacity` narrows a find to the outer fiber only —
// same convention as EstablishmentReportsSection.test.tsx / EstablishmentCard.test.tsx.
const findButtonByLabel = (r: Renderer, label: string) => {
  const matches = r.root.findAll(
    (n) => n.type === TouchableOpacity && n.props?.accessibilityLabel === label,
  );
  if (matches.length === 0) {
    throw new Error(`No button found with accessibilityLabel === "${label}"`);
  }
  if (matches.length > 1) {
    throw new Error(`Expected 1 "${label}" button but found ${matches.length}; the locator is not sufficiently specific`);
  }
  return matches[0];
};

const baseEstablishment: EstablishmentDTO = {
  id: 'row-1',
  estabId: 'estab-1',
  inspectorUid: 'uid-1',
  name: 'Test Facility',
  formerName: null,
  addressLine: '123 Main St',
  barangay: 'Barangay 1',
  city: 'Puerto Princesa',
  province: 'Palawan',
  geoLat: null,
  geoLng: null,
  natureOfBusiness: 'Manufacturing',
  psicCode: null,
  product: null,
  yearEstablished: null,
  operatingStatus: 'Operational',
  operatingHoursDay: null,
  operatingDaysWeek: null,
  operatingDaysYear: null,
  operatingStatusSince: null,
  productLines: [],
  ownerName: 'Owner',
  managingHeadName: 'Manager',
  pcoName: null,
  pcoAccreditationNo: null,
  pcoEffectivity: null,
  phoneFax: '',
  email: '',
  contactPersonName: '',
  contactPersonPosition: '',
  denrPermits: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  syncStatus: 'synced',
  deviceId: 'device-1',
  isArchived: false,
  complianceTags: [],
};

const noop = () => {};

// The DENR Permits section header used to read "Update Permits", which
// doubled the word "Permits" against the section title right above it
// ("DENR Permits, Licenses & Clearances") and made the control noticeably
// wider than the matching "Edit" on the Establishment Details section. It
// now reads "Edit" like every other section-header action, at `sm` `outline`
// per the button hierarchy this task establishes.
describe('EstablishmentInfoSections DENR permits action', () => {
  it('reads "Edit", not "Update Permits", and renders at sm/outline', () => {
    const r = render(
      <EstablishmentInfoSections establishment={baseEstablishment} onUpdatePermits={noop} />,
    );
    expect(
      r.root.findAll((n) => n.type === TouchableOpacity && n.props?.accessibilityLabel === 'Update Permits'),
    ).toHaveLength(0);
    const button = findButtonByLabel(r, 'Edit');
    expect(flattenStyle(button.props.style).minHeight).toBe(32); // sm
  });

  it('calls onUpdatePermits when the Edit action is pressed', () => {
    const onUpdatePermits = jest.fn();
    const r = render(
      <EstablishmentInfoSections establishment={baseEstablishment} onUpdatePermits={onUpdatePermits} />,
    );
    TestRenderer.act(() => {
      findButtonByLabel(r, 'Edit').props.onPress();
    });
    expect(onUpdatePermits).toHaveBeenCalledTimes(1);
  });

  it('omits the action entirely when onUpdatePermits is not provided', () => {
    const r = render(<EstablishmentInfoSections establishment={baseEstablishment} />);
    expect(
      r.root.findAll((n) => n.type === TouchableOpacity && n.props?.accessibilityLabel === 'Edit'),
    ).toHaveLength(0);
  });
});
