import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { SelectField, TextField } from '../../../components/form';
import { WaterExtraFormSectionsView } from './WaterExtraFormSections';
import { buildWaterReportTabs } from './waterReportTabs';
import {
  decodeReceivingBodyOfWater,
  receivingBodyOfWaterForSave,
  describeReceivingBodyOfWater,
  emptyWaterComplianceForm,
  emptyWwtpDetail,
  WaterComplianceFormState,
} from './waterTypes';
import { WATERBODY_NOT_LISTED } from '../../../constants/waterbodies';

jest.mock('../../../db/database', () => ({
  database: { write: async (fn: () => Promise<void>) => fn() },
  collections: { complianceWater: { find: async () => ({ update: () => {} }) } },
}));
jest.mock('react-native-keyboard-controller', () => ({
  KeyboardEvents: { addListener: () => ({ remove: () => {} }) },
}));

describe('decoding a stored receiving body of water', () => {
  it('recognises a value from the establishment’s province', () => {
    expect(decodeReceivingBodyOfWater('Boac River (C)', 'Marinduque')).toEqual({
      selection: 'Boac River (C)',
      other: '',
    });
  });

  // Reports predate the dropdown, so this field is full of hand-typed
  // names. Presenting them as "not listed" with the text preserved keeps
  // the record readable; blanking them would destroy data.
  it('presents legacy free text as not-listed, keeping the text', () => {
    expect(decodeReceivingBodyOfWater('creek behind the plant', 'Marinduque')).toEqual({
      selection: WATERBODY_NOT_LISTED,
      other: 'creek behind the plant',
    });
  });

  // The same river in the wrong province is still not a valid choice here -
  // the dropdown only ever offered this establishment's own province.
  it('treats a value from another province as not-listed', () => {
    expect(decodeReceivingBodyOfWater('Honda Bay (SB)', 'Marinduque')).toEqual({
      selection: WATERBODY_NOT_LISTED,
      other: 'Honda Bay (SB)',
    });
  });

  it('leaves an empty value empty', () => {
    expect(decodeReceivingBodyOfWater('', 'Marinduque')).toEqual({ selection: '', other: '' });
  });
});

describe('what reaches the record', () => {
  it('stores the selected option', () => {
    expect(receivingBodyOfWaterForSave('Boac River (C)', '')).toBe('Boac River (C)');
  });

  it('stores the free text when not-listed is selected', () => {
    expect(receivingBodyOfWaterForSave(WATERBODY_NOT_LISTED, ' Sapa Creek ')).toBe('Sapa Creek');
  });

  // Text stranded by re-picking a real option would otherwise contradict
  // the option beside it - the same rule nonWwtpTreatmentFor applies.
  it('drops free text left behind by a re-picked option', () => {
    expect(receivingBodyOfWaterForSave('Boac River (C)', 'Sapa Creek')).toBe('Boac River (C)');
  });

  it('stores nothing when not-listed is selected but nothing is typed', () => {
    expect(receivingBodyOfWaterForSave(WATERBODY_NOT_LISTED, '   ')).toBe('');
  });
});

describe('summarising for a read-only card', () => {
  it('shows the selected option', () => {
    const detail = { ...emptyWwtpDetail('1'), receivingBodyOfWater: 'Boac River (C)' };
    expect(describeReceivingBodyOfWater(detail)).toBe('Boac River (C)');
  });

  it('shows the free text rather than the not-listed label', () => {
    const detail = {
      ...emptyWwtpDetail('1'),
      receivingBodyOfWater: WATERBODY_NOT_LISTED,
      receivingBodyOfWaterOther: 'Sapa Creek',
    };
    expect(describeReceivingBodyOfWater(detail)).toBe('Sapa Creek');
  });

  it('shows an em dash when nothing was recorded', () => {
    expect(describeReceivingBodyOfWater(emptyWwtpDetail('1'))).toBe('—');
  });
});

const wastewaterTab = buildWaterReportTabs().find(t => t.key === 'wastewaterpollution')!;

function renderForm(
  value: WaterComplianceFormState,
  province: string,
  onChange: (v: WaterComplianceFormState) => void = () => {},
) {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <WaterExtraFormSectionsView
        value={value}
        onChange={onChange}
        mainTab={wastewaterTab}
        hasDp={false}
        province={province}
      />,
    );
  });
  return tree;
}

const withOneOutlet = (patch: Partial<ReturnType<typeof emptyWwtpDetail>> = {}) => ({
  ...emptyWaterComplianceForm(),
  hasWwtp: 'yes' as const,
  wwtpDetails: [{ ...emptyWwtpDetail('1'), ...patch }],
});

const receivingField = (tree: renderer.ReactTestRenderer) =>
  tree.root.find(
    n => n.type === SelectField && n.props.label === 'Receiving Body of Water (Water Classification)',
  );

describe('Receiving Body of Water (create form, section 5C)', () => {
  it('offers the establishment’s own province’s waterbodies', () => {
    const options = receivingField(renderForm(withOneOutlet(), 'Marinduque')).props.groups
      .flatMap((g: { options: string[] }) => g.options);
    expect(options).toContain('Boac River (C)');
    expect(options).not.toContain('Honda Bay (SB)');
  });

  it('groups them principal, then minor, then other', () => {
    const labels = receivingField(renderForm(withOneOutlet(), 'Marinduque')).props.groups
      .map((g: { label: string }) => g.label);
    expect(labels).toEqual(['Principal Rivers', 'Minor Rivers', 'Other Waterbodies']);
  });

  it('always offers the not-listed escape hatch', () => {
    const options = receivingField(renderForm(withOneOutlet(), 'Marinduque')).props.groups
      .flatMap((g: { options: string[] }) => g.options);
    expect(options).toContain('Not listed (specify)');
  });

  it('hides the free-text box until not-listed is picked', () => {
    const tree = renderForm(withOneOutlet(), 'Marinduque');
    expect(tree.root.findAll(n => n.type === TextField && n.props.label === 'Specify').length).toBe(0);
  });

  it('reveals the free-text box once not-listed is picked', () => {
    const tree = renderForm(
      withOneOutlet({ receivingBodyOfWater: 'Not listed (specify)' }),
      'Marinduque',
    );
    expect(tree.root.findAll(n => n.type === TextField && n.props.label === 'Specify').length).toBe(1);
  });

  it('records the picked waterbody', () => {
    const onChange = jest.fn();
    const tree = renderForm(withOneOutlet(), 'Marinduque', onChange);
    act(() => { receivingField(tree).props.onSelect('Boac River (C)'); });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        wwtpDetails: [expect.objectContaining({ receivingBodyOfWater: 'Boac River (C)' })],
      }),
    );
  });
});
