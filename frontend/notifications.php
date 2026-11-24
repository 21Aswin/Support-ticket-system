<?php
require_once __DIR__ . '/config/auth.php';
$user = require_auth();

$page_title = 'My Notifications';
$errorMessage = '';
$successMessage = $_GET['msg'] ?? '';

// Handle POST actions: Mark single as read, Mark all as read
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $csrf = $_POST['csrf_token'] ?? '';
    if (!verify_csrf_token($csrf)) {
        $errorMessage = 'Security validation failed.';
    } else {
        $action = $_POST['form_action'] ?? '';

        if ($action === 'mark_read') {
            $notifId = intval($_POST['notification_id'] ?? 0);
            $res = api_request('PATCH', "/api/notifications/{$notifId}/read");
            if ($res['status'] === 200) {
                // If a redirect URL was provided, go there
                if (!empty($_POST['redirect_ticket_id'])) {
                    header('Location: ticket-details.php?id=' . intval($_POST['redirect_ticket_id']));
                    exit;
                }
                header('Location: notifications.php?msg=' . urlencode('Notification marked as read.'));
                exit;
            } else {
                $errorMessage = $res['body']['message'] ?? 'Failed to update notification.';
            }
        } elseif ($action === 'mark_all_read') {
            $res = api_request('PATCH', '/api/notifications/read-all');
            if ($res['status'] === 200) {
                header('Location: notifications.php?msg=' . urlencode('All notifications marked as read.'));
                exit;
            } else {
                $errorMessage = $res['body']['message'] ?? 'Failed to update notifications.';
            }
        }
    }
}

// Filter: All vs Unread
$filterUnread = isset($_GET['filter']) && $_GET['filter'] === 'unread';
$queryStr = $filterUnread ? '?unread_only=true' : '';

$notifRes = api_request('GET', '/api/notifications' . $queryStr);
$notifications = $notifRes['body']['data'] ?? [];
$unreadCount = $notifRes['body']['meta']['unread_count'] ?? 0;

$csrfToken = get_csrf_token();
require_once __DIR__ . '/includes/header.php';
require_once __DIR__ . '/includes/sidebar.php';
?>

