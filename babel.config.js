module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // ── Fix: OpenTelemetry dynamic import breaks Hermes in release builds ──
      // @supabase/supabase-js pulls in @opentelemetry/api which uses:
      //   import(/* webpackIgnore */ /* vite-ignore */ OTEL_PKG)
      // Metro can't resolve a variable import(), so it lands in the bundle
      // as-is. Hermes then rejects it — dynamic import() is not supported.
      // This plugin replaces those calls with Promise.resolve(null) before
      // the bundle is assembled. The .catch() in the original code handles
      // null gracefully, so OpenTelemetry tracing silently stays disabled.
      function removeHermesBrokenDynamicImports({ types: t }) {
        return {
          visitor: {
            CallExpression(path) {
              if (path.node.callee.type !== 'Import') return;

              const arg = path.node.arguments[0];
              if (!arg) return;

              // Collect all comments on the import() call and its argument
              const comments = [
                ...(path.node.innerComments      || []),
                ...(path.node.leadingComments    || []),
                ...(arg.innerComments            || []),
                ...(arg.leadingComments          || []),
                ...(arg.trailingComments         || []),
              ];

              const hasBundlerIgnore = comments.some(
                c =>
                  c.value.includes('webpackIgnore')   ||
                  c.value.includes('vite-ignore')     ||
                  c.value.includes('turbopackIgnore'),
              );

              if (hasBundlerIgnore) {
                path.replaceWith(
                  t.callExpression(
                    t.memberExpression(
                      t.identifier('Promise'),
                      t.identifier('resolve'),
                    ),
                    [t.nullLiteral()],
                  ),
                );
              }
            },
          },
        };
      },

      [
        'module-resolver',
        {
          root: ['.'],
          alias: { '@': '.' },
        },
      ],
      'react-native-reanimated/plugin', // must always be last
    ],
  };
};