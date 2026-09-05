import React from 'react';
import { TouchableOpacity } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { EstablishmentPickerStep } from './EstablishmentPickerStep';
import { Button } from '../../../components/Button';
import { Colors } from '../../../constants/colors';

// EstablishmentPickerStep imports useEstablishments, which constructs a real
// WatermelonDB SQLiteAdapter at import time (via db/database.ts) needing the
// native JSI binding that isn't present under plain Jest — same rationale as
// ReportListCard.test.tsx and useEstablishment.test.ts. The useEstablishment
// module mock below replaces that whole chain for this file already, but
// these three mocks are kept alongside it (rather than relied on implicitly)
// to match the established pattern documented in ReportListCard.test.tsx,
// in case any future edit here starts importing the real hook module for
// something else it exports.
jest.mock('../../../db/database', () => ({ database: {}, collections: {} }));
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't reference out-of-scope imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../../../services/supabase/client', () => ({ supabase: {} }));

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

// Stub the hook itself rather than driving it for real: this file is about
// the "New Establishment" button, not establishment search/filtering, which
// has its own coverage elsewhere.
const mockUseEstablishments = jest.fn();
jest.mock('../../establishments/hooks/useEstablishment', () => ({
  useEstablishments: (...args: unknown[]) => mockUseEstablishments(...args),
}));

// useHeaderScroll throws outside a HeaderScrollProvider; stub it rather than
// standing up the provider (and its reanimated shared values) for a test
// that never asserts on scroll-driven header collapse.
jest.mock('../../home/context/HeaderScrollContext', () => ({
  useHeaderScroll: () => ({ onScroll: jest.fn(), collapsed: { value: 0 }, expand: jest.fn() }),
}));

type Renderer = TestRenderer.ReactTestRenderer;

const render = (element: React.ReactElement) => {
  let r!: Renderer;
  act(() => {
    r = TestRenderer.create(element);
  });
  return r;
};

const flattenStyle = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...([style].flat(Infinity).filter(Boolean) as Record<string, unknown>[]));

// The picker renders several TouchableOpacitys (Back, each establishment
// row, and this one), and react-native's own TouchableOpacity module is a
// thin wrapper that spreads every prop it receives — onPress included — onto
// an inner, unexported class component of the same displayName, so a
// props-only predicate double-matches: once on the outer wrapper fiber, once
// on the inner one (same concern documented in ReportListCard.test.tsx and
// AddRowButton.test.tsx). Anchoring on `n.type === TouchableOpacity` plus the
// accessibilityLabel Button derives from its `label` prop narrows this to
// exactly the "New Establishment" control's outer fiber.
const findNewEstablishmentButton = (r: Renderer) => {
  const matches = r.root.findAll(
    (n) => n.type === TouchableOpacity && n.props?.accessibilityLabel === 'New Establishment',
  );
  if (matches.length === 0) {
    throw new Error('No "New Establishment" TouchableOpacity found');
  }
  if (matches.length > 1) {
    throw new Error(
      `Expected 1 "New Establishment" TouchableOpacity but found ${matches.length}; the locator is not sufficiently specific`,
    );
  }
  return matches[0];
};

const noop = () => {};

describe('EstablishmentPickerStep "New Establishment" button', () => {
  beforeEach(() => {
    mockUseEstablishments.mockReturnValue({ establishments: [], loading: false, error: null });
  });

  it('renders via the shared Button primitive with the "add" variant, not a bespoke component', () => {
    const r = render(<EstablishmentPickerStep onPick={noop} onCreateNew={noop} />);
    const button = r.root.findByType(Button);
    expect(button.props.variant).toBe('add');
    expect(button.props.label).toBe('New Establishment');
  });

  // The bug this task fixes: before, this button drew its own dashed border
  // via a local `newBtn` style. Now the dashed/green treatment must come
  // from Button's shared "add" variant — assert the resolved style values,
  // imported as symbols, not restated hex/keyword literals.
  it("gets its dashed-green treatment from Button's shared \"add\" variant, not a local style", () => {
    const r = render(<EstablishmentPickerStep onPick={noop} onCreateNew={noop} />);
    const style = flattenStyle(findNewEstablishmentButton(r).props.style);
    expect(style.borderStyle).toBe('dashed');
    expect(style.borderColor).toBe(Colors.greenLight);
  });

  it('stays left-aligned and content-width, not stretched full width', () => {
    const r = render(<EstablishmentPickerStep onPick={noop} onCreateNew={noop} />);
    const style = flattenStyle(findNewEstablishmentButton(r).props.style);
    expect(style.alignSelf).toBe('flex-start');
  });

  it('invokes the same onCreateNew handler as before when pressed', () => {
    const onCreateNew = jest.fn();
    const r = render(<EstablishmentPickerStep onPick={noop} onCreateNew={onCreateNew} />);

    act(() => {
      findNewEstablishmentButton(r).props.onPress();
    });

    expect(onCreateNew).toHaveBeenCalledTimes(1);
  });

  it('never renders a label starting with a literal "+"', () => {
    const r = render(<EstablishmentPickerStep onPick={noop} onCreateNew={noop} />);
    const button = r.root.findByType(Button);
    expect(String(button.props.label).startsWith('+')).toBe(false);
  });
});
