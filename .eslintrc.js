module.exports = {
  root: true,
  extends: ['expo'],
  overrides: [
    {
      // The Expo config gives *.test.* files the Jest globals but not the
      // setup file Jest itself runs before them, which calls jest.mock at
      // top level. CI lints the whole repo (`eslint .`), so without this
      // that one line fails ci/lint-typecheck with no-undef.
      files: ['jest.setup.js'],
      env: { jest: true },
    },
  ],
};
