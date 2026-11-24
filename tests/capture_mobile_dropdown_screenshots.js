const puppeteer = require('../backend/node_modules/puppeteer-core');
const path = require('path');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  // Login
  await page.goto('http://127.0.0.1:8000/login.php');
  if (await page.$('#email')) {
    await page.type('#email', 'admin@helpdesk.local');
    await page.type('#password', 'Admin@123');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]')
    ]);
  }

  // 1. Mobile 375px Notification Dropdown
  await page.setViewport({ width: 375, height: 667, isMobile: true, hasTouch: true });
  await page.goto('http://127.0.0.1:8000/admin-dashboard.php', { waitUntil: 'networkidle2' });
  const bell375 = await page.$('button[title="Notifications"]');
  await bell375.click();
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'mobile_dropdown_notif_375px.png') });
  console.log('Saved: mobile_dropdown_notif_375px.png');

  // 2. Mobile 375px Profile Dropdown
  await page.evaluate(() => document.body.click());
  await new Promise(r => setTimeout(r, 200));
  const profile375 = await page.$('.user-profile-trigger');
  await profile375.click();
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'mobile_dropdown_profile_375px.png') });
  console.log('Saved: mobile_dropdown_profile_375px.png');

  // 3. Mobile 320px Notification Dropdown (smallest iPhone SE / compact mobile)
  await page.setViewport({ width: 320, height: 568, isMobile: true, hasTouch: true });
  await page.goto('http://127.0.0.1:8000/admin-dashboard.php', { waitUntil: 'networkidle2' });
  const bell320 = await page.$('button[title="Notifications"]');
  await bell320.click();
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'mobile_dropdown_notif_320px.png') });
  console.log('Saved: mobile_dropdown_notif_320px.png');

  await browser.close();
})();
