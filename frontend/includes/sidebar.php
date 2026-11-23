<?php
$currentPage = basename($_SERVER['PHP_SELF']);
$user = $_SESSION['user'] ?? null;
$role = $user['role'] ?? 'Guest';
$userInitials = 'U';
if ($user && !empty($user['name'])) {
    $parts = explode(' ', trim($user['name']));
    $userInitials = strtoupper(substr($parts[0], 0, 1) . (isset($parts[1]) ? substr($parts[1], 0, 1) : ''));
}
?>
<aside class="app-sidebar">
  <div class="sidebar-header">
    <a href="<?= e(get_dashboard_url($role)) ?>" class="sidebar-brand">
      <div class="sidebar-brand-icon">
        <i class="bi bi-shield-check"></i>
      </div>
      <div class="sidebar-brand-text">
        <h4>HelpDesk</h4>
        <span>Support Portal</span>
      </div>
    </a>
    <button type="button" class="sidebar-collapse-toggle-btn" id="sidebarCollapseBtn" aria-label="Collapse Menu" title="Close / Tuck Sidebar">
      <i class="bi bi-x-lg"></i>
    </button>
  </div>

  <ul class="sidebar-menu">
    <li class="menu-heading">Navigation</li>
    
    <!-- Dashboard Link -->
    <li class="nav-item">
      <?php 
        $dashUrl = get_dashboard_url($role); 
        $isDash = in_array($currentPage, ['admin-dashboard.php', 'support-dashboard.php', 'employee-dashboard.php'], true);
      ?>
      <a href="<?= e($dashUrl) ?>" class="nav-link <?= $isDash ? 'active' : '' ?>">
        <i class="bi bi-grid-1x2-fill"></i>
        <span>Dashboard</span>
      </a>
    </li>

    <!-- Create Ticket (Admin & Employee) -->
    <?php if ($role === 'Admin' || $role === 'Employee'): ?>
    <li class="nav-item">
      <a href="create-ticket.php" class="nav-link <?= $currentPage === 'create-ticket.php' ? 'active' : '' ?>">
        <i class="bi bi-plus-circle-fill"></i>
        <span>Create Ticket</span>
      </a>
    </li>
    <?php endif; ?>

    <!-- Ticket Management Section -->
    <li class="menu-heading">Ticket Management</li>

    <?php if ($role === 'Admin'): ?>
    <li class="nav-item">
      <a href="ticket-list.php" class="nav-link <?= $currentPage === 'ticket-list.php' && empty($_GET['filter']) ? 'active' : '' ?>">
        <i class="bi bi-ticket-detailed-fill"></i>
        <span>All Tickets</span>
      </a>
    </li>
    <?php endif; ?>

    <?php if ($role === 'Support Staff'): ?>
    <li class="nav-item">
      <a href="ticket-list.php" class="nav-link <?= $currentPage === 'ticket-list.php' ? 'active' : '' ?>">
        <i class="bi bi-inbox-fill"></i>
        <span>Assigned Tickets</span>
      </a>
    </li>
    <?php endif; ?>

    <?php if ($role === 'Employee'): ?>
    <li class="nav-item">
      <a href="ticket-list.php" class="nav-link <?= $currentPage === 'ticket-list.php' ? 'active' : '' ?>">
        <i class="bi bi-collection-fill"></i>
        <span>My Tickets</span>
      </a>
    </li>
    <?php endif; ?>

    <!-- Administration Section -->
    <?php if ($role === 'Admin'): ?>
    <li class="menu-heading">Administration</li>
    <li class="nav-item">
      <a href="manage-users.php" class="nav-link <?= $currentPage === 'manage-users.php' ? 'active' : '' ?>">
        <i class="bi bi-people-fill"></i>
        <span>Users</span>
      </a>
    </li>
    <li class="nav-item">
      <a href="manage-categories.php" class="nav-link <?= $currentPage === 'manage-categories.php' ? 'active' : '' ?>">
        <i class="bi bi-tags-fill"></i>
        <span>Categories</span>
      </a>
    </li>
    <?php endif; ?>

    <!-- Reports Section -->
    <?php if ($role === 'Admin' || $role === 'Support Staff'): ?>
    <li class="menu-heading">Analytics</li>
    <li class="nav-item">
      <a href="reports.php" class="nav-link <?= $currentPage === 'reports.php' ? 'active' : '' ?>">
        <i class="bi bi-bar-chart-line-fill"></i>
        <span>Reports</span>
      </a>
    </li>
    <?php endif; ?>

    <!-- Settings & System -->
    <li class="menu-heading">Preferences</li>
    <li class="nav-item">
      <a href="settings.php" class="nav-link <?= $currentPage === 'settings.php' ? 'active' : '' ?>">
        <i class="bi bi-gear-fill"></i>
        <span>Settings</span>
      </a>
    </li>
    <li class="nav-item">
      <a href="logout.php" class="nav-link" onclick="return confirmAction('Are you sure you want to log out?');">
        <i class="bi bi-box-arrow-right"></i>
        <span>Logout</span>
      </a>
    </li>
  </ul>

  <!-- User Profile in Footer -->
  <div class="sidebar-footer">
    <div class="sidebar-user">
      <div class="user-avatar-circle">
        <?= e($userInitials) ?>
      </div>
      <div class="user-info-text">
        <div class="user-info-name"><?= e($user['name'] ?? 'User') ?></div>
        <div class="user-info-role"><?= e($role) ?></div>
      </div>
      <a href="logout.php" title="Logout" style="color: rgba(255,255,255,0.7); font-size: 16px;">
        <i class="bi bi-box-arrow-right"></i>
      </a>
    </div>
  </div>
</aside>
