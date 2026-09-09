// Mock AsyncStorage globally so any suite that transitively renders a report card
// (which imports urgencyConfig.ts, which imports AsyncStorage) doesn't fail at import time.
// Per-file mocks elsewhere in the repo still take precedence and work unchanged.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
