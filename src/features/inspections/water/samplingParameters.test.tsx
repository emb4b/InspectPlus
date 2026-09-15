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

const mockPatches: Record<string, unknown>[] = [];
jest.mock('../../../db/database', () => ({
  database: { write: async (fn: () => Promise<void>) => fn() },
  collections: {
    complianceWater: {
      find: async () => ({
        update: (fn: (rec: Record<string, unknown>) => void) => {
          const rec: Record<string, unknown> = {};
          fn(rec);
          mockPatches.push(rec);
        },
      }),
    },
  },
}));
jest.mock('react-native-keyboard-controller', () => ({
  KeyboardEvents: { addListener: () => ({ remove: () => {} }) },
}));

const samplingTab = buildWaterReportTabs().find(t => t.key === 'samplingfindings')!;

const pointWithParam = (remarks = '') => ({
  ...emptySamplingPoint('1'),
  parameters: [{ ...emptySamplingParameter(), remarks }],
});

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

const renderEditSection = (remarks = '') => {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <SamplingPointsSection
        complianceId="c1"
        value={{ samplingConducted: true, samplingClassification: 'Effluent', samplingPoints: [pointWithParam(remarks)] }}
        canEdit
        onSaved={() => {}}
      />,
    );
  });
  return tree;
};
const startEdit = (tree: renderer.ReactTestRenderer) => {
  const edit = tree.root.findAll(n => typeof n.props.onStartEdit === 'function')[0];
  act(() => { edit.props.onStartEdit(); });
  return tree;
};
const renderEdit = () => startEdit(renderEditSection());
const flatten = (node: renderer.ReactTestRendererNode | renderer.ReactTestRendererNode[] | null): string =>
  node == null ? '' : typeof node === 'string' ? node : Array.isArray(node) ? node.map(flatten).join('') : flatten(node.children ?? null);

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

// The create form has always recorded a remark per parameter; the edit
// screen used to neither show nor edit it, so a remark typed at creation
// looked lost the moment the report was reopened.
describe('per-parameter remarks on the edit screen', () => {
  beforeEach(() => {
    mockPatches.length = 0;
  });

  it('shows a stored remark on the read-only card', () => {
    expect(flatten(renderEditSection('Exceeds Class C limit').toJSON())).toContain('Exceeds Class C limit');
  });

  it('offers a Remarks input per parameter while editing', () => {
    expect(byPlaceholder(renderEdit(), 'Remarks')).toHaveLength(1);
  });

  it('round-trips an edited remark through save', async () => {
    const tree = startEdit(renderEditSection('old'));
    act(() => { byPlaceholder(tree, 'Remarks')[0].props.onChangeText('Exceeds Class C limit'); });
    const actions = tree.root.findAll(n => n.props?.onSave != null && n.props?.onStartEdit != null);
    await act(async () => { await actions[0].props.onSave(); });
    expect(mockPatches).toEqual([
      expect.objectContaining({
        samplingPoints: [expect.objectContaining({ parameters: [expect.objectContaining({ remarks: 'Exceeds Class C limit' })] })],
      }),
    ]);
  });
});
