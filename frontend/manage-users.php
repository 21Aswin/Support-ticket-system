<?php
require_once __DIR__ . '/config/auth.php';
$user = require_auth(['Admin']);

$page_title = 'Manage Users';
$errorMessage = '';
$successMessage = $_GET['msg'] ?? '';

// Handle POST actions (Create User, Toggle Status, Update User)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $csrf = $_POST['csrf_token'] ?? '';
    if (!verify_csrf_token($csrf)) {
        $errorMessage = 'Security validation failed.';
    } else {
        $action = $_POST['form_action'] ?? '';

        if ($action === 'create_user') {
            $name = trim($_POST['name'] ?? '');
            $email = trim($_POST['email'] ?? '');
            $password = $_POST['password'] ?? '';
            $role_id = intval($_POST['role_id'] ?? 3);

            $res = api_request('POST', '/api/users', [
                'name' => $name,
                'email' => $email,
                'password' => $password,
                'role_id' => $role_id,
            ]);

            if ($res['status'] === 201) {
                header('Location: manage-users.php?msg=' . urlencode('User created successfully.'));
                exit;
            } else {
                $errorMessage = $res['body']['message'] ?? 'Failed to create user.';
            }
        } elseif ($action === 'toggle_status') {
            $targetId = intval($_POST['user_id'] ?? 0);
            $newStatus = ($_POST['is_active'] === '1' || $_POST['is_active'] === 'true');

            $res = api_request('PUT', "/api/users/{$targetId}", [
                'is_active' => $newStatus,
            ]);

            if ($res['status'] === 200) {
                $msg = $newStatus ? 'User account activated.' : 'User account deactivated.';
                header('Location: manage-users.php?msg=' . urlencode($msg));
                exit;
            } else {
                $errorMessage = $res['body']['message'] ?? 'Failed to update user status.';
            }
        }
    }
}

// Fetch Users List
$usersRes = api_request('GET', '/api/users');
$usersList = $usersRes['body']['data'] ?? [];

$csrfToken = get_csrf_token();
require_once __DIR__ . '/includes/header.php';
require_once __DIR__ . '/includes/sidebar.php';
?>

<div class="app-main">
  <?php require_once __DIR__ . '/includes/topbar.php'; ?>

  <main class="app-content">
    <div class="page-header">
      <div class="page-title">
        <h2>User Management</h2>
        <p>Control user accounts, role allocations, and security credentials</p>
      </div>
      <div class="page-actions">
        <button type="button" class="btn btn-primary-custom" data-bs-toggle="modal" data-bs-target="#createUserModal">
          <i class="bi bi-person-plus-fill"></i> Add New User
        </button>
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

    <div class="card-custom">
      <div class="card-custom-header">
        <h5 class="card-custom-title"><i class="bi bi-people-fill text-primary"></i> Directory of Users</h5>
        <span class="badge bg-light text-dark border"><?= count($usersList) ?> Accounts</span>
      </div>

      <div class="table-responsive-custom">
        <table class="table-custom">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created Date</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($usersList as $u): ?>
              <?php
                $roleBadge = 'badge-role-employee';
                if ($u['role'] === 'Admin') $roleBadge = 'badge-role-admin';
                elseif ($u['role'] === 'Support Staff') $roleBadge = 'badge-role-support';
                
                $initials = strtoupper(substr($u['name'], 0, 1));
              ?>
              <tr>
                <td>
                  <div class="d-flex align-items-center gap-2">
                    <div class="user-avatar-circle" style="width: 32px; height: 32px; font-size: 13px;">
                      <?= e($initials) ?>
                    </div>
                    <span class="fw-semibold text-dark"><?= e($u['name']) ?></span>
                  </div>
                </td>
                <td>
                  <span class="text-muted"><?= e($u['email']) ?></span>
                </td>
                <td>
                  <span class="user-profile-badge <?= e($roleBadge) ?>"><?= e($u['role']) ?></span>
                </td>
                <td>
                  <?php if ($u['is_active']): ?>
                    <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-1">Active</span>
                  <?php else: ?>
                    <span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle rounded-pill px-2 py-1">Inactive</span>
                  <?php endif; ?>
                </td>
                <td>
                  <span class="text-muted small"><?= date('M d, Y', strtotime($u['created_at'])) ?></span>
                </td>
                <td class="text-end">
                  <?php if ($u['id'] !== $user['id']): ?>
                    <form method="POST" action="manage-users.php" class="d-inline" onsubmit="return confirmAction('Are you sure you want to change this user status?');">
                      <input type="hidden" name="csrf_token" value="<?= e($csrfToken) ?>">
                      <input type="hidden" name="form_action" value="toggle_status">
                      <input type="hidden" name="user_id" value="<?= e($u['id']) ?>">
                      <input type="hidden" name="is_active" value="<?= $u['is_active'] ? '0' : '1' ?>">

                      <?php if ($u['is_active']): ?>
                        <button type="submit" class="btn btn-sm btn-outline-danger" title="Deactivate user">
                          <i class="bi bi-person-x"></i> Deactivate
                        </button>
                      <?php else: ?>
                        <button type="submit" class="btn btn-sm btn-outline-success" title="Activate user">
                          <i class="bi bi-person-check"></i> Activate
                        </button>
                      <?php endif; ?>
                    </form>
                  <?php else: ?>
                    <span class="badge bg-light text-muted border">Current User</span>
                  <?php endif; ?>
                </td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </div>
  </main>

  <!-- Create User Modal -->
  <div class="modal fade" id="createUserModal" tabindex="-1" aria-labelledby="createUserModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <form method="POST" action="manage-users.php" data-prevent-double-submit>
          <input type="hidden" name="csrf_token" value="<?= e($csrfToken) ?>">
          <input type="hidden" name="form_action" value="create_user">

          <div class="modal-header">
            <h5 class="modal-title fw-bold" id="createUserModalLabel">
              <i class="bi bi-person-plus-fill text-primary me-2"></i>Create New User Account
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="form-group mb-3">
              <label for="new_name" class="form-label">Full Name <span class="text-danger">*</span></label>
              <input type="text" id="new_name" name="name" class="form-control form-control-custom" placeholder="e.g., Jennifer Taylor" required>
            </div>

            <div class="form-group mb-3">
              <label for="new_email" class="form-label">Email Address <span class="text-danger">*</span></label>
              <input type="email" id="new_email" name="email" class="form-control form-control-custom" placeholder="jennifer@helpdesk.local" required>
            </div>

            <div class="form-group mb-3">
              <label for="new_password" class="form-label">Initial Password <span class="text-danger">*</span></label>
              <div class="input-group">
                <input type="password" id="new_password" name="password" class="form-control form-control-custom border-end-0" placeholder="Set temporary password" required minlength="6">
                <button type="button" class="btn btn-outline-secondary border-start-0 bg-white text-muted password-toggle-btn" data-target="new_password" title="Show password" tabindex="-1">
                  <i class="bi bi-eye"></i>
                </button>
              </div>
            </div>

            <div class="form-group mb-3">
              <label for="new_role" class="form-label">Account Role <span class="text-danger">*</span></label>
              <select id="new_role" name="role_id" class="form-select form-control-custom" required>
                <option value="3" selected>Employee (Default requester)</option>
                <option value="2">Support Staff (Assignee & resolver)</option>
                <option value="1">Admin (System administrator)</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-custom" data-bs-dismiss="modal">Cancel</button>
            <button type="submit" class="btn btn-primary-custom">Create Account</button>
          </div>
        </form>
      </div>
    </div>
  </div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
