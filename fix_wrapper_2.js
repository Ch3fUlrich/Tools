const fs = require('fs');
const glob = require('glob');

const files = glob.sync('frontend/__tests__/**/*.test.tsx');
let fixedCount = 0;

for (let file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Render calls wrapping AuthProvider
  if (content.includes('render(')) {
    // If not already wrapping act around render and using UserProfile, DieSelect, etc
    // This isn't the best regex, but let's try a generic approach: wrapping render() in act is not standard, we should wrap the state setting.

    // Let's instead look at TestWrapper.tsx, it might be the cause since it renders AuthProvider.
  }
}
