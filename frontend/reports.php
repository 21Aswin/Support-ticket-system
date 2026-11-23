<?php
require_once __DIR__ . '/config/auth.php';
$user = require_auth(['Admin', 'Support Staff']);

$page_title = 'System Reports & Analytics';
require_once __DIR__ . '/includes/header.php';
require_once __DIR__ . '/includes/sidebar.php';
?>

<div class="app-main">
  <?php require_once __DIR__ . '/includes/topbar.php'; ?>

  <main class="app-content">
    <?php
      $statsRes = api_request('GET', '/api/dashboard/stats');
      $stats = $statsRes['body']['data'] ?? [];

      $total = $stats['total_tickets'] ?? 1;
      if ($total === 0) $total = 1;
    ?>

    <div class="page-header">
      <div class="page-title">
        <h2>Analytics & Reports</h2>
        <p>Operational metrics, response breakdown, and support team performance</p>
      </div>
      <div class="page-actions">
        <button type="button" class="btn btn-outline-custom" onclick="window.print();">
          <i class="bi bi-printer"></i> Print Report
        </button>
      </div>
    </div>

    <!-- KPI Row -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon blue"><i class="bi bi-speedometer2"></i></div>
        <div class="kpi-details">
          <div class="kpi-value"><?= e($stats['total_tickets'] ?? 0) ?></div>
          <div class="kpi-label">Cumulative Tickets</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon green"><i class="bi bi-check2-circle"></i></div>
        <div class="kpi-details">
          <?php 
            $resolvedCount = ($stats['resolved_tickets'] ?? 0) + ($stats['closed_tickets'] ?? 0);
            $resolutionRate = round(($resolvedCount / $total) * 100);
          ?>
          <div class="kpi-value"><?= $resolutionRate ?>%</div>
          <div class="kpi-label">Resolution Rate</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon cyan"><i class="bi bi-arrow-repeat"></i></div>
        <div class="kpi-details">
          <div class="kpi-value"><?= e($stats['in_progress_tickets'] ?? 0) ?></div>
          <div class="kpi-label">Active Workload</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon red"><i class="bi bi-shield-exclamation"></i></div>
        <div class="kpi-details">
          <div class="kpi-value"><?= e($stats['priority_breakdown']['Critical'] ?? 0) ?></div>
          <div class="kpi-label">Critical Incidents</div>
        </div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="row g-4 mb-4">
      <!-- Priority Distribution Chart -->
      <div class="col-lg-6">
        <div class="card-custom h-100">
          <div class="card-custom-header">
            <h5 class="card-custom-title"><i class="bi bi-bar-chart-steps text-primary"></i> Incident Priority Distribution</h5>
          </div>
          <div style="position: relative; height: 260px;">
            <canvas id="priorityChart"></canvas>
          </div>
        </div>
      </div>

      <!-- Category Share Breakdown -->
      <div class="col-lg-6">
        <div class="card-custom h-100">
          <div class="card-custom-header">
            <h5 class="card-custom-title"><i class="bi bi-pie-chart text-info"></i> Category Incident Share</h5>
          </div>
          <div class="table-responsive">
            <table class="table table-sm table-borderless align-middle" style="font-size: 13px;">
              <thead class="text-muted border-bottom">
                <tr>
                  <th>Category</th>
                  <th class="text-center">Count</th>
                  <th class="text-end">Percentage</th>
                </tr>
              </thead>
              <tbody>
                <?php if (!empty($stats['category_breakdown'])): ?>
                  <?php foreach ($stats['category_breakdown'] as $cat): ?>
                    <?php $pct = round(($cat['count'] / $total) * 100, 1); ?>
                    <tr>
                      <td class="py-2 fw-semibold text-dark"><?= e($cat['category_name']) ?></td>
                      <td class="text-center"><span class="badge bg-light text-dark border"><?= e($cat['count']) ?></span></td>
                      <td class="text-end">
                        <div class="d-flex align-items-center justify-content-end gap-2">
                          <div class="progress flex-grow-1" style="height: 6px; max-width: 100px;">
                            <div class="progress-bar bg-primary" role="progressbar" style="width: <?= $pct ?>%"></div>
                          </div>
                          <span class="text-muted small" style="min-width: 40px;"><?= $pct ?>%</span>
                        </div>
                      </td>
                    </tr>
                  <?php endforeach; ?>
                <?php else: ?>
                  <tr><td colspan="3" class="text-center py-3 text-muted">No data available.</td></tr>
                <?php endif; ?>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </main>

  <script>
    document.addEventListener('DOMContentLoaded', function () {
      const pData = <?= json_encode($stats['priority_breakdown'] ?? []) ?>;
      const pLabels = ['Low', 'Medium', 'High', 'Critical'];
      const pCounts = pLabels.map(l => pData[l] || 0);

      const ctxPriority = document.getElementById('priorityChart').getContext('2d');
      new Chart(ctxPriority, {
        type: 'bar',
        data: {
          labels: pLabels,
          datasets: [{
            label: 'Incident Volume',
            data: pCounts,
            backgroundColor: ['#64748B', '#0B6DB7', '#F5A623', '#DC3545'],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } }
          }
        }
      });
    });
  </script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
