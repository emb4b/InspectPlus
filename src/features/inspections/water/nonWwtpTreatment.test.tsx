import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { WaterExtraFormSectionsView } from './WaterExtraFormSections';
import { TreatmentSystemTypeSection } from './WaterComplianceEditSections';
import { buildWaterReportTabs } from './waterReportTabs';
import { emptyWaterComplianceForm, nonWwtpTreatmentForSave, WaterComplianceFormState } from './waterTypes';
import { CheckboxRow } from '../../../components/form';

// See dpConditionsVisibility.test.tsx for why these mocks are needed. This
// one goes further than a bare stub: the edit-screen tests below save for
// real, and mockPatches captures what would have reached the record.
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

const PROMPT = "Select the establishment's current wastewater treatment system:";
const OTHER_LABEL = 'Others (specify)';

const wastewaterPollutionTab = buildWaterReportTabs().find(t => t.key === 'wastewaterpollution')!;

function countOccurrences(json: unknown, text: string): number {
  if (json == null) return 0;
  if (typeof json === 'string') return json === text ? 1 : 0;
  if (Array.isArray(json)) return json.reduce((sum: number, n) => sum + countOccurrences(n, text), 0);
  if (typeof json === 'object') {
    const node = json as { children?: unknown; props?: Record<string, unknown> };
    const placeholderMatch = node.props?.placeholder === text ? 1 : 0;
    return placeholderMatch + countOccurrences(node.children, text);
  }
  return 0;
}

function renderForm(value: WaterComplianceFormState, onChange: (v: WaterComplianceFormState) => void = () => {}) {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <WaterExtraFormSectionsView value={value} onChange={onChange} mainTab={wastewaterPollutionTab} hasDp={false} />,
    );
  });
  return tree;
}

const checkbox = (tree: renderer.ReactTestRenderer, label: string) =>
  tree.root.find(n => n.type === CheckboxRow && n.props.label === label);

// ── The control itself ───────────────────────────────────────────────────────

describe('Non-WWTP treatment system field (create form, section 5A)', () => {
  // Establishments without a WWTP still treat their wastewater somehow -
  // most commonly a septic tank, or an oil/water separator on a motor pool.
  // Recording that is the whole point of asking "Has WWTP?" first, so the
  // field only exists on the "no" branch.
  it('offers the treatment systems when there is no WWTP', () => {
    const json = renderForm({ ...emptyWaterComplianceForm(), hasWwtp: 'no' }).toJSON();
    expect(countOccurrences(json, PROMPT)).toBe(1);
    expect(countOccurrences(json, 'Septic Tank')).toBe(1);
    expect(countOccurrences(json, 'Oil and Water Separator (OWS)')).toBe(1);
  });

  it('asks nothing about them when there is a WWTP', () => {
    const json = renderForm({ ...emptyWaterComplianceForm(), hasWwtp: 'yes' }).toJSON();
    expect(countOccurrences(json, PROMPT)).toBe(0);
    expect(countOccurrences(json, 'Septic Tank')).toBe(0);
  });

  it('asks nothing about them while the WWTP question is unanswered', () => {
    const json = renderForm({ ...emptyWaterComplianceForm(), hasWwtp: null }).toJSON();
    expect(countOccurrences(json, PROMPT)).toBe(0);
  });

  it('hides the free-text box until Others is ticked', () => {
    const json = renderForm({ ...emptyWaterComplianceForm(), hasWwtp: 'no' }).toJSON();
    expect(countOccurrences(json, OTHER_LABEL)).toBe(0);
  });

  it('reveals the free-text box once Others is ticked', () => {
    const json = renderForm({
      ...emptyWaterComplianceForm(),
      hasWwtp: 'no',
      nonWwtpSystems: ['Others'],
    }).toJSON();
    expect(countOccurrences(json, OTHER_LABEL)).toBe(1);
  });

  it('ticks a system on toggle', () => {
    const onChange = jest.fn();
    const tree = renderForm({ ...emptyWaterComplianceForm(), hasWwtp: 'no' }, onChange);
    act(() => {
      checkbox(tree, 'Septic Tank').props.onToggle();
    });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ nonWwtpSystems: ['Septic Tank'] }));
  });

  it('unticks a system already selected', () => {
    const onChange = jest.fn();
    const tree = renderForm(
      { ...emptyWaterComplianceForm(), hasWwtp: 'no', nonWwtpSystems: ['Septic Tank', 'Others'] },
      onChange,
    );
    act(() => {
      checkbox(tree, 'Septic Tank').props.onToggle();
    });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ nonWwtpSystems: ['Others'] }));
  });

  it('lets both systems be ticked at once', () => {
    const onChange = jest.fn();
    const tree = renderForm({ ...emptyWaterComplianceForm(), hasWwtp: 'no', nonWwtpSystems: ['Septic Tank'] }, onChange);
    act(() => {
      checkbox(tree, 'Oil and Water Separator (OWS)').props.onToggle();
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ nonWwtpSystems: ['Septic Tank', 'Oil and Water Separator (OWS)'] }),
    );
  });
});

