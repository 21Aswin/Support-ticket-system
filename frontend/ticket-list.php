<?php
require_once __DIR__ . '/config/auth.php';
$user = require_auth();

$page_title = 'Tickets Directory';

// Query parameters for filters
$statusFilter = $_GET['status'] ?? '';
$priorityFilter = $_GET['priority'] ?? '';
$categoryFilter = $_GET['category_id'] ?? '';
$searchQuery = $_GET['search'] ?? '';

// Build query string for API
$queryParams = [];
if (!empty($statusFilter)) $queryParams['status'] = $statusFilter;
if (!empty($priorityFilter)) $queryParams['priority'] = $priorityFilter;
if (!empty($categoryFilter)) $queryParams['category_id'] = $categoryFilter;
if (!empty($searchQuery)) $queryParams['search'] = $searchQuery;

$queryString = !empty($queryParams) ? '?' . http_build_query($queryParams) : '';

// Call Node.js API
$ticketsRes = api_request('GET', '/api/tickets' . $queryString);
$tickets = $ticketsRes['body']['data'] ?? [];
$meta = $ticketsRes['body']['meta'] ?? ['total' => count($tickets)];

// Fetch categories for filter dropdown
$catRes = api_request('GET', '/api/categories?active_only=true');
$categories = $catRes['body']['data'] ?? [];

require_once __DIR__ . '/includes/header.php';
require_once __DIR__ . '/includes/sidebar.php';
?>

