import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { ClipPath, Defs, Path, Polygon, Text as SvgText } from 'react-native-svg';
import { Colors } from '../design/colors';
import { Radius } from '../design/radius';
import type { ReportUrgency } from '../utils/reportUrgency';

interface UrgencyRibbonProps {
  urgency: ReportUrgency;
}

// The band takes the saturated hue rather than the pale badge tint: at this
// size, on a diagonal, a tint reads as a smudge.
const LEVEL_FILL = {
  overdue: Colors.hazwaste.text,
  'due-soon': Colors.warning.text,
} as const;

// Geometry, all in the SVG's own coordinate space, which is pinned to the
// card's top-left corner.
//
// The card's report-type tile is 38px square and vertically centred, so on
// the shortest card its top-left corner sits at roughly (12, 23) — i.e. on
// the diagonal x + y = 35. The band therefore starts outboard of that, at
// x + y = 36, so it never crosses the glyph it would otherwise obscure.
const SIZE = 56;
const BAND_INNER = 36;
const BAND_OUTER = 52;
// Midpoint of the band's centre line (x + y = 44), which the label rotates
// about.
const MID = (BAND_INNER + BAND_OUTER) / 4;

// Matches the card's own top-left corner so the band's square end is cut to
// the rounded edge. Clipping here rather than with overflow:'hidden' on the
// card keeps Android's elevation shadow intact — see Elevation.raised.
const CORNER_CLIP = `M${Radius.lg},0 A${Radius.lg},${Radius.lg} 0 0 0 0,${Radius.lg} L0,${SIZE} L${SIZE},${SIZE} L${SIZE},0 Z`;

const plural = (days: number) => (days === 1 ? 'day' : 'days');

// Roughly eight characters fit on the diagonal before the band would reach
// the type tile, so the visible label is abbreviated hard.
function bandLabel(urgency: ReportUrgency): string {
  if (urgency.level === 'due-soon') return `${urgency.days}d left`;
  if (urgency.days === 0) return 'Overdue';
  return `${urgency.days}d late`;
}

function spokenLabel(urgency: ReportUrgency): string {
  if (urgency.level === 'due-soon') return `Due in ${urgency.days} ${plural(urgency.days)}`;
  if (urgency.days === 0) return 'Overdue';
  return `Overdue by ${urgency.days} ${plural(urgency.days)}`;
}

// A corner banner wrapping a card's top-left corner, flagging how a draft
// report sits against its filing deadline.
export const UrgencyRibbon: React.FC<UrgencyRibbonProps> = ({ urgency }) => {
  if (urgency.level === 'none') return null;

  const fill = LEVEL_FILL[urgency.level];

  return (
    <View
      style={styles.wrap}
      pointerEvents="none"
      accessibilityRole="text"
      accessibilityLabel={spokenLabel(urgency)}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Defs>
          <ClipPath id="urgencyRibbonCorner">
            <Path d={CORNER_CLIP} />
          </ClipPath>
        </Defs>
        <Polygon
          points={`0,${BAND_INNER} ${BAND_INNER},0 ${BAND_OUTER},0 0,${BAND_OUTER}`}
          fill={fill}
          clipPath="url(#urgencyRibbonCorner)"
        />
        <SvgText
          x={MID}
          y={MID}
          fill={Colors.textWhite}
          fontSize={9}
          fontWeight="700"
          textAnchor="middle"
          transform={`rotate(-45, ${MID}, ${MID})`}
          clipPath="url(#urgencyRibbonCorner)">
          {bandLabel(urgency)}
        </SvgText>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    // Above the card's own content, but never intercepting a tap meant for
    // the card underneath.
    zIndex: 1,
  },
});
