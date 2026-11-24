<?php
require_once __DIR__ . '/config/auth.php';
$user = require_auth(['Admin']);

$page_title = 'Administrator Dashboard';
require_once __DIR__ . '/includes/header.php';
require_once __DIR__ . '/includes/sidebar.php';
?>

<div class="app-main">
  <?php require_once __DIR__ . '/includes/topbar.php'; ?>

  <main class="app-content">
    <?php
      // Fetch Dashboard statistics from Node.js API
      $statsRes = api_request('GET', '/api/dashboard/stats');
      $stats = $statsRes['body']['data'] ?? [
          'total_tickets' => 0,
          'open_tickets' => 0,
          'assigned_tickets' => 0,
          'in_progress_tickets' => 0,
          'resolved_tickets' => 0,
          'closed_tickets' => 0,
          'reopened_tickets' => 0,
          'employees_count' => 0,
          'support_staff_count' => 0,
          'status_breakdown' => [],
          'priority_breakdown' => [],
          'category_breakdown' => [],
          'staff_workload' => [],
      ];

      // Fetch Recent Tickets from Node.js API
      $recentRes = api_request('GET', '/api/dashboard/recent-tickets');
      $recentTickets = $recentRes['body']['data'] ?? [];
    ?>

    <!-- Page Title & Header Actions -->
    <div class="page-header">
      <div class="page-title">
        <h2>Enterprise Support Overview</h2>
        <p>Real-time analytics and ticket workflow management</p>
      </div>
      <div class="page-actions">
        <a href="create-ticket.php" class="btn btn-primary-custom">
          <i class="bi bi-plus-lg"></i> New Ticket
        </a>
        <a href="ticket-list.php" class="btn btn-outline-custom">
          <i class="bi bi-list-task"></i> View All Tickets
        </a>
      </div>
    </div>

    <!-- KPI Summary Cards Grid -->
    <div class="kpi-grid">
      <!-- Total Tickets -->
      <div class="kpi-card">
        <div class="kpi-icon blue">
          <i class="bi bi-ticket-perforated-fill"></i>
        </div>
        <div class="kpi-details">
          <div class="kpi-value"><?= e($stats['total_tickets']) ?></div>
          <div class="kpi-label">Total Tickets</div>
        </div>
      </div>

      <!-- Open Tickets -->
      <div class="kpi-card">
        <div class="kpi-icon blue">
          <i class="bi bi-folder2-open"></i>
        </div>
        <div class="kpi-details">
          <div class="kpi-value"><?= e($stats['open_tickets']) ?></div>
          <div class="kpi-label">Open / Unassigned</div>
        </div>
      </div>

      <!-- In Progress Tickets -->
      <div class="kpi-card">
        <div class="kpi-icon cyan">
          <i class="bi bi-gear-wide-connected"></i>
        </div>
        <div class="kpi-details">
          <div class="kpi-value"><?= e($stats['in_progress_tickets']) ?></div>
          <div class="kpi-label">In Progress</div>
        </div>
      </div>

      <!-- Resolved Tickets -->
      <div class="kpi-card">
        <div class="kpi-icon green">
          <i class="bi bi-check-circle-fill"></i>
        </div>
        <div class="kpi-details">
          <div class="kpi-value"><?= e($stats['resolved_tickets']) ?></div>
          <div class="kpi-label">Resolved</div>
        </div>
      </div>

      <!-- Closed Tickets -->
      <div class="kpi-card">
        <div class="kpi-icon orange">
          <i class="bi bi-archive-fill"></i>
        </div>
        <div class="kpi-details">
          <div class="kpi-value"><?= e($stats['closed_tickets']) ?></div>
          <div class="kpi-label">Closed</div>
        </div>
      </div>

      <!-- Total Staff / Employees -->
      <div class="kpi-card">
        <div class="kpi-icon purple">
          <i class="bi bi-people-fill"></i>
        </div>
        <div class="kpi-details">
          <div class="kpi-value"><?= e($stats['support_staff_count']) ?> / <?= e($stats['employees_count']) ?></div>
          <div class="kpi-label">Staff / Employees</div>
        </div>
      </div>
    </div>

    <!-- Charts & Analytics Section -->
    <div class="row g-4 mb-4">
      <!-- Status Donut Chart -->
      <div class="col-lg-4 col-md-6">
        <div class="card-custom h-100">
          <div class="card-custom-header d-flex justify-content-between align-items-center">
            <h5 class="card-custom-title mb-0"><i class="bi bi-pie-chart-fill text-primary"></i> Ticket Status Breakdown</h5>
            <span class="badge bg-light text-primary border" style="font-size: 11px;">Share (%)</span>
          </div>
          <div style="position: relative; height: 240px;">
            <canvas id="statusChart"></canvas>
          </div>
        </div>
      </div>

      <!-- Category Breakdown Chart -->
      <div class="col-lg-4 col-md-6">
        <div class="card-custom h-100">
          <div class="card-custom-header d-flex justify-content-between align-items-center">
            <h5 class="card-custom-title mb-0"><i class="bi bi-bar-chart-fill text-info"></i> Frequent Categories</h5>
            <span class="badge bg-light text-muted border" style="font-size: 11px;">Volume</span>
          </div>
          <div style="position: relative; height: 240px;">
            <canvas id="categoryChart"></canvas>
          </div>
        </div>
      </div>

      <!-- Staff Workload Summary -->
      <div class="col-lg-4 col-md-12">
        <div class="card-custom h-100">
          <div class="card-custom-header">
            <h5 class="card-custom-title"><i class="bi bi-person-workspace text-success"></i> Support Staff Workload</h5>
            <a href="manage-users.php" class="text-primary small text-decoration-none">Manage</a>
          </div>
          <div class="table-responsive">
            <table class="table table-sm table-borderless align-middle mb-0" style="font-size: 13px;">
              <thead class="text-muted border-bottom">
                <tr>
                  <th>Staff Member</th>
                  <th class="text-center">Active</th>
                  <th class="text-center">Resolved</th>
                </tr>
              </thead>
              <tbody>
                <?php if (!empty($stats['staff_workload'])): ?>
                  <?php foreach ($stats['staff_workload'] as $staff): ?>
                    <tr>
                      <td class="py-2">
                        <div class="fw-semibold text-dark"><?= e($staff['name']) ?></div>
                        <div class="text-muted small"><?= e($staff['email']) ?></div>
                      </td>
                      <td class="text-center">
                        <span class="badge bg-primary rounded-pill"><?= e($staff['active_tickets']) ?></span>
                      </td>
                      <td class="text-center">
                        <span class="badge bg-success rounded-pill"><?= e($staff['resolved_tickets']) ?></span>
                      </td>
                    </tr>
                  <?php endforeach; ?>
                <?php else: ?>
                  <tr>
                    <td colspan="3" class="text-center text-muted py-3">No support staff configured.</td>
                  </tr>
                <?php endif; ?>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Tickets Table -->
    <div class="card-custom">
      <div class="card-custom-header">
        <h5 class="card-custom-title"><i class="bi bi-clock-history text-primary"></i> Recent Tickets Queue</h5>
        <a href="ticket-list.php" class="btn btn-sm btn-outline-custom">View All Tickets</a>
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
              <th>Assigned To</th>
              <th>Date</th>
              <th class="text-end">Action</th>
            </tr>
          </thead>
          <tbody>
            <?php if (!empty($recentTickets)): ?>
              <?php foreach ($recentTickets as $ticket): ?>
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
                    <span class="text-dark"><?= e($ticket['requester_name']) ?></span>
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
                      <span class="text-dark fw-medium"><i class="bi bi-person me-1 text-primary"></i><?= e($ticket['assigned_name']) ?></span>
                    <?php else: ?>
                      <span class="text-muted fst-italic">Unassigned</span>
                    <?php endif; ?>
                  </td>
                  <td>
                    <span class="text-muted small"><?= date('M d, Y', strtotime($ticket['created_at'])) ?></span>
                  </td>
                  <td class="text-end">
                    <a href="ticket-details.php?id=<?= e($ticket['id']) ?>" class="btn btn-sm btn-outline-custom">
                      Manage
                    </a>
                  </td>
                </tr>
              <?php endforeach; ?>
            <?php else: ?>
              <tr>
                <td colspan="9" class="text-center text-muted py-4">No recent tickets found.</td>
              </tr>
            <?php endif; ?>
          </tbody>
        </table>
      </div>
    </div>
  </main>

  <!-- Interactive Charts Initialization -->
  <script>
    document.addEventListener('DOMContentLoaded', function () {
      // 1. Status Donut Chart with Percentages
      const statusData = <?= json_encode($stats['status_breakdown']) ?>;
      const statusLabels = Object.keys(statusData);
      const statusValues = Object.values(statusData);
      const totalStatusTickets = statusValues.reduce((sum, val) => sum + val, 0);

      const statusColors = {
        'Open': '#0B6DB7',
        'Assigned': '#6366F1',
        'In Progress': '#0B9BC4',
        'Resolved': '#2E9B27',
        'Closed': '#64748B',
        'Reopened': '#F5A623'
      };

      const ctxStatus = document.getElementById('statusChart').getContext('2d');
      new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
          labels: statusLabels,
          datasets: [{
            data: statusValues,
            backgroundColor: statusLabels.map(l => statusColors[l] || '#94A3B8'),
            borderWidth: 2,
            borderColor: '#FFFFFF'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 12,
                font: { size: 11, weight: '500' },
                padding: 10,
                generateLabels: function(chart) {
                  const data = chart.data;
                  if (data.labels.length && data.datasets.length) {
                    return data.labels.map(function(label, i) {
                      const value = data.datasets[0].data[i] || 0;
                      const pct = totalStatusTickets > 0 
                        ? ((value / totalStatusTickets) * 100).toFixed(1) + '%' 
                        : '0%';
                      return {
                        text: `${label} (${pct})`,
                        fillStyle: data.datasets[0].backgroundColor[i],
                        strokeStyle: '#FFFFFF',
                        lineWidth: 1,
                        hidden: !chart.isDatasetVisible(0),
                        index: i
                      };
                    });
                  }
                  return [];
                }
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  const pct = totalStatusTickets > 0 
                    ? ((value / totalStatusTickets) * 100).toFixed(1) + '%' 
                    : '0%';
                  return ` ${label}: ${pct} (${value} ${value === 1 ? 'ticket' : 'tickets'})`;
                }
              }
            }
          },
          cutout: '65%'
        },
        plugins: [{
          id: 'doughnutCenterText',
          beforeDraw(chart) {
            const { ctx, chartArea } = chart;
            if (!chartArea) return;
            const centerX = (chartArea.left + chartArea.right) / 2;
            const centerY = (chartArea.top + chartArea.bottom) / 2;
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const active = chart.getActiveElements();
            let line1 = 'TOTAL';
            let line2 = totalStatusTickets + ' Tickets';
            
            if (active && active.length > 0) {
              const idx = active[0].index;
              const val = statusValues[idx] || 0;
              const pct = totalStatusTickets > 0 ? ((val / totalStatusTickets) * 100).toFixed(1) + '%' : '0%';
              line1 = (statusLabels[idx] || '').toUpperCase();
              line2 = pct;
            }
            
            ctx.font = '600 11px Inter, sans-serif';
            ctx.fillStyle = '#64748B';
            ctx.fillText(line1, centerX, centerY - 9);
            
            ctx.font = '700 17px Inter, sans-serif';
            ctx.fillStyle = '#064B8F';
            ctx.fillText(line2, centerX, centerY + 11);
            ctx.restore();
          }
        }]
      });

      // 2. Category Bar Chart with Percentages in Tooltips
      const categoryData = <?= json_encode($stats['category_breakdown']) ?>;
      const catLabels = categoryData.map(c => c.category_name);
      const catCounts = categoryData.map(c => c.count);
      const totalCatTickets = catCounts.reduce((a, b) => a + b, 0);

      const ctxCat = document.getElementById('categoryChart').getContext('2d');
      new Chart(ctxCat, {
        type: 'bar',
        data: {
          labels: catLabels,
          datasets: [{
            label: 'Tickets',
            data: catCounts,
            backgroundColor: '#0B6DB7',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const val = context.parsed.y || 0;
                  const pct = totalCatTickets > 0 
                    ? ((val / totalCatTickets) * 100).toFixed(1) + '%' 
                    : '0%';
                  return ` Volume: ${val} tickets (${pct})`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { precision: 0 }
            },
            x: {
              ticks: { font: { size: 10 } }
            }
          }
        }
      });
    });
  </script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
