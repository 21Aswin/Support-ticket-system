const http = require('http');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = { 'Accept': 'application/json' };
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      path,
      method,
      headers,
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runNotificationTests() {
  console.log('--- Testing Real-Time Ticket Notifications & Unread Counts ---\n');
  let passed = 0;
  let failed = 0;

  function assert(cond, msg) {
    if (cond) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      failed++;
    }
  }

  // 1. Admin Login
  const adminLogin = await request('POST', '/api/auth/login', {
    email: 'admin@helpdesk.local', password: 'Admin@123'
  });
  const adminToken = adminLogin.data.data.token;

  // 2. Support Staff Login (Sarah Jenkins, id 2)
  const supLogin = await request('POST', '/api/auth/login', {
    email: 'support@helpdesk.local', password: 'Support@123'
  });
  const supToken = supLogin.data.data.token;
  const supId = supLogin.data.data.user.id;

  // 3. Employee Login (John Doe, id 4)
  const empLogin = await request('POST', '/api/auth/login', {
    email: 'employee@helpdesk.local', password: 'Employee@123'
  });
  const empToken = empLogin.data.data.token;

  // 4. Initial unread count for Support Staff
  const supInitial = await request('GET', '/api/notifications/unread-count', null, supToken);
  assert(supInitial.status === 200, 'Support Staff can fetch unread count');
  const supInitialCount = supInitial.data.data.unread_count;
  console.log(`Initial Support Staff unread notifications: ${supInitialCount}`);

  // 5. Employee creates a new ticket
  const newTicket = await request('POST', '/api/tickets', {
    title: 'VPN disconnects every 15 minutes',
    description: 'VPN tunnel drops abruptly during database queries.',
    category_id: 3,
    priority: 'High'
  }, empToken);
  assert(newTicket.status === 201, `Employee created ticket ${newTicket.data.data.ticket_number}`);
  const ticketId = newTicket.data.data.id;

  // 6. Admin assigns ticket to Support Staff
  const assignRes = await request('PATCH', `/api/tickets/${ticketId}/assign`, {
    assigned_to: supId
  }, adminToken);
  assert(assignRes.status === 200, 'Admin assigned ticket to Support Staff');

  // 7. Verify Support Staff received an assignment notification and unread count increased!
  const supAfterAssign = await request('GET', '/api/notifications/unread-count', null, supToken);
  assert(supAfterAssign.data.data.unread_count === supInitialCount + 1, 
    `Support Staff unread count increased by 1 (New Count: ${supAfterAssign.data.data.unread_count})`);

  // 8. Fetch Support Staff notifications and find the assignment notification
  const supNotifs = await request('GET', '/api/notifications?unread_only=true', null, supToken);
  assert(supNotifs.status === 200 && supNotifs.data.data.length > 0, 'Support Staff notifications list returned');
  const latestNotif = supNotifs.data.data[0];
  assert(latestNotif.type === 'ASSIGNMENT' && latestNotif.ticket_id == ticketId, 
    `Notification correctly identifies ticket assignment (${latestNotif.title})`);

  // 9. Support Staff marks notification as read
  const markReadRes = await request('PATCH', `/api/notifications/${latestNotif.id}/read`, null, supToken);
  assert(markReadRes.status === 200 && markReadRes.data.data.unread_count === supInitialCount, 
    `Marking notification as read decreased unread count back to ${supInitialCount}`);

  // 10. Initial unread count for Employee
  const empInitial = await request('GET', '/api/notifications/unread-count', null, empToken);
  const empInitialCount = empInitial.data.data.unread_count;

  // 11. Support Staff starts work and marks ticket Resolved
  await request('PATCH', `/api/tickets/${ticketId}/status`, { status: 'In Progress' }, supToken);
  const resolveRes = await request('PATCH', `/api/tickets/${ticketId}/status`, {
    status: 'Resolved',
    resolution: 'Adjusted TCP keepalive timeout to 300 seconds on VPN gateway.'
  }, supToken);
  assert(resolveRes.status === 200, 'Support Staff resolved ticket');

  // 12. Verify Employee received a resolution notification and unread count increased!
  const empAfterResolve = await request('GET', '/api/notifications/unread-count', null, empToken);
  assert(empAfterResolve.data.data.unread_count > empInitialCount, 
    `Employee unread count increased (Before: ${empInitialCount}, After: ${empAfterResolve.data.data.unread_count})`);

  // 13. Employee marks all notifications as read
  const readAllRes = await request('PATCH', '/api/notifications/read-all', null, empToken);
  assert(readAllRes.status === 200 && readAllRes.data.data.unread_count === 0, 
    'Employee "mark all as read" resets unread count to 0');

  console.log(`\n======================================================`);
  console.log(`--- Notification Tests: ${passed} PASSED, ${failed} FAILED ---`);
  console.log(`======================================================`);
  if (failed > 0) process.exit(1);
}

runNotificationTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
