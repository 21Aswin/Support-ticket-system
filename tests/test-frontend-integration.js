const http = require('http');

function parseCookie(setCookieHeaders) {
  if (!setCookieHeaders) return '';
  const cookies = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  return cookies.map(c => c.split(';')[0]).join('; ');
}

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: '127.0.0.1',
      port: 8000,
      path,
      method: options.method || 'GET',
      headers: { ...options.headers },
    };

    if (options.body) {
      reqOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data,
          cookie: parseCookie(res.headers['set-cookie']),
        });
      });
    });

    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function extractCsrf(html) {
  const match = html.match(/name="csrf_token"\s+value="([^"]+)"/);
  return match ? match[1] : '';
}

async function runFrontendTests() {
  console.log('--- Starting PHP Frontend End-to-End Workflow Tests ---\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Visit Login Page
  const loginGet = await request('/login.php');
  assert(loginGet.status === 200, 'GET /login.php returns HTTP 200 OK');
  const csrfToken = extractCsrf(loginGet.data);
  const sessionCookie = loginGet.cookie;
  assert(csrfToken.length > 10, 'CSRF token successfully generated and rendered');

  // 2. Submit Invalid Login
  const badLoginPost = await request('/login.php', {
    method: 'POST',
    headers: { 'Cookie': sessionCookie },
    body: `csrf_token=${encodeURIComponent(csrfToken)}&email=admin%40helpdesk.local&password=badpassword`,
  });
  assert(badLoginPost.data.includes('Authentication failed') || badLoginPost.data.includes('Invalid email or password'), 'Invalid login shows user-friendly error message');

  // 3. Admin Login POST
  const adminLoginPost = await request('/login.php', {
    method: 'POST',
    headers: { 'Cookie': sessionCookie },
    body: `csrf_token=${encodeURIComponent(csrfToken)}&email=admin%40helpdesk.local&password=Admin%40123`,
  });
  assert(adminLoginPost.status === 302 && adminLoginPost.headers.location === 'admin-dashboard.php', 'Admin login redirects to admin-dashboard.php (HTTP 302)');

  // 4. Admin accesses admin-dashboard.php
  const adminDash = await request('/admin-dashboard.php', {
    headers: { 'Cookie': sessionCookie },
  });
  assert(adminDash.status === 200 && adminDash.data.includes('Enterprise Support Overview'), 'Admin dashboard loads with full KPI overview');
  assert(adminDash.data.includes('Total Tickets') && adminDash.data.includes('Support Staff Workload'), 'Admin dashboard renders KPI cards & workload section');

  // 5. Admin accesses manage-users.php
  const usersPage = await request('/manage-users.php', {
    headers: { 'Cookie': sessionCookie },
  });
  assert(usersPage.status === 200 && usersPage.data.includes('Directory of Users'), 'Admin manages users page rendered');

  // 6. Admin accesses manage-categories.php
  const catsPage = await request('/manage-categories.php', {
    headers: { 'Cookie': sessionCookie },
  });
  assert(catsPage.status === 200 && catsPage.data.includes('Category Management'), 'Admin category management page rendered');

  // 7. Admin accesses reports.php
  const reportsPage = await request('/reports.php', {
    headers: { 'Cookie': sessionCookie },
  });
  assert(reportsPage.status === 200 && reportsPage.data.includes('Analytics & Reports'), 'System reports & analytics page rendered');

  // 8. Admin accesses settings.php
  const settingsPage = await request('/settings.php', {
    headers: { 'Cookie': sessionCookie },
  });
  assert(settingsPage.status === 200 && settingsPage.data.includes('System Architecture Diagnostics'), 'Settings & Architecture diagnostics page rendered');

  // 9. Employee Login session
  const empInit = await request('/login.php');
  const empCsrf = extractCsrf(empInit.data);
  const empCookie = empInit.cookie;

  const empLoginPost = await request('/login.php', {
    method: 'POST',
    headers: { 'Cookie': empCookie },
    body: `csrf_token=${encodeURIComponent(empCsrf)}&email=employee%40helpdesk.local&password=Employee%40123`,
  });
  assert(empLoginPost.status === 302 && empLoginPost.headers.location === 'employee-dashboard.php', 'Employee login redirects to employee-dashboard.php');

  // 10. Employee accesses employee-dashboard.php
  const empDash = await request('/employee-dashboard.php', {
    headers: { 'Cookie': empCookie },
  });
  assert(empDash.status === 200 && empDash.data.includes('Welcome back, John Doe!'), 'Employee dashboard personalized with name');

  // 11. Employee visits create-ticket.php
  const createGet = await request('/create-ticket.php', {
    headers: { 'Cookie': empCookie },
  });
  assert(createGet.status === 200 && createGet.data.includes('Raise a Support Ticket'), 'Employee create ticket page loads properly');
  const createCsrf = extractCsrf(createGet.data);

  // 12. Employee submits create-ticket form
  const createPost = await request('/create-ticket.php', {
    method: 'POST',
    headers: { 'Cookie': empCookie },
    body: `csrf_token=${encodeURIComponent(createCsrf)}&title=Integration+Test+Laptop+Power+Fault&category_id=1&priority=High&description=Laptop+shuts+down+unexpectedly+when+unplugged+from+charger`,
  });
  assert(createPost.status === 200 && createPost.data.includes('Ticket Created Successfully!'), 'Ticket created via PHP presentation layer');

  // 13. Employee visits ticket-list.php
  const listGet = await request('/ticket-list.php', {
    headers: { 'Cookie': empCookie },
  });
  assert(listGet.status === 200 && listGet.data.includes('Integration Test Laptop Power Fault'), 'Created ticket visible in employee ticket list');

  // 14. Support Staff Login session
  const supInit = await request('/login.php');
  const supCsrf = extractCsrf(supInit.data);
  const supCookie = supInit.cookie;

  const supLoginPost = await request('/login.php', {
    method: 'POST',
    headers: { 'Cookie': supCookie },
    body: `csrf_token=${encodeURIComponent(supCsrf)}&email=support%40helpdesk.local&password=Support%40123`,
  });
  assert(supLoginPost.status === 302 && supLoginPost.headers.location === 'support-dashboard.php', 'Support Staff login redirects to support-dashboard.php');

  // 15. Support Staff accesses support-dashboard.php
  const supDash = await request('/support-dashboard.php', {
    headers: { 'Cookie': supCookie },
  });
  assert(supDash.status === 200 && supDash.data.includes('My Support Work Queue'), 'Support staff work queue loads correctly');

  // 16. Support Staff visits ticket details of an assigned ticket
  const detailGet = await request('/ticket-details.php?id=1', {
    headers: { 'Cookie': supCookie },
  });
  assert(detailGet.status === 200 && detailGet.data.includes('Activity Audit History'), 'Ticket details page renders description, comments, and audit timeline');

  console.log(`\n======================================================`);
  console.log(`--- Frontend Tests: ${passed} PASSED, ${failed} FAILED ---`);
  console.log(`======================================================`);
  if (failed > 0) process.exit(1);
}

runFrontendTests().catch(err => {
  console.error('Frontend test failed:', err);
  process.exit(1);
});
