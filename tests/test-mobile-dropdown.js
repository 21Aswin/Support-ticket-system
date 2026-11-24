const puppeteer = require('../backend/node_modules/puppeteer-core');
const path = require('path');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  // Set to 320px (minimum mobile width)
  await page.setViewport({ width: 320, height: 600, isMobile: true, hasTouch: true });

  await page.goto('http://127.0.0.1:8000/login.php');
  await page.type('#email', 'admin@helpdesk.local');
  await page.type('#password', 'Admin@123');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.click('button[type="submit"]')
  ]);

  // Click notifications bell icon
  const bellBtn = await page.$('button[title="Notifications"]');
  await bellBtn.click();
  await new Promise(r => setTimeout(r, 400));

  const notifBox = await page.evaluate(() => {
    const el = document.querySelector('.dropdown-menu.show');
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      width: rect.width,
      viewportWidth: window.innerWidth,
      isOverflowingLeft: rect.left < 0,
      isOverflowingRight: rect.right > window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth
    };
  });

  console.log('Mobile 320px Notification Dropdown Bounding Box:', notifBox);
  await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'mobile_320px_overflow_before.png') });
  console.log('Saved screenshot: screenshots/mobile_320px_overflow_before.png');

  await browser.close();
})();
