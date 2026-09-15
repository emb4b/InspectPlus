import React from 'react';
import { TextInput } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { ComboInput, TextField } from '../../../components/form';
import { WaterExtraFormSectionsView } from './WaterExtraFormSections';
import { SamplingPointsSection } from './WaterComplianceEditSections';
import { buildWaterReportTabs } from './waterReportTabs';
import { WATER_QUALITY_PARAMETERS } from './waterChecklistData';
import {
  emptyWaterComplianceForm,
  emptySamplingPoint,
  emptySamplingParameter,
  WaterComplianceFormState,
} from './waterTypes';

jest.mock('../../../db/database', () => ({
  database: { write: async (fn: () => Promise<void>) => fn() },
  collections: { complianceWater: { find: async () => ({ update: () => {} }) } },
}));
jest.mock('react-native-keyboard-controller', () => ({
  KeyboardEvents: { addListener: () => ({ remove: () => {} }) },
}));

const samplingTab = buildWaterReportTabs().find(t => t.key === 'samplingfindings')!;

const pointWithParam = () => ({ ...emptySamplingPoint('1'), parameters: [emptySamplingParameter()] });

const renderForm = (onChange: (v: WaterComplianceFormState) => void = () => {}) => {
  const value: WaterComplianceFormState = {
    ...emptyWaterComplianceForm(),
    samplingConducted: 'yes',
    samplingPoints: [pointWithParam()],
  };
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <WaterExtraFormSectionsView value={value} onChange={onChange} mainTab={samplingTab} hasDp={false} province="Marinduque" />,
    );
  });
  return tree;
};

const renderEdit = () => {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <SamplingPointsSection
        complianceId="c1"
        value={{ samplingConducted: true, samplingClassification: 'Effluent', samplingPoints: [pointWithParam()] }}
        canEdit
        onSaved={() => {}}
      />,
    );
  });
  const edit = tree.root.findAll(n => typeof n.props.onStartEdit === 'function')[0];
  act(() => { edit.props.onStartEdit(); });
  return tree;
};

const parameterCombos = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAll(n => n.type === ComboInput && n.props.title === 'Parameter');
const byPlaceholder = (tree: renderer.ReactTestRenderer, placeholder: string) =>
  tree.root.findAll(n => n.type === TextInput && n.props.placeholder === placeholder);
const fieldLabels = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAll(n => n.type === TextField).map(n => n.props.label as string);

describe.each([
  ['create form', renderForm],
  ['edit screen', renderEdit],
])('Water Quality Sampling parameters (%s)', (_, render) => {
  it('offers the parameter names from a typeable dropdown', () => {
    const combos = parameterCombos(render());
    expect(combos).toHaveLength(1);
    expect(combos[0].props.options).toBe(WATER_QUALITY_PARAMETERS);
    expect(combos[0].props.options).toContain('pH');
  });

  it('gives the DENR standard a full-width, multiline field', () => {
    const standard = byPlaceholder(render(), 'DENR Standard');
    expect(standard).toHaveLength(1);
    expect(standard[0].props.multiline).toBe(true);
  });

  it('calls the point-level note Result Analysis, as the template does', () => {
    const labels = fieldLabels(render());
    expect(labels).toContain('Result Analysis');
    expect(labels).not.toContain('Remarks');
  });
});

describe('what the create form records', () => {
  it('writes a parameter name whether picked or typed', () => {
    const onChange = jest.fn();
    const tree = renderForm(onChange);
    act(() => { parameterCombos(tree)[0].props.onChangeText('Total Coliform'); });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        samplingPoints: [expect.objectContaining({ parameters: [expect.objectContaining({ parameterName: 'Total Coliform' })] })],
      }),
    );
  });
});

describe('the parameter list', () => {
  it('covers the effluent parameters an inspector routinely reports', () => {
    for (const p of ['pH', 'Temperature', 'BOD', 'COD', 'TSS', 'Oil and Grease', 'Fecal Coliform']) {
      expect(WATER_QUALITY_PARAMETERS).toContain(p);
    }
    expect(new Set(WATER_QUALITY_PARAMETERS).size).toBe(WATER_QUALITY_PARAMETERS.length);
  });
});
