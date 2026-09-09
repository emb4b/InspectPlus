import React from 'react';
import { View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { Polygon, Text as SvgText } from 'react-native-svg';
import { UrgencyRibbon } from './UrgencyRibbon';
import { Colors } from '../design/colors';

type Renderer = TestRenderer.ReactTestRenderer;

const render = (element: React.ReactElement) => {
  let r!: Renderer;
  act(() => { r = TestRenderer.create(element); });
  return r;
};

const flattenStyle = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...([style].flat(Infinity).filter(Boolean) as Record<string, unknown>[]));

const label = (r: Renderer) => r.root.findByType(SvgText).props.children;
const band = (r: Renderer) => r.root.findByType(Polygon);
const wrapper = (r: Renderer) =>
  r.root.findAll((n) => (n.type as any)?.name === 'View' || n.type === View)[0];

describe('UrgencyRibbon', () => {
  it('renders nothing when the report is not flagged', () => {
    const r = render(<UrgencyRibbon urgency={{ level: 'none', days: 0 }} />);
    expect(r.toJSON()).toBeNull();
  });

  // The diagonal clears roughly 8 characters at this size before it would
  // run into the report-type tile, so the label is abbreviated hard.
  it('abbreviates an overdue count to fit the diagonal', () => {
    expect(label(render(<UrgencyRibbon urgency={{ level: 'overdue', days: 15 }} />))).toBe('15d late');
  });

  it('says just "Overdue" on the deadline day itself', () => {
    expect(label(render(<UrgencyRibbon urgency={{ level: 'overdue', days: 0 }} />))).toBe('Overdue');
  });

  it('abbreviates remaining runway the same way', () => {
    expect(label(render(<UrgencyRibbon urgency={{ level: 'due-soon', days: 6 }} />))).toBe('6d left');
  });

  // A pale badge tint does not read at this size on a diagonal — the band
  // takes the saturated hue and the text goes white on top of it.
  it('fills the band with the saturated overdue hue', () => {
    expect(band(render(<UrgencyRibbon urgency={{ level: 'overdue', days: 15 }} />)).props.fill).toBe(
      Colors.hazwaste.text,
    );
    expect(
      render(<UrgencyRibbon urgency={{ level: 'overdue', days: 15 }} />).root.findByType(SvgText).props.fill,
    ).toBe(Colors.textWhite);
  });

  it('fills the band with the saturated due-soon hue', () => {
    expect(band(render(<UrgencyRibbon urgency={{ level: 'due-soon', days: 6 }} />)).props.fill).toBe(
      Colors.warning.text,
    );
  });

  it('pins itself to its parent card\'s top-left corner', () => {
    const style = flattenStyle(wrapper(render(<UrgencyRibbon urgency={{ level: 'overdue', days: 15 }} />)).props.style);
    expect(style.position).toBe('absolute');
    expect(style.top).toBe(0);
    expect(style.left).toBe(0);
  });

  it('spells the label out in full for screen readers', () => {
    const r = render(<UrgencyRibbon urgency={{ level: 'overdue', days: 15 }} />);
    expect(wrapper(r).props.accessibilityLabel).toBe('Overdue by 15 days');
  });

  it('uses the singular day in the spoken label', () => {
    const r = render(<UrgencyRibbon urgency={{ level: 'due-soon', days: 1 }} />);
    expect(wrapper(r).props.accessibilityLabel).toBe('Due in 1 day');
    expect(label(r)).toBe('1d left');
  });

  // The card carries Elevation.raised, whose Android `elevation` interacts
  // badly with overflow:'hidden' on a rounded parent. Clipping the band
  // inside the SVG instead keeps the card's own overflow untouched.
  it('clips itself rather than relying on the card to clip it', () => {
    const r = render(<UrgencyRibbon urgency={{ level: 'overdue', days: 15 }} />);
    expect(band(r).props.clipPath).toBeDefined();
  });
});
