# Roots Media Marketing Employee & Task Management System

Roots Media Marketing Employee & Task Management System is a MERN Stack Developer Intern assignment. It includes the project foundation, Employee and Task APIs with their backend business rules, a responsive dashboard, employee and task management screens, and URL-synchronized task search with CSV export.

## Technology stack

- **Frontend:** React, Vite, TypeScript, Tailwind CSS 4, React Router, Axios, Lucide React, React Hook Form, Zod, React Hot Toast
- **Backend:** Node.js, Express, MongoDB, Mongoose, dotenv, CORS, Helmet, Zod
- **Development and tests:** Nodemon, Vitest, Supertest, ESLint, Prettier, concurrently

## Prerequisites

- Node.js 20.19+ (or 22.12+); this project was set up with Node.js 24.16.0.
- npm.
- A MongoDB server running locally, or a MongoDB Atlas connection URI.

MongoDB is a separate prerequisite; this project does not install or start MongoDB for you.

## Project structure

```text
client/
  public/
  src/
    assets/
    components/
      common/
      layout/
    layouts/
    pages/
    routes/
    services/
    hooks/
    utils/
    types/
    App.tsx
    index.css
    main.tsx
  .env.example
  eslint.config.js
  package.json
  tsconfig*.json
  vite.config.ts
server/
  src/
    config/
    controllers/
    middleware/
    models/
    routes/
    services/
    validators/
    utils/
    app.js
    server.js
  tests/
    employeeApi.test.js
    employeeValidators.test.js
    health.test.js
    taskApi.test.js
    taskQuery.test.js
    taskValidators.test.js
  .env.example
  package.json
.editorconfig
.gitignore
.prettierrc.json
package.json
```

The planned feature folders are present, but no empty placeholder files were added.

## Install dependencies

From the project root:

```bash
npm install
npm --prefix client install
npm --prefix server install
```

## Environment variables

Create local environment files by copying the examples:

```bash
copy server\.env.example server\.env
copy client\.env.example client\.env
```

On macOS or Linux, use `cp` instead of `copy`. Set `MONGODB_URI` in `server/.env` to your local MongoDB URI or MongoDB Atlas URI. The checked-in examples contain placeholders/default local settings only; real `.env` files are ignored by Git.

`VITE_API_URL` is the only client-side setting. Variables containing database credentials or other server secrets must stay in `server/.env` and must not use the `VITE_` prefix.

## Start MongoDB

For a local installation, install MongoDB Community Server using the official MongoDB instructions for your operating system, then start its MongoDB service before starting this application. The example URI expects MongoDB at `mongodb://127.0.0.1:27017`.

Alternatively, create a MongoDB Atlas cluster, allow your development machine to connect according to your Atlas network access settings, and set `MONGODB_URI` to the connection string in `server/.env`. Do not commit the URI or share it publicly.

## Run the applications

Start both applications from the project root:

```bash
npm run dev
```

Or start either side separately:

```bash
npm run dev:client
npm run dev:server
```

- Frontend: <http://localhost:5173>
- Backend health check: <http://localhost:5000/api/health>

The health check returns HTTP 200 with `"database": "connected"` only when Mongoose is connected. If MongoDB is unavailable, it returns HTTP 503 with `"database": "disconnected"`.

## Employee data model

Employee records have these fields:

| Field | Type | Rules |
| --- | --- | --- |
| `employeeId` | String | Required, trimmed, unique |
| `fullName` | String | Required, trimmed |
| `email` | String | Required, trimmed, lowercase, unique |
| `phone` | String | Required Indian mobile number; stored as `+91` followed by 10 digits |
| `department` | String | Required: `Development`, `Design`, `QA`, `HR`, or `Sales` |
| `role` | String | Required |
| `joiningDate` | Date | Required |
| `status` | String | `Active`, `Inactive`, or `On Leave`; defaults to `Active` |
| `skills` | String array | Optional; defaults to an empty array |
| `leaveStart`, `leaveEnd` | Date | Required together when status is `On Leave`; end cannot precede start |
| `createdAt`, `updatedAt` | Date | Maintained by Mongoose timestamps |