// ── What actually reaches the record ─────────────────────────────────────────

describe('nonWwtpTreatmentForSave', () => {
  // The form keeps a selection alive while the inspector toggles "Has WWTP?"
  // back and forth, so an accidental Yes costs nothing. The record must not
  // be that forgiving: a report saved with a WWTP has no business also
  // describing a septic tank, so the drop happens here, at the boundary.
  const form = (patch: Partial<WaterComplianceFormState>): WaterComplianceFormState => ({
    ...emptyWaterComplianceForm(),
    ...patch,
  });

  it('stores the ticked systems when there is no WWTP', () => {
    expect(nonWwtpTreatmentForSave(form({ hasWwtp: 'no', nonWwtpSystems: ['Septic Tank'] }))).toEqual({
      systems: ['Septic Tank'],
      other: '',
    });
  });

  it('stores the free text alongside an Others tick', () => {
    expect(
      nonWwtpTreatmentForSave(form({ hasWwtp: 'no', nonWwtpSystems: ['Others'], nonWwtpOther: 'Grease trap' })),
    ).toEqual({ systems: ['Others'], other: 'Grease trap' });
  });

  it('drops free text left behind by an unticked Others', () => {
    expect(
      nonWwtpTreatmentForSave(form({ hasWwtp: 'no', nonWwtpSystems: ['Septic Tank'], nonWwtpOther: 'Grease trap' })),
    ).toEqual({ systems: ['Septic Tank'], other: '' });
  });

  it('stores nothing when the report records a WWTP', () => {
    expect(
      nonWwtpTreatmentForSave(form({ hasWwtp: 'yes', nonWwtpSystems: ['Septic Tank'], nonWwtpOther: 'Grease trap' })),
    ).toEqual({});
  });

  it('stores nothing while the WWTP question is unanswered', () => {
    expect(nonWwtpTreatmentForSave(form({ hasWwtp: null, nonWwtpSystems: ['Septic Tank'] }))).toEqual({});
  });
});

// ── The same question on the edit screen ─────────────────────────────────────

describe('Non-WWTP treatment system field (edit screen, section 5A)', () => {
  beforeEach(() => {
    mockPatches.length = 0;
  });

  const renderSection = (
    hasWwtp: boolean | null,
    nonWwtpTreatment: Record<string, unknown> = {},
  ) => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <TreatmentSystemTypeSection
          complianceId="c1"
          hasWwtp={hasWwtp}
          nonWwtpTreatment={nonWwtpTreatment}
          canEdit
          onSaved={() => {}}
        />,
      );
    });
    return tree;
  };

  const startEditing = (tree: renderer.ReactTestRenderer) => {
    act(() => {
      tree.root.find(n => n.type === CheckboxRow || n.props?.onStartEdit != null).props.onStartEdit();
    });
  };

  it('reads back the recorded systems without entering edit mode', () => {
    const tree = renderSection(false, { systems: ['Septic Tank', 'Others'], other: 'Grease trap' });
    expect(countOccurrences(tree.toJSON(), 'Septic Tank, Others: Grease trap')).toBe(1);
  });

  it('shows a dash when no WWTP is recorded and nothing was ticked', () => {
    const tree = renderSection(false, {});
    expect(countOccurrences(tree.toJSON(), PROMPT)).toBe(0);
  });

  it('offers the checkboxes once editing a record with no WWTP', () => {
    const tree = renderSection(false, {});
    startEditing(tree);
    const json = tree.toJSON();
    expect(countOccurrences(json, PROMPT)).toBe(1);
    expect(countOccurrences(json, 'Septic Tank')).toBe(1);
  });

  it('asks nothing about them when editing a record that has a WWTP', () => {
    const tree = renderSection(true, {});
    startEditing(tree);
    expect(countOccurrences(tree.toJSON(), PROMPT)).toBe(0);
  });

  it('writes the ticked systems to the record', async () => {
    const tree = renderSection(false, {});
    startEditing(tree);
    act(() => {
      checkbox(tree, 'Septic Tank').props.onToggle();
    });
    await act(async () => {
      await tree.root.find(n => n.props?.onSave != null && n.props?.onStartEdit != null).props.onSave();
    });
    expect(mockPatches).toEqual([
      expect.objectContaining({ hasWwtp: false, nonWwtpTreatment: { systems: ['Septic Tank'], other: '' } }),
    ]);
  });

  it('stores nothing for the field when the record is saved with a WWTP', async () => {
    const tree = renderSection(false, { systems: ['Septic Tank'], other: '' });
    startEditing(tree);
    act(() => {
      tree.root.find(n => n.props?.options != null && n.props?.label === 'Has WWTP?').props.onChange('yes');
    });
    await act(async () => {
      await tree.root.find(n => n.props?.onSave != null && n.props?.onStartEdit != null).props.onSave();
    });
    expect(mockPatches).toEqual([expect.objectContaining({ hasWwtp: true, nonWwtpTreatment: {} })]);
  });
});
