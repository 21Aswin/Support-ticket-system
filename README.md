# HelpDesk — Support Ticket Management System

An enterprise-grade, full-stack Internal Support Ticket Management System developed strictly following the three-tier architectural separation principle:

```
[ Browser / Client ]
         │
         ▼ HTTP (HTML / CSS / JS)
[ PHP Presentation Layer ] (Port 8000)
         │
         ▼ cURL / REST APIs (JSON + JWT)
[ Node.js + Express Backend ] (Port 3000)
         │
         ▼ Parameterized SQL Pool
[ PostgreSQL Relational Database ] (Port 5432 / 5433: helpdesk_db)
```

---

## Architecture & Non-Negotiable Separation Rules

1. **PHP is strictly the presentation layer**:
   - PHP never connects to PostgreSQL.
   - PHP contains zero database queries and zero database configuration.
   - PHP does not implement ticket assignment logic, workflow business logic, or authorization rules.
   - PHP communicates exclusively with the Node.js backend over HTTP using JSON REST APIs via cURL.
2. **Node.js is the only database access layer**:
   - All database reads and writes to PostgreSQL occur strictly inside Node.js.
   - All status transitions, role validations, assignment transactions, and audit logs are enforced on the Node.js server.
3. **Browser security**:
   - The browser never communicates directly with PostgreSQL.
   - JWT tokens are stored securely in server-side PHP sessions using HttpOnly cookies; tokens are never exposed in HTML, localStorage, or client JavaScript.

---

## Visual Design Reference

Visually designed according to enterprise corporate UI standards:
- **Primary Navy**: `#064B8F`
- **Secondary Blue**: `#0B6DB7`
- **Bright Blue**: `#0B9BC4`
- **Light Blue Accent**: `#E9F5FB`
- **Page Background**: `#F4F6F9`
- **Card Background**: `#FFFFFF`
- **Dark Text**: `#1E293B`
- **Muted Text**: `#64748B`
- **Success Green**: `#2E9B27`
- **Warning Orange**: `#F5A623`
- **Danger Red**: `#DC3545`
- **Typography**: Clean, readable sans-serif typography (`Inter` / system fallback)
- **Components**: Rounded cards with soft drop shadows, intuitive KPI summary metrics, interactive status donut and category bar charts, clean table grids with status pills, timeline comments, and chronological activity history.

---

## User Roles & Strict Workflow State Machine

### 1. User Roles
- **Admin**:
  - Full system oversight, KPI dashboard, and global ticket views.
  - Can assign and reassign tickets to active Support Staff members.
  - Can manage users (create, update, soft deactivate).
  - Can manage categories (create, activate, deactivate).
  - Can view complete chronological audit trails.
- **Support Staff**:
  - Scoped to only tickets assigned directly to their account.
  - Investigates issues, adds comments, and updates ticket status through permitted workflow states (`Assigned -> In Progress -> Resolved`).
  - Required to document resolution notes upon resolving tickets.
- **Employee**:
  - Creates support tickets with Title, Description, Category, and Priority.
  - Scoped strictly to their own tickets.
  - Can post comments, review progress, close resolved tickets, or request reopening.

### 2. Status Transitions State Machine

```
              ┌──────────────┐
              │     Open     │
              └──────┬───────┘
                     │ (Admin Assigns)
                     ▼
              ┌──────────────┐
     ┌───────►│   Assigned   │
     │        └──────┬───────┘
     │               │ (Support Staff Starts Work)
     │               ▼
     │        ┌──────────────┐
     │   ┌───►│ In Progress  │
     │   │    └──────┬───────┘
     │   │           │ (Support Staff Resolves with Note)
     │   │           ▼
     │   │    ┌──────────────┐
     │   │    │   Resolved   │
     │   │    └──┬────────┬──┘
     │   │       │        │
     │   │(Reopen)│        │(Close)
     │   │       ▼        ▼
     │   └─── ┌──────────────┐  ┌──────────────┐
     └─────── │   Reopened   │  │    Closed    │
              └──────────────┘  └──────────────┘
```

