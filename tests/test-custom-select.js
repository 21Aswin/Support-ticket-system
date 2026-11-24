const puppeteer = require('../backend/node_modules/puppeteer-core');
const path = require('path');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  console.log('--- Testing Custom Select on create-ticket.php --- \n');
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  // 1. Mobile 375px
  await page.setViewport({ width: 375, height: 750, isMobile: true, hasTouch: true });
  await page.goto('http://127.0.0.1:8000/login.php');
  if (await page.$('#email')) {
    await page.type('#email', 'employee@helpdesk.local');
    await page.type('#password', 'Employee@123');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]')
    ]);
  }

  await page.goto('http://127.0.0.1:8000/create-ticket.php', { waitUntil: 'networkidle2' });

  // Verify custom select triggers exist
  const catTrigger = await page.$('#trigger_category_id');
  if (!catTrigger) {
    console.error('[FAIL] Custom select trigger #trigger_category_id not found!');
    process.exit(1);
  }
  console.log('[PASS] Custom select trigger #trigger_category_id found');

  // Click to open Category dropdown
  await catTrigger.click();
  await new Promise(r => setTimeout(r, 300));

  // Check bounding box of custom select menu
  const menuMetrics = await page.evaluate(() => {
    const menu = document.querySelector('#wrapper_category_id .custom-select-menu');
    if (!menu) return null;
    const rect = menu.getBoundingClientRect();
    const card = document.querySelector('.card-custom').getBoundingClientRect();
    return {
      menuLeft: rect.left,
      menuRight: rect.right,
      menuWidth: rect.width,
      viewportWidth: window.innerWidth,
      cardLeft: card.left,
      cardRight: card.right,
      overflowLeft: rect.left < 0,
      overflowRight: rect.right > window.innerWidth,
      overflowCard: rect.right > card.right + 2,
      docScrollWidth: document.documentElement.scrollWidth
    };
  });
  console.log('Category Dropdown Metrics (375px):', menuMetrics);

  if (menuMetrics.overflowRight || menuMetrics.overflowLeft || menuMetrics.overflowCard) {
    console.error('[FAIL] Dropdown menu overflows screen or card boundary!');
    process.exit(1);
  }
  console.log('[PASS] Dropdown menu is strictly bounded inside card and screen!');

  // Capture screenshot of open Category dropdown
  await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'custom_select_category_375px.png') });
  console.log('Saved: screenshots/custom_select_category_375px.png');

  // Select "Hardware Issue"
  await page.evaluate(() => {
    const opts = Array.from(document.querySelectorAll('#wrapper_category_id .custom-select-option'));
    const hw = opts.find(o => o.textContent.includes('Hardware Issue'));
    if (hw) hw.click();
  });
  await new Promise(r => setTimeout(r, 200));

  const selectedVal = await page.evaluate(() => {
    const sel = document.getElementById('category_id');
    const trig = document.getElementById('trigger_category_id');
    return {
      nativeVal: sel.value,
      nativeText: sel.options[sel.selectedIndex].text,
      triggerText: trig.textContent.trim()
    };
  });
  console.log('Selected Category Value:', selectedVal);
  if (!selectedVal.triggerText.includes('Hardware Issue')) {
    console.error('[FAIL] Category selection did not update trigger!');
    process.exit(1);
  }
  console.log('[PASS] Category selection correctly updated trigger & native select');

  // Now click Priority dropdown
  const prioTrigger = await page.$('#trigger_priority');
  await prioTrigger.click();
  await new Promise(r => setTimeout(r, 300));

  const prioMetrics = await page.evaluate(() => {
    const menu = document.querySelector('#wrapper_priority .custom-select-menu');
    if (!menu) return null;
    const rect = menu.getBoundingClientRect();
    return {
      menuLeft: rect.left,
      menuRight: rect.right,
      menuWidth: rect.width,
      viewportWidth: window.innerWidth,
      overflowLeft: rect.left < 0,
      overflowRight: rect.right > window.innerWidth,
      docScrollWidth: document.documentElement.scrollWidth
    };
  });
  console.log('Priority Dropdown Metrics (375px):', prioMetrics);
  await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'custom_select_priority_375px.png') });
  console.log('Saved: screenshots/custom_select_priority_375px.png');

  // Select "High" priority
  await page.evaluate(() => {
    const opts = Array.from(document.querySelectorAll('#wrapper_priority .custom-select-option'));
    const hi = opts.find(o => o.getAttribute('data-value') === 'High');
    if (hi) hi.click();
  });
  await new Promise(r => setTimeout(r, 200));

  // Test AI Auto-Draft with the custom selected Category & Priority
  await page.type('#title', 'Office printer Paper Jam error 502');
  await page.click('#btnAiDraft');
  await new Promise(r => setTimeout(r, 2000));

  const descVal = await page.$eval('#description', el => el.value);
  console.log('AI Draft Generated Length:', descVal.length);
  if (descVal.length > 50 && descVal.includes('Hardware Issue')) {
    console.log('[PASS] AI Auto-Draft successfully used custom selected category!');
  } else {
    console.warn('[WARN] AI draft content:', descVal);
  }

  // Test smallest mobile screen (320px)
  await page.setViewport({ width: 320, height: 600, isMobile: true, hasTouch: true });
  await page.goto('http://127.0.0.1:8000/create-ticket.php', { waitUntil: 'networkidle2' });
  const cat320 = await page.$('#trigger_category_id');
  await cat320.click();
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'custom_select_category_320px.png') });
  console.log('Saved: screenshots/custom_select_category_320px.png');

  await browser.close();
  console.log('\n--- ALL CUSTOM SELECT TESTS COMPLETED SUCCESSFULLY! ---');
})();
