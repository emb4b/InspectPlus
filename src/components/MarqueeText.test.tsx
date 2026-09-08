import React from 'react';
import { Text } from 'react-native';
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

describe('MarqueeText font scaling', () => {
  // The probe is what decides whether this marquee scrolls at all, so it has
  // to scale exactly like the visible copy. If the probe scaled and the
  // visible text did not (or the reverse), the measured content width would
  // describe a string that is never rendered, and the overflow check would be
  // made against the wrong size — a marquee that scrolls text which actually
  // fits, or clips text that actually overflows. Asserting across *every*
  // Text node rather than naming them individually is what makes that
  // parity the property under test, and means a Text added later to either
  // branch is covered without anyone remembering to extend this.
  const allTextNodes = (r: Renderer) => r.root.findAllByType(Text);

  const expectEveryTextScaling = (r: Renderer, expected: boolean | undefined) => {
    const nodes = allTextNodes(r);
    expect(nodes.length).toBeGreaterThan(0);
    nodes.forEach(n => expect(n.props.allowFontScaling).toBe(expected));
  };

  it('threads allowFontScaling to the probe and the clipped copy alike', () => {
    let r!: Renderer;
    act(() => { r = TestRenderer.create(<MarqueeText text="ACME CORP" allowFontScaling={false} />); });

    layout(r, 200);
    report(r, 80);

    expect(isClipped(r)).toBe(true);
    expectEveryTextScaling(r, false);
  });

  it('threads allowFontScaling to the probe and both scrolling copies alike', () => {
    let r!: Renderer;
    act(() => {
      r = TestRenderer.create(<MarqueeText text="A VERY LONG ESTABLISHMENT NAME" allowFontScaling={false} />);
    });

    layout(r, 100);
    report(r, 400);

    expect(isClipped(r)).toBe(false);
    // Probe + the two looped copies.
    expect(allTextNodes(r)).toHaveLength(3);
    expectEveryTextScaling(r, false);
  });

  it("leaves scaling to React Native's default when the prop is not passed", () => {
    let r!: Renderer;
    act(() => { r = TestRenderer.create(<MarqueeText text="ACME CORP" />); });

    layout(r, 200);
    report(r, 80);

    // Undefined, not `true` — passing an explicit value here would override
    // a caller that sets allowFontScaling on a parent Text.
    expectEveryTextScaling(r, undefined);
  });
});
