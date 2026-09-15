import React from 'react';
import { Modal, Text, TextInput, TouchableOpacity } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ComboInput } from './ComboInput';

type Renderer = TestRenderer.ReactTestRenderer;

const render = (element: React.ReactElement) => {
  let r!: Renderer;
  act(() => { r = TestRenderer.create(element); });
  return r;
};

const OPTIONS = ['pH', 'BOD', 'TSS'];

const input = (r: Renderer) => r.root.findByType(TextInput);
const sheet = (r: Renderer) => r.root.findByType(Modal);
// Same outer-fiber anchoring as YesNoNAToggle.test.tsx.
const buttons = (r: Renderer) => r.root.findAll(n => n.type === TouchableOpacity);
const optionButton = (r: Renderer, label: string) =>
  buttons(r).filter(b => b.findAllByType(Text).some(t => t.props.children === label)).pop()!;

describe('ComboInput', () => {
  it('is a live text input - anything typed goes straight through', () => {
    const onChangeText = jest.fn();
    const r = render(<ComboInput title="Parameter" value="" options={OPTIONS} onChangeText={onChangeText} />);
    act(() => { input(r).props.onChangeText('Total Coliform'); });
    expect(onChangeText).toHaveBeenCalledWith('Total Coliform');
  });

  it('keeps the sheet closed until the chevron is pressed', () => {
    const r = render(<ComboInput title="Parameter" value="" options={OPTIONS} onChangeText={() => {}} />);
    expect(sheet(r).props.visible).toBe(false);
    act(() => { buttons(r)[0].props.onPress(); });
    expect(sheet(r).props.visible).toBe(true);
  });

  it('writes the picked option and closes the sheet', () => {
    const onChangeText = jest.fn();
    const r = render(<ComboInput title="Parameter" value="" options={OPTIONS} onChangeText={onChangeText} />);
    act(() => { buttons(r)[0].props.onPress(); });
    act(() => { optionButton(r, 'BOD').props.onPress(); });
    expect(onChangeText).toHaveBeenCalledWith('BOD');
    expect(sheet(r).props.visible).toBe(false);
  });

  it('goes inert, not hidden, when there is nothing to offer', () => {
    const r = render(<ComboInput title="Parameter" value="" options={[]} onChangeText={() => {}} />);
    expect(buttons(r)[0].props.disabled).toBe(true);
    expect(input(r).props.editable).not.toBe(false);
  });

  it('hands the text input to a ref so a focus chain can reach it', () => {
    const ref = React.createRef<TextInput>();
    const onSubmitEditing = jest.fn();
    const r = render(
      <ComboInput ref={ref} title="Parameter" value="" options={OPTIONS} onChangeText={() => {}} returnKeyType="next" onSubmitEditing={onSubmitEditing} />,
    );
    expect(ref.current).toBeTruthy();
    expect(input(r).props.returnKeyType).toBe('next');
    act(() => { input(r).props.onSubmitEditing(); });
    expect(onSubmitEditing).toHaveBeenCalled();
  });
});
