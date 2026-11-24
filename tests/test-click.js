const puppeteer = require('../backend/node_modules/puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE:', msg.text()));
  await page.setViewport({ width: 375, height: 700, isMobile: true });
  await page.goto('http://127.0.0.1:8000/login.php');
  await page.type('#email', 'employee@helpdesk.local');
  await page.type('#password', 'Employee@123');
  await Promise.all([page.waitForNavigation(), page.click('button[type="submit"]')]);
  await page.goto('http://127.0.0.1:8000/create-ticket.php');
  
  const res = await page.evaluate(() => {
    const t = document.getElementById('trigger_category_id');
    const w = document.getElementById('wrapper_category_id');
    t.click();
    const m = w.querySelector('.custom-select-menu');
    const r = m.getBoundingClientRect();
    const centerX = r.left + r.width / 2;
    const centerY = r.top + 30;
    const topElement = document.elementFromPoint(centerX, centerY);
    return {
      wrapperClass: w.className,
      display: window.getComputedStyle(m).display,
      rect: { left: r.left, right: r.right, width: r.width, top: r.top, height: r.height },
      menuBg: window.getComputedStyle(m).backgroundColor,
      menuZIndex: window.getComputedStyle(m).zIndex,
      topElementTag: topElement ? topElement.tagName : null,
      topElementClass: topElement ? topElement.className : null,
      topElementText: topElement ? topElement.textContent.trim().substring(0, 40) : null,
      windowW: window.innerWidth
    };
  });
  console.log('Result after click:', res);
  await page.screenshot({ path: 'screenshots/custom_select_menu_open_375px.png' });
  console.log('Saved screenshots/custom_select_menu_open_375px.png');
  // Click Priority
  await page.evaluate(() => {
    document.getElementById('trigger_priority').click();
  });
  await new Promise(r => setTimeout(r, 300)); // wait for 150ms fade animation to finish!

  const prioRes = await page.evaluate(() => {
    const w = document.getElementById('wrapper_priority');
    const m = w.querySelector('.custom-select-menu');
    const r = m.getBoundingClientRect();
    const centerX = r.left + r.width / 2;
    const centerY = r.top + 30;
    const topElement = document.elementFromPoint(centerX, centerY);
    return {
      wrapperClass: w.className,
      display: window.getComputedStyle(m).display,
      rect: { left: r.left, right: r.right, width: r.width, top: r.top, height: r.height },
      menuBg: window.getComputedStyle(m).backgroundColor,
      menuZIndex: window.getComputedStyle(m).zIndex,
      topElementTag: topElement ? topElement.tagName : null,
      topElementClass: topElement ? topElement.className : null,
      topElementText: topElement ? topElement.textContent.trim().substring(0, 40) : null,
      windowW: window.innerWidth
    };
  });
  console.log('Priority result after click:', prioRes);
  await page.screenshot({ path: 'screenshots/custom_select_priority_open_375px.png' });
  console.log('Saved screenshots/custom_select_priority_open_375px.png');
  await browser.close();
})();
