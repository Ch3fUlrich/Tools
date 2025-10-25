const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

async function takeScreenshots(label) {
  const outDir = path.resolve(__dirname, '..', 'tmp', 'screenshots');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  try {
    // Desktop
    const contextDesktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageDesktop = await contextDesktop.newPage();
    await pageDesktop.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await pageDesktop.screenshot({ path: path.join(outDir, `home_${label}_desktop.png`), fullPage: true });
    await pageDesktop.goto('http://localhost:3000/auth', { waitUntil: 'networkidle' });
    await pageDesktop.screenshot({ path: path.join(outDir, `auth_${label}_desktop.png`), fullPage: true });
    await contextDesktop.close();

    // Mobile (iPhone 12)
    const device = devices['iPhone 12'] || { viewport: { width: 390, height: 844 }, userAgent: '' };
    const contextMobile = await browser.newContext({ ...device });
    const pageMobile = await contextMobile.newPage();
    await pageMobile.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await pageMobile.screenshot({ path: path.join(outDir, `home_${label}_mobile.png`), fullPage: true });
    await pageMobile.goto('http://localhost:3000/auth', { waitUntil: 'networkidle' });
    await pageMobile.screenshot({ path: path.join(outDir, `auth_${label}_mobile.png`), fullPage: true });
    await contextMobile.close();
  } finally {
    await browser.close();
  }
}

(async () => {
  const phase = process.argv[2] || 'before';
  console.log('Taking screenshots:', phase);
  await takeScreenshots(phase);
  console.log('Screenshots saved to tmp/screenshots');
})();
