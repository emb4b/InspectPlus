import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import HomeScreen from './home';

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

describe('HomeScreen', () => {
  it('opens on Manage Reports by default, not the retired Create tab', () => {
    const r = render();
    expect(findActiveTabLabel(r)).toBe('Manage Reports');
  });
});
