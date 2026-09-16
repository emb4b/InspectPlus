import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { TextField } from '../../../components/form';
import { Button } from '../../../components/Button';
import { Colors } from '../../../design/colors';
import { HOME_FOOTER_BAR_HEIGHT } from '../../home/components/HomeFooter';
import { GENERATE_BOTTOM_GAP } from '../exportLayout';
import { SignatorySheet } from './SignatorySheet';

jest.mock('react-native-keyboard-controller', () => jest.requireActual('react-native-keyboard-controller/jest'));
jest.mock('react-native-reanimated', () => ({ ...jest.requireActual('react-native-reanimated'), useReducedMotion: () => false }));
// The library ships its own jest mock (no provider needed — useSafeAreaInsets
// falls back to zero insets), but nothing wires it in automatically the way
// jest-expo does for some other native modules.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- factory can't close over top-level imports (babel-plugin-jest-hoist)
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

const initial = {
  inspectorName: 'Juan', inspectorPosition: '', supervisorName: '', supervisorPosition: '',
  recommendingName: 'Rec Name', recommendingPosition: 'Rec Position',
  approverName: 'App Name', approverPosition: 'App Position',
  additionalInspectors: [],
};

// Flatten a StyleProp (single object or array) into a single resolved style
// object — same convention as Card.test.tsx's helper of the same name.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const flattenStyle = (style: any): any => {
  if (!style) return {};
  if (Array.isArray(style)) return style.reduce((acc, s) => ({ ...acc, ...(s || {}) }), {});
  return style;
};

describe('SignatorySheet', () => {
  it('prefills from initial and confirms the edited values', () => {
    const onConfirm = jest.fn();
    let r!: TestRenderer.ReactTestRenderer;
    act(() => { r = TestRenderer.create(<SignatorySheet visible initial={initial} onCancel={() => {}} onConfirm={onConfirm} />); });
    const fields = r.root.findAllByType(TextField);
    expect(fields.map(f => f.props.label)).toEqual([
      'Inspector name', 'Inspector position/designation', 'Immediate supervisor name', 'Supervisor position/designation',
      'Recommending approval — name', 'Recommending approval — position', 'Approved by — name', 'Approved by — position',
    ]);
    expect(fields[0].props.value).toBe('Juan');
    expect(fields[4].props.value).toBe('Rec Name');
    expect(fields[5].props.value).toBe('Rec Position');
    expect(fields[6].props.value).toBe('App Name');
    expect(fields[7].props.value).toBe('App Position');
    act(() => fields[1].props.onChangeText('Engineer II'));
    act(() => fields[2].props.onChangeText('Maria'));
    act(() => fields[6].props.onChangeText('New Approver'));
    const generate = r.root.findAllByType(Button).find(b => b.props.label === 'Generate')!;
    act(() => generate.props.onPress());
    expect(onConfirm).toHaveBeenCalledWith({
      inspectorName: 'Juan', inspectorPosition: 'Engineer II', supervisorName: 'Maria', supervisorPosition: '',
      recommendingName: 'Rec Name', recommendingPosition: 'Rec Position',
      approverName: 'New Approver', approverPosition: 'App Position',
      additionalInspectors: [],
    });
  });

  it('lifts the pinned footer by HOME_FOOTER_BAR_HEIGHT + GENERATE_BOTTOM_GAP above the (mocked, zero) safe-area inset', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => { r = TestRenderer.create(<SignatorySheet visible initial={initial} onCancel={() => {}} onConfirm={() => {}} />); });
    const footer = r.root.find(n => n.type === View && flattenStyle(n.props.style).borderTopColor === Colors.border);
    expect(flattenStyle(footer.props.style).paddingBottom).toBe(HOME_FOOTER_BAR_HEIGHT + GENERATE_BOTTOM_GAP);
  });

  it('disables Generate until the inspector name is filled', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => { r = TestRenderer.create(<SignatorySheet visible initial={{ ...initial, inspectorName: '' }} onCancel={() => {}} onConfirm={() => {}} />); });
    const generate = r.root.findAllByType(Button).find(b => b.props.label === 'Generate')!;
    expect(generate.props.disabled).toBe(true);
    act(() => r.root.findAllByType(TextField)[0].props.onChangeText('X'));
    expect(r.root.findAllByType(Button).find(b => b.props.label === 'Generate')!.props.disabled).toBe(false);
  });

  it('keeps in-progress edits across a re-render with a new `initial` identity while open, and only resets on reopen', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => { r = TestRenderer.create(<SignatorySheet visible initial={initial} onCancel={() => {}} onConfirm={() => {}} />); });
    act(() => r.root.findAllByType(TextField)[0].props.onChangeText('Edited'));
    expect(r.root.findAllByType(TextField)[0].props.value).toBe('Edited');

    // A new `initial` object with the same values, still visible — this
    // simulates a parent re-render (e.g. a AsyncStorage load resolving)
    // that shouldn't stomp on what the user already typed.
    const sameValuesNewIdentity = { ...initial };
    act(() => { r.update(<SignatorySheet visible initial={sameValuesNewIdentity} onCancel={() => {}} onConfirm={() => {}} />); });
    expect(r.root.findAllByType(TextField)[0].props.value).toBe('Edited');

    // Close, then reopen with a genuinely different `initial` — now it resets.
    act(() => { r.update(<SignatorySheet visible={false} initial={sameValuesNewIdentity} onCancel={() => {}} onConfirm={() => {}} />); });
    const initialB = { ...initial, inspectorName: 'Maria' };
    act(() => { r.update(<SignatorySheet visible initial={initialB} onCancel={() => {}} onConfirm={() => {}} />); });
    expect(r.root.findAllByType(TextField)[0].props.value).toBe('Maria');
  });
});

