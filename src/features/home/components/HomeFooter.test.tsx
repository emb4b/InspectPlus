import React from 'react';
import { Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import TestRenderer, { act } from 'react-test-renderer';
import { HomeFooter, HOME_FOOTER_HEIGHT } from './HomeFooter';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.0.3' }, nativeBuildVersion: '12' },
}));

const render = (element: React.ReactElement) => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => { r = TestRenderer.create(element); });
  return r;
};
const texts = (r: TestRenderer.ReactTestRenderer) =>
  r.root.findAllByType(Text).map(t => [t.props.children].flat().join(''));

jest.mock('../../../db/schema', () => ({ schema: { version: 15 } }));

// An inspector asking for help - or reading the recovery guide - needs to
// say which version they're on, and the app never showed it anywhere. The
// database schema version rides along: it is the number that decides
// whether an update migrates the store or resets it, so a support
// screenshot showing "db 15" settles that question on the spot.
describe('HomeFooter version stamp', () => {
  it('shares the rights line on the login footer', () => {
    expect(texts(render(<HomeFooter showCredits />))).toContain('All Rights Reserved · v1.0.3 (12) · db 15');
  });

  it('prints it on the plain bar every signed-in screen carries', () => {
    expect(texts(render(<HomeFooter />))).toContain('v1.0.3 (12) · db 15');
  });
});

// HOME_FOOTER_HEIGHT is exported for other screens' layout math (e.g. the
// export sheet's footer) to line up against — guard that the bar height and
// the credits footer's padding, computed from it, still add back up to it.
describe('HomeFooter height math', () => {
  it('derives the bar height and the credits footer padding from HOME_FOOTER_HEIGHT', () => {
    const bar = render(<HomeFooter />).root.findByType(LinearGradient).props.style;
    const footer = render(<HomeFooter showCredits />).root.findByType(LinearGradient).props.style;
    expect(bar.height + footer.paddingVertical * 2).toBe(HOME_FOOTER_HEIGHT);
  });
});
