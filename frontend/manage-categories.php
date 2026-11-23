<?php
require_once __DIR__ . '/config/auth.php';
$user = require_auth(['Admin']);

$page_title = 'Manage Categories';
$errorMessage = '';
$successMessage = $_GET['msg'] ?? '';

// Handle POST actions (Create Category, Toggle Status, Rename)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $csrf = $_POST['csrf_token'] ?? '';
    if (!verify_csrf_token($csrf)) {
        $errorMessage = 'Security validation failed.';
    } else {
        $action = $_POST['form_action'] ?? '';

        if ($action === 'create_category') {
            $name = trim($_POST['name'] ?? '');
            $res = api_request('POST', '/api/categories', ['name' => $name]);

            if ($res['status'] === 201) {
                header('Location: manage-categories.php?msg=' . urlencode('Category created successfully.'));
                exit;
            } else {
                $errorMessage = $res['body']['message'] ?? 'Failed to create category.';
            }
        } elseif ($action === 'toggle_status') {
            $catId = intval($_POST['category_id'] ?? 0);
            $newStatus = ($_POST['is_active'] === '1' || $_POST['is_active'] === 'true');

            $res = api_request('PATCH', "/api/categories/{$catId}/status", [
                'is_active' => $newStatus,
            ]);

            if ($res['status'] === 200) {
                $msg = $newStatus ? 'Category activated.' : 'Category deactivated.';
                header('Location: manage-categories.php?msg=' . urlencode($msg));
                exit;
            } else {
                $errorMessage = $res['body']['message'] ?? 'Failed to update category.';
            }
        } elseif ($action === 'rename_category') {
            $catId = intval($_POST['category_id'] ?? 0);
            $name = trim($_POST['name'] ?? '');

            $res = api_request('PUT', "/api/categories/{$catId}", ['name' => $name]);
            if ($res['status'] === 200) {
                header('Location: manage-categories.php?msg=' . urlencode('Category renamed successfully.'));
                exit;
            } else {
                $errorMessage = $res['body']['message'] ?? 'Failed to rename category.';
            }
        }
    }
}

// Fetch all categories (including inactive for admin)
$catRes = api_request('GET', '/api/categories');
$categoriesList = $catRes['body']['data'] ?? [];

$csrfToken = get_csrf_token();
require_once __DIR__ . '/includes/header.php';
require_once __DIR__ . '/includes/sidebar.php';
?>

<div class="app-main">
  <?php require_once __DIR__ . '/includes/topbar.php'; ?>

  <main class="app-content">
    <div class="page-header">
      <div class="page-title">
        <h2>Category Management</h2>
        <p>Configure support ticket classification categories</p>
      </div>
      <div class="page-actions">
        <button type="button" class="btn btn-primary-custom" data-bs-toggle="modal" data-bs-target="#createCategoryModal">
          <i class="bi bi-tag-fill"></i> Add Category
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
        <h5 class="card-custom-title"><i class="bi bi-tags-fill text-primary"></i> Support Categories</h5>
        <span class="badge bg-light text-dark border"><?= count($categoriesList) ?> Total</span>
      </div>

      <div class="table-responsive-custom">
        <table class="table-custom">
          <thead>
            <tr>
              <th>ID</th>
              <th>Category Name</th>
              <th>Status</th>
              <th>Created Date</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($categoriesList as $cat): ?>
              <tr>
                <td><span class="text-muted fw-bold">#<?= e($cat['id']) ?></span></td>
                <td>
                  <span class="fw-semibold text-dark"><?= e($cat['name']) ?></span>
                </td>
                <td>
                  <?php if ($cat['is_active']): ?>
                    <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-1">Active</span>
                  <?php else: ?>
                    <span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle rounded-pill px-2 py-1">Inactive</span>
                  <?php endif; ?>
                </td>
                <td>
                  <span class="text-muted small"><?= date('M d, Y', strtotime($cat['created_at'])) ?></span>
                </td>
                <td class="text-end">
                  <!-- Toggle Status Button -->
                  <form method="POST" action="manage-categories.php" class="d-inline" onsubmit="return confirmAction('Are you sure you want to change this category status?');">
                    <input type="hidden" name="csrf_token" value="<?= e($csrfToken) ?>">
                    <input type="hidden" name="form_action" value="toggle_status">
                    <input type="hidden" name="category_id" value="<?= e($cat['id']) ?>">
                    <input type="hidden" name="is_active" value="<?= $cat['is_active'] ? '0' : '1' ?>">

                    <?php if ($cat['is_active']): ?>
                      <button type="submit" class="btn btn-sm btn-outline-danger" title="Deactivate category">
                        Deactivate
                      </button>
                    <?php else: ?>
                      <button type="submit" class="btn btn-sm btn-outline-success" title="Activate category">
                        Activate
                      </button>
                    <?php endif; ?>
                  </form>
                </td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </div>
  </main>

  <!-- Create Category Modal -->
  <div class="modal fade" id="createCategoryModal" tabindex="-1" aria-labelledby="createCategoryModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <form method="POST" action="manage-categories.php" data-prevent-double-submit>
          <input type="hidden" name="csrf_token" value="<?= e($csrfToken) ?>">
          <input type="hidden" name="form_action" value="create_category">

          <div class="modal-header">
            <h5 class="modal-title fw-bold" id="createCategoryModalLabel">
              <i class="bi bi-tag-fill text-primary me-2"></i>Add Ticket Category
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="form-group mb-3">
              <label for="cat_name" class="form-label">Category Name <span class="text-danger">*</span></label>
              <input type="text" id="cat_name" name="name" class="form-control form-control-custom" placeholder="e.g., Security & Antivirus" required maxlength="100">
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-custom" data-bs-dismiss="modal">Cancel</button>
            <button type="submit" class="btn btn-primary-custom">Create Category</button>
          </div>
        </form>
      </div>
    </div>
  </div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
