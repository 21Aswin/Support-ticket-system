<?php
require_once __DIR__ . '/config/api.php';
require_once __DIR__ . '/config/auth.php';

// If already logged in, redirect to appropriate dashboard
if (!empty($_SESSION['jwt']) && !empty($_SESSION['user']['role'])) {
    header('Location: ' . get_dashboard_url($_SESSION['user']['role']));
    exit;
}

$token = trim($_GET['token'] ?? $_POST['token'] ?? '');
$email = trim($_GET['email'] ?? $_POST['email'] ?? '');
$errorMessage = '';

if (empty($token)) {
    header('Location: forgot-password.php?msg=' . urlencode('Please request a valid password reset link.'));
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $password = $_POST['password'] ?? '';
    $confirmPassword = $_POST['confirm_password'] ?? '';
    $csrf = $_POST['csrf_token'] ?? '';

    if (!verify_csrf_token($csrf)) {
        $errorMessage = 'Invalid security session. Please refresh and try again.';
    } elseif (empty($password) || empty($confirmPassword)) {
        $errorMessage = 'Please enter both password fields.';
    } elseif (strlen($password) < 6) {
        $errorMessage = 'Password must be at least 6 characters long.';
    } elseif ($password !== $confirmPassword) {
        $errorMessage = 'Passwords do not match. Please verify.';
    } else {
        $response = api_request('POST', '/api/auth/reset-password', [
            'token' => $token,
            'password' => $password,
            'confirm_password' => $confirmPassword,
        ]);

        if ($response['status'] === 200) {
            header('Location: login.php?msg=' . urlencode('Password reset successfully! You can now sign in with your new password.'));
            exit;
        } else {
            $errorMessage = $response['body']['message'] ?? 'Failed to reset password. The link may have expired.';
        }
    }
}

$csrfToken = get_csrf_token();
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Set New Password | HelpDesk Support Portal</title>
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
  <link rel="stylesheet" href="assets/css/style.css">
  
  <style>
    body {
      background: linear-gradient(135deg, #064B8F 0%, #0B6DB7 50%, #0B9BC4 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .auth-container {
      width: 100%;
      max-width: 440px;
    }
    .auth-card {
      background: #FFFFFF;
      border-radius: 14px;
      padding: 36px 32px;
      box-shadow: 0 15px 35px rgba(6, 75, 143, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .auth-brand {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 24px;
    }
    .auth-brand-icon {
      width: 46px;
      height: 46px;
      background: linear-gradient(135deg, var(--bright-blue), var(--secondary-blue));
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
      font-size: 24px;
      box-shadow: 0 4px 10px rgba(11, 109, 183, 0.35);
    }
  </style>
</head>
<body>

<div class="auth-container">
  <div class="auth-card">
    <div class="auth-brand">
      <div class="auth-brand-icon">
        <i class="bi bi-shield-check"></i>
      </div>
      <div>
        <h3 class="fw-bold mb-0 text-dark" style="letter-spacing: -0.5px;">HelpDesk</h3>
        <p class="text-muted small mb-0">Internal Support Ticket Management</p>
      </div>
    </div>

    <div class="text-center mb-4">
      <h4 class="fw-bold text-dark mb-1">Set New Password</h4>
      <p class="text-muted small">
        <?= !empty($email) ? 'Resetting password for <strong>' . e($email) . '</strong>' : 'Choose a strong new password for your account' ?>
      </p>
    </div>

    <?php if (!empty($errorMessage)): ?>
      <div class="alert alert-danger alert-custom py-2 mb-3" role="alert">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <div><?= e($errorMessage) ?></div>
      </div>
    <?php endif; ?>

    <form method="POST" action="reset-password.php" data-prevent-double-submit>
      <input type="hidden" name="csrf_token" value="<?= e($csrfToken) ?>">
      <input type="hidden" name="token" value="<?= e($token) ?>">
      <input type="hidden" name="email" value="<?= e($email) ?>">

      <div class="form-group mb-3">
        <label for="password" class="form-label">New Password <span class="text-danger">*</span></label>
        <div class="input-group">
          <span class="input-group-text bg-white border-end-0 text-muted"><i class="bi bi-lock"></i></span>
          <input type="password" id="password" name="password" class="form-control form-control-custom border-start-0 border-end-0" placeholder="Minimum 6 characters" required minlength="6" autofocus>
          <button type="button" class="btn btn-outline-secondary border-start-0 bg-white text-muted password-toggle-btn" data-target="password" title="Show password" tabindex="-1">
            <i class="bi bi-eye"></i>
          </button>
        </div>
      </div>

      <div class="form-group mb-4">
        <label for="confirm_password" class="form-label">Confirm New Password <span class="text-danger">*</span></label>
        <div class="input-group">
          <span class="input-group-text bg-white border-end-0 text-muted"><i class="bi bi-shield-lock"></i></span>
          <input type="password" id="confirm_password" name="confirm_password" class="form-control form-control-custom border-start-0 border-end-0" placeholder="Re-enter new password" required minlength="6">
          <button type="button" class="btn btn-outline-secondary border-start-0 bg-white text-muted password-toggle-btn" data-target="confirm_password" title="Show password" tabindex="-1">
            <i class="bi bi-eye"></i>
          </button>
        </div>
      </div>

      <button type="submit" class="btn btn-primary-custom w-100 justify-content-center py-2 fs-6">
        <i class="bi bi-check2-circle"></i> Save New Password
      </button>

      <div class="text-center mt-3">
        <a href="login.php" class="text-primary fw-semibold small text-decoration-none">
          <i class="bi bi-arrow-left"></i> Back to Sign In
        </a>
      </div>
    </form>
  </div>
</div>

<script src="assets/js/main.js"></script>
</body>
</html>
