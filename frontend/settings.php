<?php
require_once __DIR__ . '/config/auth.php';
$user = require_auth();

$page_title = 'User Profile & Settings';
$errorMessage = '';
$successMessage = $_GET['msg'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $csrf = $_POST['csrf_token'] ?? '';
    if (!verify_csrf_token($csrf)) {
        $errorMessage = 'Security verification failed.';
    } else {
        $action = $_POST['form_action'] ?? '';
        if ($action === 'change_password') {
            $newPassword = $_POST['new_password'] ?? '';
            $confirmPassword = $_POST['confirm_password'] ?? '';

            if (empty($newPassword) || strlen($newPassword) < 6) {
                $errorMessage = 'Password must be at least 6 characters long.';
            } elseif ($newPassword !== $confirmPassword) {
                $errorMessage = 'New password and confirmation do not match.';
            } else {
                $updateRes = api_request('PUT', "/api/users/{$user['id']}", [
                    'password' => $newPassword,
                ]);

                if ($updateRes['status'] === 200) {
                    header('Location: settings.php?msg=' . urlencode('Password updated successfully.'));
                    exit;
                } else {
                    $errorMessage = $updateRes['body']['message'] ?? 'Failed to update password.';
                }
            }
        }
    }
}

// Fetch latest profile from backend API
$profileRes = api_request('GET', '/api/auth/profile');
$profile = $profileRes['body']['data'] ?? $user;

$csrfToken = get_csrf_token();
require_once __DIR__ . '/includes/header.php';
require_once __DIR__ . '/includes/sidebar.php';
?>

<div class="app-main">
  <?php require_once __DIR__ . '/includes/topbar.php'; ?>

  <main class="app-content">
    <div class="page-header">
      <div class="page-title">
        <h2>Account Settings & Profile</h2>
        <p>Manage your account credentials and personal profile information</p>
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

    <div class="row g-4">
      <!-- Profile Information Card -->
      <div class="col-lg-6">
        <div class="card-custom h-100">
          <div class="card-custom-header">
            <h5 class="card-custom-title"><i class="bi bi-person-badge-fill text-primary"></i> Profile Information</h5>
          </div>

          <div class="d-flex align-items-center gap-3 mb-4 p-3 bg-light rounded-3">
            <div class="user-avatar-circle" style="width: 52px; height: 52px; font-size: 20px;">
              <?= strtoupper(substr($profile['name'] ?? 'U', 0, 1)) ?>
            </div>
            <div>
              <h5 class="fw-bold text-dark mb-0"><?= e($profile['name'] ?? '') ?></h5>
              <div class="text-muted small"><?= e($profile['email'] ?? '') ?></div>
              <span class="badge bg-primary text-white mt-1"><?= e($profile['role'] ?? '') ?></span>
            </div>
          </div>

          <div class="row g-3">
            <div class="col-sm-6">
              <span class="text-muted d-block small">Account ID</span>
              <span class="fw-semibold text-dark">#<?= e($profile['id'] ?? '') ?></span>
            </div>
            <div class="col-sm-6">
              <span class="text-muted d-block small">Account Status</span>
              <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill">Active</span>
            </div>
            <div class="col-sm-6">
              <span class="text-muted d-block small">Assigned Role</span>
              <span class="fw-semibold text-dark"><?= e($profile['role'] ?? '') ?></span>
            </div>
            <div class="col-sm-6">
              <span class="text-muted d-block small">Email Address</span>
              <span class="fw-semibold text-dark"><?= e($profile['email'] ?? '') ?></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Change Password Card -->
      <div class="col-lg-6">
        <div class="card-custom h-100">
          <div class="card-custom-header">
            <h5 class="card-custom-title"><i class="bi bi-shield-lock-fill text-primary"></i> Change Password</h5>
          </div>

          <form method="POST" action="settings.php" data-prevent-double-submit>
            <input type="hidden" name="csrf_token" value="<?= e($csrfToken) ?>">
            <input type="hidden" name="form_action" value="change_password">

            <div class="form-group mb-3">
              <label for="new_password" class="form-label">New Password</label>
              <input type="password" id="new_password" name="new_password" class="form-control form-control-custom" placeholder="Minimum 6 characters" required minlength="6">
            </div>

            <div class="form-group mb-4">
              <label for="confirm_password" class="form-label">Confirm New Password</label>
              <input type="password" id="confirm_password" name="confirm_password" class="form-control form-control-custom" placeholder="Re-type new password" required minlength="6">
            </div>

            <button type="submit" class="btn btn-primary-custom">
              <i class="bi bi-key-fill"></i> Update Password
            </button>
          </form>
        </div>
      </div>
    </div>
  </main>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
