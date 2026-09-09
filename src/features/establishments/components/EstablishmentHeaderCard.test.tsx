import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { EstablishmentHeaderCard } from './EstablishmentHeaderCard';
import type { EstablishmentDTO } from '../types';
import { Colors } from '../../../design/colors';

// EstablishmentHeaderCard's "Sync conflict" pill pulls in confirmResolveConflict
// -> the WatermelonDB sync adapter chain, which constructs a real SQLiteAdapter
// at import time (via db/database.ts) needing the native JSI binding that isn't
// present under plain Jest — same rationale as EstablishmentCard.test.tsx.
jest.mock('../../../db/database', () => ({ database: {}, collections: {} }));
jest.mock('../../../services/sync/syncConflictResolution', () => ({
  confirmResolveConflict: jest.fn(),
}));

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
// `n.type === TouchableOpacity` (the module reference this file and
// Button.tsx both resolve to) narrows a find to the outer fiber only — same
// convention as EstablishmentReportsSection.test.tsx / EstablishmentCard.test.tsx.
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
  dueReports: null,
};

const noop = () => {};

// The button hierarchy this task establishes: exactly one filled `primary`
// button per screen. This card's "Add Report" is the screen's one primary
// action. The card used to carry a top-level "Edit" beside it too, but
// establishment editing converged onto the report's granular, per-section
// model (see docs/superpowers/specs/2026-09-05-establishment-editing-
// convergence-decision.md) — editing now lives on each FormSection below
// via its own Edit, not here.
describe('EstablishmentHeaderCard button hierarchy', () => {
  it('keeps Add Report as the one filled primary action, at md size and full width', () => {
    const r = render(
      <EstablishmentHeaderCard establishment={baseEstablishment} inspectorLabel="Inspector One" onAddReport={noop} />,
    );
    const button = findButtonByLabel(r, 'Add Report');
    const style = flattenStyle(button.props.style);
    expect(style.minHeight).toBe(40); // md
    expect(style.flex).toBe(1); // fullWidth
    expect(style.backgroundColor).not.toBe(undefined);
  });

  it('renders no top-level Edit control — editing lives on the sections below', () => {
    const r = render(
      <EstablishmentHeaderCard establishment={baseEstablishment} inspectorLabel="Inspector One" onAddReport={noop} />,
    );
    expect(
      r.root.findAll((n) => n.type === TouchableOpacity && n.props?.accessibilityLabel === 'Edit'),
    ).toHaveLength(0);
  });
});

// The same badge, on the same icon, as the Manage Establishments tile — the
// list and the detail screen have to teach one thing, not two.
describe('EstablishmentHeaderCard due indicator', () => {
  const findDueBadge = (r: Renderer) => {
    const views = r.root.findAll((n) => (n.type as any)?.name === 'View' || n.type === View);
    const matches = views.filter((n) => n.props.accessibilityRole === 'text');
    if (matches.length > 1) {
      throw new Error(`Expected at most 1 due badge but found ${matches.length}`);
    }
    return matches[0];
  };

  it('shows nothing when the establishment has no flagged reports', () => {
    const r = render(
      <EstablishmentHeaderCard
        establishment={{ ...baseEstablishment, dueReports: null }}
        inspectorLabel="Inspector One"
        onAddReport={noop}
      />,
    );
    expect(findDueBadge(r)).toBeUndefined();
  });

  it('counts every flagged report and takes the overdue hue when any has lapsed', () => {
    const r = render(
      <EstablishmentHeaderCard
        establishment={{ ...baseEstablishment, dueReports: { level: 'overdue', count: 4 } }}
        inspectorLabel="Inspector One"
        onAddReport={noop}
      />,
    );
    const badge = findDueBadge(r);
    expect(flattenStyle(badge.props.style).backgroundColor).toBe(Colors.hazwaste.text);
    expect(badge.props.accessibilityLabel).toBe('4 reports overdue');
  });

  it('takes the due-soon hue when nothing has lapsed yet', () => {
    const r = render(
      <EstablishmentHeaderCard
        establishment={{ ...baseEstablishment, dueReports: { level: 'due-soon', count: 2 } }}
        inspectorLabel="Inspector One"
        onAddReport={noop}
      />,
    );
    expect(flattenStyle(findDueBadge(r).props.style).backgroundColor).toBe(Colors.warning.text);
  });
});
