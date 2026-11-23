<?php
require_once __DIR__ . '/config/api.php';
require_once __DIR__ . '/config/auth.php';

// If already logged in, redirect to appropriate dashboard
if (!empty($_SESSION['jwt']) && !empty($_SESSION['user']['role'])) {
    header('Location: ' . get_dashboard_url($_SESSION['user']['role']));
    exit;
}

$errorMessage = '';
$successMessage = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $confirmPassword = $_POST['confirm_password'] ?? '';
    $csrf = $_POST['csrf_token'] ?? '';

    if (!verify_csrf_token($csrf)) {
        $errorMessage = 'Invalid security session. Please refresh and try again.';
    } elseif (empty($name) || empty($email) || empty($password) || empty($confirmPassword)) {
        $errorMessage = 'Please complete all required fields.';
    } elseif (strlen($password) < 6) {
        $errorMessage = 'Password must be at least 6 characters long.';
    } elseif ($password !== $confirmPassword) {
        $errorMessage = 'Passwords do not match. Please verify.';
    } else {
        $response = api_request('POST', '/api/auth/register', [
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'confirm_password' => $confirmPassword,
        ]);

        if ($response['status'] === 201 && !empty($response['body']['data']['token'])) {
            // Save token and auto sign-in
            $_SESSION['jwt'] = $response['body']['data']['token'];
            $_SESSION['user'] = $response['body']['data']['user'];

            header('Location: employee-dashboard.php?msg=' . urlencode('Welcome to HelpDesk! Your account has been created successfully.'));
            exit;
        } else {
            $errorMessage = $response['body']['message'] ?? 'Registration failed. Please check your details.';
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
  <title>Create Account | HelpDesk Support Portal</title>
  
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
      padding: 24px 20px;
    }
    .register-container {
      width: 100%;
      max-width: 480px;
    }
    .register-card {
      background: #FFFFFF;
      border-radius: 14px;
      padding: 36px 32px;
      box-shadow: 0 15px 35px rgba(6, 75, 143, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .register-brand {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 24px;
    }
    .register-brand-icon {
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

<div class="register-container">
  <div class="register-card">
    <div class="register-brand">
      <div class="register-brand-icon">
        <i class="bi bi-shield-check"></i>
      </div>
      <div>
        <h3 class="fw-bold mb-0 text-dark" style="letter-spacing: -0.5px;">HelpDesk</h3>
        <p class="text-muted small mb-0">Internal Support Ticket Management</p>
      </div>
    </div>

    <div class="text-center mb-4">
      <h4 class="fw-bold text-dark mb-1">Create an Account</h4>
      <p class="text-muted small">Sign up to submit tickets and track IT support requests</p>
    </div>

    <?php if (!empty($errorMessage)): ?>
      <div class="alert alert-danger alert-custom py-2 mb-3" role="alert">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <div><?= e($errorMessage) ?></div>
      </div>
    <?php endif; ?>

    <form method="POST" action="register.php" data-prevent-double-submit>
      <input type="hidden" name="csrf_token" value="<?= e($csrfToken) ?>">

      <div class="form-group mb-3">
        <label for="name" class="form-label">Full Name <span class="text-danger">*</span></label>
        <div class="input-group">
          <span class="input-group-text bg-white border-end-0 text-muted"><i class="bi bi-person"></i></span>
          <input type="text" id="name" name="name" class="form-control form-control-custom border-start-0" placeholder="e.g., Alex Morgan" required autofocus value="<?= e($_POST['name'] ?? '') ?>">
        </div>
      </div>

      <div class="form-group mb-3">
        <label for="email" class="form-label">Work Email Address <span class="text-danger">*</span></label>
        <div class="input-group">
          <span class="input-group-text bg-white border-end-0 text-muted"><i class="bi bi-envelope"></i></span>
          <input type="email" id="email" name="email" class="form-control form-control-custom border-start-0" placeholder="name@helpdesk.local" required value="<?= e($_POST['email'] ?? '') ?>">
        </div>
      </div>

      <div class="form-group mb-3">
        <label for="password" class="form-label">Password <span class="text-danger">*</span></label>
        <div class="input-group">
          <span class="input-group-text bg-white border-end-0 text-muted"><i class="bi bi-lock"></i></span>
          <input type="password" id="password" name="password" class="form-control form-control-custom border-start-0 border-end-0" placeholder="At least 6 characters" required minlength="6">
          <button type="button" class="btn btn-outline-secondary border-start-0 bg-white text-muted password-toggle-btn" data-target="password" title="Show password" tabindex="-1">
            <i class="bi bi-eye"></i>
          </button>
        </div>
      </div>

      <div class="form-group mb-4">
        <label for="confirm_password" class="form-label">Confirm Password <span class="text-danger">*</span></label>
        <div class="input-group">
          <span class="input-group-text bg-white border-end-0 text-muted"><i class="bi bi-shield-lock"></i></span>
          <input type="password" id="confirm_password" name="confirm_password" class="form-control form-control-custom border-start-0 border-end-0" placeholder="Re-enter password" required minlength="6">
          <button type="button" class="btn btn-outline-secondary border-start-0 bg-white text-muted password-toggle-btn" data-target="confirm_password" title="Show password" tabindex="-1">
            <i class="bi bi-eye"></i>
          </button>
        </div>
      </div>

      <button type="submit" class="btn btn-primary-custom w-100 justify-content-center py-2 fs-6">
        <i class="bi bi-person-plus-fill"></i> Create Account
      </button>

      <div class="text-center mt-3">
        <span class="text-muted small">Already have an account?</span>
        <a href="login.php" class="text-primary fw-semibold small text-decoration-none ms-1">Sign In</a>
      </div>
    </form>
  </div>
</div>

<script src="assets/js/main.js"></script>
</body>
</html>
