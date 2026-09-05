import React from 'react';
import { Keyboard, TouchableOpacity, Text, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ReportFilterSheet } from './ReportFilterSheet';
import { SelectField, DateField } from '../../../components/form';
import type { UseReportBrowserReturn } from '../hooks/useReportBrowser';

// react-native-keyboard-controller ships its own jest mock for exactly this
// situation — see node_modules/react-native-keyboard-controller/jest/index.js
// — wiring useReanimatedKeyboardAnimation to a static, inert shared value
// instead of the real native module that isn't present under Jest.
jest.mock('react-native-keyboard-controller', () => jest.requireActual('react-native-keyboard-controller/jest'));

// ReportFilterSheet imports INSPECTION_TYPE_LABELS as a real value from
// useEstablishment.ts, which constructs a WatermelonDB SQLiteAdapter at
// import time (via db/database.ts) — needs a native JSI binding absent under
// plain Jest, same rationale as useEstablishment.test.ts and
// ReportListCard.test.tsx. Stub the whole module with a small fixed label
// set instead of assembling the three-deep mock chain those files use.
jest.mock('../hooks/useEstablishment', () => ({
  INSPECTION_TYPE_LABELS: {
    air_monitoring: 'Air Quality Monitoring Report',
    water_monitoring: 'Water Quality Monitoring Report',
  },
}));

type Renderer = TestRenderer.ReactTestRenderer;

const render = (element: React.ReactElement) => {
  let r!: Renderer;
  act(() => { r = TestRenderer.create(element); });
  return r;
};

const flattenStyle = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...([style].flat(Infinity).filter(Boolean) as Record<string, unknown>[]));

function makeBrowser(overrides: Partial<UseReportBrowserReturn> = {}): UseReportBrowserReturn {
  return {
    reports: [],
    loading: false,
    error: null,
    refetch: jest.fn(),
    state: {
      search: '',
      statusFilter: 'all',
      province: '',
      city: '',
      reportType: '',
      dateFrom: '',
      dateTo: '',
      sortOrder: 'newest',
    },
    provinceOptions: ['Palawan', 'Cebu'],
    activeFilterCount: 0,
    setSearch: jest.fn(),
    setStatusFilter: jest.fn(),
    setProvince: jest.fn(),
    setCity: jest.fn(),
    setReportType: jest.fn(),
    setDateFrom: jest.fn(),
    setDateTo: jest.fn(),
    setSortOrder: jest.fn(),
    clearFilters: jest.fn(),
    ...overrides,
  };
}

// Locates the single outer overlay's press handler by its source text
// referencing Keyboard.isVisible() — the AnimatedTouchableOpacity wrapper
// forwards its onPress unchanged to the real TouchableOpacity it renders, so
// a deep findAll would pick up both layers for the same on-screen control
// (see SpeedDial.test.tsx's byLabel comment for the same forwarding
// behavior). `.find()` uses react-test-renderer's shallow-stop traversal —
// it doesn't descend past a match — so it naturally throws on 0 or >1
// matches without double-counting those layers.
const findOverlayPress = (r: Renderer): (() => void) =>
  r.root.find(
    n => typeof n.props?.onPress === 'function' && n.props.onPress.toString().includes('isVisible'),
  ).props.onPress;

describe('ReportFilterSheet outside-tap behavior', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('dismisses only the keyboard when it is visible, leaving the sheet open', () => {
    const dismissSpy = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
    jest.spyOn(Keyboard, 'isVisible').mockReturnValue(true);
    const onClose = jest.fn();
    const r = render(
      <ReportFilterSheet visible onClose={onClose} browser={makeBrowser()} municipalities={[]} />,
    );

    act(() => findOverlayPress(r)());

    expect(dismissSpy).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes the sheet (without touching the keyboard) when the keyboard is already down', () => {
    const dismissSpy = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
    jest.spyOn(Keyboard, 'isVisible').mockReturnValue(false);
    const onClose = jest.fn();
    const r = render(
      <ReportFilterSheet visible onClose={onClose} browser={makeBrowser()} municipalities={[]} />,
    );

    act(() => findOverlayPress(r)());

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(dismissSpy).not.toHaveBeenCalled();
  });
});

