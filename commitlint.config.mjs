export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Body line length limit is not enforced — long descriptive bodies are fine
    'body-max-line-length': [0, 'always', 100],
    'header-max-length': [0, 'always', 120],
  },
  ignores: [
    (commit) =>
      commit.includes('Signed-off-by: dependabot[bot]') ||
      commit.startsWith('chore(deps') ||
      commit.startsWith('Merge branch') ||
      commit.startsWith('Merge pull request'),
  ],
};
