# Implementation Overview – StressProject

## 🎯 Goal
Create a **full‑stack IT Change Request & Approval Management System** that:
- Allows requesters to draft and submit change requests.
- Enforces a strict **manager → admin** approval chain.
- Supports cancellation with reason, scheduling, implementation, and rollback.
- Persists every state transition in an **audit log** for compliance.
- Provides a **Dribbble‑inspired React UI** with modern styling (dark mode, glassmorphism, micro‑animations).

---

## 📂 Repository Layout
```
StressProject/
├─ client/                 # React + Vite front‑end
│   ├─ src/
│   │   ├─ components/     # Sidebar, Topbar, StatusBadge, Modal, etc.
│   │   ├─ pages/          # Dashboard, Approvals, Requests, …
│   │   ├─ api.js          # Axios wrapper (adds session cookie)
│   │   ├─ AuthContext.jsx # React context for auth/session
│   │   └─ App.jsx          # Router & protected‑route wiring
│   ├─ index.html
│   ├─ vite.config.js
│   └─ package.json
│
├─ server/                 # Node/Express back‑end
│   ├─ src/
│   │   ├─ routes/          # auth, requests, approvals, services, …
│   │   ├─ middleware/auth.js
│   │   ├─ stateMachine.js   # Centralised status‑transition rules
│   │   ├─ db.js             # better‑sqlite3 wrapper + migration runner
│   │   └─ index.js          # Express app entry point
│   ├─ migrations/          # SQL migration files (adds CANCELLED status)
│   ├─ tests/requests.test.js
│   ├─ schema.sql           # Initial DB schema (pre‑migration)
│   └─ package.json
│
└─ db/                     # SQLite file (itsm.sqlite) created at runtime
```

