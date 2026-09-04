import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import HomeScreen from './home';
// Imported at the top (not after the jest.mock() calls below) because
// babel-plugin-jest-hoist hoists every jest.mock() call above ordinary
// top-level imports regardless of source position — same rationale documented
// in ExportReportsTab.test.tsx. Importing the mocked references here lets the
// tests below prove *which* component instance home.tsx renders per tab via
// findByType, rather than only pattern-matching serialized text.
import { ManageEstablishmentsTab } from '../../features/establishments/components/ManageEstablishmentsTab';
import { ManageReportsTab } from '../../features/establishments/components/ManageReportsTab';
import { ExportReportsTab } from '../../features/establishments/components/ExportReportsTab';
import { EmptyState } from '../../components/EmptyState';

type Renderer = TestRenderer.ReactTestRenderer;

jest.mock('../../core/providers/AuthProvider', () => ({
  useAuthContext: () => ({ fullName: 'Jane Inspector' }),
}));

jest.mock('../../services/sync/syncEvents', () => ({
  subscribeToSyncDataChanged: jest.fn(() => () => {}),
}));

// The real tab content components fetch live data through hooks that need a
// signed-in session and a database — irrelevant to which tab opens by
// default, so they're swapped for inert stand-ins here. HomeTabs itself is
// left real: this test is about the value home.tsx feeds it as `activeTab`,
// not the tab bar's own rendering, which HomeTabs.test.tsx already covers.
jest.mock('../../features/establishments/components/ManageEstablishmentsTab', () => ({
  // React 19 accepts `ref` as a plain prop on function components, so these
  // stand-ins don't need forwardRef — home.tsx's ref just resolves to null,
  // which is fine since nothing here calls .refresh().
  ManageEstablishmentsTab: function ManageEstablishmentsTab() {
    return null;
  },
}));

jest.mock('../../features/establishments/components/ManageReportsTab', () => ({
  ManageReportsTab: function ManageReportsTab() {
    return null;
  },
}));

// ExportReportsTab pulls in useReportBrowser -> useAllReports -> WatermelonDB
// (a real SQLiteAdapter at import time), plus ReportFilterSheet's keyboard
// controller native module — none of which run under plain Jest. Same
// isolation rationale as the two mocks above; ExportReportsTab's own render
// behavior is covered by ExportReportsTab.test.tsx. Standing in for it here
// only proves home.tsx wires the real component into the Export case.
jest.mock('../../features/establishments/components/ExportReportsTab', () => ({
  ExportReportsTab: function ExportReportsTab() {
    return null;
  },
}));

// HomeScreen starts a `setInterval` to tick the header clock. Left running,
// it fires again after the test (and its Jest environment) have already
// torn down, throwing "trying to `import` a file after the Jest environment
// has been torn down" from inside RefreshControl's render — so every
// renderer created here is unmounted before the test ends.
let activeRenderer: Renderer | undefined;

const render = () => {
  let r!: Renderer;
  act(() => { r = TestRenderer.create(<HomeScreen />); });
  activeRenderer = r;
  return r;
};

afterEach(() => {
  if (activeRenderer) {
    act(() => { activeRenderer!.unmount(); });
    activeRenderer = undefined;
  }
});

// `find` throws unless exactly one instance matches, so a wrong or missing
// default surfaces as a thrown error rather than an undefined read — same
// convention as HomeTabs.test.tsx / SpeedDial.test.tsx / Card.test.tsx.
const findActiveTabLabel = (r: Renderer) =>
  r.root.find(
    n => n.props?.accessibilityRole === 'tab' && n.props?.accessibilityState?.selected === true,
  ).findByType(Text).props.children;

// Same locator convention as HomeTabs.test.tsx's own findTab: `.find()`
// throws on zero or multiple matches, and anchoring on `onPress` (not just
// accessibilityRole) skips past the Pressable HomeTabs' TouchableOpacity
// wraps internally, which forwards accessibilityRole onto itself too.
const findTab = (r: Renderer, label: string) =>
  r.root.find(
    n =>
      n.props?.accessibilityRole === 'tab' &&
      typeof n.props?.onPress === 'function' &&
      n.findAllByType(Text).some(t => t.props.children === label),
  );

const switchTab = (r: Renderer, label: string) => {
  act(() => { findTab(r, label).props.onPress(); });
};

describe('HomeScreen', () => {
  it('opens on Manage Reports by default, not the retired Create tab', () => {
    const r = render();
    expect(findActiveTabLabel(r)).toBe('Manage Reports');
  });

  it('renders the real ManageReportsTab component by default', () => {
    const r = render();
    // Throws on zero or multiple matches, proving exactly one instance of
    // the actual imported component (not a lookalike) is mounted.
    expect(() => r.root.findByType(ManageReportsTab)).not.toThrow();
    expect(r.root.findAllByType(ManageEstablishmentsTab)).toHaveLength(0);
    expect(r.root.findAllByType(ExportReportsTab)).toHaveLength(0);
  });

  it('renders the real ManageEstablishmentsTab when that tab is selected', () => {
    const r = render();
    switchTab(r, 'Manage\nEstablishments');
    expect(findActiveTabLabel(r)).toBe('Manage\nEstablishments');
    expect(() => r.root.findByType(ManageEstablishmentsTab)).not.toThrow();
    expect(r.root.findAllByType(ManageReportsTab)).toHaveLength(0);
    expect(r.root.findAllByType(ExportReportsTab)).toHaveLength(0);
  });

  it('renders the real ExportReportsTab when the Export tab is selected, not a placeholder', () => {
    const r = render();
    switchTab(r, 'Export Inspection\nReports');
    expect(findActiveTabLabel(r)).toBe('Export Inspection\nReports');

    // Proves home.tsx now mounts the actual ExportReportsTab component built
    // in the prior task, not a stand-in reimplementation.
    expect(() => r.root.findByType(ExportReportsTab)).not.toThrow();
    expect(r.root.findAllByType(ManageReportsTab)).toHaveLength(0);
    expect(r.root.findAllByType(ManageEstablishmentsTab)).toHaveLength(0);

    // The retired interim placeholder ("Export is coming next.") rendered an
    // EmptyState directly from home.tsx. Now that the real tab is wired in,
    // home.tsx itself must never construct an EmptyState element again.
    expect(r.root.findAllByType(EmptyState)).toHaveLength(0);
  });
});