<div class="app-main">
  <?php require_once __DIR__ . '/includes/topbar.php'; ?>

  <main class="app-content">
    <div class="page-header">
      <div class="page-title">
        <div class="d-flex align-items-center gap-2">
          <h2>Notifications Center</h2>
          <?php if ($unreadCount > 0): ?>
            <span class="badge bg-danger rounded-pill fs-6 px-3 py-1"><?= e($unreadCount) ?> Unread</span>
          <?php endif; ?>
        </div>
        <p>Stay updated on ticket assignments, status updates, and technical comments</p>
      </div>

      <div class="page-actions">
        <?php if ($unreadCount > 0): ?>
          <form method="POST" action="notifications.php" class="d-inline">
            <input type="hidden" name="csrf_token" value="<?= e($csrfToken) ?>">
            <input type="hidden" name="form_action" value="mark_all_read">
            <button type="submit" id="btnMarkAllRead" class="btn btn-outline-custom">
              <i class="bi bi-check2-all text-primary me-1"></i> Mark All as Read
            </button>
          </form>
        <?php endif; ?>
      </div>
    </div>

    <?php if (!empty($errorMessage)): ?>
      <div class="alert alert-danger alert-custom alert-auto-dismiss mb-3" role="alert">
        <i class="bi bi-exclamation-triangle-fill fs-5"></i>
        <div><?= e($errorMessage) ?></div>
      </div>
    <?php endif; ?>

    <?php if (!empty($successMessage)): ?>
      <div class="alert alert-success alert-custom alert-auto-dismiss mb-3" role="alert">
        <i class="bi bi-check-circle-fill fs-5"></i>
        <div><?= e($successMessage) ?></div>
      </div>
    <?php endif; ?>

    <!-- Filter Tabs (All vs Unread) -->
    <div class="d-flex align-items-center gap-2 mb-3">
      <a href="notifications.php" class="btn btn-sm <?= !$filterUnread ? 'btn-primary-custom' : 'btn-outline-custom' ?>">
        All Notifications
      </a>
      <a href="notifications.php?filter=unread" class="btn btn-sm <?= $filterUnread ? 'btn-primary-custom' : 'btn-outline-custom' ?>">
        Unread Only <?= $unreadCount > 0 ? "({$unreadCount})" : '' ?>
      </a>
    </div>

    <!-- Notifications List Card -->
    <div class="card-custom">
      <div class="card-custom-header">
        <h5 class="card-custom-title">
          <i class="bi bi-bell-fill text-primary"></i> 
          <span>Activity Feed</span>
        </h5>
        <span class="text-muted small"><?= count($notifications) ?> items</span>
      </div>

      <?php if (!empty($notifications)): ?>
        <div class="list-group list-group-flush">
          <?php foreach ($notifications as $n): ?>
            <?php
              $isUnread = !$n['is_read'];
              $typeIcon = 'bi-info-circle-fill text-primary';
              $typeBg = 'bg-primary-subtle';

              if ($n['type'] === 'ASSIGNMENT') {
                  $typeIcon = 'bi-person-check-fill text-primary';
                  $typeBg = 'bg-primary-subtle';
              } elseif ($n['type'] === 'RESOLUTION') {
                  $typeIcon = 'bi-check-circle-fill text-success';
                  $typeBg = 'bg-success-subtle';
              } elseif ($n['type'] === 'STATUS_CHANGE') {
                  $typeIcon = 'bi-arrow-repeat text-info';
                  $typeBg = 'bg-info-subtle';
              } elseif ($n['type'] === 'COMMENT') {
                  $typeIcon = 'bi-chat-left-dots-fill text-warning';
                  $typeBg = 'bg-warning-subtle';
              }
            ?>
            <div class="list-group-item p-3 border-bottom <?= $isUnread ? 'bg-light' : '' ?>" style="transition: background-color 0.2s ease;">
              <div class="d-flex align-items-start gap-3">
                <div class="rounded-circle p-2 d-flex align-items-center justify-content-center <?= e($typeBg) ?>" style="width: 40px; height: 40px; flex-shrink: 0;">
                  <i class="bi <?= e($typeIcon) ?> fs-5"></i>
                </div>

                <div class="flex-grow-1">
                  <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-1">
                    <div class="d-flex align-items-center gap-2">
                      <h6 class="fw-bold mb-0 text-dark <?= $isUnread ? 'text-primary' : '' ?>">
                        <?= e($n['title']) ?>
                      </h6>
                      <?php if ($isUnread): ?>
                        <span class="badge bg-primary text-white" style="font-size: 10px;">New</span>
                      <?php endif; ?>
                    </div>
                    <span class="text-muted small">
                      <i class="bi bi-clock me-1"></i><?= format_datetime($n['created_at']) ?>
                    </span>
                  </div>

                  <p class="text-dark mb-2" style="font-size: 13.5px; line-height: 1.5;">
                    <?= e($n['message']) ?>
                  </p>

                  <div class="d-flex align-items-center gap-3">
                    <?php if (!empty($n['ticket_id'])): ?>
                      <form method="POST" action="notifications.php" class="d-inline">
                        <input type="hidden" name="csrf_token" value="<?= e($csrfToken) ?>">
                        <input type="hidden" name="form_action" value="mark_read">
                        <input type="hidden" name="notification_id" value="<?= e($n['id']) ?>">
                        <input type="hidden" name="redirect_ticket_id" value="<?= e($n['ticket_id']) ?>">
                        <button type="submit" class="btn btn-sm btn-primary-custom py-1 px-3" style="min-height: 32px; font-size: 12px;">
                          <i class="bi bi-eye me-1"></i> Open Ticket (<?= e($n['ticket_number'] ?? "#{$n['ticket_id']}") ?>)
                        </button>
                      </form>
                    <?php endif; ?>

                    <?php if ($isUnread): ?>
                      <form method="POST" action="notifications.php" class="d-inline">
                        <input type="hidden" name="csrf_token" value="<?= e($csrfToken) ?>">
                        <input type="hidden" name="form_action" value="mark_read">
                        <input type="hidden" name="notification_id" value="<?= e($n['id']) ?>">
                        <button type="submit" class="btn btn-sm btn-outline-custom py-1 px-2 text-muted" style="min-height: 32px; font-size: 12px;" title="Mark as read">
                          <i class="bi bi-check2"></i> Mark as Read
                        </button>
                      </form>
                    <?php else: ?>
                      <span class="text-muted small"><i class="bi bi-check-all text-success me-1"></i> Read</span>
                    <?php endif; ?>
                  </div>
                </div>
              </div>
            </div>
          <?php endforeach; ?>
        </div>
      <?php else: ?>
        <div class="text-center text-muted py-5">
          <i class="bi bi-bell-slash fs-1 d-block mb-2 text-secondary"></i>
          <p class="mb-0">No notifications found.</p>
        </div>
      <?php endif; ?>
    </div>
  </main>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
