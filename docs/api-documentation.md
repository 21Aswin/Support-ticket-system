# HelpDesk REST API Specification

This document provides complete technical documentation for all HTTP REST API endpoints provided by the **HelpDesk Support Ticket Management System** backend layer.

---

## Architecture & Base Configuration

- **Protocol**: HTTP/1.1
- **Format**: JSON (`Content-Type: application/json`, `Accept: application/json`)
- **Default Port**: `3000`
- **Base URL**: `http://localhost:3000/api`
- **Authentication**: JWT Bearer token supplied in HTTP header `Authorization: Bearer <TOKEN>`

### Consistent Response Formats

#### Success Response
```json
{
  "success": true,
  "message": "Human-readable confirmation message",
  "data": {},
  "meta": {}
}
```

#### Error Response
```json
{
  "success": false,
  "message": "Clear error message",
  "errors": ["Specific error detail"]
}
```

---

## 1. Authentication Endpoints

### 1.1 User Login
- **Endpoint**: `POST /api/auth/login`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "admin@helpdesk.local",
    "password": "Admin@123"
  }
  ```
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": 1,
        "name": "System Administrator",
        "email": "admin@helpdesk.local",
        "role": "Admin",
        "role_id": 1
      }
    }
  }
  ```
- **Error (401 Unauthorized)**:
  ```json
  {
    "success": false,
    "message": "Invalid email or password.",
    "errors": ["Authentication failed"]
  }
  ```

### 1.2 User Registration (Create Account)
- **Endpoint**: `POST /api/auth/register`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "name": "Alex Morgan",
    "email": "alex.morgan@helpdesk.local",
    "password": "Password123!",
    "confirm_password": "Password123!"
  }
  ```
- **Success (201 Created)**: Returns JWT token and registered Employee profile.
- **Error (409 Conflict)**: Email is already registered.

### 1.3 Forgot Password (Request Reset)
- **Endpoint**: `POST /api/auth/forgot-password`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "employee@helpdesk.local"
  }
  ```
- **Success (200 OK)**: Returns confirmation and reset token (`reset_token`).

### 1.4 Reset Password (Set New Password)
- **Endpoint**: `POST /api/auth/reset-password`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "token": "d7a4b8e...",
    "password": "BrandNewPassword123!",
    "confirm_password": "BrandNewPassword123!"
  }
  ```
- **Success (200 OK)**: Password updated; invalidates reset token.


### 1.2 Get Authenticated Profile
- **Endpoint**: `GET /api/auth/profile`
- **Access**: Authenticated (All roles)
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Profile retrieved successfully",
    "data": {
      "id": 1,
      "name": "System Administrator",
      "email": "admin@helpdesk.local",
      "role": "Admin",
      "role_id": 1,
      "is_active": true,
      "created_at": "2026-10-24T06:30:00.000Z"
    }
  }
  ```

---

## 2. Tickets Endpoints

### 2.1 List Tickets
- **Endpoint**: `GET /api/tickets`
- **Access**: Authenticated (Scoped by role: Admin sees all; Support Staff sees assigned; Employee sees own)
- **Query Parameters**:
  - `status`: Filter by status (`Open`, `Assigned`, `In Progress`, `Resolved`, `Closed`, `Reopened`)
  - `priority`: Filter by priority (`Low`, `Medium`, `High`, `Critical`)
  - `category_id`: Integer ID
  - `search`: Keyword string matching ticket number, title, or description
  - `limit`: Integer (default 50)
  - `offset`: Integer (default 0)
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Tickets retrieved successfully",
    "data": [
      {
        "id": 1,
        "ticket_number": "HD-00101",
        "title": "Laptop cannot connect to office Wi-Fi",
        "description": "My MacBook Pro cannot authenticate with the Corp-Secure Wi-Fi network.",
        "priority": "High",
        "status": "Assigned",
        "category_id": 3,
        "category_name": "Network Issue",
        "created_by": 4,
        "requester_name": "John Doe",
        "requester_email": "employee@helpdesk.local",
        "assigned_to": 2,
        "assigned_name": "Sarah Jenkins",
        "created_at": "2026-11-21T06:30:00.000Z"
      }
    ],
    "meta": { "total": 1, "limit": 50, "offset": 0 }
  }
  ```

### 2.2 Create Ticket
- **Endpoint**: `POST /api/tickets`
- **Access**: Employee or Admin
- **Request Body**:
  ```json
  {
    "title": "Printer is jamming on 2nd floor",
    "description": "Tray 2 keeps jamming when duplexing reports.",
    "category_id": 1,
    "priority": "Medium"
  }
  ```
- **Success (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Ticket created successfully",
    "data": {
      "id": 7,
      "ticket_number": "HD-00107",
      "status": "Open",
      "priority": "Medium",
      "created_at": "2026-11-23T06:45:00.000Z"
    }
  }
  ```

