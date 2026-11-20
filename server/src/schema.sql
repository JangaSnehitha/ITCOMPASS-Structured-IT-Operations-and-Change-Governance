-- schema.sql
-- Users and roles
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin','manager','implementer','requester')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Services (IT services like Servers, Networks, Apps)
CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Change Requests
CREATE TABLE IF NOT EXISTS change_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    service_id INTEGER NOT NULL REFERENCES services(id),
    priority TEXT NOT NULL CHECK (priority IN ('Low','Medium','High')),
    risk TEXT NOT NULL CHECK (risk IN ('Low','Medium','High')),
    impact TEXT NOT NULL CHECK (impact IN ('Low','Medium','High')),
    planned_start TEXT,
    planned_end TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SUBMITTED','PENDING_APPROVAL','APPROVED','REJECTED','CANCELLED','IMPLEMENTING','IMPLEMENTED','FAILED','ROLLED_BACK')),
    cancellation_reason TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Approvals
CREATE TABLE IF NOT EXISTS approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL REFERENCES change_requests(id),
    approver_id INTEGER NOT NULL REFERENCES users(id),
    decision TEXT NOT NULL CHECK (decision IN ('APPROVED','REJECTED')),
    comment TEXT,
    decided_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Implementation Records
CREATE TABLE IF NOT EXISTS implementations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL REFERENCES change_requests(id),
    implementer_id INTEGER NOT NULL REFERENCES users(id),
    start_time TEXT NOT NULL DEFAULT (datetime('now')),
    end_time TEXT,
    outcome TEXT CHECK (outcome IN ('SUCCESS','FAILURE')),
    rollback_required INTEGER NOT NULL DEFAULT 0,
    notes TEXT
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Audit History (captures every important change)
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    performed_by INTEGER NOT NULL REFERENCES users(id),
    details TEXT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);
