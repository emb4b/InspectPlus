import React from 'react';
import { Dimensions, RefreshControl, ScrollView, Text } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
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

// The reanimated jest mock (jest.config's moduleNameMapper) predates
// useReducedMotion, which home.tsx reads through useMotion() to decide
// whether a tab tap animates the pager — same override Skeleton.test.tsx
// layers over the mock.
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: jest.fn(() => false),
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
    ExportReportsTab: ReactLib.forwardRef((props: { focused: boolean; refreshControl: unknown }, ref: unknown) => {
      ReactLib.useImperativeHandle(ref, () => ({ refresh: mockExportReportsRefresh }));
      // Rendered as host props so tests can read what home.tsx passed.
      return ReactLib.createElement('ExportStandIn', { focused: props.focused, refreshControl: props.refreshControl });
    }),
  };
});

// HomeScreen starts a `setInterval` to tick the header clock. Left running,
// it fires again after the test (and its Jest environment) have already
// torn down, throwing "trying to `import` a file after the Jest environment
// has been torn down" from inside RefreshControl's render — so every
// renderer created here is unmounted before the test ends.
let activeRenderer: Renderer | undefined;

// RN's jest preset swaps ScrollView for a class mock whose instance methods
// (scrollTo among them) are jest.fn()s shared on the prototype — the pager
// ref home.tsx holds resolves to one of those instances, so this is the spy
// a tab tap's scrollTo lands on.
const mockScrollTo = (ScrollView.prototype as unknown as { scrollTo: jest.Mock }).scrollTo;

const render = () => {
  let r!: Renderer;
  act(() => { r = TestRenderer.create(<HomeScreen />); });
  activeRenderer = r;
  return r;
};

const PAGE_WIDTH = Dimensions.get('window').width;

// The horizontal pager is the one ScrollView home.tsx tags. The Manage
// pages each wrap their tab in a tagged vertical ScrollView; the Export tab
// is its own scroller (a FlatList, so a large report set virtualises), so
// its RefreshControl arrives as a prop instead.
const findPager = (r: Renderer) =>
  r.root.find(n => n.props?.testID === 'home-pager' && typeof n.props?.onMomentumScrollEnd === 'function');
const findPage = (r: Renderer, tab: string) =>
  r.root.find(n => n.type === ScrollView && n.props?.testID === `home-page-${tab}`);
const findExportStandIn = (r: Renderer) => r.root.findByType(ExportReportsTab).findByType('ExportStandIn' as never);
const findRefreshControl = (r: Renderer, tab: string) =>
  tab === 'exportReports'
    ? findExportStandIn(r).props.refreshControl
    : findPage(r, tab).findByType(RefreshControl);

// Simulates the pager settling on a page after a swipe — the only event
// that moves activeTab from a gesture.
const settlePagerOn = (r: Renderer, index: number) => {
  act(() => {
    findPager(r).props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: index * PAGE_WIDTH, y: 0 } } });
  });
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

// Every mounted page carries its own RefreshControl, so the lookup is scoped
// to the named page — `findByType` still throws on zero or multiple matches
// within it. handleRefresh is async, so the resulting promise is awaited
// inside act() to let its `finally` (clearing the refreshing tab) settle
// before the test makes assertions.
const triggerPullToRefresh = async (r: Renderer, tab: string) => {
  await act(async () => {
    await findRefreshControl(r, tab).props.onRefresh();
  });
};