Every status change and assignment runs inside a **PostgreSQL Transaction** (`BEGIN ... COMMIT`) that updates the ticket record and inserts an immutable audit log entry into `ticket_history`.

---

## Demo Test Accounts

The database comes pre-seeded with safe, realistic demo accounts for testing:

| Role | Email | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@helpdesk.local` | `Admin@123` | System administrator with full access |
| **Support Staff** | `support@helpdesk.local` | `Support@123` | Primary support technician (Sarah Jenkins) |
| **Support Staff 2** | `alex.support@helpdesk.local` | `Support@123` | Secondary support technician (Alex Rivera) |
| **Employee** | `employee@helpdesk.local` | `Employee@123` | Requester (John Doe) |
| **Employee 2** | `emily.emp@helpdesk.local` | `Employee@123` | Requester (Emily Watson) |

*(Note: The login screen also features quick-fill buttons for 1-click test credentials.)*

---

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: v13.0 or higher
- **PHP**: v8.0 or higher with `curl` and `session` extensions enabled

---

## Setup & Execution Guide

### 1. Database Initialization

Execute the SQL schema and seed data against your PostgreSQL server:

```bash
# Option A: Using the automated Node.js migration runner:
node database/init-db.js

# Option B: Using psql CLI:
psql -U postgres -c "CREATE DATABASE helpdesk_db;"
psql -U postgres -d helpdesk_db -f database/schema.sql
psql -U postgres -d helpdesk_db -f database/seed.sql
```

### 2. Backend API Setup (Node.js)

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Copy environment variables file:
   ```bash
   cp .env.example .env
   ```
3. Configure your database connection parameters in `.env`:
   ```ini
   PORT=3000
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_NAME=helpdesk_db
   DB_USER=your_db_username
   DB_PASSWORD=your_db_password
   JWT_SECRET=super_secret_helpdesk_key_2026_secure
   JWT_EXPIRES_IN=24h
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Start the backend API server:
   ```bash
   npm start
   # Server will start on http://localhost:3000
   ```

### 3. Frontend Presentation Setup (PHP)

1. In a separate terminal, navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Start the PHP built-in web server:
   ```bash
   php -S localhost:8000
   ```
3. Open your browser and navigate to:
   ```
   http://localhost:8000/login.php
   ```

---

## Automated Test Suites

The project includes automated verification test suites:

### 1. Backend REST API Suite (31 Scenarios)
Tests JWT authentication, password hashing, role authorization, resource scoping, illegal status transition rejection, mandatory resolution notes, soft deactivation, and database audit logs:
```bash
node backend/test-api.js
```
*Result: 31 PASSED, 0 FAILED.*

### 2. Frontend End-to-End Integration Suite (18 Scenarios)
Simulates end-to-end browser user journeys (Admin, Support Staff, Employee) with cookies, sessions, CSRF validation, form submissions, and ticket lifecycle:
```bash
node tests/test-frontend-integration.js
```
*Result: 18 PASSED, 0 FAILED.*

### 3. Responsive Layout & Horizontal Overflow Audit (64 Checks)
Audits all pages across 8 viewport breakpoints (`320px`, `375px`, `390px`, `414px`, `768px`, `1024px`, `1366px`, `1440px`) to verify zero overflow:
```bash
node tests/audit-responsive.js
```
*Result: 64 checks, 0 overflow issues.*

---

## Project Structure

