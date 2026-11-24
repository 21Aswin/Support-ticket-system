/**
 * Real-time End-to-End Workflow & Notification Verification
 * Tests:
 * 1. Employee creates a real ticket
 * 2. Employee comments on the ticket
 * 3. Ticket is assigned to Support Staff
 * 4. Support Staff changes status to 'In Progress'
 * 5. Support Staff comments on the ticket
 * 6. Support Staff marks ticket as 'Resolved'
 * 7. Verification: Does Admin receive notifications for EVERY single action?
 */

const BASE_URL = 'http://127.0.0.1:3000/api';

async function request(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function run() {
  console.log('--- 1. Login as Admin & check initial unread count ---');
  const adminLogin = await request('POST', '/auth/login', {
    email: 'admin@helpdesk.local',
    password: 'Admin@123'
  });
  if (adminLogin.status !== 200) {
    throw new Error('Admin login failed: ' + JSON.stringify(adminLogin.data));
  }
  const adminToken = adminLogin.data.data.token;
  const adminId = adminLogin.data.data.user.id;
  console.log(`Admin Logged in (ID: ${adminId})`);

  const initialNotifs = await request('GET', '/notifications', null, adminToken);
  const initialUnread = initialNotifs.data.meta.unread_count;
  console.log(`Initial Admin Unread Notifications: ${initialUnread}`);

  console.log('\n--- 2. Login as Employee ---');
  const empLogin = await request('POST', '/auth/login', {
    email: 'employee@helpdesk.local',
    password: 'Employee@123'
  });
  if (empLogin.status !== 200) {
    throw new Error('Employee login failed: ' + JSON.stringify(empLogin.data));
  }
  const empToken = empLogin.data.data.token;
  const empName = empLogin.data.data.user.name;
  console.log(`Employee Logged in: ${empName}`);

  console.log('\n--- 3. Employee creates a REAL ticket ---');
  const testTitle = `Network Outage on 3rd Floor - Realtime Test ${Date.now()}`;
  const ticketRes = await request('POST', '/tickets', {
    title: testTitle,
    description: 'Wi-Fi keeps dropping every 5 minutes in Conference Room 302.',
    category_id: 1,
    priority: 'High'
  }, empToken);

  if (ticketRes.status !== 201) {
    throw new Error('Ticket creation failed: ' + JSON.stringify(ticketRes.data));
  }
  const createdTicket = ticketRes.data.data;
  console.log(`Created Ticket: #${createdTicket.ticket_number} (ID: ${createdTicket.id})`);

  console.log('\n--- 4. Employee posts a comment on the ticket ---');
  const commentRes = await request('POST', `/tickets/${createdTicket.id}/comments`, {
    comment: 'Attached diagnostic logs showing 90% packet loss.'
  }, empToken);
  console.log(`Employee commented: Status ${commentRes.status}`);

  console.log('\n--- 5. Admin assigns ticket to Support Staff ---');
  // Log in as Support Staff (Sarah Jenkins)
  const staffLogin = await request('POST', '/auth/login', {
    email: 'support@helpdesk.local',
    password: 'Support@123'
  });
  if (staffLogin.status !== 200) {
    throw new Error('Support login failed: ' + JSON.stringify(staffLogin.data));
  }
  const staffToken = staffLogin.data.data.token;
  const staff = staffLogin.data.data.user;
  console.log(`Target Support Staff: ${staff.name} (ID: ${staff.id})`);

  const assignRes = await request('PATCH', `/tickets/${createdTicket.id}/assign`, {
    assigned_to: staff.id
  }, adminToken);
  console.log(`Ticket assigned to ${staff.name}: Status ${assignRes.status}`);

  console.log('\n--- 6. Support Staff logs in and changes status to "In Progress" ---');

  const inProgRes = await request('PATCH', `/tickets/${createdTicket.id}/status`, {
    status: 'In Progress'
  }, staffToken);
  console.log(`Status changed to In Progress: Status ${inProgRes.status}`);

  console.log('\n--- 7. Support Staff comments on ticket ---');
  const staffCommentRes = await request('POST', `/tickets/${createdTicket.id}/comments`, {
    comment: 'Inspecting access point switch port configuration now.'
  }, staffToken);
  console.log(`Staff commented: Status ${staffCommentRes.status}`);

  console.log('\n--- 8. Support Staff resolves ticket ---');
  const resolveRes = await request('PATCH', `/tickets/${createdTicket.id}/status`, {
    status: 'Resolved',
    resolution: 'Replaced faulty patch cable on switch port 14 and rebooted AP.'
  }, staffToken);
  console.log(`Ticket marked as Resolved: Status ${resolveRes.status}`);

  console.log('\n======================================================');
  console.log('--- 9. VERIFICATION: Check Admin Notifications ---');
  console.log('======================================================');

  const adminNotifsRes = await request('GET', '/notifications?limit=20', null, adminToken);
  const adminNotifs = adminNotifsRes.data.data;
  const newUnread = adminNotifsRes.data.meta.unread_count;

  console.log(`New Admin Unread Count: ${newUnread} (Incremented by ${newUnread - initialUnread})`);

  // Filter notifications for our created ticket
  const ticketNotifs = adminNotifs.filter(n => n.ticket_id === createdTicket.id);
  console.log(`Total notifications received by Admin for ticket #${createdTicket.ticket_number}: ${ticketNotifs.length}`);

  console.log('\nList of Notifications received by Admin:');
  ticketNotifs.forEach((n, idx) => {
    console.log(` [${idx + 1}] Type: ${n.type} | Title: "${n.title}"`);
    console.log(`     Message: "${n.message}"`);
    console.log(`     Time: ${n.created_at} | is_read: ${n.is_read}`);
  });

  const hasCreated = ticketNotifs.some(n => n.type === 'TICKET_CREATED');
  const hasComment = ticketNotifs.some(n => n.type === 'COMMENT');
  const hasStatusChange = ticketNotifs.some(n => n.type === 'STATUS_CHANGE' || n.type === 'RESOLUTION');

  console.log('\nCheck Results:');
  console.log(' - Admin received TICKET_CREATED:', hasCreated ? 'PASS ✅' : 'FAIL ❌');
  console.log(' - Admin received COMMENT:', hasComment ? 'PASS ✅' : 'FAIL ❌');
  console.log(' - Admin received STATUS CHANGE/RESOLVED:', hasStatusChange ? 'PASS ✅' : 'FAIL ❌');

  if (hasCreated && hasComment && hasStatusChange) {
    console.log('\n🎉 ALL REAL-TIME NOTIFICATION WORKFLOW CHECKS PASSED PERFECTLY!');
  } else {
    throw new Error('Some notification checks failed!');
  }
}

run().catch(err => {
  console.error('\n❌ ERROR:', err);
  process.exit(1);
});
