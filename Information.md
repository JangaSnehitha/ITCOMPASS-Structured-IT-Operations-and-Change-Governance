# ChangeOps – Comprehensive Information Document

---

## 1. Project Overview
**Name:** ChangeOps (IT Change Request & Approval Management System)
**Purpose:** Provide a full‑stack solution for submitting, reviewing, approving, scheduling, implementing, and rolling‑back IT change requests while maintaining an immutable audit trail for compliance.

- **Problem:** Organizations need a controlled, auditable workflow for IT changes to avoid service disruption and meet regulatory requirements.
- **Solution:** A web application that enforces a strict **manager → admin** approval chain, supports request cancellation, implementation scheduling, and detailed audit logging.
- **Scope:** Covers request creation, role‑based approvals, status transitions, notifications, reporting, and a polished UI.

---

## 2. Features & Modules
| Module | Key Functionality |
|--------|-------------------|
| **Authentication** | Session‑based login, bcrypt password hashing, role‑based access control. |
| **Requests API** | Create drafts, submit, edit (protected fields), cancel with reason, view details. |
| **Approvals API** | Manager and Admin approve/reject, enforce manager‑first rule, prevent self‑approval, duplicate decisions, and unauthorized actions. |
| **State Machine** | Centralised transition rules (`DRAFT → SUBMITTED → PENDING_APPROVAL → APPROVED → IMPLEMENTING → COMPLETED` etc.) with role validation. |
| **Audit Log** | Immutable record of every status change, cancellation reason, and who performed the action. |
| **Scheduler** | Store `planned_start` and `planned_end` dates, later hook for background jobs. |
| **Front‑end UI** | React 18 + Vite, dark‑mode glassmorphism design, micro‑animations, responsive layout, role‑aware navigation. |
| **Testing** | Jest + Supertest integration tests covering full lifecycle and edge cases. |
| **Deployment** | Docker‑compatible multi‑stage build, environment‑based configuration. |

---

## 3. User Roles & Permissions
- **Requester** – Creates drafts, submits, can cancel while status is `DRAFT`/`SUBMITTED`, views own requests.
- **Manager** – First approver; can **approve** or **reject** a request. Cannot act on a request already **APPROVED** or **CANCELLED**.
- **Admin** – Acts only after a manager approval; can **approve** to move to `IMPLEMENTING` or **reject** to move to `REJECTED`.
- **Implementer** – Not a separate API role yet, but can view `IMPLEMENTING` requests for execution.

Permission checks are enforced at the route level and inside the state‑machine helper.

---

## 4. Technology Stack
| Layer | Technology | Reason |
|------|------------|--------|
| **Backend** | Node.js 18, Express, better‑sqlite3 | Lightweight, fast, SQLite works in local dev & CI. |
| **Database** | SQLite (file‑based) | Zero‑config, transactional safety, easy migration. |
| **Front‑end** | React 18, Vite, vanilla CSS (custom design tokens) | Fast HMR, modern component model, full control over aesthetics (no Tailwind). |
| **Testing** | Jest, Supertest | Unit/integration testing of HTTP endpoints. |
| **Styling** | CSS variables, glass‑morphism, micro‑animations | Provides premium look required by guidelines. |
| **Package Management** | npm (with lockfile) | Consistency across dev machines. |

---

## 5. System Architecture
```
Client (React) <--REST API over HTTPS--> Server (Express)
        |                                   |
   Vite dev server (5173)          Express server (3000)
        |                                   |
   Axios wrapper (api.js)        SQLite DB (itsm.sqlite)
        |                                   |
   AuthContext (session cookie)   StateMachine (src/stateMachine.js)
```
- The client uses an Axios wrapper that automatically includes the session cookie for authenticated calls.
- The server routes (`/api/requests`, `/api/approvals`, `/api/auth`) delegate to helpers in `stateMachine.js` for status validation and audit logging.
- All mutating actions are wrapped in a single SQLite transaction to guarantee atomicity.

---

