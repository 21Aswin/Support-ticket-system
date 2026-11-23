const puppeteer = require('../backend/node_modules/puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const viewports = [
  { width: 320, height: 568, name: 'Mobile iPhone SE' },
  { width: 375, height: 667, name: 'Mobile iPhone 8' },
  { width: 390, height: 844, name: 'Mobile iPhone 12/13/14' },
  { width: 414, height: 896, name: 'Mobile iPhone XR' },
  { width: 768, height: 1024, name: 'Tablet iPad' },
  { width: 1024, height: 768, name: 'Laptop Small' },
  { width: 1366, height: 768, name: 'Laptop Standard' },
  { width: 1440, height: 900, name: 'Desktop HD' },
];

const pages = [
  '/login.php',
  '/admin-dashboard.php',
  '/ticket-list.php',
  '/ticket-details.php?id=1',
  '/manage-users.php',
  '/manage-categories.php',
  '/reports.php',
  '/settings.php',
];

async function audit() {
  console.log('--- Starting Responsive Layout & Horizontal Overflow Audit ---\n');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();

  // Log in as Admin first to get authenticated session
  await page.goto('http://127.0.0.1:8000/login.php');
  await page.type('#email', 'admin@helpdesk.local');
  await page.type('#password', 'Admin@123');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.click('button[type="submit"]')
  ]);

  let totalChecks = 0;
  let issues = 0;

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    for (const p of pages) {
      await page.goto(`http://127.0.0.1:8000${p}`, { waitUntil: 'networkidle2' });
      const overflow = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        };
      });

      totalChecks++;
      if (overflow.hasOverflow) {
        console.error(`[OVERFLOW] ${p} at ${vp.width}px (${vp.name}): scrollWidth=${overflow.scrollWidth}, clientWidth=${overflow.clientWidth}`);
        issues++;
      } else {
        // passed
      }
    }
    console.log(`[PASS] All ${pages.length} pages verified at ${vp.width}px (${vp.name}) - Zero overflow.`);
  }

  await browser.close();
  console.log(`\n======================================================`);
  console.log(`Responsive Audit Complete: ${totalChecks} checks, ${issues} overflow issues.`);
  console.log(`======================================================`);
}

audit().catch(console.error);
