import React from 'react';
import { RefreshControl, Text } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
// Imported from its route path — a normal module import, not a file placed
// inside src/app, so expo-router never treats this test file itself as a
// route. See the module-scope jest.mock() calls below for why the test
// itself must NOT live under src/app.
import HomeScreen from '../../../app/(app)/home';
// Imported at the top (not after the jest.mock() calls below) because
// babel-plugin-jest-hoist hoists every jest.mock() call above ordinary
// top-level imports regardless of source position — same rationale documented
// in ExportReportsTab.test.tsx. Importing the mocked references here lets the
// tests below prove *which* component instance home.tsx renders per tab via
// findByType, rather than only pattern-matching serialized text.
import { ManageEstablishmentsTab } from '../../establishments/components/ManageEstablishmentsTab';
import { ManageReportsTab } from '../../establishments/components/ManageReportsTab';
import { ExportReportsTab } from '../../establishments/components/ExportReportsTab';
import { EmptyState } from '../../../components/EmptyState';
// Mocked below to a jest.fn() so tests can inspect the callback home.tsx
// registers with it — the same "import the mocked reference" approach as the
// three tab components above.
import { subscribeToSyncDataChanged } from '../../../services/sync/syncEvents';

type Renderer = TestRenderer.ReactTestRenderer;

jest.mock('../../../core/providers/AuthProvider', () => ({
  useAuthContext: () => ({ fullName: 'Jane Inspector' }),
}));

jest.mock('../../../services/sync/syncEvents', () => ({
  subscribeToSyncDataChanged: jest.fn(() => () => {}),
}));

// Prefixed `mock` — babel-plugin-jest-hoist statically rejects any
// out-of-scope identifier a hoisted jest.mock() factory closes over unless
// its name starts with "mock" (case-insensitive), and each of these is read
// from inside a factory below. One per tab, so pull-to-refresh and the sync
// subscription tests can tell which tab's handle actually got called instead
// of only proving *a* handle fired.
const mockManageEstablishmentsRefresh = jest.fn().mockResolvedValue(undefined);
const mockManageReportsRefresh = jest.fn().mockResolvedValue(undefined);
const mockExportReportsRefresh = jest.fn().mockResolvedValue(undefined);

// The real tab content components fetch live data through hooks that need a
// signed-in session and a database — irrelevant to which tab opens by
// default, so they're swapped for inert stand-ins here. HomeTabs itself is
// left real: this test is about the value home.tsx feeds it as `activeTab`,
// not the tab bar's own rendering, which HomeTabs.test.tsx already covers.
//
// Each stand-in is now a forwardRef exposing the same `refresh()` shape the
// real components do (ManageReportsTabHandle / ManageEstablishmentsTabHandle
// / ExportReportsTabHandle) — required to prove home.tsx's pull-to-refresh
// and sync-subscription wiring actually reaches each tab's ref, not just that
// *a* component renders. require('react') inside the factory rather than
// referencing the top-level `React` import: the same out-of-scope rule above
// applies to it too, and ExportReportsTab.test.tsx's FabVisibilityContext
// mock already establishes this exact require-inside-the-factory pattern.
jest.mock('../../establishments/components/ManageEstablishmentsTab', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- see comment above
  const ReactLib = require('react');
  return {
    ManageEstablishmentsTab: ReactLib.forwardRef((_props: unknown, ref: unknown) => {
      ReactLib.useImperativeHandle(ref, () => ({ refresh: mockManageEstablishmentsRefresh }));
      return null;
    }),
  };
});

jest.mock('../../establishments/components/ManageReportsTab', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- see comment above
  const ReactLib = require('react');
  return {
    ManageReportsTab: ReactLib.forwardRef((_props: unknown, ref: unknown) => {
      ReactLib.useImperativeHandle(ref, () => ({ refresh: mockManageReportsRefresh }));
      return null;
    }),
  };
});

