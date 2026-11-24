const puppeteer = require('../backend/node_modules/puppeteer-core');
const path = require('path');
const http = require('http');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function apiCall(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api' + path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, raw: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

(async () => {
  console.log('--- Testing Notification Workflow & Counter Decrement --- \n');
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });

  // 1. Login as Support Staff
  await page.goto('http://127.0.0.1:8000/login.php');
  await page.type('#email', 'support@helpdesk.local');
  await page.type('#password', 'Support@123');
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }), page.click('button[type="submit"]')]);

  // Check initial badge
  const initialBadge = await page.evaluate(() => {
    const b = document.querySelector('.notification-badge-count');
    return b ? b.textContent.trim() : '0';
  });
  console.log('[Step 1] Support Staff initial badge count:', initialBadge);

  // Open notification dropdown
  const bell = await page.$('button[title="Notifications"]');
  await bell.click();
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'notif_flow_1_open.png') });
  console.log('Saved: screenshots/notif_flow_1_open.png');

  // Test "Mark all read" button in topbar dropdown
  const btnMarkAll = await page.$('#btnMarkAllReadTopbar');
  if (btnMarkAll) {
    console.log('[Step 2] Clicking "Mark all read" in topbar dropdown...');
    await btnMarkAll.click();
    await new Promise(r => setTimeout(r, 800));

    const afterMarkAll = await page.evaluate(() => {
      const b = document.querySelector('.notification-badge-count');
      const pill = document.getElementById('notifDropdownBadge');
      const unreadItems = document.querySelectorAll('.notif-dropdown-item.unread').length;
      return {
        badgeVisible: b ? b.style.display !== 'none' : false,
        pillVisible: pill ? pill.style.display !== 'none' : false,
        unreadItemsCount: unreadItems
      };
    });
    console.log('[Step 2 Result] After Mark All Read:', afterMarkAll);
    if (afterMarkAll.badgeVisible || afterMarkAll.unreadItemsCount > 0) {
      console.error('[FAIL] Badge or unread items still visible after Mark All Read!');
      process.exit(1);
    }
    console.log('[PASS] "Mark all read" cleared badge & unread state completely!');
    await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'notif_flow_2_all_cleared.png') });
  }

  // Close dropdown
  await page.evaluate(() => document.body.click());
  await new Promise(r => setTimeout(r, 300));

  // 3. Admin creates and assigns a brand new ticket to Support Staff (Sarah Jenkins, id: 2)
  console.log('[Step 3] Admin assigning a new ticket to Support Staff...');
  const adminAuth = await apiCall('POST', '/auth/login', { email: 'admin@helpdesk.local', password: 'Admin@123' });
  const empAuth = await apiCall('POST', '/auth/login', { email: 'employee@helpdesk.local', password: 'Employee@123' });

  const ticketRes = await apiCall('POST', '/tickets', {
    title: 'VPN disconnect error 806 on remote laptop',
    category_id: 3, // Network Issue
    priority: 'Critical',
    description: 'Remote employee cannot connect to company intranet through VPN tunnel.'
  }, empAuth.data.data.token);
  const newTicketId = ticketRes.data.data.id;

  await apiCall('PATCH', `/tickets/${newTicketId}/assign`, {
    assigned_to: 2,
    priority: 'Critical'
  }, adminAuth.data.data.token);

  // 4. Support Staff refreshes page: Unread count MUST be exactly 1!
  await page.reload({ waitUntil: 'networkidle2' });
  const countAfterAssign = await page.evaluate(() => {
    const b = document.querySelector('.notification-badge-count');
    return b ? b.textContent.trim() : '0';
  });
  console.log('[Step 4] Support Staff badge count after new assignment:', countAfterAssign);
  if (countAfterAssign !== '1') {
    console.error(`[FAIL] Expected badge count to be 1, but got ${countAfterAssign}`);
    process.exit(1);
  }
  console.log('[PASS] Badge count is exactly 1 after new ticket assigned');
  await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'notif_flow_3_badge_one.png') });

  // 5. Support Staff opens notification dropdown and clicks the new notification item
  console.log('[Step 5] Clicking the unread notification in dropdown...');
  const bell2 = await page.$('button[title="Notifications"]');
  await bell2.click();
  await new Promise(r => setTimeout(r, 400));

  const firstNotifItem = await page.$('.notif-dropdown-item');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    firstNotifItem.click()
  ]);

  console.log('Navigated to URL:', page.url());

  // 6. Verify that on ticket-details.php, the unread count in topbar is now 0 (badge disappeared)!
  const countOnTicketDetails = await page.evaluate(() => {
    const b = document.querySelector('.notification-badge-count');
    return b ? (b.style.display === 'none' ? '0 (hidden)' : b.textContent.trim()) : '0 (none)';
  });
  console.log('[Step 6] Topbar badge count on ticket details:', countOnTicketDetails);

  if (countOnTicketDetails !== '0 (hidden)' && countOnTicketDetails !== '0 (none)') {
    console.error('[FAIL] Badge did not reduce to 0 after viewing the notification!');
    process.exit(1);
  }
  console.log('[PASS] Badge count successfully reduced to 0 after opening the notification!');
  await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'notif_flow_4_badge_reduced.png') });

  await browser.close();
  console.log('\n--- ALL NOTIFICATION WORKFLOW TESTS PASSED PERFECTLY! ---');
})();
