const puppeteer = require('../backend/node_modules/puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  // First login
  await page.goto('http://127.0.0.1:8000/login.php');
  if (await page.$('#email')) {
    await page.type('#email', 'admin@helpdesk.local');
    await page.type('#password', 'Admin@123');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]')
    ]);
  }

  for (const width of [320, 360, 375, 412, 768]) {
    await page.setViewport({ width, height: 700, isMobile: true });
    await page.goto('http://127.0.0.1:8000/admin-dashboard.php', { waitUntil: 'networkidle2' });

    // Test Notification dropdown
    const bell = await page.$('button[title="Notifications"]');
    await bell.click();
    await new Promise(r => setTimeout(r, 400));
    const notifRect = await page.evaluate(() => {
      const el = document.querySelector('.dropdown-menu.show');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { 
        left: r.left, 
        right: r.right, 
        width: r.width, 
        windowW: window.innerWidth,
        overflowLeft: r.left < 0,
        overflowRight: r.right > window.innerWidth,
        docScrollWidth: document.documentElement.scrollWidth
      };
    });
    console.log(`[Viewport ${width}px] Notification Dropdown:`, notifRect);

    // Close by clicking backdrop/body
    await page.evaluate(() => document.body.click());
    await new Promise(r => setTimeout(r, 200));

    // Test Profile dropdown
    const profileBtn = await page.$('.user-profile-trigger');
    await profileBtn.click();
    await new Promise(r => setTimeout(r, 400));
    const profRect = await page.evaluate(() => {
      const el = document.querySelector('.dropdown-menu.show');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { 
        left: r.left, 
        right: r.right, 
        width: r.width, 
        windowW: window.innerWidth,
        overflowLeft: r.left < 0,
        overflowRight: r.right > window.innerWidth,
        docScrollWidth: document.documentElement.scrollWidth
      };
    });
    console.log(`[Viewport ${width}px] Profile Dropdown:`, profRect);
  }

  await browser.close();
})();
