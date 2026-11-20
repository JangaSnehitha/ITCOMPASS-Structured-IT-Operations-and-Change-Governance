import request from 'supertest';
import bcrypt from 'bcryptjs';
import db from '../src/db.js';
import app from '../src/app.js';

let requester;
let manager;
let admin;
let implementer;

let requesterAgent;
let managerAgent;
let adminAgent;
let implementerAgent;

let serviceId;

async function createUser(username, role) {
  const password = 'pw123';
  const passwordHash = await bcrypt.hash(password, 10);

  const result = db.prepare(`
    INSERT INTO users (username, password_hash, role)
    VALUES (?, ?, ?)
  `).run(username, passwordHash, role);

  return {
    id: Number(result.lastInsertRowid),
    username,
    password,
    role
  };
}

async function loginUser(user) {
  const agent = request.agent(app);

  const response = await agent
    .post('/api/auth/login')
    .send({
      username: user.username,
      password: user.password
    });

  if (response.status !== 200) {
    throw new Error(
      `Login failed for ${user.username}: ${response.status} ${JSON.stringify(response.body)}`
    );
  }

  return agent;
}

async function createRequest(agent, title = 'Test change request') {
  const response = await agent
    .post('/api/requests')
    .send({
      title,
      description: 'Test description',
      service_id: serviceId,
      priority: 'Medium',
      risk: 'Low',
      impact: 'Low'
    });

  expect(response.status).toBe(201);
  expect(response.body.id).toBeDefined();

  return response.body.id;
}

async function submitRequest(agent, requestId) {
  const response = await agent
    .put(`/api/requests/${requestId}`)
    .send({ status: 'SUBMITTED' });

  expect(response.status).toBe(200);
  return response;
}

async function getStatus(requestId) {
  return db.prepare(
    'SELECT status FROM change_requests WHERE id = ?'
  ).get(requestId).status;
}

beforeEach(async () => {
  // Clear data in foreign-key-safe order.
  db.pragma('foreign_keys = OFF');

  for (const table of [
    'notifications',
    'implementations',
    'approvals',
    'audit_log',
    'change_requests',
    'services',
    'users'
  ]) {
    try {
      db.prepare(`DELETE FROM ${table}`).run();
    } catch {
      // Ignore only if an optional table does not exist.
    }
  }

  db.pragma('foreign_keys = ON');

  // Create a service for test requests.
  const service = db.prepare(`
    INSERT INTO services (name, description)
    VALUES (?, ?)
  `).run('Test Service', 'Service used for automated tests');

  serviceId = Number(service.lastInsertRowid);

  requester = await createUser('alice', 'requester');
  manager = await createUser('bob', 'manager');
  admin = await createUser('carol', 'admin');
  implementer = await createUser('erin', 'implementer');

  requesterAgent = await loginUser(requester);
  managerAgent = await loginUser(manager);
  adminAgent = await loginUser(admin);
  implementerAgent = await loginUser(implementer);
});

