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
  console.log('--- Testing Live Ticket Assignment at Current Local Time (IST) --- \n');

  // 1. Login Admin via API to get token
  const adminAuth = await apiCall('POST', '/auth/login', { email: 'admin@helpdesk.local', password: 'Admin@123' });
  const adminToken = adminAuth.data.data.token;

  // 2. Login Employee via API
  const empAuth = await apiCall('POST', '/auth/login', { email: 'employee@helpdesk.local', password: 'Employee@123' });
  const empToken = empAuth.data.data.token;

  // 3. Create fresh ticket right now
  const newTicket = await apiCall('POST', '/tickets', {
    title: 'Switch port amber blink test ' + Date.now(),
    category_id: 1,
    priority: 'High',
    description: 'Diagnosing network port amber led in switch room.'
  }, empToken);
  const ticketId = newTicket.data.data.id;
  console.log('Created Ticket ID:', ticketId, 'Number:', newTicket.data.data.ticket_number);

  // 4. Admin assigns ticket to Support Staff 1 (id: 2) right now
  const assignRes = await apiCall('PATCH', `/tickets/${ticketId}/assign`, {
    assigned_to: 2,
    priority: 'High'
  }, adminToken);
  console.log('Assigned result:', assignRes.status, assignRes.data.message);

  // 5. Open browser, login as Support Staff (id: 2), and view ticket & notifications
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });

  // Login as Support Staff
  await page.goto('http://127.0.0.1:8000/login.php');
  await page.type('#email', 'support@helpdesk.local');
  await page.type('#password', 'Support@123');
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }), page.click('button[type="submit"]')]);

  // Go to the ticket details
  await page.goto(`http://127.0.0.1:8000/ticket-details.php?id=${ticketId}`, { waitUntil: 'networkidle2' });

  // Get header and timeline texts
  const pageData = await page.evaluate(() => {
    const createdHeader = document.querySelector('.page-title p')?.textContent.trim();
    const timeline = Array.from(document.querySelectorAll('.timeline-item')).map(item => ({
      author: item.querySelector('.timeline-author')?.textContent.trim(),
      time: item.querySelector('.timeline-meta span:last-child')?.textContent.trim(),
      body: item.querySelector('.timeline-body')?.textContent.trim()
    }));
    return { createdHeader, timeline };
  });

  console.log('Ticket Header Timestamp:', pageData.createdHeader);
  console.log('Activity Timeline:');
  pageData.timeline.forEach((t, i) => console.log(`  [${i + 1}] ${t.time} | ${t.body}`));

  await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'ticket_assigned_ist_time.png') });
  console.log('Saved: screenshots/ticket_assigned_ist_time.png');

  // Check topbar notification time
  const bell = await page.$('button[title="Notifications"]');
  if (bell) {
    await bell.click();
    await new Promise(r => setTimeout(r, 400));
    const notifItem = await page.evaluate(() => {
      const el = document.querySelector('.notif-dropdown-item');
      if (!el) return null;
      return {
        title: el.querySelector('.fw-semibold')?.textContent.trim(),
        time: el.querySelector('span:last-child')?.textContent.trim(),
        message: el.querySelector('.text-truncate')?.textContent.trim()
      };
    });
    console.log('Support Staff Notification Timestamp:', notifItem);
    await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'notif_assigned_ist_time.png') });
    console.log('Saved: screenshots/notif_assigned_ist_time.png');
  }

  await browser.close();
  console.log('\n--- LIVE TEST SUCCESSFUL ---');
})();
