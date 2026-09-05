import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import TestRenderer from 'react-test-renderer';
import { EstablishmentCard } from './EstablishmentCard';
import { Colors } from '../../../design/colors';
import { Radius } from '../../../design/radius';
import { Elevation } from '../../../design/elevation';
import { Type } from '../../../design/typography';
import { REPORT_TYPES } from '../../../constants/reportTypes';
import type { EstablishmentDTO } from '../types';

// EstablishmentCard pulls in confirmResolveConflict -> the WatermelonDB sync
// adapter chain, which constructs a real SQLiteAdapter at import time (via
// db/database.ts) needing the native JSI binding that isn't present under
// plain Jest — same rationale as ReportListCard.test.tsx. jest.mock calls are
// hoisted above imports by babel-plugin-jest-hoist regardless of where
// they're written, so this still applies before EstablishmentCard is ever
// required.
jest.mock('../../../db/database', () => ({ database: {}, collections: {} }));

const mockConfirmResolveConflict = jest.fn();
jest.mock('../../../services/sync/syncConflictResolution', () => ({
  confirmResolveConflict: (...args: unknown[]) => mockConfirmResolveConflict(...args),
}));

type Renderer = TestRenderer.ReactTestRenderer;

const render = (element: React.ReactElement) => {
  let r!: Renderer;
  TestRenderer.act(() => { r = TestRenderer.create(element); });
  return r;
};

const flattenStyle = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...([style].flat(Infinity).filter(Boolean) as Record<string, unknown>[]));

// Locate the establishment icon wrap View by its resolved shape (width 44 /
// height 44 / borderRadius 8 — ICON_BOX / Radius.md in EstablishmentCard.tsx
// — unique to this element in the card). Throws if zero or more than one
// match is found, per the ReportListCard locator convention.
const findIconWrap = (r: Renderer) => {
  const views = r.root.findAll((n) => (n.type as any)?.name === 'View' || n.type === View);
  const matches = views.filter((n) => {
    const flattened = flattenStyle(n.props.style);
    return flattened.width === 44 && flattened.height === 44 && flattened.borderRadius === Radius.md;
  });
  if (matches.length === 0) {
    throw new Error('No icon wrap View found: expected a View with width===44, height===44, borderRadius===Radius.md');
  }
  if (matches.length > 1) {
    throw new Error(`Expected 1 icon wrap View but found ${matches.length}; the locator is not sufficiently specific`);
  }
  return matches[0];
};

// react-native's own TouchableOpacity module is itself a thin wrapper that
// spreads every prop it receives onto an inner, unexported class component of
// the same displayName, so a props-only predicate double-matches: once on the
// outer wrapper fiber, once on the inner one. Anchoring on
// `n.type === TouchableOpacity` (the same module reference this file and
// EstablishmentCard.tsx both resolve to) narrows a find/findAll to the outer
// fiber only — confirmed by the identical convention in ReportListCard.test.tsx.
//
// The card itself carries no accessibilityLabel, so it's located by its
// resolved backgroundColor instead — Colors.white is unique to the card
// among the card's TouchableOpacity elements (the swipe actions use
// Colors.bgLight / Colors.navy / Colors.conflict).
const findCard = (r: Renderer) =>
  r.root.find(
    (n) => n.type === TouchableOpacity && flattenStyle(n.props.style).backgroundColor === Colors.white,
  );

const findActionButton = (r: Renderer, label: string) =>
  r.root.findAll(
    (n) => n.type === TouchableOpacity && n.props?.children?.[1]?.props?.children === label,
  );

const isPanGestureEnabled = (r: Renderer): boolean | undefined =>
  (r.root.findByType(GestureDetector).props as { gesture: { config: { enabled?: boolean } } }).gesture
    .config.enabled;

// @expo/vector-icons renders its glyph as a Text under the hood, with the
// icon's `size` prop applied as that Text's fontSize — that's an icon size,
// not prose, so it must be excluded before checking the type scale's floor.
// Collected per-render, since a fresh element tree exists for every render()
// call.
const iconGlyphTexts = (r: Renderer): Set<TestRenderer.ReactTestInstance> =>
  new Set(r.root.findAllByType(Ionicons).flatMap((icon) => icon.findAllByType(Text)));