beforeEach(() => {
  mockScrollTo.mockClear();
  (useReducedMotion as jest.Mock).mockReturnValue(false);
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

  it('mounts ManageEstablishmentsTab when that tab is selected, keeps the visited Manage Reports page, and leaves Export unmounted', () => {
    const r = render();
    switchTab(r, 'Manage Establishments');
    expect(findActiveTabLabel(r)).toBe('Manage Establishments');
    expect(() => r.root.findByType(ManageEstablishmentsTab)).not.toThrow();
    // Pages mount on first visit and stay mounted, so swiping back is
    // instant and keeps that tab's filters — but a never-visited page
    // costs nothing, which is what keeps Home's first paint at one query.
    expect(r.root.findAllByType(ManageReportsTab)).toHaveLength(1);
    expect(r.root.findAllByType(ExportReportsTab)).toHaveLength(0);
  });

  it('renders the real ExportReportsTab when the Export tab is selected, not a placeholder', () => {
    const r = render();
    switchTab(r, 'Export Inspection Reports');
    expect(findActiveTabLabel(r)).toBe('Export Inspection Reports');

    // Proves home.tsx now mounts the actual ExportReportsTab component built
    // in the prior task, not a stand-in reimplementation.
    expect(() => r.root.findByType(ExportReportsTab)).not.toThrow();
    expect(r.root.findAllByType(ManageReportsTab)).toHaveLength(1);
    expect(r.root.findAllByType(ManageEstablishmentsTab)).toHaveLength(0);

    // The retired interim placeholder ("Export is coming next.") rendered an
    // EmptyState directly from home.tsx. Now that the real tab is wired in,
    // home.tsx itself must never construct an EmptyState element again.
    expect(r.root.findAllByType(EmptyState)).toHaveLength(0);
  });

  describe('pull-to-refresh', () => {
    it('refreshes Manage Reports via its handle when that tab is active (the default)', async () => {
      const r = render();
      await triggerPullToRefresh(r, 'manageReports');

      expect(mockManageReportsRefresh).toHaveBeenCalledTimes(1);
      expect(mockManageEstablishmentsRefresh).not.toHaveBeenCalled();
      expect(mockExportReportsRefresh).not.toHaveBeenCalled();
    });

    // The gap this task closes: ExportReportsTab used to sit outside
    // handleRefresh entirely, so pulling to refresh while on it just spun and
    // settled back without ever calling anything.
    it('refreshes the Export tab via its handle when that tab is active, and does not call the other tabs handles', async () => {
      const r = render();
      switchTab(r, 'Export Inspection Reports');

      await triggerPullToRefresh(r, 'exportReports');

      expect(mockExportReportsRefresh).toHaveBeenCalledTimes(1);
      expect(mockManageReportsRefresh).not.toHaveBeenCalled();
      expect(mockManageEstablishmentsRefresh).not.toHaveBeenCalled();
    });

    it('refreshes Manage Establishments via its handle when that tab is active', async () => {
      const r = render();
      switchTab(r, 'Manage Establishments');

      await triggerPullToRefresh(r, 'manageEstablishments');

      expect(mockManageEstablishmentsRefresh).toHaveBeenCalledTimes(1);
      expect(mockManageReportsRefresh).not.toHaveBeenCalled();
      expect(mockExportReportsRefresh).not.toHaveBeenCalled();
    });
  });

  describe('sync-data-changed subscription', () => {
    // A background sync can complete while Home is open on any of the three
    // tabs. Only visited pages are mounted, so only their refs are non-null
    // — but the subscription callback unconditionally calls all three refs,
    // and this asserts the Export tab's is now one of them (previously it
    // was omitted entirely).
    it('refreshes the Export tab when a sync completes while it is the active tab', () => {
      const r = render();
      switchTab(r, 'Export Inspection Reports');

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

  describe('swipe pager', () => {
    it('lays the three tabs out as pages of a horizontal, paging ScrollView', () => {
      const pager = findPager(render());
      expect(pager.props.horizontal).toBe(true);
      expect(pager.props.pagingEnabled).toBe(true);
    });

    it('makes the tab the pager settles on active, so a swipe moves the tab bar', () => {
      const r = render();
      settlePagerOn(r, 2);
      expect(findActiveTabLabel(r)).toBe('Export Inspection Reports');
      expect(() => r.root.findByType(ExportReportsTab)).not.toThrow();
    });

    it('mounts the neighbouring pages as soon as a drag starts, so the swipe reveals content rather than a blank page', () => {
      const r = render();
      expect(r.root.findAllByType(ManageEstablishmentsTab)).toHaveLength(0);
      act(() => { findPager(r).props.onScrollBeginDrag(); });
      expect(r.root.findAllByType(ManageEstablishmentsTab)).toHaveLength(1);
      // Two pages away is not a neighbour of the first page.
      expect(r.root.findAllByType(ExportReportsTab)).toHaveLength(0);
    });

    it('scrolls the pager to the tapped tab, animated', () => {
      const r = render();
      switchTab(r, 'Export Inspection Reports');
      expect(mockScrollTo).toHaveBeenCalledWith({ x: 2 * PAGE_WIDTH, y: 0, animated: true });
    });

    it('jumps rather than animates the pager under reduced motion', () => {
      (useReducedMotion as jest.Mock).mockReturnValue(true);
      const r = render();
      switchTab(r, 'Manage Establishments');
      expect(mockScrollTo).toHaveBeenCalledWith({ x: PAGE_WIDTH, y: 0, animated: false });
    });
  });

  describe('Export page scroller', () => {
    it('does not wrap the Export tab in a ScrollView — a FlatList inside one would never virtualise', () => {
      const r = render();
      switchTab(r, 'Export Inspection Reports');
      expect(r.root.findAll(n => n.type === ScrollView && n.props?.testID === 'home-page-exportReports')).toHaveLength(0);
      const refreshControl = findRefreshControl(r, 'exportReports');
      expect(refreshControl.type).toBe(RefreshControl);
      expect(refreshControl.props.refreshing).toBe(false);
    });
  });

  describe('Export tab focus', () => {
    // ExportReportsTab pins its selection bar through useScreenFooter; once
    // pages stay mounted, an unfocused Export page must not keep that bar
    // over the other tabs.
    const exportFocused = (r: Renderer) => findExportStandIn(r).props.focused;

    it('tells the Export tab it is focused while it is the active page', () => {
      const r = render();
      switchTab(r, 'Export Inspection Reports');
      expect(exportFocused(r)).toBe(true);
    });

    it('tells the Export tab it is unfocused once another page is active again', () => {
      const r = render();
      switchTab(r, 'Export Inspection Reports');
      switchTab(r, 'Manage Reports');
      expect(exportFocused(r)).toBe(false);
    });
  });
});