// ExportReportsTab pulls in useReportBrowser -> useAllReports -> WatermelonDB
// (a real SQLiteAdapter at import time), plus ReportFilterSheet's keyboard
// controller native module — none of which run under plain Jest. Same
// isolation rationale as the two mocks above; ExportReportsTab's own render
// behavior is covered by ExportReportsTab.test.tsx. Standing in for it here
// only proves home.tsx wires the real component into the Export case.
jest.mock('../../establishments/components/ExportReportsTab', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- see comment above
  const ReactLib = require('react');
  return {
    ExportReportsTab: ReactLib.forwardRef((_props: unknown, ref: unknown) => {
      ReactLib.useImperativeHandle(ref, () => ({ refresh: mockExportReportsRefresh }));
      return null;
    }),
  };
});

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

// Exactly one RefreshControl exists in the tree (home.tsx renders it once,
// wrapping the ScrollView) — `findByType` throws on zero or multiple matches
// rather than silently resolving the wrong node, same convention as
// findActiveTabLabel/findTab above. handleRefresh is async, so the resulting
// promise is awaited inside act() to let its `finally` (setRefreshing(false))
// settle before the test makes assertions.
const triggerPullToRefresh = async (r: Renderer) => {
  await act(async () => {
    await r.root.findByType(RefreshControl).props.onRefresh();
  });
};

beforeEach(() => {
  mockManageEstablishmentsRefresh.mockClear();
  mockManageReportsRefresh.mockClear();
  mockExportReportsRefresh.mockClear();
  (subscribeToSyncDataChanged as jest.Mock).mockClear();
});

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

  describe('pull-to-refresh', () => {
    it('refreshes Manage Reports via its handle when that tab is active (the default)', async () => {
      const r = render();
      await triggerPullToRefresh(r);

      expect(mockManageReportsRefresh).toHaveBeenCalledTimes(1);
      expect(mockManageEstablishmentsRefresh).not.toHaveBeenCalled();
      expect(mockExportReportsRefresh).not.toHaveBeenCalled();
    });

    // The gap this task closes: ExportReportsTab used to sit outside
    // handleRefresh entirely, so pulling to refresh while on it just spun and
    // settled back without ever calling anything.
    it('refreshes the Export tab via its handle when that tab is active, and does not call the other tabs handles', async () => {
      const r = render();
      switchTab(r, 'Export Inspection\nReports');

      await triggerPullToRefresh(r);

      expect(mockExportReportsRefresh).toHaveBeenCalledTimes(1);
      expect(mockManageReportsRefresh).not.toHaveBeenCalled();
      expect(mockManageEstablishmentsRefresh).not.toHaveBeenCalled();
    });

    it('refreshes Manage Establishments via its handle when that tab is active', async () => {
      const r = render();
      switchTab(r, 'Manage\nEstablishments');

      await triggerPullToRefresh(r);

      expect(mockManageEstablishmentsRefresh).toHaveBeenCalledTimes(1);
      expect(mockManageReportsRefresh).not.toHaveBeenCalled();
      expect(mockExportReportsRefresh).not.toHaveBeenCalled();
    });
  });

  describe('sync-data-changed subscription', () => {
    // A background sync can complete while Home is open on any of the three
    // tabs. Only the active tab is actually mounted (renderTab() is a
    // switch), so only its ref is non-null — but the subscription callback
    // unconditionally calls all three refs, and this asserts the Export
    // tab's is now one of them (previously it was omitted entirely).
    it('refreshes the Export tab when a sync completes while it is the active tab', () => {
      const r = render();
      switchTab(r, 'Export Inspection\nReports');

      const syncCallback = (subscribeToSyncDataChanged as jest.Mock).mock.calls[0][0];
      act(() => { syncCallback(); });

      expect(mockExportReportsRefresh).toHaveBeenCalledTimes(1);
    });

    it('refreshes Manage Reports when a sync completes while it is the active tab (the default)', () => {
      render();

      const syncCallback = (subscribeToSyncDataChanged as jest.Mock).mock.calls[0][0];
      act(() => { syncCallback(); });

      expect(mockManageReportsRefresh).toHaveBeenCalledTimes(1);
    });
  });
});
