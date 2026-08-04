import * as Crypto from 'expo-crypto';

export async function hashString(input: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input,
  );
}