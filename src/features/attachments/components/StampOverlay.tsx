import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

export interface StampOverlayProps {
  photoUri: string;
  widthDp: number;
  heightDp: number;
  dateLabel: string;
  dmsLabel: string;
  locationLabel: string | null;
  onImageLoad: () => void;
  onImageError: () => void;
}

const DENR_LOGO = require('../../../../assets/denr_logo.png');

// Rendered off-screen at (roughly) the source photo's native pixel size —
// see useGeotagStampCapture, which converts photoWidth/photoHeight to dp via
// PixelRatio before passing widthDp/heightDp here — then flattened into a
// single jpg via react-native-view-shot. Text/logo sizing is proportional to
// the photo's own width so the stamp reads consistently regardless of the
// source resolution, matching the DENR reference stamp: date/time + DMS
// coordinates + place name (right-aligned) with the DENR seal beside it,
// anchored to the photo's top-right corner.
export const StampOverlay: React.FC<StampOverlayProps> = ({
  photoUri,
  widthDp,
  heightDp,
  dateLabel,
  dmsLabel,
  locationLabel,
  onImageLoad,
  onImageError,
}) => {
  const fontSize = Math.max(11, widthDp * 0.03);
  const logoSize = Math.max(28, widthDp * 0.09);
  const padding = Math.max(8, widthDp * 0.025);

  const textStyle = [styles.text, { fontSize }];

  return (
    <View style={{ width: widthDp, height: heightDp, backgroundColor: '#000000' }}>
      <Image
        source={{ uri: photoUri }}
        style={{ width: widthDp, height: heightDp }}
        resizeMode="cover"
        onLoad={onImageLoad}
        onError={onImageError}
      />
      <View style={[styles.overlayRow, { top: padding, right: padding, gap: padding * 0.6 }]}>
        <Image source={DENR_LOGO} style={{ width: logoSize, height: logoSize }} resizeMode="contain" />
        <View style={styles.textColumn}>
          <Text style={textStyle}>{dateLabel}</Text>
          <Text style={textStyle}>{dmsLabel}</Text>
          {locationLabel && <Text style={textStyle}>{locationLabel}</Text>}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  textColumn: {
    alignItems: 'flex-end',
  },
  text: {
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'right',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});