describe('ChangeOps Change Request Workflow', () => {
  test('1. Requester can create and submit a request', async () => {
    const id = await createRequest(requesterAgent);

    expect(await getStatus(id)).toBe('DRAFT');

    await submitRequest(requesterAgent, id);

    expect(await getStatus(id)).toBe('SUBMITTED');
  });

  test('2. Requester cannot approve their own request', async () => {
    const id = await createRequest(requesterAgent);
    await submitRequest(requesterAgent, id);

    const response = await requesterAgent
      .post(`/api/approvals/${id}/approve`);

    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/own request/i);
    expect(await getStatus(id)).toBe('SUBMITTED');

    const approvals = db.prepare(
      'SELECT * FROM approvals WHERE request_id = ?'
    ).all(id);

    expect(approvals).toHaveLength(0);
  });

  test('3. Admin cannot approve before manager approval', async () => {
    const id = await createRequest(requesterAgent);
    await submitRequest(requesterAgent, id);

    const response = await adminAgent
      .post(`/api/approvals/${id}/approve`);

    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/manager/i);
    expect(await getStatus(id)).toBe('SUBMITTED');

    const approvals = db.prepare(
      'SELECT * FROM approvals WHERE request_id = ?'
    ).all(id);

    expect(approvals).toHaveLength(0);
  });

  test('4. Implementer cannot approve a request', async () => {
    const id = await createRequest(requesterAgent);
    await submitRequest(requesterAgent, id);

    const response = await implementerAgent
      .post(`/api/approvals/${id}/approve`);

    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/approval chain/i);
  });

  test('5. Manager approval followed by admin approval completes the workflow', async () => {
    const id = await createRequest(requesterAgent);
    await submitRequest(requesterAgent, id);

    const managerResponse = await managerAgent
      .post(`/api/approvals/${id}/approve`);

    expect(managerResponse.status).toBe(200);
    expect(await getStatus(id)).toBe('PENDING_APPROVAL');

    const adminResponse = await adminAgent
      .post(`/api/approvals/${id}/approve`);

    expect(adminResponse.status).toBe(200);
    expect(await getStatus(id)).toBe('APPROVED');

    const approvals = db.prepare(`
      SELECT u.role, a.decision
      FROM approvals a
      JOIN users u ON u.id = a.approver_id
      WHERE a.request_id = ?
      ORDER BY a.decided_at
    `).all(id);

    expect(approvals).toHaveLength(2);
    expect(approvals.map(a => a.role)).toEqual(['manager', 'admin']);
    expect(approvals.every(a => a.decision === 'APPROVED')).toBe(true);
  });

  test('6. A manager cannot approve the same request twice', async () => {
    const id = await createRequest(requesterAgent);
    await submitRequest(requesterAgent, id);

    const first = await managerAgent
      .post(`/api/approvals/${id}/approve`);

    expect(first.status).toBe(200);

    const second = await managerAgent
      .post(`/api/approvals/${id}/approve`);

    expect(second.status).toBe(400);

    const approvals = db.prepare(`
      SELECT * FROM approvals
      WHERE request_id = ? AND approver_id = ?
    `).all(id, manager.id);

    expect(approvals).toHaveLength(1);
  });

  test('7. Manager can reject a request and it cannot be scheduled', async () => {
    const id = await createRequest(requesterAgent);
    await submitRequest(requesterAgent, id);

    const rejection = await managerAgent
      .post(`/api/approvals/${id}/reject`)
      .send({ reason: 'Change is not required' });

    expect(rejection.status).toBe(200);
    expect(await getStatus(id)).toBe('REJECTED');

    const scheduleAttempt = await requesterAgent
      .put(`/api/requests/${id}`)
      .send({
        planned_start: '2026-11-01',
        planned_end: '2026-11-02'
      });

    expect(scheduleAttempt.status).toBe(400);
  });

  test('8. Cancellation stores CANCELLED status and its reason', async () => {
    const id = await createRequest(requesterAgent);

    const response = await requesterAgent
      .delete(`/api/requests/${id}`)
      .send({ reason: 'No longer required' });

    expect(response.status).toBe(200);

    const row = db.prepare(`
      SELECT status, cancellation_reason
      FROM change_requests
      WHERE id = ?
    `).get(id);

    expect(row.status).toBe('CANCELLED');
    expect(row.cancellation_reason).toBe('No longer required');

    const audit = db.prepare(`
      SELECT * FROM audit_log
      WHERE entity = ?
        AND entity_id = ?
        AND action = ?
    `).get('change_requests', id, 'CANCEL');

    expect(audit).toBeDefined();
  });

  test('9. Approved request cannot have its title edited', async () => {
    const id = await createRequest(requesterAgent);
    await submitRequest(requesterAgent, id);

    await managerAgent.post(`/api/approvals/${id}/approve`);
    await adminAgent.post(`/api/approvals/${id}/approve`);

    expect(await getStatus(id)).toBe('APPROVED');

    const response = await requesterAgent
      .put(`/api/requests/${id}`)
      .send({ title: 'Changed title' });

    expect(response.status).toBe(400);

    const row = db.prepare(
      'SELECT title FROM change_requests WHERE id = ?'
    ).get(id);

    expect(row.title).toBe('Test change request');
  });

  test('10. Every valid status transition is recorded in audit history', async () => {
    const id = await createRequest(requesterAgent);

    await submitRequest(requesterAgent, id);
    await managerAgent.post(`/api/approvals/${id}/approve`);
    await adminAgent.post(`/api/approvals/${id}/approve`);

    const audits = db.prepare(`
      SELECT details
      FROM audit_log
      WHERE entity = ?
        AND entity_id = ?
        AND action = ?
    `).all('change_requests', id, 'STATUS_CHANGE');

    const statuses = audits.map(entry => JSON.parse(entry.details).to);

    expect(statuses).toContain('SUBMITTED');
    expect(statuses).toContain('PENDING_APPROVAL');
    expect(statuses).toContain('APPROVED');
  });

  test('11. Another requester cannot modify someone else request', async () => {
    const id = await createRequest(requesterAgent);

    const otherUser = await createUser('dave', 'requester');
    const otherAgent = await loginUser(otherUser);

    const response = await otherAgent
      .put(`/api/requests/${id}`)
      .send({ title: 'Unauthorized edit' });

    expect(response.status).toBe(403);
  });

  test('12. Invalid request ID is rejected', async () => {
    const response = await managerAgent
      .post('/api/approvals/invalid/approve');

    expect(response.status).toBe(400);
  });
});