```
ticket management system/
├── frontend/
│   ├── config/
│   │   ├── api.php                # Reusable cURL REST API client
│   │   └── auth.php               # Session & role verification helpers
│   ├── includes/
│   │   ├── header.php             # HTML head, Bootstrap 5, stylesheets
│   │   ├── sidebar.php            # Role-tailored navigation sidebar
│   │   ├── topbar.php             # Search, notifications, user dropdown
│   │   └── footer.php             # Scripts & Chart.js initialization
│   ├── assets/
│   │   ├── css/style.css          # Design system & responsive styles
│   │   └── js/main.js             # Mobile toggles & form guards
│   ├── index.php                  # Root entrypoint
│   ├── login.php                  # Authentication page
│   ├── admin-dashboard.php        # Admin overview & analytics
│   ├── employee-dashboard.php     # Employee self-service dashboard
│   ├── support-dashboard.php      # Support technician work queue
│   ├── create-ticket.php          # Ticket creation form
│   ├── ticket-list.php            # Filterable & searchable tickets table
│   ├── ticket-details.php         # Discussion, resolution & timeline
│   ├── manage-users.php           # User account administration
│   ├── manage-categories.php      # Ticket category configuration
│   ├── reports.php                # Performance reports & metrics
│   ├── settings.php               # User settings & diagnostics
│   └── logout.php                 # Session termination
│
├── backend/
│   ├── config/
│   │   └── database.js            # PostgreSQL connection pool
│   ├── controllers/
│   │   ├── auth.controller.js     # Login & profile controller
│   │   ├── users.controller.js    # User management controller
│   │   ├── tickets.controller.js  # Ticket CRUD controller
│   │   ├── comments.controller.js # Comments & audit trail controller
│   │   ├── categories.controller.js # Categories controller
│   │   └── dashboard.controller.js# Aggregated statistics controller
│   ├── middleware/
│   │   ├── authenticate.js        # JWT verification middleware
│   │   ├── authorize.js           # RBAC role enforcement
│   │   ├── validate.js            # Body validation
│   │   └── errorHandler.js        # Centralized JSON error handler
│   ├── routes/                    # Express route definitions
│   ├── services/
│   │   ├── ticket.service.js      # Workflow rules & transactions
│   │   └── assignment.service.js  # Assignment transactions
│   ├── utils/
│   │   └── generateTicketNumber.js# Sequential HD-XXXXX generator
│   ├── app.js                     # Express app setup & CORS
│   ├── server.js                  # Server bootstrap & graceful exit
│   ├── package.json
│   ├── .env.example
│   └── test-api.js                # API test suite
│
├── database/
│   ├── schema.sql                 # PostgreSQL DDL with indexes & checks
│   ├── seed.sql                   # Realistic demo accounts & tickets
│   └── init-db.js                 # Automatic DB initializer
│
├── docs/
│   └── api-documentation.md       # Complete REST API specification
│
├── postman/
│   └── HelpDesk.postman_collection.json # Exported collection
│
├── screenshots/                   # Rendered UI screenshots
│   ├── 01_login_page.png
│   ├── 02_admin_dashboard_desktop.png
│   ├── 03_admin_dashboard_mobile.png
│   ├── 04_ticket_list.png
│   ├── 05_ticket_details.png
│   ├── 06_manage_users.png
│   ├── 07_manage_categories.png
│   ├── 08_reports.png
│   ├── 09_support_dashboard.png
│   ├── 10_employee_dashboard.png
│   └── 11_create_ticket.png
│
├── tests/
│   ├── test-frontend-integration.js # End-to-end integration test
│   └── audit-responsive.js        # Responsive overflow auditor
│
└── README.md
```

---

## Security Verification Checklist

- [x] **No Direct DB Access in PHP**: Verified; PHP makes exclusively HTTP cURL calls to Node.js.
- [x] **Parameterized Queries**: All database operations use `$1, $2` parameters via `pg.Pool`.
- [x] **Password Protection**: Passwords hashed with `bcryptjs` (salt rounds 10); plaintext passwords never stored.
- [x] **JWT Security**: Signed with secret key, validated on every protected API call, stored in server-side PHP session.
- [x] **RBAC Enforcement**: Admin-only routes guarded by `authorize(['Admin'])`.
- [x] **Resource Scoping**: Employees only access their own tickets; Support Staff only access assigned tickets.
- [x] **Audit Logging**: Every status transition, ticket creation, and assignment is recorded in `ticket_history`.
- [x] **Output Escaping**: All PHP variables escaped with `htmlspecialchars($var, ENT_QUOTES, 'UTF-8')`.
- [x] **CSRF Protection**: Form submissions require verified session tokens.
- [x] **Responsive UI**: Audited with 0 overflow from 320px to 1440px.