describe('SignatorySheet additional inspectors', () => {
  it('adds a name + position pair when "Add inspector" is pressed', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => { r = TestRenderer.create(<SignatorySheet visible initial={initial} onCancel={() => {}} onConfirm={() => {}} />); });
    expect(r.root.findAllByType(TextField).map(f => f.props.label)).not.toContain('Additional inspector 1 — name');

    const add = r.root.findAllByType(Button).find(b => b.props.label === 'Add inspector')!;
    act(() => add.props.onPress());

    const labels = r.root.findAllByType(TextField).map(f => f.props.label);
    expect(labels).toContain('Additional inspector 1 — name');
    expect(labels).toContain('Additional inspector 1 — position');
  });

  it('removes the pair when its remove control is pressed', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => { r = TestRenderer.create(<SignatorySheet visible initial={initial} onCancel={() => {}} onConfirm={() => {}} />); });
    const add = r.root.findAllByType(Button).find(b => b.props.label === 'Add inspector')!;
    act(() => add.props.onPress());
    expect(r.root.findAllByType(TextField).map(f => f.props.label)).toContain('Additional inspector 1 — name');

    const remove = r.root.find(n => n.type === TouchableOpacity && n.props.accessibilityLabel === 'Remove inspector 1');
    act(() => remove.props.onPress());
    expect(r.root.findAllByType(TextField).map(f => f.props.label)).not.toContain('Additional inspector 1 — name');
  });

  it('confirms with additionalInspectors trimmed, dropping entries with an empty name', () => {
    const onConfirm = jest.fn();
    let r!: TestRenderer.ReactTestRenderer;
    act(() => { r = TestRenderer.create(<SignatorySheet visible initial={initial} onCancel={() => {}} onConfirm={onConfirm} />); });
    const add = r.root.findAllByType(Button).find(b => b.props.label === 'Add inspector')!;
    // Two added rows: one filled in (with surrounding whitespace to trim),
    // one left with only a position and no name — the empty-name one must
    // be dropped from what Generate confirms.
    act(() => add.props.onPress());
    act(() => add.props.onPress());
    const nameFields = () => r.root.findAllByType(TextField).filter(f => (f.props.label as string).includes('— name') && (f.props.label as string).startsWith('Additional inspector'));
    const positionFields = () => r.root.findAllByType(TextField).filter(f => (f.props.label as string).includes('— position') && (f.props.label as string).startsWith('Additional inspector'));
    act(() => nameFields()[0].props.onChangeText('  Second Inspector  '));
    act(() => positionFields()[0].props.onChangeText('  Engineer I  '));
    act(() => positionFields()[1].props.onChangeText('No name given'));

    const generate = r.root.findAllByType(Button).find(b => b.props.label === 'Generate')!;
    act(() => generate.props.onPress());
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({
      additionalInspectors: [{ name: 'Second Inspector', position: 'Engineer I' }],
    }));
  });
});

describe('SignatorySheet mixedTypes hint', () => {
  const findMixedHint = (r: TestRenderer.ReactTestRenderer) =>
    r.root.findAll(n => n.type === Text && n.props.children === 'Approvers apply to every report in this run.');

  it('shows no extra hint line by default (mixedTypes omitted)', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => { r = TestRenderer.create(<SignatorySheet visible initial={initial} onCancel={() => {}} onConfirm={() => {}} />); });
    expect(findMixedHint(r)).toHaveLength(0);
  });

  it('shows no extra hint line when mixedTypes is explicitly false', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => { r = TestRenderer.create(<SignatorySheet visible initial={initial} mixedTypes={false} onCancel={() => {}} onConfirm={() => {}} />); });
    expect(findMixedHint(r)).toHaveLength(0);
  });

  it('adds the "applies to every report" line when the selection spans more than one report type', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => { r = TestRenderer.create(<SignatorySheet visible initial={initial} mixedTypes onCancel={() => {}} onConfirm={() => {}} />); });
    expect(findMixedHint(r)).toHaveLength(1);
  });
});
