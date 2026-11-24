const puppeteer = require('../backend/node_modules/puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  // Test Desktop 1200px
  await page.setViewport({ width: 1200, height: 800 });
  await page.goto('http://127.0.0.1:8000/login.php');
  if (await page.$('#email')) {
    await page.type('#email', 'employee@helpdesk.local');
    await page.type('#password', 'Employee@123');
    await Promise.all([page.waitForNavigation(), page.click('button[type="submit"]')]);
  }
  await page.goto('http://127.0.0.1:8000/create-ticket.php');

  // Click Category on Desktop
  await page.evaluate(() => document.getElementById('trigger_category_id').click());
  await new Promise(r => setTimeout(r, 250));
  await page.screenshot({ path: 'screenshots/custom_select_category_desktop.png' });
  console.log('Saved screenshots/custom_select_category_desktop.png');

  await browser.close();
})();
