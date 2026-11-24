const puppeteer = require('../backend/node_modules/puppeteer-core');
const path = require('path');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  console.log('--- Testing Timezone & Assignment Timestamp Formatting --- \n');
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  // Login as Admin
  await page.goto('http://127.0.0.1:8000/login.php');
  if (await page.$('#email')) {
    await page.type('#email', 'admin@helpdesk.local');
    await page.type('#password', 'Admin@123');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]')
    ]);
  }

  // Go to ticket-details of ticket 1
  await page.goto('http://127.0.0.1:8000/ticket-details.php?id=1', { waitUntil: 'networkidle2' });

  const timelineTimes = await page.evaluate(() => {
    const createdHeader = document.querySelector('.page-title p')?.textContent.trim();
    const metaSubmitted = Array.from(document.querySelectorAll('.card-custom small, .card-custom span'))
      .map(el => el.textContent.trim())
      .filter(t => t.includes('Nov') || t.includes('at'));

    const timelineItems = Array.from(document.querySelectorAll('.timeline-item')).map(item => {
      const author = item.querySelector('.timeline-author')?.textContent.trim();
      const time = item.querySelector('.timeline-meta span:last-child')?.textContent.trim();
      const body = item.querySelector('.timeline-body')?.textContent.trim();
      return { author, time, body };
    });

    return { createdHeader, metaSubmitted, timelineItems };
  });

  console.log('Ticket Details Header Time:', timelineTimes.createdHeader);
  console.log('Timeline Items:');
  timelineTimes.timelineItems.forEach((item, idx) => {
    console.log(`  [${idx + 1}] ${item.time} | ${item.body}`);
  });

  // Verify that the times are formatted with AM/PM and correct IST hours (e.g. 11:xx AM or matching local time, NOT 7:xx AM)
  const hasBerlinTime = timelineTimes.timelineItems.some(item => item.time.includes('7:11 AM') || item.time.includes('7:12 AM') || item.time.includes('7:13 AM'));
  const hasIstTime = timelineTimes.timelineItems.some(item => item.time.includes('11:'));

  console.log('\nBerlin Time Detected (Failure):', hasBerlinTime);
  console.log('IST Time (11:xx AM) Detected (Success):', hasIstTime);

  // Take screenshot of ticket timeline
  await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'ticket_timeline_ist_time.png') });
  console.log('Saved screenshot: screenshots/ticket_timeline_ist_time.png');

  // Check topbar notification time as well
  const bell = await page.$('button[title="Notifications"]');
  if (bell) {
    await bell.click();
    await new Promise(r => setTimeout(r, 300));
    const notifTimes = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.notif-dropdown-item span')).map(s => s.textContent.trim()).filter(t => t.includes('Nov') || t.includes('AM') || t.includes('PM'));
    });
    console.log('Topbar Notification Times:', notifTimes);
  }

  await browser.close();
  console.log('\n--- Timezone Verification Completed! ---');
})();
