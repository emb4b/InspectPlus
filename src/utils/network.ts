import NetInfo from '@react-native-community/netinfo';

export async function checkOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true &&
         state.isInternetReachable === true;
}