<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

if (!file_exists(__DIR__ . '/config/api.php')) {
    echo "<div style='font-family:sans-serif; padding:30px; background:#fff3cd; color:#856404; border:2px solid #ffeeba; border-radius:8px; max-width:700px; margin:40px auto; box-shadow:0 4px 12px rgba(0,0,0,0.1);'>";
    echo "<h2 style='margin-top:0;'>⚠️ 'config/' folder missing in public_html</h2>";
    echo "<p>Directory: <code>" . htmlspecialchars(__DIR__) . "</code></p>";
    echo "<p><b>Items currently inside this folder:</b></p><ul style='line-height:1.8;'>";
    $items = scandir(__DIR__);
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        $isDir = is_dir(__DIR__ . '/' . $item) ? '📁 <b>[Folder]</b>' : '📄 [File]';
        echo "<li>$isDir " . htmlspecialchars($item) . "</li>";
    }
    echo "</ul>";
    echo "<hr style='border:0; border-top:1px solid #ffeeba; margin:20px 0;'>";
    echo "<p><b>How to fix in Hostinger File Manager:</b><br>";
    echo "Make sure the 3 subfolders (<b>config</b>, <b>includes</b>, <b>assets</b>) are directly inside <code>public_html/</code>.</p>";
    echo "</div>";
    exit;
}

require_once __DIR__ . '/config/api.php';
require_once __DIR__ . '/config/auth.php';

// If already logged in, redirect to appropriate dashboard
if (!empty($_SESSION['jwt']) && !empty($_SESSION['user']['role'])) {
    header('Location: ' . get_dashboard_url($_SESSION['user']['role']));
    exit;
}

$errorMessage = '';
$successMessage = $_GET['msg'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $csrf = $_POST['csrf_token'] ?? '';

    if (!verify_csrf_token($csrf)) {
        $errorMessage = 'Invalid security session. Please refresh and try again.';
    } elseif (empty($email) || empty($password)) {
        $errorMessage = 'Please enter both your email address and password.';
    } else {
        $response = api_request('POST', '/api/auth/login', [
            'email' => $email,
            'password' => $password,
        ]);

        if ($response['status'] === 200 && !empty($response['body']['data']['token'])) {
            // Save token and user in secure server session
            $_SESSION['jwt'] = $response['body']['data']['token'];
            $_SESSION['user'] = $response['body']['data']['user'];

            $dashboard = get_dashboard_url($_SESSION['user']['role']);
            header("Location: {$dashboard}");
            exit;
        } else {
            $errorMessage = $response['body']['message'] ?? 'Authentication failed. Please verify your credentials.';
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
  <title>Sign In | HelpDesk Support Portal</title>
  
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
    .login-container {
      width: 100%;
      max-width: 440px;
    }
    .login-card {
      background: #FFFFFF;
      border-radius: 14px;
      padding: 36px 32px;
      box-shadow: 0 15px 35px rgba(6, 75, 143, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .login-brand {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 24px;
    }
    .login-brand-icon {
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
    .demo-accounts {
      background-color: var(--page-bg);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 12px 14px;
      margin-top: 24px;
      font-size: 12px;
    }
    .demo-btn {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 4px;
      border: 1px solid var(--border-color);
      background: #FFFFFF;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .demo-btn:hover {
      background: var(--light-blue);
      border-color: var(--secondary-blue);
      color: var(--secondary-blue);
    }
  </style>
</head>
<body>

<div class="login-container">
  <div class="login-card">
    <div class="login-brand">
      <div class="login-brand-icon">
        <i class="bi bi-shield-check"></i>
      </div>
      <div>
        <h3 class="fw-bold mb-0 text-dark" style="letter-spacing: -0.5px;">HelpDesk</h3>
        <p class="text-muted small mb-0">Internal Support Ticket Management</p>
      </div>
    </div>

    <?php if (!empty($errorMessage)): ?>
      <div class="alert alert-danger alert-custom py-2 mb-3" role="alert">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <div><?= e($errorMessage) ?></div>
      </div>
    <?php endif; ?>

    <?php if (!empty($successMessage)): ?>
      <div class="alert alert-success alert-custom py-2 mb-3" role="alert">
        <i class="bi bi-check-circle-fill"></i>
        <div><?= e($successMessage) ?></div>
      </div>
    <?php endif; ?>

    <form method="POST" action="login.php" data-prevent-double-submit>
      <input type="hidden" name="csrf_token" value="<?= e($csrfToken) ?>">

      <div class="form-group mb-3">
        <label for="email" class="form-label">Work Email Address</label>
        <div class="input-group">
          <span class="input-group-text bg-white border-end-0 text-muted"><i class="bi bi-envelope"></i></span>
          <input type="email" id="email" name="email" class="form-control form-control-custom border-start-0" placeholder="name@helpdesk.local" required autofocus value="<?= e($_POST['email'] ?? '') ?>">
        </div>
      </div>

      <div class="form-group mb-4">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <label for="password" class="form-label mb-0">Password</label>
          <a href="forgot-password.php" class="text-primary text-decoration-none small">Forgot password?</a>
        </div>
        <div class="input-group">
          <span class="input-group-text bg-white border-end-0 text-muted"><i class="bi bi-lock"></i></span>
          <input type="password" id="password" name="password" class="form-control form-control-custom border-start-0 border-end-0" placeholder="Enter your password" required>
          <button type="button" class="btn btn-outline-secondary border-start-0 bg-white text-muted password-toggle-btn" data-target="password" title="Show password" tabindex="-1">
            <i class="bi bi-eye"></i>
          </button>
        </div>
      </div>

      <button type="submit" class="btn btn-primary-custom w-100 justify-content-center py-2 fs-6">
        <i class="bi bi-box-arrow-in-right"></i> Sign In to Portal
      </button>

      <div class="text-center mt-3">
        <span class="text-muted small">Don't have an account?</span>
        <a href="register.php" class="text-primary fw-semibold small text-decoration-none ms-1">Create an Account</a>
      </div>
    </form>

    <!-- Quick Demo Credential Pills for Easy Local Review -->
    <div class="demo-accounts">
      <div class="fw-semibold text-dark mb-1 d-flex align-items-center justify-content-between">
        <span><i class="bi bi-info-circle me-1 text-primary"></i> Quick Demo Logins:</span>
      </div>
      <div class="d-flex gap-2 mt-2">
        <button type="button" class="demo-btn flex-fill" onclick="fillCreds('admin@helpdesk.local', 'Admin@123')">
          <strong>Admin</strong>
        </button>
        <button type="button" class="demo-btn flex-fill" onclick="fillCreds('support@helpdesk.local', 'Support@123')">
          <strong>Support</strong>
        </button>
        <button type="button" class="demo-btn flex-fill" onclick="fillCreds('employee@helpdesk.local', 'Employee@123')">
          <strong>Employee</strong>
        </button>
      </div>
    </div>
  </div>
</div>

<script>
function fillCreds(email, password) {
  document.getElementById('email').value = email;
  document.getElementById('password').value = password;
}
</script>
<script src="assets/js/main.js"></script>
</body>
</html>
