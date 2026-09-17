import React from 'react';
import { Linking, Text } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { UpdateBanner } from './UpdateBanner';
import { Colors } from '../../design/colors';

type Renderer = TestRenderer.ReactTestRenderer;

const render = (onDismiss = jest.fn()) => {
  let r!: Renderer;
  act(() => {
    r = TestRenderer.create(<UpdateBanner version="1.1.0" url="https://example.test/inspectplus.apk" onDismiss={onDismiss} />);
  });
  return r;
};

const text = (r: Renderer) => JSON.stringify(r.toJSON());
const findByLabel = (r: Renderer, label: string) =>
  r.root.find(n => n.props?.accessibilityLabel === label && typeof n.props?.onPress === 'function');

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...([style].flat(Infinity).filter(Boolean) as Record<string, unknown>[]));

describe('UpdateBanner', () => {
  it('names the version that is available', () => {
    expect(text(render())).toContain('Version 1.1.0 is available');
  });

  it('opens the APK link in the browser on Download', () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const r = render();
    act(() => { findByLabel(r, 'Download version 1.1.0').props.onPress(); });
    expect(open).toHaveBeenCalledWith('https://example.test/inspectplus.apk');
    open.mockRestore();
  });

  it('reports a dismissal', () => {
    const onDismiss = jest.fn();
    const r = render(onDismiss);
    act(() => { findByLabel(r, 'Dismiss update notice').props.onPress(); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('draws the Download action in the brand green like every other text action', () => {
    const r = render();
    const label = findByLabel(r, 'Download version 1.1.0').findByType(Text);
    expect(flatten(label.props.style).color).toBe(Colors.green);
  });
});
