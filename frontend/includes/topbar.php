<?php
$user = $_SESSION['user'] ?? null;
$role = $user['role'] ?? 'Guest';
$roleClass = 'badge-role-employee';
if ($role === 'Admin') $roleClass = 'badge-role-admin';
elseif ($role === 'Support Staff') $roleClass = 'badge-role-support';

$userInitials = 'U';
if ($user && !empty($user['name'])) {
    $parts = explode(' ', trim($user['name']));
    $userInitials = strtoupper(substr($parts[0], 0, 1) . (isset($parts[1]) ? substr($parts[1], 0, 1) : ''));
}
?>
<header class="app-topbar">
  <div class="topbar-left">
    <button type="button" class="sidebar-toggle-btn" id="sidebarToggleBtn" aria-label="Toggle Sidebar Menu" title="Toggle Sidebar Menu (Open / Close)">
      <i class="bi bi-list fs-4"></i>
    </button>
    <form class="topbar-search-form" action="ticket-list.php" method="GET">
      <i class="bi bi-search topbar-search-icon"></i>
      <input type="text" name="search" class="topbar-search-input" placeholder="Search ticket #, title, or keywords..." value="<?= e($_GET['search'] ?? '') ?>">
    </form>
  </div>

  <div class="topbar-right">
    <div class="topbar-actions">
      <!-- Quick Notification Icon -->
      <a href="reports.php" class="topbar-btn" title="System Activity">
        <i class="bi bi-bell"></i>
        <span class="notification-badge"></span>
      </a>
      
      <!-- Quick Refresh -->
      <button type="button" class="topbar-btn" onclick="window.location.reload();" title="Refresh Data">
        <i class="bi bi-arrow-clockwise"></i>
      </button>
    </div>

    <!-- User Profile Dropdown -->
    <div class="dropdown">
      <button class="user-profile-trigger dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
        <div class="user-avatar-circle" style="width: 34px; height: 34px; font-size: 13px;">
          <?= e($userInitials) ?>
        </div>
        <div class="user-profile-meta">
          <div class="user-profile-name"><?= e($user['name'] ?? 'User') ?></div>
          <span class="user-profile-badge <?= e($roleClass) ?>"><?= e($role) ?></span>
        </div>
      </button>
      <ul class="dropdown-menu dropdown-menu-end shadow-sm" style="border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px;">
        <li class="px-3 py-2 border-bottom">
          <div class="fw-bold text-dark"><?= e($user['name'] ?? 'User') ?></div>
          <div class="text-muted small"><?= e($user['email'] ?? '') ?></div>
        </li>
        <li><a class="dropdown-item py-2" href="settings.php"><i class="bi bi-person me-2 text-primary"></i> Profile & Settings</a></li>
        <li><hr class="dropdown-divider my-1"></li>
        <li><a class="dropdown-item py-2 text-danger" href="logout.php" onclick="return confirmAction('Are you sure you want to log out?');"><i class="bi bi-box-arrow-right me-2"></i> Log Out</a></li>
      </ul>
    </div>
  </div>
</header>
