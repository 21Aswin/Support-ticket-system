const puppeteer = require('../backend/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');

async function run() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  console.log('Launching Headless Chrome for screenshot capture...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();

  // Helper to set viewport and save screenshot
  async function snap(url, filename, width = 1440, height = 900) {
    await page.setViewport({ width, height });
    await page.goto(url, { waitUntil: 'networkidle2' });
    const fullPath = path.join(SCREENSHOT_DIR, filename);
    await page.screenshot({ path: fullPath, fullPage: true });
    console.log(`[Screenshot Captured] ${filename} (${width}x${height})`);
  }

  try {
    // 1. Login Page
    await snap('http://127.0.0.1:8000/login.php', '01_login_page.png');

    // 2. Admin Login
    await page.goto('http://127.0.0.1:8000/login.php');
    await page.type('#email', 'admin@helpdesk.local');
    await page.type('#password', 'Admin@123');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]')
    ]);

    // Admin Dashboard (Desktop)
    await snap('http://127.0.0.1:8000/admin-dashboard.php', '02_admin_dashboard_desktop.png', 1440, 900);

    // Admin Dashboard (Mobile 375px)
    await snap('http://127.0.0.1:8000/admin-dashboard.php', '03_admin_dashboard_mobile.png', 375, 812);

    // Admin Tickets List
    await snap('http://127.0.0.1:8000/ticket-list.php', '04_ticket_list.png', 1440, 900);

    // Ticket Details Page
    await snap('http://127.0.0.1:8000/ticket-details.php?id=1', '05_ticket_details.png', 1440, 900);

    // Manage Users Page
    await snap('http://127.0.0.1:8000/manage-users.php', '06_manage_users.png', 1440, 900);

    // Manage Categories Page
    await snap('http://127.0.0.1:8000/manage-categories.php', '07_manage_categories.png', 1440, 900);

    // Reports Page
    await snap('http://127.0.0.1:8000/reports.php', '08_reports.png', 1440, 900);

    // 3. Logout
    await page.goto('http://127.0.0.1:8000/logout.php', { waitUntil: 'networkidle2' });

    // 4. Support Staff Login
    await page.goto('http://127.0.0.1:8000/login.php');
    await page.type('#email', 'support@helpdesk.local');
    await page.type('#password', 'Support@123');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]')
    ]);
    await snap('http://127.0.0.1:8000/support-dashboard.php', '09_support_dashboard.png', 1440, 900);

    // 5. Logout
    await page.goto('http://127.0.0.1:8000/logout.php', { waitUntil: 'networkidle2' });

    // 6. Employee Login
    await page.goto('http://127.0.0.1:8000/login.php');
    await page.type('#email', 'employee@helpdesk.local');
    await page.type('#password', 'Employee@123');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]')
    ]);
    await snap('http://127.0.0.1:8000/employee-dashboard.php', '10_employee_dashboard.png', 1440, 900);
    await snap('http://127.0.0.1:8000/create-ticket.php', '11_create_ticket.png', 1440, 900);

    console.log('\nAll 11 screenshots successfully captured and saved in screenshots/ !');
  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    await browser.close();
  }
}

run();
