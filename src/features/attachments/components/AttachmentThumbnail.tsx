import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { getDisplayUri } from '../attachmentUploadQueue';
import type { Attachment } from '../../../db/models/Attachment';

interface AttachmentThumbnailProps {
  attachment: Attachment;
  selectionMode: boolean;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

type ResolveState = 'loading' | 'ready' | 'unavailable';

// Local `file://` uri if the photo hasn't left this device yet, otherwise
// an on-demand signed URL — see getDisplayUri (attachmentUploadQueue.ts).
// No local caching of the resolved URL: it's re-fetched every time this
// thumbnail mounts, an accepted v1 simplification.
//
// Just the grid tile — tapping it opens the shared, swipeable
// AttachmentViewer (owned by AttachmentsSection) when not in selection
// mode, or toggles selection when it is. There is no per-tile delete
// button — deletion is bulk-only, entered via long-press (see
// AttachmentsSection's selection toolbar).
export const AttachmentThumbnail: React.FC<AttachmentThumbnailProps> = ({
  attachment,
  selectionMode,
  selected,
  onPress,
  onLongPress,
}) => {
  const [uri, setUri] = useState<string | null>(null);
  // Distinct from a bare `uri === null` check — otherwise "still resolving"
  // and "resolved, but there's genuinely nothing to show yet" (e.g. not
  // uploaded and no local file) render identically as a spinner that never
  // goes away instead of an explicit "not available" state.
  const [state, setState] = useState<ResolveState>('loading');

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    getDisplayUri(attachment)
      .then(resolved => {
        if (cancelled) return;
        setUri(resolved);
        setState(resolved ? 'ready' : 'unavailable');
      })
      .catch(() => {
        if (!cancelled) setState('unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, [attachment]);

  const hasGeo = attachment.geoLat != null && attachment.geoLng != null;

  // 'pending' can sit for a long time — this app only syncs on login or a
  // manual "Sync Now" tap, there's no periodic background sync — so an
  // animated spinner there would misleadingly imply active progress. Only
  // 'uploading' (the brief window a row is actually being sent, see
  // attachmentUploadQueue.ts) gets the spinner; 'pending' gets a static
  // waiting icon instead.
  //
  // uploadStatus alone only tracks the binary file — once it's 'uploaded'
  // it never changes again, even if the row's own metadata (e.g. a caption
  // added after the photo already synced) is later edited and goes back to
  // pending_update. syncState is what actually reflects whether anything
  // about this row still needs to reach the server.
  const statusIcon = (() => {
    if (attachment.uploadStatus === 'uploading') {
      return <ActivityIndicator size="small" color={Colors.white} />;
    }
    if (attachment.uploadStatus === 'failed') {
      return <Ionicons name="alert-circle" size={16} color={Colors.conflict} />;
    }
    if (attachment.uploadStatus === 'uploaded' && attachment.syncState === 'synced') {
      return null;
    }
    return <Ionicons name="time-outline" size={13} color={Colors.white} />;
  })();

  return (
    <View style={styles.tile}>
      <TouchableOpacity
        activeOpacity={0.85}
        disabled={!selectionMode && state !== 'ready'}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={350}>
        {state === 'loading' && (
          <View style={[styles.image, styles.placeholder]}>
            <ActivityIndicator size="small" color={Colors.textLight} />
          </View>
        )}
        {state === 'unavailable' && (
          <View style={[styles.image, styles.placeholder]}>
            <Ionicons name="image-outline" size={20} color={Colors.textLight} />
          </View>
        )}
        {state === 'ready' && uri && (
          <Image source={{ uri }} style={[styles.image, selected && styles.imageSelected]} />
        )}
      </TouchableOpacity>

      {!selectionMode && statusIcon && <View style={styles.statusBadge}>{statusIcon}</View>}

      {!selectionMode && hasGeo && (
        <View style={styles.geoBadge}>
          <Ionicons name="location" size={10} color={Colors.white} />
        </View>
      )}

      {selectionMode && (
        <View style={[styles.selectCircle, selected && styles.selectCircleChecked]}>
          {selected && <Ionicons name="checkmark" size={13} color={Colors.white} />}
        </View>
      )}

      {!selectionMode && attachment.uploadStatus === 'failed' && (
        <Text style={styles.errorText} numberOfLines={1}>Upload failed — will retry</Text>
      )}
    </View>
  );
};

const TILE_SIZE = 96;

const styles = StyleSheet.create({
  tile: {
    width: TILE_SIZE,
  },
  image: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 10,
    backgroundColor: Colors.bgMuted,
  },
  imageSelected: {
    opacity: 0.6,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusBadge: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    backgroundColor: 'rgba(13,33,55,0.75)',
    borderRadius: 10,
    padding: 3,
  },
  geoBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(13,33,55,0.75)',
    borderRadius: 10,
    padding: 3,
  },
  selectCircle: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.white,
    backgroundColor: 'rgba(13,33,55,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectCircleChecked: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  errorText: {
    marginTop: 4,
    fontSize: 9.5,
    color: Colors.conflict,
    textAlign: 'center',
  },
});