## 6. Database Design
**Tables**
- `users(id, username, password_hash, role)` – stores credentials and role.
- `services(id, name, description)` – optional categorisation of change types.
- `change_requests(id, title, description, status, requester_id, service_id, planned_start, planned_end, cancellation_reason, created_at, updated_at)` – core entity.
- `approvals(id, request_id, approver_id, decision, comment, created_at)` – one‑to‑many relation to a request.
- `audit_log(id, entity, entity_id, action, details, performed_by, timestamp)` – immutable log.

**Key constraints**
- `status` column has a CHECK enum enforcing allowed values.
- Foreign keys ensure referential integrity (`requester_id → users.id`, `service_id → services.id`).
- Composite unique index on `(request_id, approver_id)` prevents a user from approving the same request twice.

---

## 7. Complete Workflow
1. **Create Draft** – Requester posts to `/api/requests` (status = `DRAFT`).
2. **Submit** – PATCH/PUT removes `status` field, server changes to `SUBMITTED`.
3. **Pending Approval** – Auto‑transition to `PENDING_APPROVAL`.
4. **Manager Decision** – POST `/api/approvals/:id/approve` or `/reject`. If approved, a manager approval row is stored.
5. **Admin Decision** – After a manager approval, admin can approve to move to `APPROVED` → `IMPLEMENTING` or reject to `REJECTED`.
6. **Implementation** – Status `IMPLEMENTING` can be set by a scheduled job or manual action; once done, move to `COMPLETED`.
7. **Cancellation** – Requester can cancel while in early states; sets `CANCELLED` and stores a reason.
8. **Rollback** – If implementation fails, transition to `ROLLING_BACK` then `FAILED`.

All transitions generate an entry in `audit_log`.

---

## 8. API Endpoints (summary)
- `POST /api/auth/login` – returns session cookie.
- `POST /api/requests` – create draft.
- `PUT /api/requests/:id` – edit mutable fields (status stripped).
- `DELETE /api/requests/:id` – cancel request.
- `POST /api/approvals/:id/approve` – manager/admin approve.
- `POST /api/approvals/:id/reject` – manager/admin reject.
- `GET /api/requests/:id` – fetch request with approvals and audit trail.

---

## 9. UI Design Highlights
- **Dark Theme** with `hsl(220,12%,12%)` background, `hsla(0,0%,100%,0.08)` glass panels.
- **Glass‑morphism cards** (`backdrop-filter: blur(12px)`).
- **Micro‑animations** on buttons, badges, and modal dialogs.
- **Responsive** layout – sidebar collapses on <768 px.
- **StatusBadge** component with colour‑coded statuses (green, amber, red, grey).

---

## 10. Running the Project
```powershell
# Backend
cd C:/Users/jsirisha/OneDrive/文档/StressProject/server
npm ci
node src/db.js migrate   # apply migrations
npm run dev               # http://localhost:3000

# Frontend (new terminal)
cd ../client
npm ci
npm run dev               # http://localhost:5173 (proxy /api → 3000)

# Test suite
cd ../server
npm test
```
- Ensure port 3000 is free before starting the backend.
- The front‑end proxies `/api/*` to the backend automatically.

---

## 11. Testing Strategy
- **Integration tests** (`tests/requests.test.js`) cover the full lifecycle, role guards, duplicate decision prevention, and transaction rollback.
- **Future work** – Component tests with React Testing Library, end‑to‑end Cypress scripts, load‑testing of API endpoints.

---

## 12. Deployment Considerations
- **Dockerfile** (multi‑stage): build client, copy `client/dist` into server static folder, expose ports 80 (NGINX) & 3000.
- **Environment variables** (`.env`): `PORT`, `SESSION_SECRET`, `DB_PATH`.
- **Production migration** – run `node src/db.js migrate` as an entry‑point step.
- **Scalability** – SQLite can be swapped for PostgreSQL with minimal code changes (just update `db.js`).

---

## 13. Future Enhancements
- Email/SMS notifications on status changes.
- Role‑based dashboard analytics (charts of request volume, SLA compliance).
- Export reports (PDF/CSV) from audit logs.
- Integration with external ticketing systems (Jira, ServiceNow).
- CI/CD pipeline with automated migrations and container image builds.

---

*Generated by Antigravity – your agentic coding assistant.*
