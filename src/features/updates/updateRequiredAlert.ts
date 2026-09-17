import { Alert, Linking } from 'react-native';
import { LATEST_APK_URL } from './checkForUpdate';

// The sync gate (appVersionGate) refuses builds below the operator's
// minimum version. Every place that reports it used to say "please
// update" with nowhere to go; this is the one wording, with the stable
// latest-APK link as the way out. `detail` is an optional trailing
// sentence for callers that need to say what was (not) changed.
export function showUpdateRequiredAlert(minVersion: string, detail?: string): void {
  const message = `This app version is no longer supported for sync. Please update to at least version ${minVersion}.${detail ? ` ${detail}` : ''}`;
  Alert.alert('Update required', message, [
    { text: 'Later', style: 'cancel' },
    { text: 'Download', onPress: () => { void Linking.openURL(LATEST_APK_URL); } },
  ]);
}
