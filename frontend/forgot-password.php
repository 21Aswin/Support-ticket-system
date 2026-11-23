<?php
require_once __DIR__ . '/config/api.php';
require_once __DIR__ . '/config/auth.php';

// If already logged in, redirect to appropriate dashboard
if (!empty($_SESSION['jwt']) && !empty($_SESSION['user']['role'])) {
    header('Location: ' . get_dashboard_url($_SESSION['user']['role']));
    exit;
}

$errorMessage = '';
$successData = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $csrf = $_POST['csrf_token'] ?? '';

    if (!verify_csrf_token($csrf)) {
        $errorMessage = 'Invalid security session. Please refresh and try again.';
    } elseif (empty($email)) {
        $errorMessage = 'Please enter your registered email address.';
    } else {
        $response = api_request('POST', '/api/auth/forgot-password', [
            'email' => $email,
        ]);

        if ($response['status'] === 200) {
            $successData = $response['body']['data'] ?? [];
        } else {
            $errorMessage = $response['body']['message'] ?? 'Could not process request. Please try again.';
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
  <title>Forgot Password | HelpDesk Support Portal</title>
  
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
      <h4 class="fw-bold text-dark mb-1">Reset Your Password</h4>
      <p class="text-muted small">Enter your corporate email address to receive password reset instructions</p>
    </div>

    <?php if ($successData !== null): ?>
      <div class="alert alert-success alert-custom py-3 mb-3 text-start" role="alert">
        <i class="bi bi-check-circle-fill fs-5"></i>
        <div>
          <strong>Reset Link Generated</strong>
          <p class="mb-0 small mt-1">If an active account exists for <strong><?= e($_POST['email'] ?? '') ?></strong>, a reset token has been created.</p>
        </div>
      </div>

      <?php if (!empty($successData['reset_token'])): ?>
        <!-- Quick reset button for internal demo / local environment -->
        <div class="p-3 bg-light rounded-3 border mb-3 text-center">
          <span class="text-muted small d-block mb-2">Simulated Email Delivery (Demo / Local Mode):</span>
          <a href="reset-password.php?token=<?= urlencode($successData['reset_token']) ?>&email=<?= urlencode($successData['email'] ?? '') ?>" class="btn btn-primary-custom w-100 justify-content-center py-2">
            <i class="bi bi-key-fill"></i> Proceed to Reset Password
          </a>
        </div>
      <?php endif; ?>

      <div class="text-center mt-3">
        <a href="login.php" class="btn btn-outline-custom w-100 justify-content-center">
          <i class="bi bi-arrow-left"></i> Back to Sign In
        </a>
      </div>
    <?php else: ?>
      <?php if (!empty($errorMessage)): ?>
        <div class="alert alert-danger alert-custom py-2 mb-3" role="alert">
          <i class="bi bi-exclamation-triangle-fill"></i>
          <div><?= e($errorMessage) ?></div>
        </div>
      <?php endif; ?>

      <form method="POST" action="forgot-password.php" data-prevent-double-submit>
        <input type="hidden" name="csrf_token" value="<?= e($csrfToken) ?>">

        <div class="form-group mb-4">
          <label for="email" class="form-label">Registered Work Email</label>
          <div class="input-group">
            <span class="input-group-text bg-white border-end-0 text-muted"><i class="bi bi-envelope"></i></span>
            <input type="email" id="email" name="email" class="form-control form-control-custom border-start-0" placeholder="name@helpdesk.local" required autofocus value="<?= e($_POST['email'] ?? '') ?>">
          </div>
          <small class="text-muted">We will send a secure token to this address.</small>
        </div>

        <button type="submit" class="btn btn-primary-custom w-100 justify-content-center py-2 fs-6">
          <i class="bi bi-send-fill"></i> Send Reset Link
        </button>

        <div class="text-center mt-3">
          <a href="login.php" class="text-primary fw-semibold small text-decoration-none">
            <i class="bi bi-arrow-left"></i> Back to Sign In
          </a>
        </div>
      </form>
    <?php endif; ?>
  </div>
</div>

<script src="assets/js/main.js"></script>
</body>
</html>
