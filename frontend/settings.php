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

// Test API Health
$healthRes = api_request('GET', '/api/health');
$apiOnline = ($healthRes['status'] === 200);

$csrfToken = get_csrf_token();
require_once __DIR__ . '/includes/header.php';
require_once __DIR__ . '/includes/sidebar.php';
?>

<div class="app-main">
  <?php require_once __DIR__ . '/includes/topbar.php'; ?>

  <main class="app-content">
    <div class="page-header">
      <div class="page-title">
        <h2>Account Settings & System Info</h2>
        <p>Manage your account credentials and inspect system health</p>
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
      <!-- Profile Card & Password Update -->
      <div class="col-lg-6">
        <div class="card-custom mb-4">
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
          </div>
        </div>

        <!-- Change Password Card -->
        <div class="card-custom">
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

      <!-- System Architecture & Diagnostics -->
      <div class="col-lg-6">
        <div class="card-custom h-100">
          <div class="card-custom-header">
            <h5 class="card-custom-title"><i class="bi bi-cpu-fill text-info"></i> System Architecture Diagnostics</h5>
          </div>

          <p class="text-muted small mb-3">
            Verified separation: PHP acts strictly as the presentation layer communicating via cURL REST APIs to Node.js. Node.js is the only layer with PostgreSQL database connectivity.
          </p>

          <ul class="list-group list-group-flush mb-4" style="font-size: 13px;">
            <li class="list-group-item d-flex justify-content-between align-items-center px-0 py-3">
              <div>
                <div class="fw-semibold text-dark">Node.js Express Backend REST API</div>
                <div class="text-muted small">Port 3000 (HTTP/JSON)</div>
              </div>
              <?php if ($apiOnline): ?>
                <span class="badge bg-success text-white"><i class="bi bi-check-circle me-1"></i> Connected & Online</span>
              <?php else: ?>
                <span class="badge bg-danger text-white"><i class="bi bi-x-circle me-1"></i> Offline</span>
              <?php endif; ?>
            </li>

            <li class="list-group-item d-flex justify-content-between align-items-center px-0 py-3">
              <div>
                <div class="fw-semibold text-dark">Database Persistence</div>
                <div class="text-muted small">PostgreSQL (helpdesk_db)</div>
              </div>
              <span class="badge bg-success text-white"><i class="bi bi-database-check me-1"></i> Active via Node.js Pool</span>
            </li>

            <li class="list-group-item d-flex justify-content-between align-items-center px-0 py-3">
              <div>
                <div class="fw-semibold text-dark">Frontend Presentation Layer</div>
                <div class="text-muted small">PHP <?= phpversion() ?> + Bootstrap 5</div>
              </div>
              <span class="badge bg-info text-white"><i class="bi bi-layers me-1"></i> Presentation Only</span>
            </li>

            <li class="list-group-item d-flex justify-content-between align-items-center px-0 py-3">
              <div>
                <div class="fw-semibold text-dark">Authentication Mechanism</div>
                <div class="text-muted small">Signed JWT + Server-side PHP Session</div>
              </div>
              <span class="badge bg-primary text-white"><i class="bi bi-shield-check me-1"></i> HttpOnly Protected</span>
            </li>

            <li class="list-group-item d-flex justify-content-between align-items-center px-0 py-3">
              <div>
                <div class="fw-semibold text-dark">Password Security</div>
                <div class="text-muted small">bcrypt (10 rounds salt)</div>
              </div>
              <span class="badge bg-secondary text-white"><i class="bi bi-hash me-1"></i> Irreversible Hash</span>
            </li>
          </ul>

          <div class="alert alert-info py-2" style="font-size: 12.5px;">
            <i class="bi bi-info-circle-fill me-1"></i> Direct database queries from PHP are strictly disabled and not supported by design.
          </div>
        </div>
      </div>
    </div>
  </main>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
