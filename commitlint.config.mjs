export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Body line length limit is not enforced — long descriptive bodies are fine
    'body-max-line-length': [0, 'always', 100],
  },
};
