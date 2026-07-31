const fs = require('fs');
const glob = require('glob');

const files = glob.sync('frontend/__tests__/**/*.test.tsx');

for (let file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // For testing library render
  if (content.includes('render(') && !content.includes('await act(async () => { render(')) {
    // Basic substitution for common pattern
    content = content.replace(/render\(\s*<TestWrapper>/g, 'await act(async () => { render(<TestWrapper>');
    content = content.replace(/<\/TestWrapper>\s*\);/g, '</TestWrapper>); });');

    // Some are render(<Component />, { wrapper: TestWrapper })
    // Hard to regex all, maybe we just use vitest.setup.ts to mock getUserProfile so it doesn't trigger state updates?
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
  }
}
