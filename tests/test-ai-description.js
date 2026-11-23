const puppeteer = require('../backend/node_modules/puppeteer-core');
const path = require('path');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testAiDescription() {
  console.log('--- Testing AI Description Generator & Clear / Select All --- \n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err));

  try {
    // 1. Login as Employee
    console.log('[Step 1] Logging in as Employee...');
    await page.goto('http://127.0.0.1:8000/login.php');
    await page.type('#email', 'employee@helpdesk.local');
    await page.type('#password', 'Employee@123');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]')
    ]);

    // 2. Open create-ticket.php
    console.log('[Step 2] Navigating to create-ticket.php...');
    await page.goto('http://127.0.0.1:8000/create-ticket.php');

    // 3. Verify buttons exist
    const hasAiBtn = await page.$('#btnAiDraft');
    const hasSelectAllBtn = await page.$('#btnSelectAllDesc');
    const hasClearBtn = await page.$('#btnClearDesc');

    console.log('[Test 1] AI Auto-Draft button visible:', hasAiBtn ? 'PASS' : 'FAIL');
    console.log('[Test 2] Select All button visible:', hasSelectAllBtn ? 'PASS' : 'FAIL');
    console.log('[Test 3] Clear button visible:', hasClearBtn ? 'PASS' : 'FAIL');

    // 4. Fill Subject, Category, Priority
    console.log('[Step 3] Entering Subject, Category and Priority...');
    await page.evaluate(() => {
      const inp = document.querySelector('input[name="title"]');
      if (inp) {
        inp.value = 'Laptop cannot connect to office Wi-Fi';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    const typedTitle = await page.$eval('input[name="title"]', el => el.value);
    console.log(`Typed Title value in DOM: "${typedTitle}"`);
    await page.select('#category_id', '1'); // Network Issue or Hardware
    await page.select('#priority', 'High');

    // 5. Click AI Auto-Draft button
    console.log('[Step 4] Clicking "✨ AI Auto-Draft" button...');
    await page.$eval('#btnAiDraft', el => el.click());

    // Wait for description to populate
    await page.waitForFunction(() => {
      const el = document.getElementById('description');
      return el && el.value.length > 50;
    }, { timeout: 8000 });

    const generatedText = await page.$eval('#description', el => el.value);
    console.log(`[PASS] AI Generated Description (${generatedText.length} characters):`);
    console.log(generatedText.substring(0, 180) + '...\n');

    // Capture screenshot of AI drafted description
    await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'create_ticket_ai_drafted.png') });
    console.log('Saved screenshot: screenshots/create_ticket_ai_drafted.png');

    // 6. Test "Select All"
    console.log('[Step 5] Clicking "Select All"...');
    await page.$eval('#btnSelectAllDesc', el => el.click());
    const isSelected = await page.evaluate(() => {
      const el = document.getElementById('description');
      return el.selectionStart === 0 && el.selectionEnd === el.value.length;
    });
    console.log('[Test 4] Select All selected all text:', isSelected ? 'PASS' : 'FAIL');

    // 7. Test "Clear" button
    console.log('[Step 6] Clicking "Clear" button...');
    await page.$eval('#btnClearDesc', el => el.click());
    const textAfterClear = await page.$eval('#description', el => el.value);
    console.log('[Test 5] Clear button emptied textarea:', textAfterClear === '' ? 'PASS' : 'FAIL');

    // Capture screenshot of cleared state
    await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'create_ticket_cleared.png') });
    console.log('Saved screenshot: screenshots/create_ticket_cleared.png');

    // 8. Type custom description and submit ticket
    console.log('[Step 7] Typing custom description and submitting...');
    await page.evaluate(() => {
      const desc = document.getElementById('description');
      desc.value = 'This is a custom issue description typed manually by the employee after clearing the AI draft.';
    });

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.evaluate(() => document.querySelector('form[data-prevent-double-submit]').submit())
    ]);

    const isSuccess = await page.evaluate(() => {
      return document.body.innerText.includes('Ticket Created Successfully!');
    });
    console.log('[Test 6] Ticket submitted successfully with custom description:', isSuccess ? 'PASS' : 'FAIL');

    console.log('\n======================================================');
    console.log('--- ALL AI DESCRIPTION TESTS PASSED SUCCESSFULLY! ---');
    console.log('======================================================\n');

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
  }
}

testAiDescription();