<div class="app-main">
  <?php require_once __DIR__ . '/includes/topbar.php'; ?>

  <main class="app-content">
    <div class="page-header">
      <div class="page-title">
        <h2>
          <?php if ($user['role'] === 'Admin'): ?>
            All Support Tickets
          <?php elseif ($user['role'] === 'Support Staff'): ?>
            Assigned Support Queue
          <?php else: ?>
            My Support Tickets
          <?php endif; ?>
        </h2>
        <p>Browse, filter, and track technical support cases across the organization</p>
      </div>
      <div class="page-actions">
        <?php if ($user['role'] === 'Admin' || $user['role'] === 'Employee'): ?>
          <a href="create-ticket.php" class="btn btn-primary-custom">
            <i class="bi bi-plus-lg"></i> Create Ticket
          </a>
        <?php endif; ?>
      </div>
    </div>

    <!-- Filter Bar Card -->
    <div class="filter-bar">
      <form method="GET" action="ticket-list.php" class="d-flex flex-wrap align-items-center gap-3 w-100">
        <!-- Search -->
        <div class="flex-grow-1" style="min-width: 220px;">
          <input type="text" name="search" class="form-control form-control-custom" 
                 placeholder="Search by ticket # or keyword..." value="<?= e($searchQuery) ?>">
        </div>

        <!-- Status Filter -->
        <div style="min-width: 150px;">
          <select name="status" class="form-select form-control-custom" onchange="this.form.submit()">
            <option value="">-- All Statuses --</option>
            <option value="Open" <?= $statusFilter === 'Open' ? 'selected' : '' ?>>Open</option>
            <option value="Assigned" <?= $statusFilter === 'Assigned' ? 'selected' : '' ?>>Assigned</option>
            <option value="In Progress" <?= $statusFilter === 'In Progress' ? 'selected' : '' ?>>In Progress</option>
            <option value="Resolved" <?= $statusFilter === 'Resolved' ? 'selected' : '' ?>>Resolved</option>
            <option value="Closed" <?= $statusFilter === 'Closed' ? 'selected' : '' ?>>Closed</option>
            <option value="Reopened" <?= $statusFilter === 'Reopened' ? 'selected' : '' ?>>Reopened</option>
          </select>
        </div>

        <!-- Priority Filter -->
        <div style="min-width: 140px;">
          <select name="priority" class="form-select form-control-custom" onchange="this.form.submit()">
            <option value="">-- All Priorities --</option>
            <option value="Low" <?= $priorityFilter === 'Low' ? 'selected' : '' ?>>Low</option>
            <option value="Medium" <?= $priorityFilter === 'Medium' ? 'selected' : '' ?>>Medium</option>
            <option value="High" <?= $priorityFilter === 'High' ? 'selected' : '' ?>>High</option>
            <option value="Critical" <?= $priorityFilter === 'Critical' ? 'selected' : '' ?>>Critical</option>
          </select>
        </div>

        <!-- Category Filter -->
        <div style="min-width: 160px;">
          <select name="category_id" class="form-select form-control-custom" onchange="this.form.submit()">
            <option value="">-- All Categories --</option>
            <?php foreach ($categories as $cat): ?>
              <option value="<?= e($cat['id']) ?>" <?= (string)$categoryFilter === (string)$cat['id'] ? 'selected' : '' ?>>
                <?= e($cat['name']) ?>
              </option>
            <?php endforeach; ?>
          </select>
        </div>

        <!-- Filter / Reset Buttons -->
        <div class="d-flex gap-2">
          <button type="submit" class="btn btn-primary-custom">
            <i class="bi bi-funnel-fill"></i> Filter
          </button>
          <?php if (!empty($statusFilter) || !empty($priorityFilter) || !empty($categoryFilter) || !empty($searchQuery)): ?>
            <a href="ticket-list.php" class="btn btn-outline-custom" title="Clear all filters">
              <i class="bi bi-x-circle"></i> Reset
            </a>
          <?php endif; ?>
        </div>
      </form>
    </div>

    <!-- Tickets Table Card -->
    <div class="card-custom">
      <div class="card-custom-header">
        <h5 class="card-custom-title">
          <i class="bi bi-table text-primary"></i> 
          <span>Tickets Queue</span>
        </h5>
        <span class="badge bg-light text-dark border px-3 py-2">
          Found <strong><?= e($meta['total'] ?? count($tickets)) ?></strong> Tickets
        </span>
      </div>

      <div class="table-responsive-custom">
        <table class="table-custom">
          <thead>
            <tr>
              <th>Ticket #</th>
              <th>Title / Summary</th>
              <th>Category</th>
              <th>Requester</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Assigned To</th>
              <th>Created Date</th>
              <th class="text-end">Action</th>
            </tr>
          </thead>
          <tbody>
            <?php if (!empty($tickets)): ?>
              <?php foreach ($tickets as $ticket): ?>
                <?php
                  $statusSlug = strtolower(str_replace(' ', '-', $ticket['status']));
                  $prioritySlug = strtolower($ticket['priority']);
                ?>
                <tr>
                  <td>
                    <a href="ticket-details.php?id=<?= e($ticket['id']) ?>" class="ticket-number-link">
                      <?= e($ticket['ticket_number']) ?>
                    </a>
                  </td>
                  <td>
                    <div class="fw-semibold text-dark"><?= e($ticket['title']) ?></div>
                    <small class="text-muted text-truncate d-inline-block" style="max-width: 300px;">
                      <?= e($ticket['description']) ?>
                    </small>
                  </td>
                  <td>
                    <span class="text-muted"><?= e($ticket['category_name']) ?></span>
                  </td>
                  <td>
                    <div class="text-dark fw-medium"><?= e($ticket['requester_name']) ?></div>
                    <small class="text-muted"><?= e($ticket['requester_email']) ?></small>
                  </td>
                  <td>
                    <span class="badge-priority badge-<?= e($prioritySlug) ?>">
                      <?= e($ticket['priority']) ?>
                    </span>
                  </td>
                  <td>
                    <span class="badge-status badge-<?= e($statusSlug) ?>">
                      <?= e($ticket['status']) ?>
                    </span>
                  </td>
                  <td>
                    <?php if (!empty($ticket['assigned_name'])): ?>
                      <span class="text-dark"><i class="bi bi-person-fill text-primary me-1"></i><?= e($ticket['assigned_name']) ?></span>
                    <?php else: ?>
                      <span class="text-muted fst-italic">Unassigned</span>
                    <?php endif; ?>
                  </td>
                  <td>
                    <span class="text-muted small"><?= date('M d, Y', strtotime($ticket['created_at'])) ?></span>
                  </td>
                  <td class="text-end">
                    <a href="ticket-details.php?id=<?= e($ticket['id']) ?>" class="btn btn-sm btn-outline-custom">
                      <i class="bi bi-arrow-right"></i> Open
                    </a>
                  </td>
                </tr>
              <?php endforeach; ?>
            <?php else: ?>
              <tr>
                <td colspan="9" class="text-center text-muted py-5">
                  <i class="bi bi-search text-muted fs-1 d-block mb-2"></i>
                  No tickets found matching your selected criteria.
                  <?php if (!empty($statusFilter) || !empty($priorityFilter) || !empty($categoryFilter) || !empty($searchQuery)): ?>
                    <div class="mt-2">
                      <a href="ticket-list.php" class="btn btn-sm btn-outline-custom">Clear Filters</a>
                    </div>
                  <?php endif; ?>
                </td>
              </tr>
            <?php endif; ?>
          </tbody>
        </table>
      </div>
    </div>
  </main>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
