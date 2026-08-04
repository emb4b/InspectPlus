import NetInfo from '@react-native-community/netinfo';

export async function checkOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();

    // isConnected: false → definitely offline
    if (!state.isConnected) return false;

    // isInternetReachable can be null on Android when the OS hasn't
    // finished its reachability probe yet. Treat null as "probably online"
    // and let the actual Supabase call fail naturally if there's no real
    // connectivity — that error is more meaningful than forcing offline mode.
    return state.isInternetReachable !== false;
  } catch {
    // NetInfo itself failed — assume offline to be safe
    return false;
  }
}