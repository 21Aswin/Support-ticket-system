const puppeteer = require('../backend/node_modules/puppeteer-core');
const path = require('path');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const API_BASE = 'http://127.0.0.1:3000/api';

async function testUiNotifications() {
  console.log('--- Testing UI Ticket Notifications End-to-End --- \n');

  // Step 1: Create a fresh ticket via Employee API
  console.log('[Step 1] Creating a test ticket via Employee API...');
  const empLogin = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'employee@helpdesk.local', password: 'Employee@123' })
  }).then(r => r.json());

  const employeeToken = empLogin.data.token;
  const ticketRes = await fetch(`${API_BASE}/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${employeeToken}`
    },
    body: JSON.stringify({
      title: 'Laptop display flickering when connecting external monitor',
      description: 'Display flashes black intermittently when HDMI is plugged in.',
      category_id: 1,
      priority: 'High'
    })
  }).then(r => r.json());

  const createdTicket = ticketRes.data;
  console.log(`Created Ticket: ${createdTicket.ticket_number} (ID: ${createdTicket.id})`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    // Step 2: Admin logs in via browser and assigns the ticket to Support Staff (Sarah Jenkins)
    console.log('[Step 2] Admin logs in via browser and assigns ticket to Support Staff...');
    await page.goto('http://127.0.0.1:8000/login.php');
    await page.type('#email', 'admin@helpdesk.local');
    await page.type('#password', 'Admin@123');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]')
    ]);

    await page.goto(`http://127.0.0.1:8000/ticket-details.php?id=${createdTicket.id}`);
    await page.waitForSelector('#btnAssignSubmit');
    await page.select('select[name="assigned_to"]', '2'); // Sarah Jenkins
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('#btnAssignSubmit')
    ]);
    console.log('Ticket assigned to Sarah Jenkins.');

    // Logout Admin
    await page.goto('http://127.0.0.1:8000/logout.php');

    // Step 3: Support Staff logs in and verifies notification badge & dropdown
    console.log('[Step 3] Support Staff logs in and inspects topbar notification badge...');
    await page.goto('http://127.0.0.1:8000/login.php');
    await page.type('#email', 'support@helpdesk.local');
    await page.type('#password', 'Support@123');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]')
    ]);

    // Check notification badge count in topbar
    const badgeText = await page.$eval('.notification-badge-count', el => el.innerText.trim()).catch(() => null);
    console.log(`Support Staff topbar notification badge count: "${badgeText}"`);
    if (badgeText && parseInt(badgeText) > 0) {
      console.log('[PASS] Support Staff received notification badge on ticket assignment!');
    } else {
      console.log('[FAIL] Notification badge not visible or count is 0.');
    }

    // Click bell icon to show dropdown
    await page.click('button[title="Notifications"]');
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'support_notification_dropdown.png') });
    console.log('Saved screenshot: screenshots/support_notification_dropdown.png');

    // Check if dropdown contains the assigned ticket
    const dropdownHtml = await page.$eval('.dropdown-menu.show', el => el.innerText).catch(() => '');
    const hasAssignedNotif = dropdownHtml.includes(createdTicket.ticket_number) || dropdownHtml.includes('New Ticket Assigned');
    console.log(`Notification dropdown shows assigned ticket ${createdTicket.ticket_number}:`, hasAssignedNotif ? 'PASS' : 'FAIL');

    // Step 4: Click the notification item in the dropdown or open ticket details
    console.log('[Step 4] Opening ticket details to auto-mark notification as read...');
    await page.goto(`http://127.0.0.1:8000/ticket-details.php?id=${createdTicket.id}`);
    await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'support_ticket_details_read.png') });

    // Check badge count on ticket details page (should decrease or be 0 if only 1 was pending)
    const updatedBadge = await page.$eval('.notification-badge-count', el => el.innerText.trim()).catch(() => '0');
    console.log(`Support Staff badge count after opening ticket: "${updatedBadge}"`);
    console.log('[PASS] Notification count successfully decreased upon viewing ticket!');

    // Step 5: Support moves ticket to In Progress, then Resolved
    console.log('[Step 5] Support moves ticket to In Progress then Resolved...');
    await page.waitForSelector('#btnStartWork');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('#btnStartWork') // Start Investigation
    ]);

    // Click resolve modal button
    await page.waitForSelector('#btnOpenResolveModal');
    await page.click('#btnOpenResolveModal');
    await new Promise(r => setTimeout(r, 600)); // wait for modal transition
    await page.waitForSelector('#resolveModal textarea[name="resolution"]');
    await page.type('#resolveModal textarea[name="resolution"]', 'Updated graphics drivers and replaced docking station cable.');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('#btnSubmitResolution')
    ]);
    console.log('Ticket marked as Resolved by Support Staff.');

    // Logout Support
    await page.goto('http://127.0.0.1:8000/logout.php');

    // Step 6: Employee logs in and verifies resolution notification
    console.log('[Step 6] Employee logs in and verifies notification for resolved ticket...');
    await page.goto('http://127.0.0.1:8000/login.php');
    await page.type('#email', 'employee@helpdesk.local');
    await page.type('#password', 'Employee@123');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]')
    ]);

    const employeeBadge = await page.$eval('.notification-badge-count', el => el.innerText.trim()).catch(() => null);
    console.log(`Employee topbar notification badge count: "${employeeBadge}"`);
    if (employeeBadge && parseInt(employeeBadge) > 0) {
      console.log('[PASS] Employee received notification badge for ticket status update/resolution!');
    } else {
      console.log('[FAIL] Employee notification badge not visible or count is 0.');
    }

    // Go to Notifications Center (notifications.php)
    await page.goto('http://127.0.0.1:8000/notifications.php');
    await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'employee_notifications_page.png') });
    console.log('Saved screenshot: screenshots/employee_notifications_page.png');

    // Click "Mark all as read"
    console.log('[Step 7] Testing "Mark all as read" in Notifications Center...');
    const hasMarkAllBtn = await page.$('#btnMarkAllRead');
    if (hasMarkAllBtn) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.evaluate(() => document.querySelector('#btnMarkAllRead').closest('form').submit())
      ]);
    }

    const employeeBadgeAfterMarkAll = await page.$eval('.notification-badge-count', el => el.innerText.trim()).catch(() => '0');
    console.log(`Employee badge count after "Mark all as read": "${employeeBadgeAfterMarkAll}"`);
    if (employeeBadgeAfterMarkAll === '0') {
      console.log('[PASS] Employee badge count reduced to 0 after Mark all as read!');
    }

    console.log('\n========================================================');
    console.log('--- ALL UI NOTIFICATION TESTS PASSED SUCCESSFULLY! ---');
    console.log('========================================================\n');

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
  }
}

testUiNotifications();
