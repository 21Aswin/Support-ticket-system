-- ============================================================
-- HelpDesk Support Ticket Management System
-- Seed Data for PostgreSQL
-- Database Name: helpdesk_db
-- ============================================================

-- Clean existing data
TRUNCATE TABLE ticket_history, ticket_comments, ticket_assignments, tickets, ticket_categories, users, roles RESTART IDENTITY CASCADE;

-- 1. Insert Roles
INSERT INTO roles (name) VALUES
  ('Admin'),
  ('Support Staff'),
  ('Employee');

-- 2. Insert Users
-- Passwords:
-- admin@helpdesk.local -> Admin@123
-- support@helpdesk.local -> Support@123
-- alex.support@helpdesk.local -> Support@123
-- employee@helpdesk.local -> Employee@123
-- emily.emp@helpdesk.local -> Employee@123
INSERT INTO users (role_id, name, email, password_hash, is_active, created_at) VALUES
  (1, 'System Administrator', 'admin@helpdesk.local', '$2a$10$C1u8565mHbrrwFMdEO2OoOZBARpq1q18poSv9a.NuiJLAyQopJIAi', TRUE, NOW() - INTERVAL '30 days'),
  (2, 'Sarah Jenkins', 'support@helpdesk.local', '$2a$10$FsEB/SvZsGsN5jZXNZ9r5Ov8atB1WKN.qUYcAJQV4IpaahxbIKwsq', TRUE, NOW() - INTERVAL '25 days'),
  (2, 'Alex Rivera', 'alex.support@helpdesk.local', '$2a$10$FsEB/SvZsGsN5jZXNZ9r5Ov8atB1WKN.qUYcAJQV4IpaahxbIKwsq', TRUE, NOW() - INTERVAL '20 days'),
  (3, 'John Doe', 'employee@helpdesk.local', '$2a$10$Vx9FnYBn3NmIWuT0cagriOKA5RXAfAH9ES27UrGy0iAWD5jPUZWNu', TRUE, NOW() - INTERVAL '15 days'),
  (3, 'Emily Watson', 'emily.emp@helpdesk.local', '$2a$10$Vx9FnYBn3NmIWuT0cagriOKA5RXAfAH9ES27UrGy0iAWD5jPUZWNu', TRUE, NOW() - INTERVAL '10 days');

-- 3. Insert Categories
INSERT INTO ticket_categories (name, is_active, created_at) VALUES
  ('Hardware Issue', TRUE, NOW() - INTERVAL '30 days'),
  ('Software Issue', TRUE, NOW() - INTERVAL '30 days'),
  ('Network Issue', TRUE, NOW() - INTERVAL '30 days'),
  ('Access Request', TRUE, NOW() - INTERVAL '30 days'),
  ('Email Issue', TRUE, NOW() - INTERVAL '30 days'),
  ('Other', TRUE, NOW() - INTERVAL '30 days');

-- 4. Insert Realistic Sample Tickets
-- Ticket 1: Assigned
INSERT INTO tickets (ticket_number, title, description, category_id, created_by, assigned_to, priority, status, created_at, updated_at)
VALUES (
  'HD-00101',
  'Laptop cannot connect to office Wi-Fi',
  'My MacBook Pro cannot authenticate with the Corp-Secure Wi-Fi network after password rotation yesterday. Need assistance restoring connectivity.',
  3, -- Network Issue
  4, -- John Doe
  2, -- Sarah Jenkins
  'High',
  'Assigned',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '1 day'
);

-- Ticket 2: In Progress
INSERT INTO tickets (ticket_number, title, description, category_id, created_by, assigned_to, priority, status, created_at, updated_at)
VALUES (
  'HD-00102',
  'Email account access request for new contractor',
  'Requesting temporary Outlook and Teams access for frontend contractor starting on Monday. Department: Engineering.',
  4, -- Access Request
  4, -- John Doe
  2, -- Sarah Jenkins
  'Medium',
  'In Progress',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '4 hours'
);

-- Ticket 3: Open (unassigned)
INSERT INTO tickets (ticket_number, title, description, category_id, created_by, assigned_to, priority, status, created_at, updated_at)
VALUES (
  'HD-00103',
  'Main office printer jamming on 2nd floor',
  'The HP LaserJet MFP on floor 2 keeps showing Paper Jam in Tray 2. Multiple engineers have tried clearing it without success.',
  1, -- Hardware Issue
  5, -- Emily Watson
  NULL,
  'Low',
  'Open',
  NOW() - INTERVAL '5 hours',
  NOW() - INTERVAL '5 hours'
);

-- Ticket 4: Resolved
INSERT INTO tickets (ticket_number, title, description, category_id, created_by, assigned_to, priority, status, resolution, created_at, updated_at, resolved_at)
VALUES (
  'HD-00104',
  'VPN connection failing with timeout error',
  'Cannot connect to the internal staging VPN gateway from home network. Error code: 809 (L2TP/IPsec timeout).',
  3, -- Network Issue
  4, -- John Doe
  2, -- Sarah Jenkins
  'Critical',
  'Resolved',
  'Updated IPSec preshared keys and flushed local DNS cache on client laptop. Verified VPN tunnel established successfully.',
  NOW() - INTERVAL '4 days',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
);

-- Ticket 5: Closed
INSERT INTO tickets (ticket_number, title, description, category_id, created_by, assigned_to, priority, status, resolution, created_at, updated_at, resolved_at, closed_at)
VALUES (
  'HD-00105',
  'Software installation request: Docker Desktop',
  'Need administrative privileges to install Docker Desktop for containerized microservice development.',
  2, -- Software Issue
  4, -- John Doe
  3, -- Alex Rivera
  'Medium',
  'Closed',
  'Software provisioned via corporate MDM portal and developer profile enabled.',
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '4 days',
  NOW() - INTERVAL '3 days'
);