### 2.3 Get Ticket Details
- **Endpoint**: `GET /api/tickets/:id`
- **Access**: Authorized users (Admin, Creator, or Assignee)
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Ticket details retrieved successfully",
    "data": {
      "id": 1,
      "ticket_number": "HD-00101",
      "title": "Laptop cannot connect to office Wi-Fi",
      "status": "Assigned",
      "priority": "High",
      "resolution": null,
      "created_by": 4,
      "requester_name": "John Doe",
      "assigned_to": 2,
      "assigned_name": "Sarah Jenkins"
    }
  }
  ```
- **Error (403 Forbidden)**: Accessing another user's ticket without authorization.

### 2.4 Assign / Reassign Ticket
- **Endpoint**: `PATCH /api/tickets/:id/assign`
- **Access**: Admin only
- **Request Body**:
  ```json
  {
    "assigned_to": 2
  }
  ```
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Ticket assigned to Sarah Jenkins successfully.",
    "data": {
      "ticketId": 1,
      "assigned_to": 2,
      "assignee_name": "Sarah Jenkins",
      "status": "Assigned"
    }
  }
  ```

### 2.5 Update Ticket Status (Strict Workflow)
- **Endpoint**: `PATCH /api/tickets/:id/status`
- **Access**: Role-dependent
  - `Open -> Assigned`: Admin (via assign endpoint)
  - `Assigned -> In Progress`: Assigned Support Staff or Admin
  - `In Progress -> Resolved`: Assigned Support Staff or Admin (requires `resolution`)
  - `Resolved -> Closed`: Ticket Requester or Admin
  - `Resolved -> Reopened`: Ticket Requester or Admin (optional `reason`)
  - `Reopened -> Assigned`: Admin
  - `Reopened -> In Progress`: Assigned Support Staff or Admin
- **Request Body (Resolving)**:
  ```json
  {
    "status": "Resolved",
    "resolution": "Replaced faulty Ethernet patch cable."
  }
  ```
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Ticket status successfully updated to 'Resolved'.",
    "data": {
      "ticketId": 1,
      "old_status": "In Progress",
      "new_status": "Resolved",
      "resolution": "Replaced faulty Ethernet patch cable."
    }
  }
  ```
- **Error (409 Conflict)**: Invalid transition attempted (e.g., `Assigned -> Closed`).

---

## 3. Comments and History Endpoints

### 3.1 Get Ticket Comments
- **Endpoint**: `GET /api/tickets/:id/comments`
- **Access**: Authorized users for the ticket
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Comments retrieved successfully",
    "data": [
      {
        "id": 1,
        "ticket_id": 1,
        "user_id": 4,
        "comment": "Please let me know when someone is available.",
        "user_name": "John Doe",
        "user_role": "Employee",
        "created_at": "2026-11-21T08:00:00.000Z"
      }
    ]
  }
  ```

### 3.2 Add Ticket Comment
- **Endpoint**: `POST /api/tickets/:id/comments`
- **Access**: Authorized users for the ticket
- **Request Body**:
  ```json
  {
    "comment": "Assigned technician is investigating router logs."
  }
  ```
