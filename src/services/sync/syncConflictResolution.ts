import { Alert } from 'react-native';
import { resolveConflictKeepLocal } from '../../db/sync/watermelonAdapter';
import { SyncEntityName } from './syncSchema';

// Shared tap handler for the "Sync conflict" badge (EstablishmentCard,
// EstablishmentHeaderCard, ReportListCard, InspectionReportHeader) — the
// resolution entry point for option 3 of the sync-conflict discussion: keep
// the local edit and force it to win the next push. Local-only by design —
// no fetch/diff against the other device's version, just re-queues what's
// already here with a fresh updatedAt (see resolveConflictKeepLocal).
export function confirmResolveConflict(entity: SyncEntityName, id: string, label: string): void {
  Alert.alert(
    'Sync conflict',
    `${label} couldn't be saved because someone else's newer change already reached the server. Keep your local version and try syncing it again?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Keep my version',
        onPress: () => {
          resolveConflictKeepLocal(entity, id).catch(err => {
            console.error('[SyncConflict] Failed to resolve locally:', err);
            Alert.alert('Something went wrong', 'Could not queue this record for retry. Please try again.');
          });
        },
      },
    ],
  );
}