describe('ReportFilterSheet field layout', () => {
  it('overrides SelectField flex so it does not collapse when stacked, while the From/To DateFields keep flex:1 to split their shared row', () => {
    const r = render(
      <ReportFilterSheet visible onClose={jest.fn()} browser={makeBrowser()} municipalities={[]} />,
    );

    // Check SelectFields: the filterField override should clear flex: 1 from the SelectField's inner group
    const selects = r.root.findAllByType(SelectField);
    expect(selects.length).toBeGreaterThan(0);
    selects.forEach(selectNode => {
      // Find the SelectField's inner group element by locating the View
      // that has marginBottom (from SelectField's group style)
      const groupView = selectNode.findAll(
        (n) => n.type === View && flattenStyle(n.props.style).marginBottom !== undefined,
      )[0];
      expect(groupView).toBeDefined();
      const resolvedFlex = flattenStyle(groupView.props.style).flex;
      // The override should make flex undefined (not 1)
      expect(resolvedFlex).toBeUndefined();
    });

    // Check DateFields: these DO keep flex: 1 because they share a row (definite width)
    const dates = r.root.findAllByType(DateField);
    expect(dates).toHaveLength(2);
    dates.forEach(node => {
      expect(flattenStyle(node.props.style).flex).toBe(1);
    });
  });

  it('only renders the Municipality select when municipalities are provided', () => {
    const withoutMunicipalities = render(
      <ReportFilterSheet visible onClose={jest.fn()} browser={makeBrowser()} municipalities={[]} />,
    );
    expect(
      withoutMunicipalities.root.findAllByType(SelectField).some(n => n.props.label === 'Municipality'),
    ).toBe(false);

    const withMunicipalities = render(
      <ReportFilterSheet
        visible
        onClose={jest.fn()}
        browser={makeBrowser()}
        municipalities={['Puerto Princesa']}
      />,
    );
    expect(
      withMunicipalities.root.findAllByType(SelectField).some(n => n.props.label === 'Municipality'),
    ).toBe(true);
  });
});

describe('ReportFilterSheet field wiring', () => {
  const findSelectByLabel = (r: Renderer, label: string) =>
    r.root.find(n => n.type === SelectField && n.props.label === label);

  it('translates the "All" sentinel back to an empty string for Region, and passes other values through', () => {
    const browser = makeBrowser();
    const r = render(<ReportFilterSheet visible onClose={jest.fn()} browser={browser} municipalities={[]} />);

    const region = findSelectByLabel(r, 'Region');
    act(() => region.props.onSelect('Palawan'));
    expect(browser.setProvince).toHaveBeenCalledWith('Palawan');

    act(() => region.props.onSelect('All'));
    expect(browser.setProvince).toHaveBeenCalledWith('');
  });

  it('maps the selected report-type label back to its stored key via INSPECTION_TYPE_LABELS', () => {
    const browser = makeBrowser();
    const r = render(<ReportFilterSheet visible onClose={jest.fn()} browser={browser} municipalities={[]} />);

    const reportType = findSelectByLabel(r, 'Inspection report type');
    act(() => reportType.props.onSelect('Air Quality Monitoring Report'));
    expect(browser.setReportType).toHaveBeenCalledWith('air_monitoring');

    act(() => reportType.props.onSelect('All'));
    expect(browser.setReportType).toHaveBeenCalledWith('');
  });

  it('resolves the sort label back to its ReportSortOrder key', () => {
    const browser = makeBrowser();
    const r = render(<ReportFilterSheet visible onClose={jest.fn()} browser={browser} municipalities={[]} />);

    const sort = findSelectByLabel(r, 'Sort by date');
    act(() => sort.props.onSelect('Oldest first'));
    expect(browser.setSortOrder).toHaveBeenCalledWith('oldest');

    act(() => sort.props.onSelect('Newest first'));
    expect(browser.setSortOrder).toHaveBeenCalledWith('newest');
  });

  it('wires the From/To date fields directly to setDateFrom/setDateTo', () => {
    const browser = makeBrowser();
    const r = render(<ReportFilterSheet visible onClose={jest.fn()} browser={browser} municipalities={[]} />);

    const [fromField, toField] = r.root.findAllByType(DateField);
    expect(fromField.props.label).toBe('From');
    expect(toField.props.label).toBe('To');

    act(() => fromField.props.onChange('2026-01-01'));
    expect(browser.setDateFrom).toHaveBeenCalledWith('2026-01-01');

    act(() => toField.props.onChange('2026-12-31'));
    expect(browser.setDateTo).toHaveBeenCalledWith('2026-12-31');
  });

  it('invokes clearFilters when "Clear all filters" is pressed', () => {
    const browser = makeBrowser();
    const r = render(<ReportFilterSheet visible onClose={jest.fn()} browser={browser} municipalities={[]} />);

    const clearText = r.root.find(n => n.type === Text && n.props.children === 'Clear all filters');
    const clearBtn = r.root.find(
      n => n.type === TouchableOpacity && n.props.onPress === browser.clearFilters,
    );
    expect(clearText).toBeDefined();

    act(() => clearBtn.props.onPress());

    expect(browser.clearFilters).toHaveBeenCalledTimes(1);
  });
});