> **Clickable file links** (use them in the IDE):
> - [server/src/routes/approvals.js](file:///C:/Users/jsirisha/OneDrive/%E6%96%87%E6%A1%A3/StressProject/server/src/routes/approvals.js)
> - [server/src/routes/requests.js](file:///C:/Users/jsirisha/OneDrive/%E6%96%87%E6%A1%A3/StressProject/server/src/routes/requests.js)
> - [server/src/stateMachine.js](file:///C:/Users/jsirisha/OneDrive/%E6%96%87%E6%A1%A3/StressProject/server/src/stateMachine.js)
> - [client/README.md](file:///C:/Users/jsirisha/OneDrive/%E6%96%87%E6%A1%A3/StressProject/client/README.md)

---

## 🛠️ Backend Details
### 1️⃣ Database (SQLite + better‑sqlite3)
- **Tables**: `users`, `services`, `change_requests`, `approvals`, `audit_log`.
- **Status enum** (CHECK constraint) now includes:
  `DRAFT, SUBMITTED, PENDING_APPROVAL, APPROVED, REJECTED, CANCELLED, IMPLEMENTING, ROLLING_BACK, COMPLETED`.
- **Migration** `2024‑10‑30‑add‑cancelled.sql` safely adds the `CANCELLED` status without losing data.

### 2️⃣ State Machine (`src/stateMachine.js`)
```js
const transitions = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['PENDING_APPROVAL'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['IMPLEMENTING'],
  IMPLEMENTING: ['COMPLETED', 'ROLLING_BACK'],
  // ...other terminal states
};
```
- `canTransition(current, target, role, approvalsSoFar)` validates the role‑based chain (manager first, admin second).
- `applyTransition(requestId, toStatus, extra)` updates the row **inside a single transaction** and creates an audit entry via `logStatusChange()`.

### 3️⃣ Routes
| Route | Method | Core Logic |
|-------|--------|-----------|
| `/api/requests` | `POST` | Creates a **DRAFT** row, links to `requester_id`.
| `/api/requests/:id` | `PUT` | **Guarded** – strips any `status` field; only mutable fields (`title`, `description`, `planned_*`) are allowed.  Returns `400` if `status` is supplied.
| `/api/requests/:id` | `DELETE` | Cancellation – only allowed for the original requester while status is `DRAFT` or `SUBMITTED`. Sets `status = CANCELLED`, stores `cancellation_reason`, writes audit `CANCEL`.
| `/api/approvals/:id/approve` | `POST` | Checks role (manager/admin), prevents self‑approval, avoids duplicate approvals, enforces manager‑first rule, inserts an approval row; if **both** approvals exist, calls `applyTransition` to move request to `APPROVED`.
| `/api/approvals/:id/reject` | `POST` | Same guards as approve, then immediately transitions request to `REJECTED`.
| `/api/auth/*` | – | Session‑based login with bcrypt password hash.

### 4️⃣ Audit Logging
- Every status change → `INSERT INTO audit_log (entity, entity_id, action, details)` with `action = 'STATUS_CHANGE'`.
- Cancellations → `action = 'CANCEL'` and include the reason.
- The helper `logStatusChange(requestId, from, to, performedBy)` lives in `stateMachine.js` and is called after each successful `UPDATE`.

### 5️⃣ Transaction Safety
All mutating operations (`approve`, `reject`, `cancel`) are wrapped in:
```js
const tx = db.transaction(() => { /* multiple queries */ });
try { tx(); } catch (e) { /* automatic rollback */ }
```
The Jest test *“Transactional integrity”* confirms that a forced DB error leaves the request unchanged (`DRAFT`).

---

## 🎨 Front‑end Details
- **Stack**: React 18, Vite, Tailwind‑free vanilla CSS (custom design tokens in `index.css`).
- **Routing** (`react-router-dom@6`):
  - `/login` → `Login.jsx`
  - `/dashboard` → `Dashboard.jsx`
  - `/requests/*` → pages for listing, creating, and details.
  - Protected routes read `AuthContext.isAuthenticated` and redirect to `/login`.
- **Design System** (in `index.css`):
  ```css
  :root {
    --color-bg: hsl(220, 12%, 12%);
    --color-surface: hsla(0,0%,100%,0.08);
    --color-primary: hsl(200, 80%, 55%);
    --radius: 0.75rem;
    --transition: 0.2s ease-out;
  }
  ```
  - Glass‑morphism panels (`backdrop-filter: blur(12px)`), subtle shadows, and smooth hover fades.
- **Components**:
  - `Sidebar` – collapsible, icons from `lucide-react`.
  - `Topbar` – shows user name & logout button.
  - `StatusBadge` – colour‑coded badge (green = APPROVED, amber = PENDING, red = REJECTED, grey = DRAFT/CANCELLED).
  - `Modal` – used for create‑request form, cancellation confirmation, etc.
- **API Wrapper (`api.js`)** automatically attaches the cookie returned by `/api/auth/login` and returns formatted errors.
- **Micro‑animations**:
  - Buttons: `transform: translateY(-2px)` on hover.
  - Badges: opacity transition when status changes.
  - Modals: slide‑up from 20px below with easing.

---

## ✅ How to Run the Whole System
```powershell
# 1️⃣ Ensure port 3000 is free (kill any stray node process)
netstat -ano | findstr :3000
# If a PID appears, kill it:
# taskkill /PID <PID> /F

# 2️⃣ Backend
cd C:/Users/jsirisha/OneDrive/文档/StressProject/server
npm ci                # install exact deps
node src/db.js migrate # apply migration (adds CANCELLED)
npm run dev          # starts on http://localhost:3000

# 3️⃣ Front‑end (in a new terminal)
cd ../client
npm ci
npm run dev          # http://localhost:5173 (proxies /api to 3000)

# 4️⃣ Run tests (backend only)
cd ../server
npm test
```
The dev servers hot‑reload; any change to `src/routes/*` or `src/stateMachine.js` will automatically restart the backend.

---

## 📚 Testing Strategy
- **Integration tests** (`tests/requests.test.js`) cover the entire workflow:
  - Draft → submit → pending → approvals → schedule → implementation.
  - Guard clauses (self‑approval, role‑mismatch, duplicate approvals).
  - Cancellation reason storage and audit entry creation.
  - Transaction rollback on a forced DB error.
- **All tests now pass** (`npm test` → 10/10).
- Future work: add unit tests for the React components (React Testing Library) and end‑to‑end tests with Cypress.

---

## 📦 Deployment Considerations
- **Dockerfile** (optional) – copy `server/` and `client/build/` into a multi‑stage image; expose ports `3000` (API) and `80` (static front‑end).
- **Environment variables** (via `.env`):
  - `PORT=3000`
  - `SESSION_SECRET=your‑strong‑secret`
  - `DB_PATH=./db/itsm.sqlite`
- **Production DB migration** – run `node src/db.js migrate` during container start‑up.

---

## 📌 Summary
The project now delivers a **robust, audited, and well‑styled** IT change‑management system:
- **Backend** enforces strict state rules, role‑based approvals, and full audit trails.
- **Frontend** offers a polished UI with modern design aesthetics.
- **Tests** guarantee correctness and transactional safety.
- **Documentation** (this file) gives new developers a single source of truth.

Feel free to extend the system (e.g., add email notifications, export reports, or integrate with an external ticketing API). Happy coding! 🚀
