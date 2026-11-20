// src/seed.js – Run once to create demo users and services
import db from './db.js';
import bcrypt from 'bcryptjs';

const users = [
  { username: 'admin', password: 'admin123', role: 'admin' },
  { username: 'manager1', password: 'manager123', role: 'manager' },
  { username: 'john.doe', password: 'user123', role: 'requester' },
  { username: 'jane.smith', password: 'user123', role: 'requester' },
  { username: 'impl.team', password: 'impl123', role: 'implementer' },
];

const services = [
  { name: 'Cloud Infrastructure', description: 'AWS, Azure, and GCP cloud services' },
  { name: 'Network Services', description: 'Core networking, firewalls, and VPN' },
  { name: 'Database Services', description: 'SQL Server, PostgreSQL, MongoDB clusters' },
  { name: 'Application Servers', description: 'Web servers, app servers, microservices' },
  { name: 'Security Systems', description: 'IAM, SIEM, endpoint protection' },
  { name: 'Email & Collaboration', description: 'Exchange, Teams, SharePoint' },
];

async function seed() {
  console.log('Seeding database...');

  for (const u of users) {
    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(u.username);
    if (!exists) {
      const hash = await bcrypt.hash(u.password, 12);
      db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?,?,?)').run(u.username, hash, u.role);
      console.log(`  Created user: ${u.username} (${u.role})`);
    } else {
      console.log(`  User exists: ${u.username}`);
    }
  }

  for (const s of services) {
    const exists = db.prepare('SELECT id FROM services WHERE name = ?').get(s.name);
    if (!exists) {
      db.prepare('INSERT INTO services (name, description) VALUES (?,?)').run(s.name, s.description);
      console.log(`  Created service: ${s.name}`);
    } else {
      console.log(`  Service exists: ${s.name}`);
    }
  }

  // Create some sample change requests
  const john = db.prepare("SELECT id FROM users WHERE username = 'john.doe'").get();
  const jane = db.prepare("SELECT id FROM users WHERE username = 'jane.smith'").get();
  const cloud = db.prepare("SELECT id FROM services WHERE name = 'Cloud Infrastructure'").get();
  const network = db.prepare("SELECT id FROM services WHERE name = 'Network Services'").get();
  const dbSvc = db.prepare("SELECT id FROM services WHERE name = 'Database Services'").get();
  const appSvc = db.prepare("SELECT id FROM services WHERE name = 'Application Servers'").get();
  const secSvc = db.prepare("SELECT id FROM services WHERE name = 'Security Systems'").get();

  const existing = db.prepare('SELECT COUNT(*) as cnt FROM change_requests').get();
  if (existing.cnt === 0 && john && cloud) {
    const requests = [
      { title: 'Upgrade Production Kubernetes Cluster', desc: 'Upgrade EKS cluster from v1.27 to v1.29 with zero-downtime rolling update strategy.', svc: cloud.id, pri: 'High', risk: 'High', impact: 'High', status: 'SUBMITTED', by: john.id },
      { title: 'Deploy New SSL Certificates', desc: 'Replace expiring SSL certificates across all production load balancers and CDN endpoints.', svc: network.id, pri: 'High', risk: 'Medium', impact: 'Medium', status: 'SUBMITTED', by: john.id },
      { title: 'Database Connection Pool Optimization', desc: 'Increase connection pool limits and implement connection recycling for PostgreSQL clusters.', svc: dbSvc.id, pri: 'Medium', risk: 'Low', impact: 'Low', status: 'DRAFT', by: jane.id },
      { title: 'Migrate Legacy API Gateway', desc: 'Migrate from Kong 2.x to Kong 3.x with new rate limiting and authentication plugins.', svc: appSvc.id, pri: 'Medium', risk: 'Medium', impact: 'Medium', status: 'PENDING_APPROVAL', by: jane.id },
      { title: 'Enable MFA for Admin Accounts', desc: 'Enforce multi-factor authentication across all privileged administrative accounts in Active Directory.', svc: secSvc.id, pri: 'High', risk: 'Low', impact: 'Low', status: 'APPROVED', by: john.id },
      { title: 'Scale Redis Cluster Horizontally', desc: 'Add 3 additional Redis nodes to the caching cluster to handle increased load.', svc: dbSvc.id, pri: 'Low', risk: 'Low', impact: 'Low', status: 'IMPLEMENTED', by: jane.id },
      { title: 'Patch Firewall Firmware', desc: 'Apply critical firmware update to Palo Alto firewalls addressing CVE-2025-0078.', svc: network.id, pri: 'High', risk: 'High', impact: 'High', status: 'SUBMITTED', by: john.id },
    ];

    for (const r of requests) {
      db.prepare(`INSERT INTO change_requests (title, description, service_id, priority, risk, impact, status, created_by, planned_start, planned_end) VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .run(r.title, r.desc, r.svc, r.pri, r.risk, r.impact, r.status, r.by, '2026-11-15 06:00:00', '2026-11-15 10:00:00');
    }

    // Add some approvals for the PENDING_APPROVAL and APPROVED ones
    const mgr = db.prepare("SELECT id FROM users WHERE username = 'manager1'").get();
    const adm = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
    const pending = db.prepare("SELECT id FROM change_requests WHERE status = 'PENDING_APPROVAL'").get();
    const approved = db.prepare("SELECT id FROM change_requests WHERE status = 'APPROVED'").get();
    const implemented = db.prepare("SELECT id FROM change_requests WHERE status = 'IMPLEMENTED'").get();

    if (pending && mgr) {
      db.prepare('INSERT INTO approvals (request_id, approver_id, decision) VALUES (?,?,?)').run(pending.id, mgr.id, 'APPROVED');
    }
    if (approved && mgr && adm) {
      db.prepare('INSERT INTO approvals (request_id, approver_id, decision) VALUES (?,?,?)').run(approved.id, mgr.id, 'APPROVED');
      db.prepare('INSERT INTO approvals (request_id, approver_id, decision) VALUES (?,?,?)').run(approved.id, adm.id, 'APPROVED');
    }
    if (implemented && mgr && adm) {
      db.prepare('INSERT INTO approvals (request_id, approver_id, decision) VALUES (?,?,?)').run(implemented.id, mgr.id, 'APPROVED');
      db.prepare('INSERT INTO approvals (request_id, approver_id, decision) VALUES (?,?,?)').run(implemented.id, adm.id, 'APPROVED');
    }

    // Add audit entries
    const allReqs = db.prepare('SELECT * FROM change_requests').all();
    for (const cr of allReqs) {
      db.prepare('INSERT INTO audit_log (entity, entity_id, action, performed_by, details) VALUES (?,?,?,?,?)')
        .run('change_requests', cr.id, 'CREATE', cr.created_by, JSON.stringify({ title: cr.title, status: 'DRAFT' }));
    }

    // Add some notifications
    if (mgr) {
      db.prepare('INSERT INTO notifications (user_id, message) VALUES (?,?)').run(mgr.id, 'New change request "Upgrade Production Kubernetes Cluster" requires your approval.');
      db.prepare('INSERT INTO notifications (user_id, message) VALUES (?,?)').run(mgr.id, 'New change request "Deploy New SSL Certificates" requires your approval.');
    }
    if (adm) {
      db.prepare('INSERT INTO notifications (user_id, message) VALUES (?,?)').run(adm.id, 'Change request "Migrate Legacy API Gateway" has been approved by manager.');
    }

    console.log('  Created sample change requests, approvals, and notifications');
  }

  console.log('Seeding complete!');
}

seed().catch(console.error);
