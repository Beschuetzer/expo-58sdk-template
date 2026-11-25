module.exports = {
  root: true,
  extends: ['universe/node', 'universe/native'],
  overrides: [
    {
      files: ['*.ts', '*.tsx', '*.d.ts'],
      parserOptions: {
        warnOnUnsupportedTypeScriptVersion: false,
      },
    },
  ],
};
