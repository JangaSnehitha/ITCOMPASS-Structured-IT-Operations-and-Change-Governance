# ChangeOps – IT Change Request & Approval Management System

## 1. Project Overview

| Aspect | Description |
|--------|-------------|
| **Purpose** | Provide a web‑based platform for IT teams to submit, track, and control change‑related work (e.g., software releases, configuration updates) while enforcing a formal approval workflow. |
| **Problem Statement** | Manual change‑request handling (email, spreadsheets, paper forms) is error‑prone, lacks auditability, and does not enforce role‑based approvals. |
| **Objectives** | 1. Enable requesters to create change tickets. <br>2. Enforce a sequential **Manager → Admin** approval chain. <br>3. Record immutable audit logs for compliance. <br>4. Allow implementers to move approved work into execution phases. <br>5. Provide a clean, premium UI for all users. |
| **Scope** | End‑to‑end CRUD of change requests, role‑based approval/rejection, cancellation, status‑transition validation, audit logging, and basic dashboard statistics. No external integrations (e.g., ServiceNow) are built yet. |
| **How it Solves the Problem** | - Centralised database guarantees a single source of truth. <br>- API enforces business rules (approval order, terminal‑state protection). <br>- UI shows only actions allowed for a user’s role, preventing accidental edits. <br>- Audit table captures every state change for traceability and compliance reporting. |

---

## 2. Features & Modules

| Feature | Implemented? | Description |
|---------|--------------|-------------|
| **Request Submission** | ✅ | `POST /api/requests` – requester creates a request with title, description, service, priority, risk, impact, planned dates. |
| **Request Editing** | ✅ (partial) | `PUT /api/requests/:id` – owner can modify mutable fields *unless* the request is in a **terminal state** (`REJECTED`, `CANCELLED`, `IMPLEMENTING`, `FAILED`, `ROLLED_BACK`, **`APPROVED`**). |
| **Request Cancellation** | ✅ | `DELETE /api/requests/:id` – owner can soft‑delete with a cancellation reason; status becomes `CANCELLED`. |
| **Manager Approval** | ✅ | `POST /api/approvals/:id/approve` – a user with role `manager` can approve; status moves to `PENDING_APPROVAL` if admin not yet approved. |
| **Admin Approval** | ✅ | Same endpoint, role `admin`; can approve **only after** a manager has approved (enforced via a DB query). |
| **Rejection** | ✅ | `POST /api/approvals/:id/reject` – manager or admin can reject with a comment; status becomes `REJECTED`. Admin‑reject requires prior manager approval. |
| **Audit Logging** | ✅ | Every status change, approval, rejection, and cancellation calls `audit()` → `audit_log` table. |
| **Dashboard Statistics** | ✅ | `GET /api/stats/dashboard` returns counts of requests per status, recent activity, etc. |
| **Notifications (unread count)** | ✅ | `GET /api/notifications/unread-count` – placeholder implementation returning count of unread items. |
| **User Management (list)** | ✅ | `GET /api/users` (if present) – returns basic user list; role updates are not yet exposed via UI. |
| **Role‑Based UI** | ✅ | Front‑end pages hide or disable actions based on `user.role` (e.g., Approve button only appears for manager/admin). |
| **Design System** | ✅ | Shared CSS token file (`src/styles/theme.css`), glass‑morphism cards, Inter font, micro‑animations. |
| **Testing** | ✅ | Jest + Supertest suite (`tests/requests.test.js`) covering 12 scenarios: creation, approval flow, duplicate actions, cancellation, edit protection, etc. |
| **Planned / Partial** | ⚙️ | • Scheduling of approved work (no explicit “schedule” endpoint yet). <br>• Implementation phase actions (`IMPLEMENTING`, `IMPLEMENTED`, `FAILED`, `ROLLED_BACK`) are defined in `stateMachine.js` but UI routes are placeholders. <br>• Email / push notifications. <br>• Role‑based dashboard widgets. <br>• Multi‑tenant support, OAuth2/SSO, Docker deployment. |

---

## 3. User Roles

