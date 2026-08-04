import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from './crypto';

const DEVICE_ID_KEY = 'inspectplus.device.id';

let cachedDeviceId: string | null = null;

// Every synced table requires a non-null device_id, but nothing in the app
// generates one — this is that. Persisted once per install so the same
// device always reports the same id across sessions.
export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (stored) {
    cachedDeviceId = stored;
    return stored;
  }

  const id = generateId();
  await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  cachedDeviceId = id;
  return id;
}
