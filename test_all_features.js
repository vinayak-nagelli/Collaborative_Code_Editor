/**
 * CollabIDE — Comprehensive Feature Test Script
 * Tests ALL features with 4 employees, stores results in MongoDB
 * 
 * Team: Vinayak (Owner), Aaqil, Aniket, Aslam
 * Run: node test_all_features.js
 */

const BASE = "http://localhost:8000/api";

// ─── Helpers ──────────────────────────────────────────────
async function req(method, path, body, cookie) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (cookie) opts.headers["Cookie"] = cookie;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const setCookie = res.headers.get("set-cookie");
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, cookie: setCookie || cookie };
}

function extractToken(setCookieHeader) {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(/ce_token=([^;]+)/);
  return match ? `ce_token=${match[1]}` : null;
}

const results = [];
function log(test, pass, detail) {
  const icon = pass ? "✅" : "❌";
  console.log(`  ${icon} ${test} — ${detail}`);
  results.push({ test, pass: Boolean(pass), detail, timestamp: new Date().toISOString() });
}

// ─── MAIN TEST FLOW ──────────────────────────────────────
async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   CollabIDE — Comprehensive Feature Test Suite          ║");
  console.log("║   4 Employees | All SDLC Modules | MongoDB Storage     ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const users = [
    { name: "Vinayak", email: "vinayak@test.com", password: "Pass@123" },
    { name: "Aaqil",   email: "aaqil@test.com",   password: "Pass@123" },
    { name: "Aniket",  email: "aniket@test.com",   password: "Pass@123" },
    { name: "Aslam",   email: "aslam@test.com",    password: "Pass@123" },
  ];

  const tokens = {};
  const userIds = {};

  // ════════════════════════════════════════════════════════
  // TEST 1: Server Health Check
  // ════════════════════════════════════════════════════════
  console.log("── 1. Server Health Check ──");
  try {
    const { status, data } = await req("GET", "/health");
    log("Server Health", status === 200 && data.success, `Status: ${data.status}, Time: ${data.time}`);
  } catch (e) {
    log("Server Health", false, `Server unreachable: ${e.message}`);
    console.log("\n⚠️  Server is not running! Start it with: cd server && node index.js\n");
    return;
  }

  // ════════════════════════════════════════════════════════
  // TEST 2: Register / Login 4 Employees
  // ════════════════════════════════════════════════════════
  console.log("\n── 2. User Registration & Login ──");
  for (const u of users) {
    let res = await req("POST", "/auth/register", { name: u.name, email: u.email, password: u.password });
    
    if (res.status === 409) {
      res = await req("POST", "/auth/login", { email: u.email, password: u.password });
    }

    const tok = extractToken(res.cookie);
    if (tok && res.data.success) {
      tokens[u.name] = tok;
      userIds[u.name] = res.data.user._id || res.data.user.id;
      log(`Register/Login ${u.name}`, true, `User ID: ${userIds[u.name]}, JWT cookie set`);
    } else {
      log(`Register/Login ${u.name}`, false, `Status: ${res.status}, Error: ${JSON.stringify(res.data)}`);
    }
  }

  // ════════════════════════════════════════════════════════
  // TEST 3: Auth — /me endpoint for each user
  // ════════════════════════════════════════════════════════
  console.log("\n── 3. Auth Verification — GET /me ──");
  for (const name of Object.keys(tokens)) {
    const { status, data } = await req("GET", "/auth/me", null, tokens[name]);
    log(`Auth /me (${name})`, status === 200 && data.user?.name === name, 
      `Name: ${data.user?.name}, Email: ${data.user?.email}`);
  }

  // ════════════════════════════════════════════════════════
  // TEST 4: Create Project (Vinayak = Owner)
  // ════════════════════════════════════════════════════════
  console.log("\n── 4. Project Creation ──");
  let projectId = null;
  let inviteCode = null;
  {
    const { status, data } = await req("POST", "/projects", { name: "CollabIDE Sprint 1", description: "Full team sprint testing" }, tokens.Vinayak);
    if (status === 201 && data.project) {
      projectId = data.project._id;
      inviteCode = data.project.inviteCode;
      log("Create Project", true, `Project ID: ${projectId}, Invite Code: ${inviteCode}`);
    } else {
      log("Create Project", false, JSON.stringify(data));
      return;
    }
  }

  // ════════════════════════════════════════════════════════
  // TEST 5: Invite & Join — Other 3 members join
  // ════════════════════════════════════════════════════════
  console.log("\n── 5. Team Invite & Join ──");
  for (const name of ["Aaqil", "Aniket", "Aslam"]) {
    const preview = await req("GET", `/projects/join/${inviteCode}`, null, tokens[name]);
    const join = await req("POST", `/projects/join/${inviteCode}`, {}, tokens[name]);
    log(`${name} joins project`, 
      join.status === 200 && join.data.success, 
      `Role: ${join.data.role || "editor"}, Preview OK: ${preview.status === 200}`);
  }

  // ════════════════════════════════════════════════════════
  // TEST 6: Verify Team
  // ════════════════════════════════════════════════════════
  console.log("\n── 6. Team Verification ──");
  {
    const { data } = await req("GET", `/projects/${projectId}`, null, tokens.Vinayak);
    const memberCount = (data.project?.members?.length || 0) + (data.project?.owner ? 1 : 0);
    log("Team Member Count", memberCount === 4, `Total Members: ${memberCount}/4 (1 Owner + 3 Collaborators)`);
    if (data.project?.members) {
      console.log(`     → ${data.project.owner?.name || "Vinayak"} (owner)`);
      data.project.members.forEach(m => {
        console.log(`     → ${m.user?.name || m.user} (${m.role})`);
      });
    }
  }

  // ════════════════════════════════════════════════════════
  // TEST 7: Create Files (VFS)
  // ════════════════════════════════════════════════════════
  console.log("\n── 7. Virtual File System (VFS) ──");
  const fileIds = {};
  const filesToCreate = [
    { name: "auth.js", type: "file", content: "// JWT Authentication Module\nconst jwt = require('jsonwebtoken');\nmodule.exports = { sign, verify };" },
    { name: "server.js", type: "file", content: "// Express Server Entry Point\nconst express = require('express');\nconst app = express();\napp.listen(3000);" },
    { name: "utils", type: "folder" },
    { name: "test.js", type: "file", content: "// Test Suite\ndescribe('Auth', () => { it('should login', () => {}); });" },
  ];

  for (const f of filesToCreate) {
    const { status, data } = await req("POST", `/projects/${projectId}/files`, f, tokens.Vinayak);
    if (data.file) fileIds[f.name] = data.file._id;
    log(`Create ${f.type}: ${f.name}`, status === 201 && data.file, `ID: ${data.file?._id || "N/A"}`);
  }

  // ════════════════════════════════════════════════════════
  // TEST 8: Requirements Management
  // ════════════════════════════════════════════════════════
  console.log("\n── 8. Requirements & Acceptance Criteria ──");
  let reqId = null;
  {
    const reqBody = {
      title: "User Authentication with JWT",
      description: "As a user, I want to authenticate using JWT tokens so that my sessions are secure and stateless.",
      priority: "urgent",
      type: "feature",
      status: "active",
      acceptanceCriteria: [
        { text: "User can register with name, email, and password" },
        { text: "JWT token is issued on successful login" },
        { text: "Token refresh mechanism works within 7-day expiry" },
        { text: "Protected routes reject unauthenticated requests" },
      ],
    };
    const { status, data } = await req("POST", `/projects/${projectId}/requirements`, reqBody, tokens.Vinayak);
    if (data.requirement) reqId = data.requirement._id;
    log("Create Requirement", status === 201 && Boolean(data.requirement), 
      `ID: ${reqId}, ACs: ${data.requirement?.acceptanceCriteria?.length || 0}`);
  }

  let reqId2 = null;
  {
    const reqBody2 = {
      title: "Real-Time Collaborative Code Editing",
      description: "Multiple users should be able to edit the same file simultaneously with live cursor sync.",
      priority: "high",
      type: "feature",
      status: "active",
      acceptanceCriteria: [
        { text: "Two users can type in the same file simultaneously" },
        { text: "Cursor positions are visible to all participants" },
        { text: "No data loss during concurrent edits" },
      ],
    };
    const res2 = await req("POST", `/projects/${projectId}/requirements`, reqBody2, tokens.Aaqil);
    if (res2.data.requirement) reqId2 = res2.data.requirement._id;
    log("Create Requirement (Aaqil)", res2.status === 201 && Boolean(res2.data.requirement), `ID: ${reqId2}`);
  }

  {
    const { data } = await req("GET", `/projects/${projectId}/requirements`, null, tokens.Aniket);
    log("List Requirements", data.requirements?.length >= 2, `Count: ${data.requirements?.length}`);
  }

  if (reqId) {
    const { data: reqData } = await req("GET", `/projects/${projectId}/requirements`, null, tokens.Vinayak);
    const req1 = reqData.requirements?.find(r => r._id === reqId);
    if (req1?.acceptanceCriteria?.[0]) {
      const critId = req1.acceptanceCriteria[0].id;
      const toggle = await req("PATCH", `/projects/${projectId}/requirements/${reqId}/criteria/${critId}/toggle`, {}, tokens.Vinayak);
      log("Toggle Acceptance Criteria", toggle.status === 200, `First AC marked completed`);
    }
  }

  // ════════════════════════════════════════════════════════
  // TEST 9: Task Management & Code Traceability
  // ════════════════════════════════════════════════════════
  console.log("\n── 9. Task Management & Code File Linking ──");
  let taskId1 = null, taskId2 = null, taskId3 = null;
  {
    const res1 = await req("POST", `/projects/${projectId}/tasks`, {
      title: "Implement JWT login endpoint",
      description: "Create POST /api/auth/login with bcrypt password verification",
      status: "in_progress",
      priority: "urgent",
      assignee: userIds.Vinayak,
      requirementId: reqId,
      linkedFiles: [{ fileId: fileIds["auth.js"], filePath: "auth.js" }],
    }, tokens.Vinayak);
    if (res1.data.task) taskId1 = res1.data.task._id;
    log("Create Task #1 (Vinayak)", res1.status === 201 && Boolean(res1.data.task), `ID: ${taskId1}, Linked: auth.js`);
  }
  {
    const res2 = await req("POST", `/projects/${projectId}/tasks`, {
      title: "Build Express server bootstrap",
      description: "Set up Express app with CORS, helmet, rate limiting",
      status: "todo",
      priority: "high",
      assignee: userIds.Aaqil,
      linkedFiles: [{ fileId: fileIds["server.js"], filePath: "server.js" }],
    }, tokens.Aaqil);
    if (res2.data.task) taskId2 = res2.data.task._id;
    log("Create Task #2 (Aaqil)", res2.status === 201 && Boolean(res2.data.task), `ID: ${taskId2}, Linked: server.js`);
  }
  {
    const res3 = await req("POST", `/projects/${projectId}/tasks`, {
      title: "Write test suite for authentication",
      description: "Create unit tests for register, login, and token verification",
      status: "todo",
      priority: "medium",
      assignee: userIds.Aniket,
      linkedFiles: [
        { fileId: fileIds["test.js"], filePath: "test.js" },
        { fileId: fileIds["auth.js"], filePath: "auth.js" }
      ],
    }, tokens.Aniket);
    if (res3.data.task) taskId3 = res3.data.task._id;
    log("Create Task #3 (Aniket)", res3.status === 201 && Boolean(res3.data.task), `ID: ${taskId3}, Linked: test.js, auth.js`);
  }

  if (taskId1) {
    const update = await req("PUT", `/projects/${projectId}/tasks/${taskId1}`, 
      { status: "done" }, tokens.Vinayak);
    log("Task #1 → done", update.status === 200, `Vinayak completed JWT login task`);
  }
  if (taskId2) {
    const update = await req("PUT", `/projects/${projectId}/tasks/${taskId2}`, 
      { status: "in_progress" }, tokens.Aaqil);
    log("Task #2 → in_progress", update.status === 200, `Aaqil started server bootstrap`);
  }

  // ════════════════════════════════════════════════════════
  // TEST 10: QA Test Suite & Execution
  // ════════════════════════════════════════════════════════
  console.log("\n── 10. QA Test Suite & Execution ──");
  let testId1 = null, testId2 = null;
  {
    const res1 = await req("POST", `/projects/${projectId}/qa/tests`, {
      title: "Verify JWT token generation on login",
      description: "Ensure POST /auth/login returns a valid JWT in cookie",
      preconditions: "User 'vinayak@test.com' exists in database",
      steps: [
        { action: "Send POST /auth/login with valid credentials", expectedResult: "200 OK" },
        { action: "Check response for set-cookie header", expectedResult: "ce_token cookie present" },
        { action: "Decode JWT payload", expectedResult: "Contains user sub claim" },
      ],
      priority: "critical",
    }, tokens.Aniket);
    if (res1.data.testCase) testId1 = res1.data.testCase._id;
    log("Create Test Case #1", res1.status === 201 && Boolean(res1.data.testCase), `ID: ${testId1}`);
  }
  {
    const res2 = await req("POST", `/projects/${projectId}/qa/tests`, {
      title: "Verify unauthorized access is blocked",
      description: "Protected routes should return 401 without valid token",
      steps: [
        { action: "Send GET /auth/me without cookie", expectedResult: "401 Unauthorized" },
        { action: "Send GET /projects without cookie", expectedResult: "401 Unauthorized" },
      ],
      priority: "high",
    }, tokens.Aslam);
    if (res2.data.testCase) testId2 = res2.data.testCase._id;
    log("Create Test Case #2 (Aslam)", res2.status === 201 && Boolean(res2.data.testCase), `ID: ${testId2}`);
  }

  if (testId1) {
    const exec = await req("PATCH", `/projects/${projectId}/qa/tests/${testId1}/run`, {
      status: "passed",
      notes: "Token validated successfully in automated run"
    }, tokens.Aniket);
    log("Execute Test #1 → PASSED", exec.status === 200, `Aniket executed and passed`);
  }
  if (testId2) {
    const exec = await req("PATCH", `/projects/${projectId}/qa/tests/${testId2}/run`, {
      status: "failed",
      notes: "Returns 403 instead of 401 on missing token"
    }, tokens.Aslam);
    log("Execute Test #2 → FAILED", exec.status === 200, `Aslam found failure`);
  }

  // ════════════════════════════════════════════════════════
  // TEST 11: Bug Lifecycle
  // ════════════════════════════════════════════════════════
  console.log("\n── 11. Bug Filing & Lifecycle ──");
  let bugId = null;
  {
    const res = await req("POST", `/projects/${projectId}/qa/bugs`, {
      title: "Protected routes return 403 instead of 401",
      description: "When accessing /auth/me without token, server returns 403 instead of 401",
      severity: "high",
      status: "open",
      testCaseId: testId2,
      affectedFiles: [
        { fileId: fileIds["auth.js"], filePath: "auth.js" },
        { fileId: fileIds["server.js"], filePath: "server.js" }
      ],
      assignedTo: userIds.Vinayak,
    }, tokens.Aslam);
    if (res.data.bug) bugId = res.data.bug._id;
    log("File Bug from Failed Test", res.status === 201 && Boolean(res.data.bug), `Bug ID: ${bugId}, Severity: high`);
  }

  if (bugId) {
    const fix = await req("PUT", `/projects/${projectId}/qa/bugs/${bugId}`, {
      status: "in_progress",
      assignedTo: userIds.Vinayak,
    }, tokens.Vinayak);
    log("Bug → in_progress (Vinayak)", fix.status === 200, `Vinayak assigned to fix`);

    const resolve = await req("PUT", `/projects/${projectId}/qa/bugs/${bugId}`, {
      status: "resolved",
    }, tokens.Vinayak);
    log("Bug → resolved", resolve.status === 200, `Fix: auth middleware corrected`);
  }

  // ════════════════════════════════════════════════════════
  // TEST 12: Project Health Dashboard
  // ════════════════════════════════════════════════════════
  console.log("\n── 12. Project Health Dashboard ──");
  {
    const { status, data } = await req("GET", `/projects/${projectId}/dashboard`, null, tokens.Vinayak);
    if (status === 200 && data.healthScore !== undefined) {
      log("Health Dashboard", true, 
        `Score: ${data.healthScore}/100, Tasks Done: ${data.metrics?.tasks?.done}/${data.metrics?.tasks?.total}`);
      console.log(`     → Task Progress: ${data.metrics?.tasks?.done}/${data.metrics?.tasks?.total}`);
      console.log(`     → Test Pass Rate: ${data.metrics?.qa?.passed}/${data.metrics?.qa?.totalTests}`);
      console.log(`     → Open Bugs: ${data.metrics?.qa?.openBugs}`);
      console.log(`     → Health Status: ${data.status}`);
    } else {
      log("Health Dashboard", false, JSON.stringify(data));
    }
  }

  // ════════════════════════════════════════════════════════
  // TEST 13: Admin Status — MongoDB Storage Proof
  // ════════════════════════════════════════════════════════
  console.log("\n── 13. MongoDB Storage Verification ──");
  {
    const { status, data } = await req("GET", "/admin/status");
    if (status === 200 && data.success) {
      log("MongoDB Connected", data.dbStatus === "connected", `DB Status: ${data.dbStatus}`);
      log("Users Stored in DB", data.mongodb?.totalUsers >= 4, `Total Users: ${data.mongodb?.totalUsers}`);
      log("Projects Stored in DB", data.mongodb?.totalProjects >= 1, `Total Projects: ${data.mongodb?.totalProjects}`);
      log("Sessions Stored in DB", data.mongodb?.totalCollaborationSessions >= 0, 
        `Sessions: ${data.mongodb?.totalCollaborationSessions}`);
    } else {
      log("Admin Status", false, JSON.stringify(data));
    }
  }

  // ════════════════════════════════════════════════════════
  // TEST 14: Cross-User Data Access (Persistence Proof)
  // ════════════════════════════════════════════════════════
  console.log("\n── 14. Cross-User Data Access — Persistence Proof ──");
  {
    const reqs = await req("GET", `/projects/${projectId}/requirements`, null, tokens.Aslam);
    log("Aslam reads Vinayak's requirements", reqs.data.requirements?.length >= 2, 
      `Count: ${reqs.data.requirements?.length}`);

    const tasks = await req("GET", `/projects/${projectId}/tasks`, null, tokens.Aniket);
    log("Aniket reads all team tasks", tasks.data.tasks?.length >= 3,
      `Count: ${tasks.data.tasks?.length}`);

    const bugs = await req("GET", `/projects/${projectId}/qa/bugs`, null, tokens.Aaqil);
    log("Aaqil reads Aslam's bugs", bugs.data.bugs?.length >= 1,
      `Count: ${bugs.data.bugs?.length}`);

    const tests = await req("GET", `/projects/${projectId}/qa/tests`, null, tokens.Vinayak);
    log("Vinayak reads all QA tests", tests.data.testCases?.length >= 2,
      `Count: ${tests.data.testCases?.length}`);
  }

  // ════════════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════════════
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  const total = results.length;

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log(`║   TEST RESULTS: ${passed} PASSED / ${failed} FAILED / ${total} TOTAL             ║`);
  console.log("╚══════════════════════════════════════════════════════════╝");

  if (failed === 0) {
    console.log("\n🎉 ALL TESTS PASSED — Every feature tested and persisted in MongoDB Atlas!");
    console.log("   Tomorrow: GET http://localhost:8000/api/admin/status to verify.\n");
  } else {
    console.log(`\n⚠️  ${failed} test(s) need attention.\n`);
  }

  const fs = await import("fs");
  fs.writeFileSync("test_results.json", JSON.stringify({
    runDate: new Date().toISOString(),
    team: users.map(u => ({ name: u.name, email: u.email })),
    projectId,
    summary: { passed, failed, total },
    details: results,
  }, null, 2));
  console.log("📄 Results saved to: test_results.json\n");
}

main().catch(console.error);