| Role | Permissions (API) | UI Capabilities |
|------|-------------------|-----------------|
| **Requester** | `POST /api/requests`, `GET /api/requests/:id` (own), `PUT /api/requests/:id` (own, non‑terminal), `DELETE /api/requests/:id` (own) | Create requests, view own list, edit own request (until terminal), cancel own request. |
| **Manager** | All requester rights *plus* `POST /api/approvals/:id/approve`, `POST /api/approvals/:id/reject` (first stage). Cannot approve own request. | Approve/reject pending requests, see pending approvals, view audit history. |
| **Admin** | All manager rights *plus* final approval step. Must wait for manager approval before an admin can approve or reject. | Same as manager, but can close the workflow by approving after manager. |
| **Implementer** | Read‑only access to approved requests; future endpoints for status transition (`IMPLEMENTING` → `IMPLEMENTED`). Currently only UI placeholder. | View approved requests, see implementation tasks (planned). |

All routes are protected by `requireAuth` middleware that checks the session cookie and attaches `req.user` (id, role). |

---

## 4. Technology Stack

| Layer | Technology | Why it was chosen |
|-------|------------|-------------------|
| **Frontend** | **React** (Vite), **Vanilla CSS**, **Google Font – Inter** | React gives component‑based UI; Vite provides fast dev server & HMR; vanilla CSS keeps the bundle lean and allows full control over the premium visual design. |
| **Backend** | **Node.js** + **Express** | Minimalist server, easy to integrate with SQLite and session middleware. |
| **Database** | **SQLite** via **better‑sqlite3** | Server‑less, zero‑config relational DB – perfect for a small‑to‑medium internal tool. `better‑sqlite3` offers synchronous API and prepared‑statement safety. |
| **Testing** | **Jest** + **Supertest** | Unit / integration testing for Express routes; Supertest simulates HTTP requests. |
| **Session Store** | **express‑session‑file‑store** | Simple file‑based persistence, no external Redis needed for dev. |
| **Package Manager** | **npm** (Node 20+) | Standard for both client & server. |
| **Design** | **Glass‑morphism, gradients, micro‑animations** (CSS) | Provides the “premium” look demanded by the project spec. |

---

## 5. System Architecture

```
+--------------------+          +---------------------+          +-------------------+
|   Browser (HTTPS)  | <------> |   Vite dev server   | <------> |   Express API     |
|  http://localhost: |          | http://localhost:   |          | http://localhost: |
|      5173          |          |        5173         |          |        3000       |
+--------------------+          +---------------------+          +-------------------+
          |                                 |                           |
          |  (static assets, React bundle)   |   API calls (JSON)        |
          |                                 |   (CRUD, approvals)       |
          v                                 v                           v
+--------------------------------------------------------------------------+
|                              SQLite DB                                    |
|  tables: users, change_requests, approvals, audit_log, (sessions files) |
+--------------------------------------------------------------------------+
```
* **Frontend** – Serves static files, routes via `react-router-dom`. All API calls go to the backend under `/api/*`. |
* **Backend** – Express app (`src/app.js`) registers middleware (CORS, JSON parser, session handling) and mounts route modules (`auth`, `requests`, `approvals`, `notifications`, `stats`, `users`). |
* **Database** – Initialized on server start (`src/db.js`). Schema lives in `src/schema.sql`. |
* **API Communication** – JSON over HTTP, session cookie (`connect.sid`) for authentication. |

---

## 6. Database Design

| Table | Primary Key | Important Columns | Foreign Keys | Purpose |
|-------|-------------|-------------------|--------------|---------|
| **users** | `id` (INTEGER AUTOINCREMENT) | `username`, `password_hash`, `role` (`requester`, `manager`, `admin`, `implementer`) | – | Stores system users. |
| **change_requests** | `id` | `title`, `description`, `service_id`, `priority`, `risk`, `impact`, `planned_start`, `planned_end`, `status` (enum), `created_by`, `created_at`, `updated_at`, `cancellation_reason` | `created_by → users.id` | Core change request data. |
| **approvals** | `id` | `request_id`, `approver_id`, `decision` (`APPROVED`/`REJECTED`), `comment`, `created_at` | `request_id → change_requests.id`, `approver_id → users.id` | Individual approval/rejection records. |
| **audit_log** | `id` | `entity` (e.g., `change_requests`), `entity_id`, `action` (`STATUS_CHANGE`, `APPROVE`, `REJECT`, `CANCEL`), `performed_by`, `details` (JSON), `created_at` | – | Immutable history of every significant operation. |
| **sessions** (file‑store) | – | – | – | Persists express‑session data on disk (`db/sessions/`). |

