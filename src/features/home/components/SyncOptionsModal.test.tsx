import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { SyncOptionsModal } from './SyncOptionsModal';

// RadioGroup pulls in the keyboard controller through the form barrel; the
// native module isn't linked under Jest - same stub the water tests use.
jest.mock('react-native-keyboard-controller', () => ({
  KeyboardEvents: { addListener: () => ({ remove: () => {} }) },
}));

type Renderer = TestRenderer.ReactTestRenderer;

const render = (props: Partial<React.ComponentProps<typeof SyncOptionsModal>> = {}) => {
  let r!: Renderer;
  act(() => {
    r = TestRenderer.create(
      <SyncOptionsModal visible syncing={false} onCancel={() => {}} onSync={() => {}} onReset={() => {}} {...props} />,
    );
  });
  return r;
};
// Same outer-fiber anchoring as YesNoNAToggle.test.tsx.
const buttonLabelled = (r: Renderer, label: string) =>
  r.root.findAll(n => n.type === TouchableOpacity)
    .filter(b => b.findAllByType(Text).some(t => t.props.children === label)).pop();

describe('SyncOptionsModal recovery action', () => {
  it('offers Reset and re-download apart from the three everyday directions', () => {
    const r = render();
    expect(buttonLabelled(r, 'Reset and re-download…')).toBeDefined();
    // The three directions are unchanged - the reset is an addition, not a
    // fourth radio option an inspector could pick by habit.
    const labels = r.root.findAllByType(Text).map(t => t.props.children);
    for (const l of ['Pull only', 'Push only', 'Pull & Push']) expect(labels).toContain(l);
  });

  it('hands the reset to its own handler, not to Start Sync', () => {
    const onReset = jest.fn();
    const onSync = jest.fn();
    const r = render({ onReset, onSync });
    act(() => { buttonLabelled(r, 'Reset and re-download…')!.props.onPress(); });
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onSync).not.toHaveBeenCalled();
  });

  it('is disabled while a sync is in flight, like every other control', () => {
    const r = render({ syncing: true });
    expect(buttonLabelled(r, 'Reset and re-download…')!.props.disabled).toBe(true);
  });
});