Email addresses are trimmed and lowercased before persistence. MongoDB unique indexes enforce employee ID and email uniqueness, including under concurrent requests. When an employee's status changes away from `On Leave`, obsolete leave dates are cleared. The required mobile-number format accepts 10 digits starting with 6-9, optionally prefixed with `+91`; spaces and hyphens are accepted as separators.

## Task model and business rules

A Task has a collision-resistant generated UUID `taskId`, title, optional description, optional `assignedEmployee` MongoDB ObjectId reference, an `employeeSnapshot` containing employee ID/name/department, department, priority, status, start date, due date, backend-managed completion date, and Mongoose timestamps.

Task start and due dates use **date-only `YYYY-MM-DD` inputs**, normalized to midnight UTC. Due date cannot be earlier than start date. Leave overlap compares UTC calendar days inclusively: an On Leave employee cannot receive a task whose start day equals either leave boundary or falls between them. Other start dates can be assigned if the employee is otherwise eligible. Inactive employees and missing employee references are rejected.

Tasks always begin in `Todo`; creation rejects client-supplied `status` and `completedDate`. The only allowed status transitions are:

| From | Allowed transitions |
| --- | --- |
| `Todo` | `In Progress`, `Cancelled` |
| `In Progress` | `Completed`, `Cancelled` |
| `Completed` | None |
| `Cancelled` | None |

Same-status updates are rejected. The status endpoint assigns `completedDate` from the server clock when a task becomes Completed. Completed and Cancelled tasks cannot be edited; status and completion date cannot be changed through the regular edit endpoint.

An employee can have at most three active tasks (`Todo` or `In Progress`). Creation and reassignment serialize through a version-field write on each affected Employee document, then count active tasks and write the Task within a MongoDB transaction. Employee deletion acquires the same employee lock, rejects if active tasks exist, fills any missing historical snapshots, and deletes the Employee in the same transaction. Employee records include an internal `taskAssignmentVersion`; it is a coordination token rather than a workload counter. Historical tasks are retained with their snapshot and reference; no cascade deletion occurs.

These operations require a **transaction-capable MongoDB deployment**, such as a replica set or MongoDB Atlas. A standalone local MongoDB instance cannot safely enforce concurrent assignments/deletions; affected endpoints return HTTP 503 with setup guidance rather than silently skipping concurrency protection.

The shared `isTaskOverdue(task, now)` helper compares UTC calendar dates. A task is overdue only when today is later than its due date and it is neither Completed nor Cancelled.

## Employee API