**Status Enum (defined in `src/stateMachine.js`)**
```
SUBMITTED → PENDING_APPROVAL → APPROVED → IMPLEMENTING → IMPLEMENTED
           ↘︎ CANCELLED ↘︎ REJECTED ↘︎ FAILED ↘︎ ROLLED_BACK
```
---

## 7. Complete Workflow (Lifecycle)

1. **Login** – User authenticates (`POST /api/auth/login`), session cookie created. |
2. **Create Request** – Requester fills form → `POST /api/requests`. Record stored with `status = 'SUBMITTED'`. |
3. **Manager Review** – Manager sees pending requests. |
   * **Approve** → `POST /api/approvals/:id/approve` (role=manager). System adds an approval row, status becomes `PENDING_APPROVAL`. |
   * **Reject** → `POST /api/approvals/:id/reject` (role=manager). Status set to `REJECTED`; request cannot be scheduled. |
4. **Admin Review** – After a manager approval, admin can: |
   * **Approve** → `POST /api/approvals/:id/approve` (role=admin). If all required roles approved, status changes to `APPROVED`. |
   * **Reject** → `POST /api/approvals/:id/reject` (role=admin). Requires that a manager already approved; status set to `REJECTED`. |
5. **Implementation Phase** (planned, not yet exposed in UI): |
   * Transition from `APPROVED` → `IMPLEMENTING` → `IMPLEMENTED` (or `FAILED`/`ROLLED_BACK`). |
   * These transitions are validated by `canTransition` in `src/routes/requests.js`. |
6. **Cancellation** – Owner may cancel any non‑terminal request (`DELETE /api/requests/:id`). Status becomes `CANCELLED` and a reason is stored. |
7. **Rollback** – If a request fails during implementation, an admin/implementer could set status to `FAILED` → `ROLLED_BACK` (future UI). |
8. **Audit** – Every transition logs a row in `audit_log` with `from`, `to`, `performed_by`, and timestamps. |
9. **Dashboard** – `GET /api/stats/dashboard` aggregates counts (e.g., number of `APPROVED` requests, pending approvals). |
10. **Notifications** – Unread count endpoint returns pending alerts for the logged‑in user (basic placeholder). |

---

## 8. Backend & Frontend Details

### Backend (Express)

| Module | File | Key Routes / Functions | Description |
|--------|------|------------------------|-------------|
| **App Init** | `src/app.js` | `app.use('/api/auth', authRouter)`, `app.use('/api/requests', requestRouter)`, … | Registers middleware, sessions, CORS, mounts routers. |
| **Auth** | `src/routes/auth.js` | `POST /login`, `GET /me`, `POST /logout` | Validates credentials, creates session, returns user object. |
| **Requests** | `src/routes/requests.js` | `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id` | CRUD plus validation of terminal states, status transitions via `canTransition`. |
| **Approvals** | `src/routes/approvals.js` | `POST /:id/approve`, `POST /:id/reject` | Enforces approval order (`approvalSequence`), inserts rows, updates request status, writes audit entries. |
| **Notifications** | `src/routes/notifications.js` | `GET /unread-count` | Returns a count (placeholder). |
| **Stats** | `src/routes/stats.js` | `GET /dashboard` | Summarises request counts per status. |
| **Users** | `src/routes/users.js` | `GET /` (list) | Returns user list (used for admin UI). |
| **State Machine** | `src/stateMachine.js` | `approvalSequence`, `statusTransitions`, `canTransition` | Centralised workflow rules. |
| **DB** | `src/db.js` | `db.prepare(...).run(...)` | Opens SQLite, runs schema (`src/schema.sql`) on first start, provides `db` instance. |
| **Audit Helper** | `src/routes/approvals.js` (function `audit`) | Inserts into `audit_log`. | Used by both request and approval routes. |
| **Middleware** | `src/middleware/auth.js` | `requireAuth` | Ensures `req.user` exists; returns 401 otherwise. |

### Frontend (React + Vite)

