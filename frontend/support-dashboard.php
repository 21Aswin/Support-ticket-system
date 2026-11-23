<?php
require_once __DIR__ . '/config/auth.php';
$user = require_auth(['Support Staff', 'Admin']);

$page_title = 'Support Staff Dashboard';
require_once __DIR__ . '/includes/header.php';
require_once __DIR__ . '/includes/sidebar.php';
?>

<div class="app-main">
  <?php require_once __DIR__ . '/includes/topbar.php'; ?>

  <main class="app-content">
    <?php
      // Fetch Support Staff statistics
      $statsRes = api_request('GET', '/api/dashboard/stats');
      $stats = $statsRes['body']['data'] ?? [
          'total_assigned' => 0,
          'assigned_count' => 0,
          'in_progress_count' => 0,
          'resolved_count' => 0,
          'high_critical_count' => 0,
          'priority_breakdown' => [],
      ];

      // Fetch Work Queue (Assigned tickets)
      $ticketsRes = api_request('GET', '/api/tickets?limit=20');
      $workQueue = $ticketsRes['body']['data'] ?? [];
    ?>

    <div class="page-header">
      <div class="page-title">
        <h2>My Support Work Queue</h2>
        <p>Active tickets assigned for your investigation and resolution</p>
      </div>
      <div class="page-actions">
        <a href="reports.php" class="btn btn-outline-custom">
          <i class="bi bi-graph-up"></i> Performance
        </a>
      </div>
    </div>

    <!-- KPI Summary Grid -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon blue">
          <i class="bi bi-inbox-fill"></i>
        </div>
        <div class="kpi-details">
          <div class="kpi-value"><?= e($stats['total_assigned']) ?></div>
          <div class="kpi-label">Total Assigned</div>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon purple">
          <i class="bi bi-person-check-fill"></i>
        </div>
        <div class="kpi-details">
          <div class="kpi-value"><?= e($stats['assigned_count']) ?></div>
          <div class="kpi-label">Pending Acceptance</div>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon cyan">
          <i class="bi bi-play-circle-fill"></i>
        </div>
        <div class="kpi-details">
          <div class="kpi-value"><?= e($stats['in_progress_count']) ?></div>
          <div class="kpi-label">Currently In Progress</div>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon green">
          <i class="bi bi-check2-all"></i>
        </div>
        <div class="kpi-details">
          <div class="kpi-value"><?= e($stats['resolved_count']) ?></div>
          <div class="kpi-label">Resolved</div>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon red">
          <i class="bi bi-exclamation-octagon-fill"></i>
        </div>
        <div class="kpi-details">
          <div class="kpi-value"><?= e($stats['high_critical_count']) ?></div>
          <div class="kpi-label">High / Critical</div>
        </div>
      </div>
    </div>

    <!-- Assigned Tickets Work Queue Table -->
    <div class="card-custom">
      <div class="card-custom-header">
        <h5 class="card-custom-title"><i class="bi bi-list-check text-primary"></i> Assigned Tickets Work Queue</h5>
        <span class="badge bg-light text-dark border"><?= count($workQueue) ?> Tickets</span>
      </div>

      <div class="table-responsive-custom">
        <table class="table-custom">
          <thead>
            <tr>
              <th>Ticket #</th>
              <th>Title</th>
              <th>Category</th>
              <th>Requester</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Created</th>
              <th>Last Updated</th>
              <th class="text-end">Action</th>
            </tr>
          </thead>
          <tbody>
            <?php if (!empty($workQueue)): ?>
              <?php foreach ($workQueue as $ticket): ?>
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
                    <small class="text-muted text-truncate d-inline-block" style="max-width: 280px;">
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
                    <span class="text-muted small"><?= date('M d, Y', strtotime($ticket['created_at'])) ?></span>
                  </td>
                  <td>
                    <span class="text-muted small"><?= date('M d, H:i', strtotime($ticket['updated_at'])) ?></span>
                  </td>
                  <td class="text-end">
                    <a href="ticket-details.php?id=<?= e($ticket['id']) ?>" class="btn btn-sm btn-primary-custom">
                      <i class="bi bi-box-arrow-up-right"></i> Open Ticket
                    </a>
                  </td>
                </tr>
              <?php endforeach; ?>
            <?php else: ?>
              <tr>
                <td colspan="9" class="text-center text-muted py-5">
                  <i class="bi bi-check2-circle text-success fs-1 d-block mb-2"></i>
                  No active tickets currently assigned to you!
                </td>
              </tr>
            <?php endif; ?>
          </tbody>
        </table>
      </div>
    </div>
  </main>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
