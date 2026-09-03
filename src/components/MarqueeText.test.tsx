import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MarqueeText } from './MarqueeText';

// The container is the only node carrying onLayout and the probe the only one
// carrying onContentSizeChange, so both can be driven without reaching into
// private styles or adding test-only props. The non-scrolling branch is the
// only one that renders with ellipsizeMode="tail", which makes it a reliable
// signal for "this is showing a static, clipped string".
type Renderer = TestRenderer.ReactTestRenderer;

const probe = (r: Renderer) =>
  r.root.findAll(n => typeof n.props?.onContentSizeChange === 'function')[0];

const container = (r: Renderer) =>
  r.root.findAll(n => typeof n.props?.onLayout === 'function')[0];

const isClipped = (r: Renderer) =>
  r.root.findAll(n => n.props?.ellipsizeMode === 'tail').length > 0;

const layout = (r: Renderer, width: number) =>
  act(() => {
    container(r).props.onLayout({ nativeEvent: { layout: { width, height: 20 } } });
  });

const report = (r: Renderer, width: number) =>
  act(() => {
    probe(r).props.onContentSizeChange(width);
  });

describe('MarqueeText overflow detection', () => {
  it('clips with an ellipsis when the text fits its container', () => {
    let r!: Renderer;
    act(() => { r = TestRenderer.create(<MarqueeText text="ACME CORP" />); });

    layout(r, 200);
    report(r, 80);

    expect(isClipped(r)).toBe(true);
  });

  it('switches to the scrolling loop when the text overflows', () => {
    let r!: Renderer;
    act(() => { r = TestRenderer.create(<MarqueeText text="A VERY LONG ESTABLISHMENT NAME" />); });

    layout(r, 100);
    report(r, 400);

    expect(isClipped(r)).toBe(false);
  });

  // Regression guard. onContentSizeChange fires more than once, and an early
  // report can be the constrained width from before the text has fully laid
  // out. A version that latched the first non-zero value locked in a width too
  // small to ever exceed the container, which silently turned every marquee in
  // the app back into a plain ellipsis.
  it('still upgrades to scrolling when a later, larger width is reported', () => {
    let r!: Renderer;
    act(() => { r = TestRenderer.create(<MarqueeText text="A VERY LONG ESTABLISHMENT NAME" />); });

    layout(r, 100);
    report(r, 80);
    expect(isClipped(r)).toBe(true);

    report(r, 400);

    expect(isClipped(r)).toBe(false);
  });

  it('does not decide anything before the container has been laid out', () => {
    let r!: Renderer;
    act(() => { r = TestRenderer.create(<MarqueeText text="A VERY LONG ESTABLISHMENT NAME" />); });

    report(r, 400);

    // containerWidth is still 0, so overflow is not yet knowable — it must not
    // start looping on the strength of the content width alone.
    expect(isClipped(r)).toBe(true);
  });
});