| Page / Component | File | Purpose | Role‑Based Behaviour |
|------------------|------|---------|----------------------|
| **Dashboard** | `src/pages/Dashboard.jsx` | Shows KPI cards (total requests, pending approvals, etc.). | All roles see aggregated numbers; details differ. |
| **Requests** | `src/pages/Requests.jsx` | List of requests, filter, “Create New” button. | Requester sees own requests, manager/admin see all pending. |
| **RequestForm** | `src/components/RequestForm.jsx` | Form used for create & edit. Fields disabled when request is in a terminal state. |
| **Approvals** | `src/pages/Approvals.jsx` | Table of pending approvals for the logged‑in user’s role. | Manager sees manager‑pending, admin sees admin‑pending after manager approval. |
| **AuditHistory** | `src/pages/AuditHistory.jsx` | Paginated view of `audit_log`. | All authenticated users can view (could be restricted later). |
| **Notifications** | `src/pages/Notifications.jsx` | Dropdown showing recent notifications (currently stub). |
| **Users** | `src/pages/Users.jsx` | Admin UI to list users and possibly change roles (future). |
| **Services** | `src/pages/Services.jsx` | Static list of IT services (used for request dropdown). |
| **Navbar** | `src/components/Navbar.jsx` | Shows navigation links depending on `user.role`; includes logout. |
| **ProtectedRoute** | `src/components/ProtectedRoute.jsx` | Wraps routes; redirects to login if session missing. |
| **ThemeContext** | `src/context/ThemeContext.jsx` | Provides dark‑mode toggle (currently scaffold). |
| **Styling** | `src/styles/theme.css` | Central token file (colors, fonts, spacing). Uses `Inter` font via `<link>` in `client/index.html`. |
| **index.html** | `client/index.html` | Sets page title, meta tags, loads the bundled JS. |
| **Vite Config** | `client/vite.config.js` | Proxy `/api` to `http://localhost:3000`. |

All components are built with vanilla CSS modules (`*.module.css`) respecting the premium visual guidelines (glass‑morphism, gradients, hover scaling, smooth transitions). |

---

## 9. Security & Testing

| Area | Implementation |
|------|----------------|
| **Authentication** | Session‑based login (`express-session`). Passwords stored as BCrypt hashes (`bcryptjs`). HttpOnly cookie. |
| **Authorization** | `requireAuth` middleware; each route checks `req.user.role` before performing actions. Owner checks (`created_by === req.user.id`). |
| **Input Validation** | Basic validation in route handlers (e.g., required fields, valid `status` transitions). No external validator library yet – could be added (`express-validator`). |
| **Audit Logs** | `audit()` writes immutable entries; timestamps via SQLite `datetime('now')`. Guarantees traceability for all state changes. |
| **CORS** | Configured to allow only `http://localhost:5173` (dev) – production would tighten origins. |
| **Testing** | `tests/requests.test.js` covers: creation, self‑approval block, manager → admin order, duplicate approvals, rejection flow, cancellation, edit protection on APPROVED, unauthorized edit, invalid ID handling. All tests **PASS**. |
| **Error Handling** | Each route catches exceptions and returns `500` with a generic error message; console logs detailed error for developers. |
| **Session Store Security** | File‑store persists sessions on disk; in production you would switch to a more robust store (Redis or DB). |

---

## 10. Advantages & Future Scope

### Advantages

| Benefit | Reason |
|---------|--------|
| **Clear approval chain** – Enforced by DB queries and state‑machine logic. |
| **Auditability** – Immutable `audit_log` satisfies compliance requirements. |
| **Premium UI** – Modern design (glass‑morphism, gradients) meets the aesthetic requirement. |
| **Modular code** – Separate routers, state machine, and DB init make future extensions straightforward. |
| **Test coverage** – Core workflow fully automated with Jest + Supertest. |
| **Lightweight stack** – SQLite + Express = minimal ops overhead; easy to run locally. |

### Current Limitations

| Limitation | Impact |
|------------|--------|
| **No real scheduling** – Approved requests cannot be assigned dates or resources yet. |
| **Implementer workflow not exposed** – UI for moving from `APPROVED` → `IMPLEMENTING` is missing. |
| **Simple notification system** – Only unread count; no push or email alerts. |
| **Static user/role management** – No UI for creating users or changing roles (hard‑coded seeds). |
| **No external authentication** – Only username/password; SSO / OAuth2 not integrated. |
| **Single‑tenant only** – All data lives in one SQLite DB; no separation for multiple business units. |
| **Limited validation** – No schema validation library; risk of malformed payloads. |
| **No CI/CD / Docker** – Deployment steps are manual; Docker/Compose planned for v2.2. |

