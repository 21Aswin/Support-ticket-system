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

// Fetch unread notifications for the active user
$notifOverviewRes = api_request('GET', '/api/notifications?limit=5');
$topbarNotifications = $notifOverviewRes['body']['data'] ?? [];
$topbarUnreadCount = $notifOverviewRes['body']['meta']['unread_count'] ?? 0;
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
      <!-- Notifications Dropdown -->
      <div class="dropdown">
        <button type="button" class="topbar-btn" data-bs-toggle="dropdown" aria-expanded="false" title="Notifications">
          <i class="bi bi-bell"></i>
          <?php if ($topbarUnreadCount > 0): ?>
            <span class="notification-badge-count"><?= $topbarUnreadCount > 99 ? '99+' : $topbarUnreadCount ?></span>
          <?php endif; ?>
        </button>
        <div class="dropdown-menu dropdown-menu-end shadow p-0 notif-dropdown-menu">
          <div class="p-3 bg-light border-bottom d-flex align-items-center justify-content-between">
            <span class="fw-bold text-dark" style="font-size: 13px;">
              <i class="bi bi-bell-fill me-1 text-primary"></i> Notifications
              <span class="badge bg-danger rounded-pill ms-1 notif-badge-pill" id="notifDropdownBadge" style="<?= $topbarUnreadCount > 0 ? '' : 'display:none;' ?>">
                <?= $topbarUnreadCount ?> new
              </span>
            </span>
            <div class="d-flex align-items-center gap-2">
              <?php if ($topbarUnreadCount > 0): ?>
                <button type="button" id="btnMarkAllReadTopbar" class="btn btn-link p-0 text-decoration-none text-muted" style="font-size: 11px;" title="Mark all notifications as read">
                  <i class="bi bi-check2-all"></i> Mark all read
                </button>
                <span class="text-muted" style="font-size: 10px;">•</span>
              <?php endif; ?>
              <a href="notifications.php" class="small text-primary text-decoration-none fw-medium" style="font-size: 11.5px;">View All</a>
            </div>
          </div>

          <div style="max-height: 280px; overflow-y: auto;" id="topbarNotifList">
            <?php if (!empty($topbarNotifications)): ?>
              <?php foreach ($topbarNotifications as $tn): ?>
                <?php
                  $isUnread = !$tn['is_read'];
                  $targetTicketId = !empty($tn['ticket_id']) ? intval($tn['ticket_id']) : 0;
                  $linkUrl = "notification-read.php?id={$tn['id']}" . ($targetTicketId > 0 ? "&ticket_id={$targetTicketId}" : "");
                ?>
                <a href="<?= e($linkUrl) ?>" 
                   class="notif-dropdown-item <?= $isUnread ? 'unread' : '' ?>"
                   data-notif-id="<?= e($tn['id']) ?>"
                   data-ticket-id="<?= e($targetTicketId) ?>"
                   data-is-unread="<?= $isUnread ? '1' : '0' ?>">
                  <div class="d-flex align-items-start justify-content-between mb-1">
                    <span class="fw-semibold small text-dark <?= $isUnread ? 'text-primary' : '' ?> notif-item-title">
                      <?= e($tn['title']) ?>
                    </span>
                    <span class="text-muted" style="font-size: 10px; white-space: nowrap;">
                      <?= format_datetime($tn['created_at'], 'M d, g:i A') ?>
                    </span>
                  </div>
                  <div class="text-muted small text-truncate" style="font-size: 11.5px;">
                    <?= e($tn['message']) ?>
                  </div>
                </a>
              <?php endforeach; ?>
            <?php else: ?>
              <div class="text-center text-muted py-4 small">
                <i class="bi bi-bell-slash text-secondary d-block mb-1 fs-5"></i>
                No notifications right now
              </div>
            <?php endif; ?>
          </div>

          <div class="p-2 text-center bg-light border-top">
            <a href="notifications.php" class="btn btn-sm btn-link text-primary text-decoration-none fw-semibold" style="font-size: 12px;">
              Go to Notifications Center <i class="bi bi-arrow-right"></i>
            </a>
          </div>
        </div>
      </div>
      
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
      <ul class="dropdown-menu dropdown-menu-end shadow-sm user-profile-dropdown-menu">
        <li class="px-3 py-2 border-bottom">
          <div class="fw-bold text-dark text-truncate" style="max-width: 220px;"><?= e($user['name'] ?? 'User') ?></div>
          <div class="text-muted small text-truncate" style="max-width: 220px;"><?= e($user['email'] ?? '') ?></div>
        </li>
        <li><a class="dropdown-item py-2" href="notifications.php"><i class="bi bi-bell me-2 text-primary"></i> Notifications</a></li>
        <li><a class="dropdown-item py-2" href="settings.php"><i class="bi bi-person me-2 text-primary"></i> Profile & Settings</a></li>
        <li><hr class="dropdown-divider my-1"></li>
        <li><a class="dropdown-item py-2 text-danger" href="logout.php" onclick="return confirmAction('Are you sure you want to log out?');"><i class="bi bi-box-arrow-right me-2"></i> Log Out</a></li>
      </ul>
    </div>
  </div>
