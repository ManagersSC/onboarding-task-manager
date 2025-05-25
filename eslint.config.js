// eslint.config.js
import next from 'eslint-config-next';

export default [
  ...next,
  {
    ignores: ['.next/**', 'coverage/**', 'node_modules/**'],
  },
]; 