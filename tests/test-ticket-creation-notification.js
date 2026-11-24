const http = require('http');

function request(method, path, data, token) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function run() {
  console.log("=== Testing Ticket Creation Notification to Admin ===");

  // 1. Login Admin and get initial unread count
  const adminLogin = await request('POST', '/api/auth/login', {
    email: 'admin@helpdesk.local',
    password: 'Admin@123'
  });
  const adminToken = adminLogin.body.data.token;
  const adminNotifsBefore = await request('GET', '/api/notifications', null, adminToken);
  const beforeCount = adminNotifsBefore.body.meta.unread_count;
  console.log(`Admin unread notifications before: ${beforeCount}`);

  // 2. Login Employee and create ticket
  const empLogin = await request('POST', '/api/auth/login', {
    email: 'employee@helpdesk.local',
    password: 'Employee@123'
  });
  const empToken = empLogin.body.data.token;

  const createRes = await request('POST', '/api/tickets', {
    title: 'Monitor flickering in Conference Room B ' + Date.now(),
    description: 'The primary HDMI display keeps blacking out every 30 seconds.',
    category_id: 1, // Hardware
    priority: 'High'
  }, empToken);

  console.log(`Employee created ticket: ${createRes.body.data.ticket_number} (status: ${createRes.status})`);

  // 3. Check Admin notifications now
  const adminNotifsAfter = await request('GET', '/api/notifications?limit=5', null, adminToken);
  const afterCount = adminNotifsAfter.body.meta.unread_count;
  console.log(`Admin unread notifications after: ${afterCount}`);

  const latestNotif = adminNotifsAfter.body.data[0];
  console.log("Latest Admin Notification:", {
    title: latestNotif.title,
    message: latestNotif.message,
    type: latestNotif.type,
    is_read: latestNotif.is_read
  });

  if (afterCount > beforeCount && latestNotif.title.includes('New Ticket Raised')) {
    console.log("\n✅ SUCCESS: Admin received real-time notification for newly raised ticket!");
  } else {
    console.error("\n❌ FAILED: Admin was not notified.");
    process.exit(1);
  }
}

run().catch(console.error);
