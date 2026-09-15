import React from 'react';
import { Modal, Text, TextInput, TouchableOpacity } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { TimeField, formatTime, parseTime } from './TimeField';

type Renderer = TestRenderer.ReactTestRenderer;

const render = (element: React.ReactElement) => {
  let r!: Renderer;
  act(() => { r = TestRenderer.create(element); });
  return r;
};

const input = (r: Renderer) => r.root.findByType(TextInput);
const sheet = (r: Renderer) => r.root.findByType(Modal);
// Same outer-fiber anchoring as YesNoNAToggle.test.tsx.
const buttons = (r: Renderer) => r.root.findAll(n => n.type === TouchableOpacity);
const buttonLabelled = (r: Renderer, label: string) =>
  buttons(r).filter(b => b.findAllByType(Text).some(t => t.props.children === label)).pop()!;
const clockButton = (r: Renderer) => buttons(r)[0];

describe('the h:mm AM/PM value', () => {
  it('parses what an inspector has been typing so far', () => {
    expect(parseTime('9:00 AM')).toEqual({ hour: 9, minute: 0, period: 'AM' });
    expect(parseTime('12:45 pm')).toEqual({ hour: 12, minute: 45, period: 'PM' });
    expect(parseTime('09:05AM')).toEqual({ hour: 9, minute: 5, period: 'AM' });
  });

  it('rejects anything that is not a clock time', () => {
    expect(parseTime('')).toBeNull();
    expect(parseTime('morning')).toBeNull();
    expect(parseTime('13:00 PM')).toBeNull();
    expect(parseTime('9:60 AM')).toBeNull();
  });

  it('formats without a leading zero on the hour and with one on the minute', () => {
    expect(formatTime({ hour: 9, minute: 5, period: 'AM' })).toBe('9:05 AM');
    expect(formatTime({ hour: 12, minute: 30, period: 'PM' })).toBe('12:30 PM');
  });
});

describe('TimeField', () => {
  it('still lets the time be typed', () => {
    const onChange = jest.fn();
    const r = render(<TimeField label="Sampling Time" value="" onChange={onChange} />);
    act(() => { input(r).props.onChangeText('10:15 AM'); });
    expect(onChange).toHaveBeenCalledWith('10:15 AM');
  });

  it('opens the picker from the clock button, preselecting the typed time', () => {
    const r = render(<TimeField label="Sampling Time" value="2:30 PM" onChange={() => {}} />);
    expect(sheet(r).props.visible).toBe(false);
    act(() => { clockButton(r).props.onPress(); });
    expect(sheet(r).props.visible).toBe(true);
    expect(buttonLabelled(r, '2').props.accessibilityState).toEqual({ selected: true });
    expect(buttonLabelled(r, '30').props.accessibilityState).toEqual({ selected: true });
    expect(buttonLabelled(r, 'PM').props.accessibilityState).toEqual({ selected: true });
  });

  it('writes the picked hour, minute and period on Set', () => {
    const onChange = jest.fn();
    const r = render(<TimeField label="Sampling Time" value="" onChange={onChange} />);
    act(() => { clockButton(r).props.onPress(); });
    act(() => { buttonLabelled(r, '11').props.onPress(); });
    act(() => { buttonLabelled(r, '45').props.onPress(); });
    act(() => { buttonLabelled(r, 'AM').props.onPress(); });
    act(() => { buttonLabelled(r, 'Set').props.onPress(); });
    expect(onChange).toHaveBeenCalledWith('11:45 AM');
    expect(sheet(r).props.visible).toBe(false);
  });

  it('writes the current time on Now', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 8, 15, 14, 7));
    try {
      const onChange = jest.fn();
      const r = render(<TimeField label="Sampling Time" value="" onChange={onChange} />);
      act(() => { clockButton(r).props.onPress(); });
      act(() => { buttonLabelled(r, 'Now').props.onPress(); });
      expect(onChange).toHaveBeenCalledWith('2:07 PM');
    } finally {
      jest.useRealTimers();
    }
  });

  it('renders as plain text with no clock button when read-only', () => {
    const r = render(<TimeField label="Sampling Time" value="9:00 AM" onChange={() => {}} readOnly />);
    expect(r.root.findAllByType(TextInput)).toHaveLength(0);
    expect(r.root.findAllByType(Modal)).toHaveLength(0);
    expect(r.root.findAllByType(Text).some(t => t.props.children === '9:00 AM')).toBe(true);
  });
});