// Every non-icon Text node — the ones the card's own StyleSheet drives.
const proseTexts = (r: Renderer) => {
  const glyphs = iconGlyphTexts(r);
  return r.root.findAllByType(Text).filter((n) => !glyphs.has(n));
};

// Every prose Text node's resolved fontSize — the legibility guarantee this
// task exists to enforce is that none of them ever falls below Type.caption's
// 11.
const allFontSizes = (r: Renderer): number[] =>
  proseTexts(r)
    .map((n) => flattenStyle(n.props.style).fontSize)
    .filter((size): size is number => typeof size === 'number');

const baseItem: EstablishmentDTO = {
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

afterEach(() => {
  mockConfirmResolveConflict.mockClear();
});

describe('EstablishmentCard token resolution', () => {
  it('resolves the business icon and location pin colors from Colors, not a raw hex', () => {
    const r = render(<EstablishmentCard item={baseItem} onPress={noop} />);
    const businessIcon = r.root.findAllByType(Ionicons).find((n) => n.props.name === 'business');
    const locationIcon = r.root.findAllByType(Ionicons).find((n) => n.props.name === 'location');
    expect(businessIcon?.props.color).toBe(Colors.textLight);
    expect(locationIcon?.props.color).toBe(Colors.conflict);
  });

  it('resolves the icon wrap background and radius from tokens', () => {
    const r = render(<EstablishmentCard item={baseItem} onPress={noop} />);
    const style = flattenStyle(findIconWrap(r).props.style);
    expect(style.backgroundColor).toBe(Colors.bgLight);
    expect(style.borderRadius).toBe(Radius.md);
  });

  it('resolves the card surface (border, radius, elevation) from tokens instead of a hand-rolled shadow', () => {
    const r = render(<EstablishmentCard item={baseItem} onPress={noop} />);
    const style = flattenStyle(findCard(r).props.style);
    expect(style.backgroundColor).toBe(Colors.white);
    expect(style.borderColor).toBe(Colors.border);
    expect(style.borderRadius).toBe(Radius.lg);
    // The whole point of the Elevation token: iOS shadow + Android elevation
    // travel together instead of drifting apart (shadowOpacity 0.04 beside
    // elevation 1, as this card shipped before the migration).
    expect(style.shadowColor).toBe(Elevation.raised.shadowColor);
    expect(style.shadowOpacity).toBe(Elevation.raised.shadowOpacity);
    expect(style.shadowRadius).toBe(Elevation.raised.shadowRadius);
    expect(style.elevation).toBe(Elevation.raised.elevation);
  });

  it('resolves the establishment name and location text sizes from the type scale', () => {
    const r = render(<EstablishmentCard item={baseItem} onPress={noop} />);
    const nameText = r.root.findAllByType(Text).find((n) => flattenStyle(n.props.style).color === Colors.textPrimary);
    const locationText = r.root.findAllByType(Text).find((n) => flattenStyle(n.props.style).color === Colors.textMuted && n.props.numberOfLines === 1);
    expect(flattenStyle(nameText?.props.style).fontSize).toBe(Type.body.fontSize);
    expect(flattenStyle(nameText?.props.style).lineHeight).toBe(Type.body.lineHeight);
    expect(flattenStyle(locationText?.props.style).fontSize).toBe(Type.label.fontSize);
    expect(flattenStyle(locationText?.props.style).lineHeight).toBe(Type.label.lineHeight);
  });

  it('resolves a compliance tag chip color from REPORT_TYPES, not a hardcoded value', () => {
    const item: EstablishmentDTO = { ...baseItem, complianceTags: ['Hazwaste'] };
    const r = render(<EstablishmentCard item={item} onPress={noop} />);
    const hazwaste = REPORT_TYPES.find((t) => t.key === 'hazwaste_generator')!;

    const chip = r.root.findAll((n) => (n.type as any)?.name === 'View' || n.type === View).find((n) => {
      const flattened = flattenStyle(n.props.style);
      return flattened.backgroundColor === hazwaste.bgColor && flattened.borderRadius === Radius.pill;
    });
    expect(chip).toBeDefined();

    // Restricted to prose Text (excluding icon glyphs): the location pin
    // icon also resolves to Colors.conflict, which is the same literal hex
    // as this hazwaste palette's textColor, so an unfiltered search would
    // grab the pin's internal glyph Text instead of the tag label.
    const label = proseTexts(r).find((n) => flattenStyle(n.props.style).color === hazwaste.textColor);
    expect(label?.props.children).toBe(hazwaste.law);
  });

  it('resolves the tag-overflow chip background from Colors.border', () => {
    const item: EstablishmentDTO = {
      ...baseItem,
      complianceTags: ['Air Monitoring', 'Water Monitoring', 'Hazwaste', 'EIA'],
    };
    const r = render(<EstablishmentCard item={item} onPress={noop} />);
    const overflowChip = r.root
      .findAll((n) => (n.type as any)?.name === 'View' || n.type === View)
      .find((n) => flattenStyle(n.props.style).backgroundColor === Colors.border);
    expect(overflowChip).toBeDefined();
    // `+{overflowCount} more` compiles to a children array (`['+', 1, '
    // more']`), not a single string — joined here rather than compared as one.
    const overflowText = r.root
      .findAllByType(Text)
      .find((n) => Array.isArray(n.props.children) && n.props.children.join('') === '+1 more');
    expect(overflowText).toBeDefined();
  });
});

describe('EstablishmentCard legibility guarantee', () => {
  // The bug this task fixes: 9px/10px body copy on a screen inspectors read
  // at arm's length outdoors. Every text node's resolved fontSize must sit at
  // or above the type scale's floor, Type.caption (11), in every branch.
  it('renders nothing below Type.caption.fontSize with tags, overflow, and no swipe actions', () => {
    const item: EstablishmentDTO = {
      ...baseItem,
      complianceTags: ['Air Monitoring', 'Water Monitoring', 'Hazwaste', 'EIA'],
    };
    const r = render(<EstablishmentCard item={item} onPress={noop} />);
    const sizes = allFontSizes(r);
    expect(sizes.length).toBeGreaterThan(0);
    sizes.forEach((size) => expect(size).toBeGreaterThanOrEqual(Type.caption.fontSize));
  });

  it('renders nothing below Type.caption.fontSize with edit/delete actions, pending sync, and no tags', () => {
    const item: EstablishmentDTO = { ...baseItem, syncStatus: 'pending', complianceTags: [] };
    const r = render(<EstablishmentCard item={item} onPress={noop} onEdit={noop} onDelete={noop} />);
    const sizes = allFontSizes(r);
    expect(sizes.length).toBeGreaterThan(0);
    sizes.forEach((size) => expect(size).toBeGreaterThanOrEqual(Type.caption.fontSize));
  });

  it('renders nothing below Type.caption.fontSize with a sync conflict', () => {
    const item: EstablishmentDTO = { ...baseItem, syncStatus: 'conflict' };
    const r = render(<EstablishmentCard item={item} onPress={noop} />);
    const sizes = allFontSizes(r);
    expect(sizes.length).toBeGreaterThan(0);
    sizes.forEach((size) => expect(size).toBeGreaterThanOrEqual(Type.caption.fontSize));
  });
});

describe('EstablishmentCard sync indicator', () => {
  it('shows a Pending sync row at the pending token color when syncStatus is pending', () => {
    const item: EstablishmentDTO = { ...baseItem, syncStatus: 'pending' };
    const r = render(<EstablishmentCard item={item} onPress={noop} />);
    const pendingIcon = r.root.findAllByType(Ionicons).find((n) => n.props.name === 'cloud-upload-outline');
    const pendingText = r.root.findAllByType(Text).find((n) => n.props.children === 'Pending sync');
    expect(pendingIcon?.props.color).toBe(Colors.pending);
    expect(flattenStyle(pendingText?.props.style).color).toBe(Colors.pending);
  });

  it('shows a tappable Sync conflict row at the conflict token color, and resolves via confirmResolveConflict', () => {
    const item: EstablishmentDTO = { ...baseItem, syncStatus: 'conflict' };
    const r = render(<EstablishmentCard item={item} onPress={noop} />);
    const conflictIcon = r.root.findAllByType(Ionicons).find((n) => n.props.name === 'alert-circle-outline');
    const conflictRow = r.root.find(
      (n) => n.type === TouchableOpacity && n.props?.children?.[1]?.props?.children === 'Sync conflict',
    );
    expect(conflictIcon?.props.color).toBe(Colors.conflict);
    expect(flattenStyle(conflictRow.props.children[1].props.style).color).toBe(Colors.conflict);

    TestRenderer.act(() => {
      conflictRow.props.onPress();
    });
    expect(mockConfirmResolveConflict).toHaveBeenCalledWith('establishments', item.estabId, item.name);
  });

  it('shows neither sync row when syncStatus is synced', () => {
    const r = render(<EstablishmentCard item={baseItem} onPress={noop} />);
    expect(r.root.findAllByType(Ionicons).some((n) => n.props.name === 'cloud-upload-outline')).toBe(false);
    expect(r.root.findAllByType(Ionicons).some((n) => n.props.name === 'alert-circle-outline')).toBe(false);
  });
});

describe('EstablishmentCard action visibility (unchanged by this task)', () => {
  it('always shows Add, and hides Edit/Delete when their handlers are not provided', () => {
    const r = render(<EstablishmentCard item={baseItem} onPress={noop} onAdd={noop} />);
    expect(findActionButton(r, 'Add')).toHaveLength(1);
    expect(findActionButton(r, 'Edit')).toHaveLength(0);
    expect(findActionButton(r, 'Delete')).toHaveLength(0);
  });

  it('shows Edit when onEdit is provided', () => {
    const r = render(<EstablishmentCard item={baseItem} onPress={noop} onEdit={noop} />);
    expect(findActionButton(r, 'Edit')).toHaveLength(1);
    expect(findActionButton(r, 'Delete')).toHaveLength(0);
  });

  it('shows Delete when onDelete is provided', () => {
    const r = render(<EstablishmentCard item={baseItem} onPress={noop} onDelete={noop} />);
    expect(findActionButton(r, 'Delete')).toHaveLength(1);
    expect(findActionButton(r, 'Edit')).toHaveLength(0);
  });

  it('shows all three actions when every handler is provided', () => {
    const r = render(<EstablishmentCard item={baseItem} onPress={noop} onAdd={noop} onEdit={noop} onDelete={noop} />);
    expect(findActionButton(r, 'Add')).toHaveLength(1);
    expect(findActionButton(r, 'Edit')).toHaveLength(1);
    expect(findActionButton(r, 'Delete')).toHaveLength(1);
  });

  it('closes the swipe and invokes the handler when an action is pressed', () => {
    const onEdit = jest.fn();
    const r = render(<EstablishmentCard item={baseItem} onPress={noop} onEdit={onEdit} />);
    const [editBtn] = findActionButton(r, 'Edit');
    TestRenderer.act(() => {
      editBtn.props.onPress();
    });
    expect(onEdit).toHaveBeenCalledWith(baseItem);
  });
});

describe('EstablishmentCard swipe gesture', () => {
  // EstablishmentCard's Add action is always present (unlike ReportListCard,
  // where Edit/Delete can both be absent), so the pan gesture never has a
  // `.enabled(false)` case — it stays enabled regardless of which of
  // onEdit/onDelete are supplied. This locks that invariant in.
  it('stays enabled with only the default Add action available', () => {
    const r = render(<EstablishmentCard item={baseItem} onPress={noop} />);
    expect(isPanGestureEnabled(r)).not.toBe(false);
  });

  it('stays enabled with every action available', () => {
    const r = render(<EstablishmentCard item={baseItem} onPress={noop} onAdd={noop} onEdit={noop} onDelete={noop} />);
    expect(isPanGestureEnabled(r)).not.toBe(false);
  });
});

describe('EstablishmentCard press behavior (unchanged by this task)', () => {
  it('calls onPress with the item when tapped', () => {
    const onPress = jest.fn();
    const r = render(<EstablishmentCard item={baseItem} onPress={onPress} />);
    TestRenderer.act(() => {
      findCard(r).props.onPress();
    });
    expect(onPress).toHaveBeenCalledWith(baseItem);
  });

  it('disables the card TouchableOpacity when no onPress is supplied', () => {
    const r = render(<EstablishmentCard item={baseItem} />);
    expect(findCard(r).props.disabled).toBe(true);
  });
});
