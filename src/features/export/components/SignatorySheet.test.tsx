import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { TextField } from '../../../components/form';
import { Button } from '../../../components/Button';
import { SignatorySheet } from './SignatorySheet';

jest.mock('react-native-keyboard-controller', () => jest.requireActual('react-native-keyboard-controller/jest'));
jest.mock('react-native-reanimated', () => ({ ...jest.requireActual('react-native-reanimated'), useReducedMotion: () => false }));

const initial = { inspectorName: 'Juan', inspectorPosition: '', supervisorName: '', supervisorPosition: '' };

describe('SignatorySheet', () => {
  it('prefills from initial and confirms the edited values', () => {
    const onConfirm = jest.fn();
    let r!: TestRenderer.ReactTestRenderer;
    act(() => { r = TestRenderer.create(<SignatorySheet visible initial={initial} onCancel={() => {}} onConfirm={onConfirm} />); });
    const fields = r.root.findAllByType(TextField);
    expect(fields.map(f => f.props.label)).toEqual(['Inspector name', 'Inspector position/designation', 'Immediate supervisor name', 'Supervisor position/designation']);
    expect(fields[0].props.value).toBe('Juan');
    act(() => fields[1].props.onChangeText('Engineer II'));
    act(() => fields[2].props.onChangeText('Maria'));
    const generate = r.root.findAllByType(Button).find(b => b.props.label === 'Generate')!;
    act(() => generate.props.onPress());
    expect(onConfirm).toHaveBeenCalledWith({ inspectorName: 'Juan', inspectorPosition: 'Engineer II', supervisorName: 'Maria', supervisorPosition: '' });
  });

  it('disables Generate until the inspector name is filled', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => { r = TestRenderer.create(<SignatorySheet visible initial={{ ...initial, inspectorName: '' }} onCancel={() => {}} onConfirm={() => {}} />); });
    const generate = r.root.findAllByType(Button).find(b => b.props.label === 'Generate')!;
    expect(generate.props.disabled).toBe(true);
    act(() => r.root.findAllByType(TextField)[0].props.onChangeText('X'));
    expect(r.root.findAllByType(Button).find(b => b.props.label === 'Generate')!.props.disabled).toBe(false);
  });
});
