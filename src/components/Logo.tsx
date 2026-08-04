import React from 'react';
import { Text } from 'react-native';
import { Colors } from '../constants/colors';

interface LogoProps {
  // White text for the dark navy→green header gradient; navy for light
  // backgrounds (e.g. the login screen). "Plus" stays green either way,
  // just a brighter shade on dark backgrounds.
  dark?: boolean;
  fontSize?: number;
  // "lockup" (design system 2a/2b): green "i" + contrasting "NSPECT" —
  // used on the login screen. "plain" (3a): solid-color "iNSPECT" — used
  // in the header, where the wordmark sits inline with agency logos and
  // stays simpler.
  variant?: 'lockup' | 'plain';
}

// Just the "iNSPECTPlus" wordmark — callers compose their own subtitle
// line, since its layout differs between the login screen (centered,
// directly under the wordmark) and the header (full-width, below a row
// that also has the agency logos).
export const Logo: React.FC<LogoProps> = ({ dark = false, fontSize = 34, variant = 'lockup' }) => {
  const iColor = dark ? Colors.greenLight : Colors.green;
  const restColor = dark ? Colors.textWhite : Colors.navy;
  const plusColor = dark ? Colors.greenLight : Colors.green;

  return (
    <Text style={{ fontSize, fontWeight: '800', letterSpacing: -0.5, lineHeight: fontSize }}>
      {/* {variant === 'lockup' ? (
        <>
          <Text style={{ color: iColor }}>i</Text>
          <Text style={{ color: restColor }}>NSPECT</Text>
        </>
      ) : (
        // <Text style={{ color: restColor }}>iNSPECT</Text>
        <Text style={{ color: iColor }}>i</Text>
        <Text style={{ color: restColor }}>NSPECT</Text>
      )} */}
      <Text style={{ color: iColor }}>i</Text>
      <Text style={{ color: restColor }}>NSPECT</Text>
      <Text style={{ color: plusColor }}>Plus</Text>
    </Text>
  );
};
