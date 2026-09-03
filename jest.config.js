module.exports = {
  preset: 'jest-expo',
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.claude/'],
  moduleNameMapper: {
    '^react-native-reanimated$': 'react-native-reanimated/mock',
    '^react-native-worklets$': 'react-native-worklets/lib/module/mock',
  },
};