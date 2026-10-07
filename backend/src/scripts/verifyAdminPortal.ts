const PORT = Number(process.env.PORT) || 4000;

function assert(condition: any, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function request(path: string, options: { method?: string; token?: string; body?: any } = {}) {
  const url = `http://127.0.0.1:${PORT}${path}`;
  const headers: Record<string, string> = {
    'X-SynergySphere-Client': 'mobile',
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  let data: any;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  // Also capture cookie if any
  const cookieHeader = res.headers.get('set-cookie');

  return { status: res.status, data, contentType, cookieHeader };
}

async function waitForServer(): Promise<void> {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/api/health`);
      if (res.ok) {
        console.log('✓ SynergySphere API server ready on http://127.0.0.1:' + PORT);
        return;
      }
    } catch (e: any) {
      console.log('Poll failed:', e?.message || e);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('Server failed to start within timeout');
}

function extractToken(res: { data: any; cookieHeader: string | null }): string {
  if (res.data?.token) return res.data.token;
  if (res.cookieHeader) {
    const match = res.cookieHeader.match(/synergysphere_token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return '';
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🚀 RUNNING SYNERGYSPHERE ADMIN & TICKETING E2E TESTS');
  console.log('======================================================\n');

  await waitForServer();

  try {
    // -----------------------------------------------------------------
    // TEST 1: Student Login
    // -----------------------------------------------------------------
    console.log('\n[1] Student Authentication:');
    const studentLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'student@synergysphere.com', password: 'student123' },
    });
    assert(studentLogin.status === 200, 'Student logs in successfully (200)');
    const studentToken = extractToken(studentLogin);
    assert(!!studentToken, 'Student receives valid JWT');
    assert(studentLogin.data.user.role === 'STUDENT', 'User role is STUDENT');

    // -----------------------------------------------------------------
    // TEST 2: Submit Support Ticket from Settings
    // -----------------------------------------------------------------
    console.log('\n[2] User Help & Support - Ticket Submission:');
    const newTicketRes = await request('/api/settings/tickets', {
      method: 'POST',
      token: studentToken,
      body: {
        category: 'Bug / Technical Issue',
        title: 'E2E Automated Test Ticket',
        description: 'Verifying automated ticket submission from settings help and support view.',
      },
    });
    assert(newTicketRes.status === 201, `Ticket created with 201 Created (got ${newTicketRes.status}: ${JSON.stringify(newTicketRes.data)})`);
    const createdTicket = newTicketRes.data.ticket || newTicketRes.data;
    assert(/^SS-\d+$/.test(createdTicket.ticketNumber), `Ticket generated sequential ID: ${createdTicket.ticketNumber}`);
    assert(createdTicket.status === 'open', 'Default status is "open"');
    assert(createdTicket.priority === 'medium', 'Default priority is "medium"');

    // -----------------------------------------------------------------
    // TEST 3: User View My Submitted Issues
    // -----------------------------------------------------------------
    console.log('\n[3] User Help & Support - Fetch My Issues:');
    const myTicketsRes = await request('/api/settings/tickets/me', {
      method: 'GET',
      token: studentToken,
    });
    assert(myTicketsRes.status === 200, 'Student can fetch their tickets (200)');
    const studentTickets = Array.isArray(myTicketsRes.data) ? myTicketsRes.data : myTicketsRes.data.tickets;
    assert(Array.isArray(studentTickets), 'Returns tickets array');
    const foundTicket = studentTickets.find((t: any) => t.ticketNumber === createdTicket.ticketNumber);
    assert(!!foundTicket, `Created ticket ${createdTicket.ticketNumber} is in user ticket list`);

    // Fetch individual ticket
    const singleTicketRes = await request(`/api/settings/tickets/${createdTicket.id}`, {
      method: 'GET',
      token: studentToken,
    });
    assert(singleTicketRes.status === 200, 'Student can fetch single ticket details');
    const singleTicket = singleTicketRes.data.ticket || singleTicketRes.data;
    assert(singleTicket.adminNotes === undefined || singleTicket.adminNotes === null,
      'Internal adminNotes are NEVER leaked to normal user');

    // -----------------------------------------------------------------
    // TEST 4: Student RBAC Boundaries (403 Forbidden)
    // -----------------------------------------------------------------
    console.log('\n[4] RBAC Protection - Student Access Forbidden:');
    const studentOverview = await request('/api/admin/overview', { token: studentToken });
    assert(studentOverview.status === 403, 'Student blocked from /api/admin/overview (403)');

    const studentUsers = await request('/api/admin/users', { token: studentToken });
    assert(studentUsers.status === 403, 'Student blocked from /api/admin/users (403)');

    const studentAdminTickets = await request('/api/admin/tickets', { token: studentToken });
    assert(studentAdminTickets.status === 403, 'Student blocked from /api/admin/tickets (403)');

    const studentDb = await request('/api/admin/database/health', { token: studentToken });
    assert(studentDb.status === 403, 'Student blocked from /api/admin/database (403)');

    // -----------------------------------------------------------------
    // TEST 5: Single Unified Admin Authentication & Full Platform Access
    // -----------------------------------------------------------------
    console.log('\n[5] Unified Admin (admin@synergysphere.com) - Full Access:');
    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@synergysphere.com', password: 'admin123456' },
    });
    assert(adminLogin.status === 200, 'Admin logs in successfully (200)');
    const adminToken = extractToken(adminLogin);
    assert(adminLogin.data.user.role === 'ADMIN', 'Admin has role ADMIN');

    // 5a. Overview & Dashboard
    const adminOverview = await request('/api/admin/overview', { token: adminToken });
    assert(adminOverview.status === 200, 'Admin accesses /api/admin/overview');
    assert(typeof adminOverview.data.kpis?.totalUsers === 'number', 'Overview contains real KPI data');
    assert(Array.isArray(adminOverview.data.recentActivity), 'Overview contains recent activity feed');

    // 5b. User Management & Pending Approvals
    const adminUsers = await request('/api/admin/users', { token: adminToken });
    assert(adminUsers.status === 200, 'Admin can view user directory');
    const adminUsersList = Array.isArray(adminUsers.data) ? adminUsers.data : adminUsers.data.users;
    assert(Array.isArray(adminUsersList), 'Admin receives users list');

    const adminPending = await request('/api/admin/users/pending', { token: adminToken });
    assert(adminPending.status === 200, 'Admin can view pending user approvals');

    // 5c. Community Moderation
    const adminPosts = await request('/api/admin/posts', { token: adminToken });
    assert(adminPosts.status === 200, 'Admin can access /api/admin/posts');

    const adminFlagged = await request('/api/admin/community/flagged', { token: adminToken });
    assert(adminFlagged.status === 200, 'Admin can access /api/admin/community/flagged');

    // 5d. Support Ticket Triage
    const updateTicketRes = await request(`/api/admin/tickets/${createdTicket.id}`, {
      method: 'PATCH',
      token: adminToken,
      body: {
        status: 'in_progress',
        priority: 'high',
        adminNotes: 'Assigned to senior engineer for triage.',
      },
    });
    assert(updateTicketRes.status === 200, `Admin updates ticket status, priority, and notes`);
    const updatedTicket = updateTicketRes.data.ticket || updateTicketRes.data;
    assert(updatedTicket.status === 'in_progress', 'Ticket status updated to "in_progress"');
    assert(updatedTicket.priority === 'high', 'Ticket priority updated to "high"');

    // 5e. Role Management (Admin can update roles)
    const adminRoleChange = await request(`/api/admin/users/${createdTicket.userId}/role`, {
      method: 'PATCH',
      token: adminToken,
      body: { role: 'STUDENT' },
    });
    assert(adminRoleChange.status === 200, 'Admin can update user roles');

    // 5f. Database Administration & Diagnostics (Admin has full access)
    const dbHealth = await request('/api/admin/database/health', { token: adminToken });
    assert(dbHealth.status === 200, 'Admin can access database health diagnostics');
    assert(dbHealth.data.status === 'healthy' || dbHealth.data.health?.status === 'healthy', 'Database status is healthy');
    assert(Array.isArray(dbHealth.data.tableStats || dbHealth.data.tables), 'Database table telemetry returned');

    const dbMaintenance = await request('/api/admin/database/maintenance', {
      method: 'POST',
      token: adminToken,
      body: { action: 'clear_cache' },
    });
    assert(dbMaintenance.status === 200, 'Admin can execute database maintenance (clear_cache)');

    // 5g. CSV Reports Export
    const csvReport = await request('/api/admin/reports?format=csv', { token: adminToken });
    assert(csvReport.status === 200, 'Admin can export CSV reports');
    assert(typeof csvReport.data === 'string' && csvReport.data.length > 0, 'CSV report content present');

    // -----------------------------------------------------------------
    // TEST 6: User Feedback Loop
    // -----------------------------------------------------------------
    console.log('\n[6] User Feedback Loop:');
    const studentUpdatedCheck = await request(`/api/settings/tickets/${createdTicket.id}`, {
      method: 'GET',
      token: studentToken,
    });
    assert(studentUpdatedCheck.status === 200, 'Student can view updated ticket');
    const studentUpdatedTicket = studentUpdatedCheck.data.ticket || studentUpdatedCheck.data;
    assert(studentUpdatedTicket.status === 'in_progress', 'Student sees updated status "in_progress"');
    assert(studentUpdatedTicket.priority === 'high', 'Student sees priority "high"');
    assert(!studentUpdatedTicket.adminNotes, 'Student does NOT see internal admin notes');

    console.log('\n======================================================');
    console.log('🎉 ALL UNIFIED ADMIN VERIFICATION CHECKS PASSED!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('Fatal error during E2E verification:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

void runTests();
