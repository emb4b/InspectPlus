import React, { useCallback, useRef, useState } from 'react';
import { View, PixelRatio, StyleSheet } from 'react-native';
import ViewShot from 'react-native-view-shot';
import { StampOverlay } from '../components/StampOverlay';

export interface StampCaptureInput {
  photoUri: string;
  photoWidth: number;
  photoHeight: number;
  dateLabel: string;
  dmsLabel: string;
  locationLabel: string | null;
}

interface PendingCapture extends StampCaptureInput {
  widthDp: number;
  heightDp: number;
}

interface PendingResolver {
  resolve: (uri: string) => void;
  reject: (error: unknown) => void;
}

// Rendering an off-screen View that react-native-view-shot flattens into a
// single jpg is the standard approach for "burn a watermark into a photo" in
// React Native/Expo — there's no built-in canvas API to draw onto pixels
// directly. The hidden node this returns (`captureNode`) must be mounted
// somewhere in the caller's tree (see AttachmentsSection) for capture() to
// have anything to snapshot.
export function useGeotagStampCapture() {
  const viewShotRef = useRef<ViewShot>(null);
  const [pending, setPending] = useState<PendingCapture | null>(null);
  const resolverRef = useRef<PendingResolver | null>(null);

  const captureStamp = useCallback((input: StampCaptureInput): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (resolverRef.current) {
        reject(new Error('A stamp capture is already in progress'));
        return;
      }
      resolverRef.current = { resolve, reject };

      // Photo dimensions come back in device pixels; react-native-view-shot
      // captures at the *layout* size (dp) multiplied by the device's own
      // pixel ratio, so dividing by that ratio here is what makes the final
      // captured jpg land close to the original photo's resolution instead
      // of being scaled to whatever the screen happens to be.
      const ratio = PixelRatio.get();
      setPending({
        ...input,
        widthDp: input.photoWidth / ratio,
        heightDp: input.photoHeight / ratio,
      });
    });
  }, []);

  // Per react-native-view-shot's own docs: capture() must not fire until the
  // Image inside it has actually finished loading/decoding, or the snapshot
  // can come back blank — onLoad on the <Image> in StampOverlay is that
  // signal. But onLoad only confirms the *bitmap* decoded; it says nothing
  // about whether the off-screen View around it has finished an actual
  // native layout + paint pass at its final position yet, since that
  // happens asynchronously on the native UI thread, not in lockstep with
  // this JS callback. Capturing immediately intermittently grabbed a
  // transitional, under-painted frame — which reads as a dark/near-black
  // photo, and only some of the time, matching the inconsistent symptom
  // (not every embedded photo, unlike the earlier opacity bug which was
  // dark 100% of the time). A couple of animation frames plus a short
  // buffer gives the native side room to actually finish painting first.
  const handleImageLoad = useCallback(() => {
    const resolver = resolverRef.current;
    if (!resolver) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(async () => {
            try {
              const uri = await viewShotRef.current?.capture?.();
              if (!uri) throw new Error('Stamp capture returned no uri');
              resolver.resolve(uri);
            } catch (error) {
              resolver.reject(error);
            } finally {
              resolverRef.current = null;
              setPending(null);
            }
          }, 300);
        });
      });
    });
  }, []);

  const handleImageError = useCallback(() => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setPending(null);
    resolver?.reject(new Error('Failed to load photo for geotag stamping'));
  }, []);

  const captureNode = pending ? (
    // collapsable={false} is required on Android — without it, RN's view-
    // flattening optimization can strip this View out of the native
    // hierarchy entirely (it has no visible paint of its own from the
    // renderer's point of view), leaving react-native-view-shot with
    // nothing to actually capture.
    <View style={styles.offscreen} pointerEvents="none" collapsable={false}>
      <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.97 }}>
        <StampOverlay
          photoUri={pending.photoUri}
          widthDp={pending.widthDp}
          heightDp={pending.heightDp}
          dateLabel={pending.dateLabel}
          dmsLabel={pending.dmsLabel}
          locationLabel={pending.locationLabel}
          onImageLoad={handleImageLoad}
          onImageError={handleImageError}
        />
      </ViewShot>
    </View>
  ) : null;

  return { captureStamp, captureNode };
}

const styles = StyleSheet.create({
  // Positioned far outside the viewport rather than hidden via opacity: 0.
  // react-native-view-shot captures the view's actual rendered pixels,
  // alpha included — an opacity-0 ancestor gets captured as a near-
  // transparent render, which flattening into an opaque jpg (no alpha
  // channel) turns dark/black. Moving it off-screen keeps it invisible to
  // the user without touching the alpha the capture reads back.
  offscreen: {
    position: 'absolute',
    top: 0,
    // Comfortably outside any real device viewport, but not an absurd
    // magnitude — an extremely large offset is one more variable that could
    // plausibly affect how eagerly the native side prioritizes painting a
    // view nobody could ever scroll to.
    left: -3000,
  },
});