- **Success (201 Created)**: Returns created comment with user name and role.

### 3.3 Get Ticket Audit History
- **Endpoint**: `GET /api/tickets/:id/history`
- **Access**: Authorized users for the ticket
- **Success (200 OK)**: Chronological list of events (`CREATED`, `ASSIGNED`, `STATUS_CHANGE`, `COMMENT`).

---

## 4. Dashboard Endpoints

### 4.1 Get Dashboard Statistics
- **Endpoint**: `GET /api/dashboard/stats`
- **Access**: Authenticated (Role-scoped)
- **Success (200 OK - Admin)**: Returns total tickets, counts per status, employee count, staff count, category breakdown, priority breakdown, and staff workload.

### 4.2 Get Recent Tickets
- **Endpoint**: `GET /api/dashboard/recent-tickets`
- **Access**: Authenticated (Role-scoped)
- **Success (200 OK)**: Returns the 10 most recent tickets visible to the requester.

---

## 5. User and Category Administration

### 5.1 List Users
- **Endpoint**: `GET /api/users`
- **Access**: Admin only (or query `role=Support Staff` for assignment reference)

### 5.2 Create User
- **Endpoint**: `POST /api/users`
- **Access**: Admin only
- **Request Body**:
  ```json
  {
    "name": "Jane Miller",
    "email": "jane@helpdesk.local",
    "password": "Password123!",
    "role_id": 2
  }
  ```

### 5.3 Deactivate User
- **Endpoint**: `DELETE /api/users/:id`
- **Access**: Admin only (Soft deactivates: `is_active = FALSE`)

### 5.4 Categories Endpoints
- `GET /api/categories`: List categories (all authenticated)
- `POST /api/categories`: Create category (Admin only)
- `PUT /api/categories/:id`: Rename category (Admin only)
- `PATCH /api/categories/:id/status`: Toggle active status (Admin only)

---

## 6. Notifications Endpoints

### 6.1 List User Notifications
- **Endpoint**: `GET /api/notifications`
- **Query Parameters**:
  - `unread_only=true|false` (Optional, filter by unread status)
  - `limit=50` (Optional pagination limit)
  - `offset=0` (Optional pagination offset)
- **Access**: Authenticated (Returns notifications for current authenticated user)
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Notifications retrieved successfully",
    "data": [
      {
        "id": 1,
        "user_id": 2,
        "ticket_id": 17,
        "type": "assigned",
        "title": "New Ticket Assigned: HD-00017",
        "message": "You have been assigned to handle ticket 'Laptop display flickering'...",
        "is_read": false,
        "created_at": "2026-11-23T10:19:00.000Z",
        "ticket_number": "HD-00017",
        "ticket_status": "Assigned",
        "ticket_priority": "High"
      }
    ],
    "meta": {
      "unread_count": 1,
      "total": 1
    }
  }
  ```

### 6.2 Get Unread Notification Count
- **Endpoint**: `GET /api/notifications/unread-count`
- **Access**: Authenticated
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Unread count retrieved successfully",
    "data": {
      "unread_count": 1
    }
  }
  ```

### 6.3 Mark Single Notification as Read
- **Endpoint**: `PATCH /api/notifications/:id/read`
- **Access**: Authenticated (User must own notification)
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Notification marked as read",
    "data": {
      "notification": { "id": 1, "is_read": true },
      "unread_count": 0
    }
  }
  ```

### 6.4 Mark All Notifications as Read
- **Endpoint**: `PATCH /api/notifications/read-all`
- **Access**: Authenticated
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "message": "All notifications marked as read",
    "data": {
      "unread_count": 0
    }
  }
  ```

### 6.5 Mark All Notifications for a Ticket as Read
- **Endpoint**: `PATCH /api/notifications/ticket/:ticketId/read`
- **Access**: Authenticated (Marks all unread notifications about this ticket for caller)
- **Success (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Ticket notifications marked as read",
    "data": {
      "unread_count": 0
    }
  }
  ```

