import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { CheckboxRow, TextField } from '../../../components/form';
import { TreatmentCheckboxGroup } from './TreatmentCheckboxGroup';
import {
  PRIMARY_TREATMENT_OPTIONS,
  BIOLOGICAL_TREATMENT_OPTIONS,
  CHEMICAL_TREATMENT_OPTIONS,
  TREATMENT_OTHERS,
} from './waterChecklistData';

// components/form pulls in useScrollToInput, which touches the native
// KeyboardEvents binding at import time - not available under plain Jest
// (no device/simulator). See dpConditionsVisibility.test.tsx for the same
// stub.
jest.mock('react-native-keyboard-controller', () => ({
  KeyboardEvents: { addListener: () => ({ remove: () => {} }) },
}));

describe('treatment option lists', () => {
  it('lists the primary treatment units from the printed form', () => {
    expect(PRIMARY_TREATMENT_OPTIONS).toEqual([
      'Screening',
      'Grit Removal',
      'Oil/Water Separator',
      'Equalization Tank',
      TREATMENT_OTHERS,
    ]);
  });

  it('lists the biological treatment units from the printed form', () => {
    expect(BIOLOGICAL_TREATMENT_OPTIONS).toEqual([
      'Activated Sludge',
      'Anaerobic Digestion',
      'Anaerobic Baffled Reactor (ABR)',
      'Reed Bed System',
      'Trickling Filter',
      'Oxidation/Stabilization Batch',
      'Sequencing Batch Reactor',
      TREATMENT_OTHERS,
    ]);
  });

  it('lists the chemical treatment units from the printed form', () => {
    expect(CHEMICAL_TREATMENT_OPTIONS).toEqual([
      'pH Adjustment',
      'Disinfection',
      'Redox',
      'Flocculation/Coagulation',
      TREATMENT_OTHERS,
    ]);
  });

  // The printed form reads "Tricking Filter". Agreed with the requester
  // that the app uses the correct term.
  it('corrects the printed form’s "Tricking Filter" typo', () => {
    expect(BIOLOGICAL_TREATMENT_OPTIONS).not.toContain('Tricking Filter');
  });
});

const renderGroup = (props: Partial<React.ComponentProps<typeof TreatmentCheckboxGroup>> = {}) => {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <TreatmentCheckboxGroup
        label="Primary"
        options={PRIMARY_TREATMENT_OPTIONS}
        selected={[]}
        other=""
        onChangeSelected={() => {}}
        onChangeOther={() => {}}
        {...props}
      />,
    );
  });
  return tree;
};

const box = (tree: renderer.ReactTestRenderer, label: string) =>
  tree.root.find(n => n.type === CheckboxRow && n.props.label === label);

describe('TreatmentCheckboxGroup', () => {
  it('offers every option as a checkbox', () => {
    const tree = renderGroup();
    PRIMARY_TREATMENT_OPTIONS.forEach(o => expect(box(tree, o)).toBeTruthy());
  });

  it('ticks the options already selected', () => {
    const tree = renderGroup({ selected: ['Screening'] });
    expect(box(tree, 'Screening').props.checked).toBe(true);
    expect(box(tree, 'Grit Removal').props.checked).toBe(false);
  });

  it('adds an option when it is ticked', () => {
    const onChangeSelected = jest.fn();
    const tree = renderGroup({ selected: ['Screening'], onChangeSelected });
    act(() => { box(tree, 'Grit Removal').props.onToggle(); });
    expect(onChangeSelected).toHaveBeenCalledWith(['Screening', 'Grit Removal']);
  });

  it('removes an option when it is unticked', () => {
    const onChangeSelected = jest.fn();
    const tree = renderGroup({ selected: ['Screening', 'Grit Removal'], onChangeSelected });
    act(() => { box(tree, 'Screening').props.onToggle(); });
    expect(onChangeSelected).toHaveBeenCalledWith(['Grit Removal']);
  });

  it('hides the free-text box until Others is ticked', () => {
    expect(renderGroup().root.findAll(n => n.type === TextField)).toHaveLength(0);
  });

  it('reveals the free-text box once Others is ticked', () => {
    const tree = renderGroup({ selected: [TREATMENT_OTHERS], other: 'Sedimentation' });
    const fields = tree.root.findAll(n => n.type === TextField);
    expect(fields).toHaveLength(1);
    expect(fields[0].props.value).toBe('Sedimentation');
  });
});
