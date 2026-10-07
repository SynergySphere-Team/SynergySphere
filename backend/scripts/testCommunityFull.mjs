const PORT = process.env.PORT || 4000;
const API_URL = process.env.API_URL || `http://localhost:${PORT}/api`;

async function request(path, options = {}) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-SynergySphere-Client': 'mobile',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('   SYNERGYSPHERE COMMUNITY MODULE FULL TEST SUITE   ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message, detail = '') {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message} ${detail ? `(${JSON.stringify(detail)})` : ''}`);
      failed++;
    }
  }

  // --- 1. AUTHENTICATION ---
  console.log('--- 1. AUTHENTICATION ---');
  const login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'student@synergysphere.com', password: 'student123' }),
  });
  assert(login.ok, 'Student login succeeds', login.status);
  const token = login.data.token;
  const authHeaders = { Authorization: `Bearer ${token}` };

  // --- 2. GITHUB DEVICE AUTHORIZATION FLOW ---
  console.log('\n--- 2. GITHUB OAUTH DEVICE FLOW ---');
  const startFlow = await request('/github/device/start', {
    method: 'POST',
    headers: authHeaders,
  });
  assert(startFlow.ok && startFlow.data.userCode, 'Start GitHub device authorization', startFlow.data);
  const authId = startFlow.data.id;
  const userCode = startFlow.data.userCode;
  console.log(`       User Code generated: ${userCode}`);

  // Wait 1.6s for dev mode threshold
  await new Promise((r) => setTimeout(r, 1600));

  const pollFlow = await request(`/github/device/${authId}/poll`, {
    method: 'POST',
    headers: authHeaders,
  });
  assert(pollFlow.ok && pollFlow.data.status === 'connected', 'Poll device authorization reaches connected state', pollFlow.data);
  console.log(`       Connected GitHub user: @${pollFlow.data.username}`);

  // Check connection status endpoint
  const checkConn = await request('/github/connection', { headers: authHeaders });
  assert(checkConn.ok && checkConn.data.connected === true, 'GET /github/connection returns connected: true', checkConn.data);

  // --- 3. MY WORK DASHBOARD ---
  console.log('\n--- 3. GITHUB MY WORK DASHBOARD ---');
  const myWork = await request('/github/my-work', { headers: authHeaders });
  assert(myWork.ok, 'GET /github/my-work returns dashboard payload', myWork.status);
  assert(Array.isArray(myWork.data.issues), 'My Work contains issues array');
  assert(Array.isArray(myWork.data.repositories), 'My Work contains repositories array');
  assert(Array.isArray(myWork.data.organizations), 'My Work contains organizations array');

  // --- 4. COMMUNITY REPOSITORIES & INITIATIVES FEED ---
  console.log('\n--- 4. COMMUNITY REPOSITORIES & INITIATIVES FEED ---');
  const allProjects = await request('/projects', { headers: authHeaders });
  assert(allProjects.ok && Array.isArray(allProjects.data), 'GET /projects returns projects array', allProjects.status);
  console.log(`       Total projects available: ${allProjects.data.length}`);

  // Search filter
  const searchProj = await request('/projects?search=System', { headers: authHeaders });
  assert(searchProj.ok && Array.isArray(searchProj.data), 'GET /projects?search=System filters by text');

  // Category filter
  const catProj = await request('/projects?category=EDTECH', { headers: authHeaders });
  assert(catProj.ok && Array.isArray(catProj.data), 'GET /projects?category=EDTECH filters by category');

  // --- 5. PROJECT CREATION WIZARD ---
  console.log('\n--- 5. REPOSITORY CREATION WIZARD ---');
  const uniqueName = `Project ${Date.now()}`;
  const newRepo = await request('/github/projects', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      category: 'OPEN_SOURCE',
      language: 'TypeScript',
      license: 'MIT',
      visibility: 'public',
      starterTemplate: 'WEB_APP',
      problem: `Students need an automated analytics pipeline for ${uniqueName} in community initiatives.`,
      audience: 'Students, faculty and junior software engineers looking for open source projects.',
      goal: `Deliver a reactive, scalable TypeScript service for ${uniqueName} and live monitoring.`,
    }),
  });
  const createdProjectId = newRepo.data?.project?.id || newRepo.data?.id;
  assert(newRepo.ok && Boolean(createdProjectId), 'POST /github/projects creates GitHub-backed project', newRepo.data);
  if (createdProjectId) {
    console.log(`       Created Project ID: ${createdProjectId}`);
    console.log(`       Repository URL: ${newRepo.data.repositoryUrl}`);
  }

  // --- 6. PROJECT DETAIL & REPOSITORY VIEWER ENDPOINTS ---
  console.log('\n--- 6. REPOSITORY DETAIL & EXPLORATION TABS ---');
  const targetId = createdProjectId || (allProjects.data[0] ? allProjects.data[0].id : null);
  if (targetId) {
    const detail = await request(`/projects/${targetId}`, { headers: authHeaders });
    assert(detail.ok && detail.data.title, `GET /projects/${targetId} retrieves project detail`);

    const activity = await request(`/projects/${targetId}/activity`, { headers: authHeaders });
    assert(activity.ok && Array.isArray(activity.data), 'GET /projects/:id/activity returns activity ticker list');

    const code = await request(`/projects/${targetId}/repository/code`, { headers: authHeaders });
    assert(code.ok, 'GET /projects/:id/repository/code returns file tree');

    const commits = await request(`/projects/${targetId}/repository/commits`, { headers: authHeaders });
    assert(commits.ok, 'GET /projects/:id/repository/commits returns git commit history');

    const issues = await request(`/projects/${targetId}/repository/issues`, { headers: authHeaders });
    assert(issues.ok, 'GET /projects/:id/repository/issues returns repository issues');
  }

  // --- 7. COMMUNITY CHAT ---
  console.log('\n--- 7. COMMUNITY CHAT CHANNELS & POSTS ---');
  const channels = await request('/community-chat/channels', { headers: authHeaders });
  assert(channels.ok && Array.isArray(channels.data) && channels.data.length > 0, 'GET /community-chat/channels returns channel list');

  if (channels.data?.[0]) {
    const channelId = channels.data[0].id;
    const messages = await request(`/community-chat/channels/${channelId}/messages`, { headers: authHeaders });
    assert(messages.ok && Array.isArray(messages.data), `GET /community-chat/channels/${channelId}/messages returns message list`);

    const sendMsg = await request(`/community-chat/channels/${channelId}/messages`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ body: 'Verification of live chat functionality for community module.' }),
    });
    assert(sendMsg.ok && sendMsg.data.id, 'POST /community-chat/channels/:id/messages sends chat message');
  }

  console.log('\n====================================================');
  console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
