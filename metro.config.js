const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/private/defaults/exclusionList').default;

const config = getDefaultConfig(__dirname);

const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};
config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter(ext => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
  blockList: exclusionList([
    /android\/build\/.*/,
    /android\/app\/build\/.*/,
    /android\/\.gradle\/.*/,
    /ios\/build\/.*/,
    /ios\/Pods\/.*/,
  ]),
};

module.exports = config;