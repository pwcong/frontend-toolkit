// eslint-disable-next-line import/no-commonjs
module.exports = {
  root: true,
  extends: ['@modern-js-app'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['../tsconfig.json'],
  },
  rules: {
    '@typescript-eslint/member-ordering': 'off',
    '@typescript-eslint/no-parameter-properties': 'off',
    '@typescript-eslint/no-redeclare': 'off',
    'no-undef-init': 'off',
  },
};