All routes are relative to `http://localhost:5000/api`.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/employees` | Search, filter, sort, and paginate employees |
| `POST` | `/employees` | Create an employee |
| `GET` | `/employees/:employeeId` | Get an employee by MongoDB ObjectId |
| `PUT` | `/employees/:employeeId` | Update one or more allowed employee fields |
| `DELETE` | `/employees/:employeeId` | Delete an employee |
| `GET` | `/health` | API and database health |

Example create request:

```json
{
  "employeeId": "EMP-1001",
  "fullName": "Rohit Sharma",
  "email": "rohit@example.com",
  "phone": "+91 98765-43210",
  "department": "Development",
  "role": "Developer",
  "joiningDate": "2024-01-15",
  "skills": ["React", "Node.js"]
}
```

Successful creation returns HTTP 201:

```json
{
  "success": true,
  "message": "Employee created successfully",
  "data": {
    "_id": "MongoDB-generated ObjectId",
    "employeeId": "EMP-1001",
    "fullName": "Rohit Sharma",
    "email": "rohit@example.com",
    "phone": "+919876543210",
    "department": "Development",
    "role": "Developer",
    "status": "Active",
    "skills": []
  }
}
```

List query parameters:

| Parameter | Description |
| --- | --- |
| `search` | Case-insensitive substring search in employee ID, full name, or email |
| `department` | Filter by an allowed department |
| `status` | Filter by `Active`, `Inactive`, or `On Leave` |
| `page` | 1-based page number; defaults to `1` |
| `limit` | Page size from `1` to `100`; defaults to `10` |
| `sortBy` | One of `fullName`, `employeeId`, `joiningDate`, `createdAt`, or `department`; defaults to `createdAt` |
| `order` | `asc` or `desc`; defaults to `desc` |

Example:

```text
GET /api/employees?search=rohit&department=Development&status=Active&page=1&limit=10&sortBy=fullName&order=asc
```

List responses contain `success`, `data`, and pagination fields: `currentPage`, `pageSize`, `totalItems`, and `totalPages`. An out-of-range page is not clamped: it returns an empty `data` array and retains the requested `currentPage`; `totalPages` reflects the matching record count (`0` when there are no matches).

Validation and errors return a consistent shape:

```json
{
  "success": false,
  "message": "Request validation failed",
  "errors": [{ "field": "email", "message": "Invalid email address" }]
}
```

HTTP statuses: `200` for reads, updates, and deletes; `201` for creation; `400` for invalid input/IDs; `404` for missing employees or routes; `409` for duplicate employee ID/email; and `500` for unexpected server errors. Unexpected error details are not returned to clients.

## Task API

The Task endpoints use MongoDB `_id` as the `:taskId` route parameter. The generated business identifier is returned as `data.taskId`.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/tasks` | Search, filter, sort, and paginate tasks |
| `POST` | `/tasks` | Create a task |
| `GET` | `/tasks/:taskId` | Get a task by MongoDB ObjectId |
| `PUT` | `/tasks/:taskId` | Edit allowed task fields (not status/completed date) |
| `PUT` | `/tasks/:taskId/status` | Apply a valid task status transition |

Example task creation:

```json
{
  "title": "Prepare payment report",
  "description": "Reconcile the monthly payment data",
  "assignedEmployee": "68f000000000000000000001",
  "department": "Development",
  "priority": "High",
  "startDate": "2026-11-10",
  "dueDate": "2026-11-20"
}
```

Creation returns HTTP 201 and sets `status` to `Todo` regardless of any client attempt to set a status or completion date (those fields are rejected).

Task list parameters:

| Parameter | Description |
| --- | --- |
| `search` | Case-insensitive search in task title or assigned employee name (including historical snapshots) |
| `department` | Department enum filter |
| `priority` | `Low`, `Medium`, `High`, or `Critical` |
| `status` | `Todo`, `In Progress`, `Completed`, or `Cancelled` |
| `dueFrom`, `dueTo` | Inclusive UTC date-only due-date bounds |
| `page`, `limit` | 1-based page; limit is 1-100 |
| `sortBy` | `createdAt`, `dueDate`, `priority`, or `title` |
| `order` | `asc` or `desc` |

Priority sorting follows the explicit order `Critical > High > Medium > Low`; `desc` sorts in that order. List responses contain `success`, `data`, and `pagination` (`currentPage`, `pageSize`, `totalItems`, `totalPages`). A page past the end returns an empty array and preserves the requested page number.

Employee deletion is blocked with HTTP 400 while active tasks are assigned. After all assigned tasks become terminal, deletion preserves each task and its historical employee snapshot.
An unsupported transaction deployment returns HTTP 503 for transaction-protected writes; the API does not fall back to unsafe task-count checks.

## Tests and database requirements

Run the test suite using `npm test`. Employee and Task API integration tests use `MONGODB_TEST_URI` (default `mongodb://127.0.0.1:27017/roots_management_test`) and only clean up records they create. Set that variable to a disposable database ending in `_test`; it must be transaction-capable (replica set or Atlas). If MongoDB is unavailable or does not support transactions, database integration tests are skipped with a warning. Schema, validation, route-validation, health, and overdue-helper tests run without MongoDB.

