import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { ClipPath, Defs, Path, Polygon, Text as SvgText } from 'react-native-svg';
import { Colors } from '../design/colors';
import { Radius } from '../design/radius';
import { urgencyShortLabel, urgencySpokenLabel } from '../utils/reportUrgency';
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
const BAND_OUTER = 54;
const LABEL_SIZE = 10;
// Midpoint of the band's centre line, which the label rotates about.
const MID = (BAND_INNER + BAND_OUTER) / 4;
// SvgText's `y` is the BASELINE, not the visual centre, so anchoring at MID
// puts every glyph on the corner side of the centre line and spills them out
// of the band — confirmed on device before this offset existed. Nudging the
// anchor along (1,1), which is perpendicular to the band, re-centres them:
// half a cap height (~0.35em) projected onto each axis.
const LABEL_ANCHOR = MID + LABEL_SIZE * 0.35 * Math.SQRT1_2;

// Matches the card's own top-left corner so the band's square end is cut to
// the rounded edge. Clipping here rather than with overflow:'hidden' on the
// card keeps Android's elevation shadow intact — see Elevation.raised.
const CORNER_CLIP = `M${Radius.lg},0 A${Radius.lg},${Radius.lg} 0 0 0 0,${Radius.lg} L0,${SIZE} L${SIZE},${SIZE} L${SIZE},0 Z`;

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
      accessibilityLabel={urgencySpokenLabel(urgency)}>
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
          x={LABEL_ANCHOR}
          y={LABEL_ANCHOR}
          fill={Colors.textWhite}
          fontSize={LABEL_SIZE}
          fontWeight="700"
          textAnchor="middle"
          transform={`rotate(-45, ${LABEL_ANCHOR}, ${LABEL_ANCHOR})`}
          clipPath="url(#urgencyRibbonCorner)">
          {urgencyShortLabel(urgency)}
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
