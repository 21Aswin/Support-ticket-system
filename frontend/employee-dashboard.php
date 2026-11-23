<?php
require_once __DIR__ . '/config/auth.php';
$user = require_auth(['Employee', 'Admin']);

$page_title = 'Employee Dashboard';
require_once __DIR__ . '/includes/header.php';
require_once __DIR__ . '/includes/sidebar.php';
?>

<div class="app-main">
  <?php require_once __DIR__ . '/includes/topbar.php'; ?>

  <main class="app-content">
    <?php
      // Fetch Employee ticket statistics
      $statsRes = api_request('GET', '/api/dashboard/stats');
      $stats = $statsRes['body']['data'] ?? [
          'total_own_tickets' => 0,
          'open_count' => 0,
          'in_progress_count' => 0,
          'resolved_count' => 0,
          'closed_count' => 0,
      ];

      // Fetch own tickets
      $ticketsRes = api_request('GET', '/api/tickets?limit=10');
      $ownTickets = $ticketsRes['body']['data'] ?? [];
    ?>

    <div class="page-header">
      <div class="page-title">
        <h2>Welcome back, <?= e($user['name']) ?>!</h2>
        <p>Track your submitted support requests and raise new IT issues</p>
      </div>
      <div class="page-actions">
        <a href="create-ticket.php" class="btn btn-primary-custom">
          <i class="bi bi-plus-circle"></i> Create New Ticket
        </a>
      </div>
    </div>

    <!-- KPI Cards for Employee -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon blue">
          <i class="bi bi-collection-fill"></i>
        </div>
        <div class="kpi-details">
          <div class="kpi-value"><?= e($stats['total_own_tickets']) ?></div>
          <div class="kpi-label">Total Requests</div>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon blue">
          <i class="bi bi-hourglass-split"></i>
        </div>
        <div class="kpi-details">
          <div class="kpi-value"><?= e($stats['open_count']) ?></div>
          <div class="kpi-label">Open / Queued</div>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon cyan">
          <i class="bi bi-tools"></i>
        </div>
        <div class="kpi-details">
          <div class="kpi-value"><?= e($stats['in_progress_count']) ?></div>
          <div class="kpi-label">In Progress</div>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon green">
          <i class="bi bi-check-circle-fill"></i>
        </div>
        <div class="kpi-details">
          <div class="kpi-value"><?= e($stats['resolved_count']) ?></div>
          <div class="kpi-label">Resolved (Pending Review)</div>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon orange">
          <i class="bi bi-archive-fill"></i>
        </div>
        <div class="kpi-details">
          <div class="kpi-value"><?= e($stats['closed_count']) ?></div>
          <div class="kpi-label">Closed Tickets</div>
        </div>
      </div>
    </div>

    <!-- Quick Action Banner -->
    <div class="card-custom bg-white border-0 shadow-sm p-4 mb-4" style="background: linear-gradient(135deg, #E9F5FB 0%, #FFFFFF 100%);">
      <div class="d-flex align-items-center justify-content-between flex-wrap gap-3">
        <div class="d-flex align-items-center gap-3">
          <div class="kpi-icon blue" style="width: 52px; height: 52px; font-size: 26px;">
            <i class="bi bi-headset"></i>
          </div>
          <div>
            <h5 class="fw-bold text-dark mb-1">Need IT or Technical Assistance?</h5>
            <p class="text-muted small mb-0">Our dedicated support staff is available to troubleshoot and resolve issues promptly.</p>
          </div>
        </div>
        <a href="create-ticket.php" class="btn btn-primary-custom px-4">
          <i class="bi bi-plus-lg me-1"></i> Submit a Ticket
        </a>
      </div>
    </div>

    <!-- Own Recent Tickets Table -->
    <div class="card-custom">
      <div class="card-custom-header">
        <h5 class="card-custom-title"><i class="bi bi-clock-history text-primary"></i> My Recent Support Requests</h5>
        <a href="ticket-list.php" class="btn btn-sm btn-outline-custom">View All My Tickets</a>
      </div>

      <div class="table-responsive-custom">
        <table class="table-custom">
          <thead>
            <tr>
              <th>Ticket #</th>
              <th>Issue Title</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Assigned Specialist</th>
              <th>Submitted Date</th>
              <th class="text-end">Action</th>
            </tr>
          </thead>
          <tbody>
            <?php if (!empty($ownTickets)): ?>
              <?php foreach ($ownTickets as $ticket): ?>
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
                  </td>
                  <td>
                    <span class="text-muted"><?= e($ticket['category_name']) ?></span>
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
                      <span class="text-dark"><i class="bi bi-person-circle me-1 text-primary"></i><?= e($ticket['assigned_name']) ?></span>
                    <?php else: ?>
                      <span class="text-muted fst-italic">Waiting for Assignment</span>
                    <?php endif; ?>
                  </td>
                  <td>
                    <span class="text-muted small"><?= date('M d, Y', strtotime($ticket['created_at'])) ?></span>
                  </td>
                  <td class="text-end">
                    <a href="ticket-details.php?id=<?= e($ticket['id']) ?>" class="btn btn-sm btn-outline-custom">
                      View Details
                    </a>
                  </td>
                </tr>
              <?php endforeach; ?>
            <?php else: ?>
              <tr>
                <td colspan="8" class="text-center text-muted py-5">
                  <i class="bi bi-inbox text-muted fs-1 d-block mb-2"></i>
                  You haven't submitted any support requests yet.
                </td>
              </tr>
            <?php endif; ?>
          </tbody>
        </table>
      </div>
    </div>
  </main>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