Latest verification in this workspace: `npm test` reported 32 passed and 38 database integration tests skipped because MongoDB was not available; `npm run build`, `npm --prefix client run lint`, and server JavaScript syntax checks passed. Run the database-backed tests against a transaction-capable test deployment before relying on runtime behavior.

## Build and tests

```bash
npm run build
npm test
npm --prefix client run lint
```

## Troubleshooting

- **Port 5173 is occupied:** Stop the process using the port, then restart. Vite is configured to fail rather than switch to another port.
- **Port 5000 is occupied:** Stop the conflicting process or set another `PORT` in `server/.env`.
- **MongoDB connection refused:** Confirm the MongoDB service is installed and running, then check `MONGODB_URI` in `server/.env`.
- **MongoDB Atlas connection fails:** Check the URI, credentials, cluster status, and Atlas network access configuration.
- **CORS errors:** Ensure `CLIENT_URL` in `server/.env` matches the frontend origin exactly (by default, `http://localhost:5173`).
- **Missing environment file:** Copy each `.env.example` to `.env` as shown above and adjust local values.

## Implementation status

**Phase 1 complete:** project setup, frontend shell, backend startup configuration, MongoDB connection lifecycle, and health endpoint.

**Phase 2 complete:** Employee model and CRUD APIs, request validation, search/filter/sort/pagination, and centralized error responses.

**Phase 3 implementation:** Task CRUD/read/status APIs, assignment eligibility and leave checks, three-active-task capacity, transaction-based serialization, status transitions, employee deletion protection, historical snapshots, list filters, and shared overdue helper.

**Phase 4 complete:** responsive application shell, Dashboard, Employee List, and Task List screens. Dashboard metrics use backend pagination metadata because no dedicated dashboard aggregate endpoint exists; employee workload is not fabricated when unavailable. Server-calculated overdue data was added in Phase 6. The dashboard groups employee and task KPIs into responsive cards, including API-counted inactive employees.

**Phase 5 complete:** Employee List, Add Employee, Employee Details, and Edit Employee routes with backend-integrated create, read, update, delete, pagination, validation feedback, and deletion confirmation. The backend prevents deletion when Todo or In Progress tasks are assigned.

**Phase 6 complete:** Task List, Add Task, Task Details, and Edit Task routes with real API operations, eligible-employee selection, server-owned status transitions, and UTC overdue data in task responses. Completed and Cancelled tasks are read-only in the UI.

**Phase 7 complete:** Task search matches titles, current employee names, and preserved employee snapshots; department, priority, status, and inclusive due-date filters run on the server. Sorting and pagination are server-side, and the list state is restored from the URL. `GET /api/tasks/export/csv` streams every record matching the active search, filters, and sort (not just the visible page). CSV text is escaped and spreadsheet formula prefixes are neutralized. Priority ascending order is Critical, High, Medium, Low; default sorting is creation date descending with `_id` as the stable tie-breaker. Canonical date and direction parameters are `dueDateFrom`, `dueDateTo`, and `sortOrder`; legacy `dueFrom`, `dueTo`, and `order` are accepted for compatibility.

**Dashboard enhancements:** The widened responsive sidebar now includes Analytics. Analytics visualizes current employee and task status counts from the backend dashboard metrics, shows the calculated completion rate and recent tasks, and includes loading, retry, and empty states. The header notification bell loads overdue tasks, tasks due within seven days, and employees marked On Leave when opened. Read and dismissed notification state is held in component memory and resets on page reload; this is not a persisted or push-notification feed. Historical trends and employee workload are not shown because the current API does not provide those metrics. Employee and task create/edit forms each provide a light-violet sample autofill button; sample values only populate the form and are not saved until the user submits.

No authentication or AI integrations are included.
