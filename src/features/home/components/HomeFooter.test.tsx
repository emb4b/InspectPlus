import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { HomeFooter } from './HomeFooter';

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

// An inspector asking for help - or reading the recovery guide - needs to
// say which version they're on, and the app never showed it anywhere.
describe('HomeFooter version stamp', () => {
  it('prints the app version and build on the login footer', () => {
    expect(texts(render(<HomeFooter showCredits />))).toContain('InspectPlus v1.0.3 (12)');
  });

  it('prints it on the plain bar every signed-in screen carries', () => {
    expect(texts(render(<HomeFooter />))).toContain('v1.0.3 (12)');
  });
});
