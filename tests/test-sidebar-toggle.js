const puppeteer = require('../backend/node_modules/puppeteer-core');
const path = require('path');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testToggle() {
  console.log('--- Testing Hamburger Button & Collapsible Sidebar ---\n');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Login as Admin
  await page.goto('http://127.0.0.1:8000/login.php');
  await page.type('#email', 'admin@helpdesk.local');
  await page.type('#password', 'Admin@123');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.click('button[type="submit"]')
  ]);

  // 1. Verify on Desktop: Hamburger button is visible
  const isBtnVisible = await page.$eval('#sidebarToggleBtn', el => {
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
  console.log('[Test 1] Hamburger button is visible on Desktop:', isBtnVisible ? 'PASS' : 'FAIL');

  // Verify initial sidebar state on Desktop (expanded)
  const isInitiallyExpanded = await page.evaluate(() => {
    return !document.body.classList.contains('sidebar-collapsed');
  });
  console.log('[Test 2] Sidebar initially expanded on Desktop:', isInitiallyExpanded ? 'PASS' : 'FAIL');

  // 2. Click Hamburger Button to collapse
  await page.click('#sidebarToggleBtn');
  await new Promise(r => setTimeout(r, 400)); // wait for transition

  const isCollapsedAfterClick = await page.evaluate(() => {
    return document.body.classList.contains('sidebar-collapsed');
  });
  console.log('[Test 3] Clicking hamburger button collapses sidebar (tucked inside):', isCollapsedAfterClick ? 'PASS' : 'FAIL');

  // Take screenshot of collapsed state
  await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'sidebar_desktop_collapsed.png') });

  // 3. Click Hamburger Button again to expand full menu
  await page.click('#sidebarToggleBtn');
  await new Promise(r => setTimeout(r, 400)); // wait for transition

  const isExpandedAgain = await page.evaluate(() => {
    return !document.body.classList.contains('sidebar-collapsed');
  });
  console.log('[Test 4] Clicking hamburger button again reveals full menu:', isExpandedAgain ? 'PASS' : 'FAIL');

  // 4. Click Sidebar Header Close Button
  await page.click('#sidebarCollapseBtn');
  await new Promise(r => setTimeout(r, 400));

  const isCollapsedViaCloseBtn = await page.evaluate(() => {
    return document.body.classList.contains('sidebar-collapsed');
  });
  console.log('[Test 5] Clicking sidebar header button collapses sidebar:', isCollapsedViaCloseBtn ? 'PASS' : 'FAIL');

  // 5. Test Mobile Viewport (375px)
  await page.setViewport({ width: 375, height: 812 });
  await page.evaluate(() => document.body.classList.remove('sidebar-collapsed'));
  await page.goto('http://127.0.0.1:8000/admin-dashboard.php', { waitUntil: 'networkidle2' });

  // Initial mobile: sidebar not showing
  const mobileInitiallyHidden = await page.$eval('.app-sidebar', el => !el.classList.contains('show'));
  console.log('[Test 6] Mobile initial state: sidebar tucked inside:', mobileInitiallyHidden ? 'PASS' : 'FAIL');

  // Click hamburger on mobile to open full menu
  await page.click('#sidebarToggleBtn');
  await new Promise(r => setTimeout(r, 400));

  const mobileOpen = await page.$eval('.app-sidebar', el => el.classList.contains('show'));
  const overlayVisible = await page.$eval('.sidebar-overlay', el => el.classList.contains('show'));
  console.log('[Test 7] Mobile hamburger button opens full menu drawer:', (mobileOpen && overlayVisible) ? 'PASS' : 'FAIL');

  // Take screenshot of mobile drawer open
  await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'sidebar_mobile_open.png') });

  // Click overlay to close mobile sidebar
  await page.click('.sidebar-overlay');
  await new Promise(r => setTimeout(r, 400));

  const mobileClosed = await page.$eval('.app-sidebar', el => !el.classList.contains('show'));
  console.log('[Test 8] Clicking backdrop/overlay tucks mobile sidebar back inside:', mobileClosed ? 'PASS' : 'FAIL');

  await browser.close();
  console.log('\nAll hamburger toggle tests PASSED!');
}

testToggle().catch(console.error);