</header>

<script>
document.addEventListener('DOMContentLoaded', function () {
  const bellBadge = document.querySelector('.notification-badge-count');
  const dropdownBadge = document.getElementById('notifDropdownBadge');
  const btnMarkAll = document.getElementById('btnMarkAllReadTopbar');

  function updateBadgeDisplay(count) {
    if (count <= 0) {
      if (bellBadge) bellBadge.style.display = 'none';
      if (dropdownBadge) dropdownBadge.style.display = 'none';
      if (btnMarkAll) btnMarkAll.style.display = 'none';
    } else {
      if (bellBadge) {
        bellBadge.style.display = 'flex';
        bellBadge.textContent = count > 99 ? '99+' : count;
      }
      if (dropdownBadge) {
        dropdownBadge.style.display = 'inline-block';
        dropdownBadge.textContent = count + ' new';
      }
    }
  }

  // Handle clicking individual notification in dropdown
  document.querySelectorAll('.notif-dropdown-item[data-is-unread="1"]').forEach(item => {
    item.addEventListener('click', function (e) {
      this.classList.remove('unread');
      this.dataset.isUnread = '0';
      const titleSpan = this.querySelector('.notif-item-title');
      if (titleSpan) titleSpan.classList.remove('text-primary');

      // Instantly reduce count
      let currentVal = parseInt(bellBadge ? bellBadge.textContent : '0') || 0;
      if (currentVal > 0) {
        updateBadgeDisplay(currentVal - 1);
      }
    });
  });

  // Handle Mark All as Read button
  if (btnMarkAll) {
    btnMarkAll.addEventListener('click', async function (e) {
      e.preventDefault();
      e.stopPropagation();

      btnMarkAll.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
      btnMarkAll.disabled = true;

      try {
        const res = await fetch('notification-read.php?action=mark_all_read', {
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        const data = await res.json();
        if (data.success) {
          updateBadgeDisplay(0);
          document.querySelectorAll('.notif-dropdown-item.unread').forEach(item => {
            item.classList.remove('unread');
            item.dataset.isUnread = '0';
            const titleSpan = item.querySelector('.notif-item-title');
            if (titleSpan) titleSpan.classList.remove('text-primary');
          });
          btnMarkAll.innerHTML = '<span class="text-success"><i class="bi bi-check2"></i> Done</span>';
          setTimeout(() => { btnMarkAll.style.display = 'none'; }, 1200);
        }
      } catch (err) {
        console.error('Failed to mark all as read:', err);
        btnMarkAll.disabled = false;
        btnMarkAll.innerHTML = '<i class="bi bi-check2-all"></i> Mark all read';
      }
    });
  }
});
</script>