-- Ticket 6: Open (Critical unassigned)
INSERT INTO tickets (ticket_number, title, description, category_id, created_by, assigned_to, priority, status, created_at, updated_at)
VALUES (
  'HD-00106',
  'Employee access card reader not recognizing badge',
  'My building access badge was deactivated after badge renewal. Currently unable to access the server room.',
  4, -- Access Request
  5, -- Emily Watson
  NULL,
  'Critical',
  'Open',
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '1 hour'
);

-- 5. Ticket Assignments History
INSERT INTO ticket_assignments (ticket_id, assigned_to, assigned_by, assigned_at) VALUES
  (1, 2, 1, NOW() - INTERVAL '1 day'),
  (2, 2, 1, NOW() - INTERVAL '2 days'),
  (4, 2, 1, NOW() - INTERVAL '3 days'),
  (5, 3, 1, NOW() - INTERVAL '6 days');

-- 6. Ticket Comments
INSERT INTO ticket_comments (ticket_id, user_id, comment, created_at) VALUES
  (1, 4, 'Please let me know when someone is available to check certificate settings.', NOW() - INTERVAL '1 day 22 hours'),
  (1, 2, 'I have queued this ticket and will run diagnostics shortly.', NOW() - INTERVAL '1 day 18 hours'),
  (2, 4, 'Contractor email should be contractor.dev@helpdesk.local.', NOW() - INTERVAL '2 days 20 hours'),
  (2, 2, 'Working with IT Security on directory authorization.', NOW() - INTERVAL '4 hours'),
  (4, 2, 'Please test the new configuration via GlobalProtect client.', NOW() - INTERVAL '1 day 4 hours'),
  (4, 4, 'Tested and verified! Tunnel connects smoothly now.', NOW() - INTERVAL '1 day 2 hours'),
  (5, 3, 'Software has been pushed through MDM. Please restart machine.', NOW() - INTERVAL '4 days 2 hours'),
  (5, 4, 'Confirmed working. Thanks for the quick response!', NOW() - INTERVAL '3 days');

-- 7. Ticket History (Audit Log)
-- Ticket 1 history
INSERT INTO ticket_history (ticket_id, actor_id, action, old_value, new_value, details, created_at) VALUES
  (1, 4, 'CREATED', NULL, 'Open', 'Ticket created with priority High', NOW() - INTERVAL '2 days'),
  (1, 1, 'ASSIGNED', 'Unassigned', 'Sarah Jenkins', 'Assigned by System Administrator', NOW() - INTERVAL '1 day');

-- Ticket 2 history
INSERT INTO ticket_history (ticket_id, actor_id, action, old_value, new_value, details, created_at) VALUES
  (2, 4, 'CREATED', NULL, 'Open', 'Ticket created with priority Medium', NOW() - INTERVAL '3 days'),
  (2, 1, 'ASSIGNED', 'Unassigned', 'Sarah Jenkins', 'Assigned by System Administrator', NOW() - INTERVAL '2 days'),
  (2, 2, 'STATUS_CHANGE', 'Assigned', 'In Progress', 'Support staff started investigation', NOW() - INTERVAL '4 hours');

-- Ticket 3 history
INSERT INTO ticket_history (ticket_id, actor_id, action, old_value, new_value, details, created_at) VALUES
  (3, 5, 'CREATED', NULL, 'Open', 'Ticket created with priority Low', NOW() - INTERVAL '5 hours');

-- Ticket 4 history
INSERT INTO ticket_history (ticket_id, actor_id, action, old_value, new_value, details, created_at) VALUES
  (4, 4, 'CREATED', NULL, 'Open', 'Ticket created with priority Critical', NOW() - INTERVAL '4 days'),
  (4, 1, 'ASSIGNED', 'Unassigned', 'Sarah Jenkins', 'Assigned by System Administrator', NOW() - INTERVAL '3 days'),
  (4, 2, 'STATUS_CHANGE', 'Assigned', 'In Progress', 'Diagnostics started on VPN gateway', NOW() - INTERVAL '2 days'),
  (4, 2, 'STATUS_CHANGE', 'In Progress', 'Resolved', 'Updated IPSec preshared keys and flushed local DNS cache on client laptop.', NOW() - INTERVAL '1 day');

-- Ticket 5 history
INSERT INTO ticket_history (ticket_id, actor_id, action, old_value, new_value, details, created_at) VALUES
  (5, 4, 'CREATED', NULL, 'Open', 'Ticket created with priority Medium', NOW() - INTERVAL '7 days'),
  (5, 1, 'ASSIGNED', 'Unassigned', 'Alex Rivera', 'Assigned by System Administrator', NOW() - INTERVAL '6 days'),
  (5, 3, 'STATUS_CHANGE', 'Assigned', 'In Progress', 'Processing MDM software delivery', NOW() - INTERVAL '5 days'),
  (5, 3, 'STATUS_CHANGE', 'In Progress', 'Resolved', 'Software provisioned via corporate MDM portal', NOW() - INTERVAL '4 days'),
  (5, 4, 'STATUS_CHANGE', 'Resolved', 'Closed', 'Closed by employee', NOW() - INTERVAL '3 days');

-- Ticket 6 history
INSERT INTO ticket_history (ticket_id, actor_id, action, old_value, new_value, details, created_at) VALUES
  (6, 5, 'CREATED', NULL, 'Open', 'Ticket created with priority Critical', NOW() - INTERVAL '1 hour');