### Possible Improvements
1. **Scheduling Service** – Add a `schedule` table, UI calendar, and API to assign implementation windows. |
2. **Implementation Phase UI** – Pages for implementers to mark as `IMPLEMENTING`, `IMPLEMENTED`, `FAILED`, `ROLLED_BACK`. |
3. **Email / Push Notifications** – Use `nodemailer` or a messaging service to alert managers/admins on pending approvals. |
4. **Role & User Management UI** – Admin screens to create users, assign roles, deactivate accounts. |
5. **OAuth2 / SSO** – Integrate Azure AD, Okta, or Google for enterprise login. |
6. **Dockerisation** – Provide `Dockerfile` for both client and server, and a `docker‑compose.yml` to spin up the whole stack (planned v2.2). |
7. **Multi‑tenant Architecture** – Separate schemas or databases per department, include tenant ID in every table. |
8. **Enhanced Validation** – Adopt `express‑validator` or `zod` for request body schema enforcement. |
9. **Performance Metrics** – Add monitoring (Prometheus, Grafana) and rate‑limiting middleware. |

---

## 11. Visual Summaries

### 11.1 Architecture Diagram (textual)

```
+----------------+      HTTPS      +----------------+      HTTP      +------------------+
|   Browser      | <-------------> |  Vite DevSrv   | <-------------> |  Express API     |
| (React SPA)    |   (static files) | (localhost:5173) |   (JSON)   | (localhost:3000) |
+----------------+                 +----------------+                +------------------+
        |                                                               |
        |   REST API calls (fetch)                                      |
        |   (CRUD, approvals)                                           |
        v                                                               v
+--------------------------------------------------------------------------+
|                              SQLite DB                                    |
|  tables: users, change_requests, approvals, audit_log, (sessions files) |
+--------------------------------------------------------------------------+
```

### 11.2 Workflow Diagram (textual)

```
[Login] --> [Create Request] --> [SUBMITTED]
      |
      v
[Manager] --approve?--> [PENDING_APPROVAL] --reject?--> [REJECTED]
      |
      v
[Admin] --approve?--> [APPROVED] --reject?--> [REJECTED]
      |
      v
[Implementer] --> [IMPLEMENTING] --> [IMPLEMENTED]
                |                |
                v                v
            [FAILED] <--- [ROLLBACK]
      |
      v
[Owner] --cancel?--> [CANCELLED]
```

### 11.3 End‑to‑End Example (realistic scenario)
> **Company:** *Acme Corp – IT Operations*  
> **Actors:** Alice (Requester), Bob (Manager), Carol (Admin), Dave (Implementer)

1. **Alice** logs in (`POST /api/auth/login`) and creates a change request to upgrade the web‑server OS. The request is stored with `status = SUBMITTED`. 
2. **Bob** (manager) sees the new request in his *Approvals* page, reads the justification and clicks **Approve**. The backend inserts a row in `approvals` (`decision = APPROVED`) and updates the request status to `PENDING_APPROVAL`. An audit entry records `STATUS_CHANGE: SUBMITTED → PENDING_APPROVAL`. 
3. **Carol** (admin) receives a notification (unread count increments). She opens the pending approvals list, sees Bob’s approval, and clicks **Approve**. The system verifies that a manager approval exists, then updates status to `APPROVED` and logs the transition. 
4. **Dave** (implementer) checks the *Dashboard* and sees the request now in the **Approved** column. He clicks **Start Implementation**, which (once UI added) would call an endpoint to set status to `IMPLEMENTING`. After a successful upgrade, Dave clicks **Mark Completed** → status becomes `IMPLEMENTED`. Each step creates an audit entry. 
5. If the upgrade failed, Dave could set status to `FAILED`. After a rollback plan, a senior engineer could transition to `ROLLED_BACK`. All would be audited. 
6. Throughout the process, Alice can view the request’s history but cannot edit the title or description once it reaches `APPROVED`. 
7. At any point before approval, Alice could cancel the request (`DELETE /api/requests/:id`) providing a cancellation reason; the status changes to `CANCELLED`. 
8. All actions are recorded in `audit_log`, allowing auditors to reconstruct who did what and when.

---

**Prepared by Antigravity – your AI coding assistant**
