# ITCOMPASS: Structured IT Operations and Change Governance

A web-based IT Change Management System designed to manage IT change requests through a structured approval and implementation workflow. The application helps organizations manage changes systematically by incorporating risk assessment, multi-level approvals, scheduling, audit tracking and role-based access control.

##  Project Overview

ChangeOps is a centralized platform for managing IT infrastructure and service-related changes. It provides a controlled workflow in which users can create change requests, managers and administrators review and approve them, and implementation activities can be tracked.

The project applies concepts learned during the ServiceNow Virtual Internship by implementing similar IT Service Management (ITSM) concepts in a custom web application.

### Key Objectives

- Centralize IT change request management.
- Implement a structured, multi-level approval process.
- Prevent unauthorized and invalid state transitions.
- Maintain accountability through audit logs.
- Improve transparency in change management.
- Maintain data integrity using database constraints.

##  Features

### 1. Change Request Management
- Create and manage IT change requests.
- Capture request title, description and associated service.
- Specify priority, risk and impact levels.
- Maintain planned implementation dates.
- Update or cancel eligible requests.

### 2. Multi-Level Approval Workflow
- Manager approval is required before Admin approval.
- Prevent users from approving their own requests.
- Prevent duplicate decisions by the same approval role.
- Allow requests to be approved or rejected with comments.
- Automatically update request status after the required approvals.

### 3. Role-Based Access Control (RBAC)
Different users have different permissions based on their roles.

| Role | Responsibilities |
|---|---|
| Requester | Creates, views and manages their own change requests. |
| Manager | Reviews requests and provides the first-level approval or rejection. |
| Admin | Provides the second-level approval after Manager approval. |
| Implementer | Responsible for implementation-related activities. |

### 4. Change Lifecycle Management
A centralized state machine controls valid transitions between request statuses and prevents invalid lifecycle operations.

### 5. Audit Trail
- Records important activities performed by users.
- Tracks request creation and updates.
- Maintains approval and rejection history.
- Records status changes and cancellation activities.
- Helps maintain accountability and traceability.

### 6. Dashboard and Reporting
- Dashboard overview of change requests.
- Request status distribution.
- Searchable and organized request lists.
- Visual representation of change management information.

### 7. Authentication and Security
- Password hashing using bcryptjs.
- Session-based authentication.
- Role-based authorization.
- Request ownership checks.
- Input validation and database constraints.

## 🛠️ Technology Stack

### Frontend

| Technology | Purpose |
|---|---|
| React.js | Building the interactive user interface. |
| Vite | Frontend development server and build tool. |
| JavaScript | Application logic and interactions. |
| React Router | Navigation between application pages. |
| Axios | Communication between frontend and backend APIs. |
| Recharts | Dashboard charts and data visualization. |
| Lucide React | Icons and interface elements. |

### Backend

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime for backend execution. |
| Express.js | Building RESTful APIs and handling HTTP requests. |
| express-session | Managing user sessions. |
| bcryptjs | Secure password hashing and verification. |
| Helmet | Adding HTTP security headers. |
| CORS | Managing cross-origin requests. |
| Morgan | HTTP request logging. |
| dotenv | Managing environment variables. |

### Database

| Technology | Purpose |
|---|---|
| SQLite | Relational database for persistent storage. |
| better-sqlite3 | Connecting the Node.js backend with SQLite. |
| SQL | Creating tables, querying and managing records. |

### Testing

| Technology | Purpose |
|---|---|
| Jest | Automated testing framework. |
| In-memory SQLite | Isolated database environment during tests. |

### Development Tools

- Visual Studio Code
- Git
- GitHub

## 🔄 Complete Change Management Workflow
<img width="1246" height="490" alt="image" src="https://github.com/user-attachments/assets/15607644-b946-427e-8360-70e7c742ba07" />


**Additional workflow rules:**
- A requester cannot approve their own request.
- Admin approval is allowed only after Manager approval.
- Duplicate approval decisions by the same role are prevented.
- Scheduling information is required before entering the implementation state.
- Eligible requests can be cancelled with a cancellation reason.


## ⚙️ Installation and Setup

### Prerequisites

Install the following before running the project:

- Node.js
- npm
- Visual Studio Code
- Git


### Step 1: Install Backend Dependencies

```bash
cd server
npm install
```

### Step 2: Configure Environment Variables

Create a `.env` file inside the server directory.

Add the environment variables required by your backend configuration, such as the session secret and port.

Example:

```env
PORT=5000
SESSION_SECRET=replace_with_a_secure_random_secret
NODE_ENV=development
```

Make sure your `.env` file is included in `.gitignore`.

### Step 3: Start the Backend

Run the development command configured in `server/package.json`.

For example, if the project uses a `dev` script:

```bash
npm run dev
```

### Step 4: Install Frontend Dependencies

Open another terminal:

```bash
cd client
npm install
```

### Step 5: Start the Frontend

Run the development command configured in `client/package.json`.

For a typical Vite project:

```bash
npm run dev
```

Open the local URL displayed in the terminal to access the application.

*Note: The exact scripts, environment variable names and frontend API configuration should match your actual package.json and source files.*

## 🚀 Future Enhancements

- Email and real-time notifications.
- Advanced reporting and analytics.
- Automated risk assessment.
- Integration with external ITSM platforms.
- More detailed implementation monitoring.
- Enhanced audit log tamper detection.
- Deployment to a cloud platform.
- Automated backup and recovery mechanisms.

## 🎯 Learning Outcomes

Through this project, the following concepts were applied:

- Full-stack web application development.
- REST API design and implementation.
- Relational database design and SQL.
- Authentication and authorization.
- Role-Based Access Control.
- State machine implementation.
- Multi-level approval workflows.
- Database transactions and prepared statements.
- Automated API testing using Jest and Supertest.
- IT Service Management concepts.

## 👩‍💻 Project Information

**Project Name:** ChangeOps – IT Change Request and Approval Management System

**Domain:** IT Service Management (ITSM)

**Application Type:** Full-Stack Web Application

**Frontend:** React.js

**Backend:** Node.js and Express.js

**Database:** SQLite

**Testing:** Jest and Supertest

**Learning Context:** ServiceNow Virtual Internship

---

