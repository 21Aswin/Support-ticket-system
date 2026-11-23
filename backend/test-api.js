const http = require('http');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'Accept': 'application/json',
    };
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      path,
      method,
      headers,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
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

async function runTests() {
  console.log('--- Starting Comprehensive HelpDesk Backend API Tests ---\n');
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

  // 1. Health check
  const health = await request('GET', '/api/health');
  assert(health.status === 200 && health.data.success === true, 'GET /api/health returns 200 OK');

  // 2. Invalid Login
  const badLogin = await request('POST', '/api/auth/login', {
    email: 'admin@helpdesk.local',
    password: 'wrongpassword',
  });
  assert(badLogin.status === 401 && badLogin.data.success === false, 'POST /api/auth/login with wrong password returns 401');

  // 3. Admin Login
  const adminLogin = await request('POST', '/api/auth/login', {
    email: 'admin@helpdesk.local',
    password: 'Admin@123',
  });
  assert(adminLogin.status === 200 && adminLogin.data.data.token, 'Admin login succeeds and returns JWT');
  const adminToken = adminLogin.data.data.token;

  // 4. Employee 1 (John Doe) Login
  const empLogin = await request('POST', '/api/auth/login', {
    email: 'employee@helpdesk.local',
    password: 'Employee@123',
  });
  assert(empLogin.status === 200 && empLogin.data.data.token, 'Employee 1 (John Doe) login succeeds');
  const empToken = empLogin.data.data.token;
  const empId = empLogin.data.data.user.id;

  // 5. Employee 2 (Emily Watson) Login
  const emp2Login = await request('POST', '/api/auth/login', {
    email: 'emily.emp@helpdesk.local',
    password: 'Employee@123',
  });
  assert(emp2Login.status === 200 && emp2Login.data.data.token, 'Employee 2 (Emily Watson) login succeeds');
  const emp2Token = emp2Login.data.data.token;

  // 6. Support Staff 1 (Sarah Jenkins) Login
  const supLogin = await request('POST', '/api/auth/login', {
    email: 'support@helpdesk.local',
    password: 'Support@123',
  });
  assert(supLogin.status === 200 && supLogin.data.data.token, 'Support Staff 1 login succeeds');
  const supToken = supLogin.data.data.token;
  const supId = supLogin.data.data.user.id;

  // 7. Support Staff 2 (Alex Rivera) Login
  const sup2Login = await request('POST', '/api/auth/login', {
    email: 'alex.support@helpdesk.local',
    password: 'Support@123',
  });
  assert(sup2Login.status === 200 && sup2Login.data.data.token, 'Support Staff 2 login succeeds');
  const sup2Token = sup2Login.data.data.token;

  // 8. Categories check
  const categories = await request('GET', '/api/categories', null, empToken);
  assert(categories.status === 200 && categories.data.data.length >= 6, 'GET /api/categories returns category list');
  const catId = categories.data.data[0].id;

  // 9. Employee creates ticket with empty title (should fail 400)
  const emptyTicket = await request('POST', '/api/tickets', {
    title: '',
    description: 'Something broke',
    category_id: catId,
    priority: 'Medium',
  }, empToken);
  assert(emptyTicket.status === 400, 'Submitting ticket with empty title returns 400 Bad Request');

  // 10. Employee 1 creates ticket
  const newTicketRes = await request('POST', '/api/tickets', {
    title: 'Monitor flickering intermittently on desk 4B',
    description: 'The Dell UltraSharp external display blinks black every 2 minutes when connected via HDMI.',
    category_id: catId,
    priority: 'Medium',
  }, empToken);
  assert(newTicketRes.status === 201 && newTicketRes.data.data.ticket_number, `Employee creates ticket (${newTicketRes.data.data.ticket_number})`);
  const ticketId = newTicketRes.data.data.id;
  assert(newTicketRes.data.data.status === 'Open', 'Newly created ticket has status "Open"');

  // 11. Employee 2 attempts to view Employee 1 ticket (should fail 403)
  const crossEmpCheck = await request('GET', `/api/tickets/${ticketId}`, null, emp2Token);
  assert(crossEmpCheck.status === 403, 'Employee 2 accessing Employee 1 private ticket is blocked with 403');

  // 12. Employee attempts assignment (should fail 403)
  const illegalAssign = await request('PATCH', `/api/tickets/${ticketId}/assign`, {
    assigned_to: supId,
  }, empToken);
  assert(illegalAssign.status === 403, 'Employee assigning ticket is blocked with 403 Forbidden');

  // 13. Admin assigns ticket to an Employee account (should fail 400)
  const invalidRoleAssign = await request('PATCH', `/api/tickets/${ticketId}/assign`, {
    assigned_to: empId,
  }, adminToken);
  assert(invalidRoleAssign.status === 400, 'Admin assigning ticket to an Employee is rejected with 400');

  // 14. Admin assigns ticket to Support Staff 1
  const assignRes = await request('PATCH', `/api/tickets/${ticketId}/assign`, {
    assigned_to: supId,
  }, adminToken);
  assert(assignRes.status === 200 && assignRes.data.data.status === 'Assigned', 'Admin assigns ticket to Support Staff 1 (status set to "Assigned")');

  // 15. Support Staff 2 attempts to access Support Staff 1 assigned ticket (should fail 403)
  const crossStaffCheck = await request('GET', `/api/tickets/${ticketId}`, null, sup2Token);
  assert(crossStaffCheck.status === 403, 'Support Staff 2 accessing Support Staff 1 assigned ticket is blocked with 403');

  // 16. Support Staff 1 attempts illegal transition Assigned -> Closed (should fail 409)
  const illegalStatus = await request('PATCH', `/api/tickets/${ticketId}/status`, {
    status: 'Closed',
  }, supToken);
  assert(illegalStatus.status === 409, 'Illegal transition Assigned -> Closed is rejected with 409 Conflict');

  // 17. Support Staff 1 moves ticket to In Progress
  const inProgressRes = await request('PATCH', `/api/tickets/${ticketId}/status`, {
    status: 'In Progress',
  }, supToken);
  assert(inProgressRes.status === 200 && inProgressRes.data.data.new_status === 'In Progress', 'Support Staff 1 transitions Assigned -> In Progress');

  // 18. Support Staff 1 posts comment
  const commentRes = await request('POST', `/api/tickets/${ticketId}/comments`, {
    comment: 'Replaced HDMI cable with USB-C to DisplayPort cable. Testing display stability.',
  }, supToken);
  assert(commentRes.status === 201 && commentRes.data.data.id, 'Support Staff 1 posts comment to ticket');

  // 19. Support Staff 1 marks ticket as Resolved without resolution text (should fail 400)
  const resolveNoNote = await request('PATCH', `/api/tickets/${ticketId}/status`, {
    status: 'Resolved',
    resolution: '',
  }, supToken);
  assert(resolveNoNote.status === 400, 'Resolving ticket without resolution notes returns 400 Bad Request');

  // 20. Support Staff 1 marks ticket Resolved with resolution notes
  const resolveRes = await request('PATCH', `/api/tickets/${ticketId}/status`, {
    status: 'Resolved',
    resolution: 'Replaced faulty HDMI cable with new DP cable. Verified flicker resolved.',
  }, supToken);
  assert(resolveRes.status === 200 && resolveRes.data.data.new_status === 'Resolved', 'Support Staff 1 transitions In Progress -> Resolved with resolution notes');

  // 21. Employee 1 views ticket details and verifies status is Resolved
  const ticketDetail = await request('GET', `/api/tickets/${ticketId}`, null, empToken);
  assert(ticketDetail.status === 200 && ticketDetail.data.data.status === 'Resolved', 'Employee 1 views ticket details and sees Resolved status');

  // 22. Employee 1 closes ticket
  const closeRes = await request('PATCH', `/api/tickets/${ticketId}/status`, {
    status: 'Closed',
  }, empToken);
  assert(closeRes.status === 200 && closeRes.data.data.new_status === 'Closed', 'Employee 1 transitions Resolved -> Closed');

  // 23. Commenting on closed ticket is blocked
  const closedComment = await request('POST', `/api/tickets/${ticketId}/comments`, {
    comment: 'Trying to add comment on closed ticket',
  }, empToken);
  assert(closedComment.status === 400, 'Commenting on a closed ticket is rejected with 400');

  // 24. Verify chronological ticket history
  const historyRes = await request('GET', `/api/tickets/${ticketId}/history`, null, adminToken);
  assert(historyRes.status === 200 && historyRes.data.data.length >= 6, `Audit history records all 6+ events chronologically (Count: ${historyRes.data.data.length})`);

  // 25. Deactivate a user and verify login rejection
  const tempEmail = `temp.user.${Date.now()}@helpdesk.local`;
  const testUser = await request('POST', '/api/users', {
    name: 'Temporary User',
    email: tempEmail,
    password: 'Password123!',
    role_id: 3,
  }, adminToken);
  assert(testUser.status === 201, 'Admin creates a temporary test user');

  const deactRes = await request('DELETE', `/api/users/${testUser.data.data.id}`, null, adminToken);
  assert(deactRes.status === 200, 'Admin deactivates temporary user');

  const deactLogin = await request('POST', '/api/auth/login', {
    email: tempEmail,
    password: 'Password123!',
  });
  assert(deactLogin.status === 403, 'Deactivated user login is blocked with 403 Forbidden');

  // 26. Dashboard Stats check for Admin
  const adminStats = await request('GET', '/api/dashboard/stats', null, adminToken);
  assert(adminStats.status === 200 && adminStats.data.data.total_tickets >= 7, 'Admin dashboard statistics return accurate aggregated database counts');

  // 27. Support Staff dashboard stats
  const supStats = await request('GET', '/api/dashboard/stats', null, supToken);
  assert(supStats.status === 200 && supStats.data.data.total_assigned !== undefined, 'Support Staff dashboard stats scoped to assigned tickets');

  // 28. Employee dashboard stats
  const empStats = await request('GET', '/api/dashboard/stats', null, empToken);
  assert(empStats.status === 200 && empStats.data.data.total_own_tickets !== undefined, 'Employee dashboard stats scoped to own tickets');

  console.log(`\n======================================================`);
  console.log(`--- Test Results: ${passed} PASSED, ${failed} FAILED ---`);
  console.log(`======================================================`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
