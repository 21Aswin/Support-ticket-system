<?php
require_once __DIR__ . '/config/auth.php';
$user = require_auth(['Employee', 'Admin']);

$page_title = 'Create New Ticket';
$errorMessage = '';
$successData = null;

// Fetch categories from backend API
$catRes = api_request('GET', '/api/categories?active_only=true');
$categories = $catRes['body']['data'] ?? [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $csrf = $_POST['csrf_token'] ?? '';
    if (!verify_csrf_token($csrf)) {
        $errorMessage = 'Security validation failed. Please reload and try again.';
    } else {
        $title = trim($_POST['title'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $category_id = intval($_POST['category_id'] ?? 0);
        $priority = trim($_POST['priority'] ?? 'Medium');

        if (empty($title) || empty($description) || empty($category_id)) {
            $errorMessage = 'Please complete all required fields (Title, Description, and Category).';
        } else {
            $createRes = api_request('POST', '/api/tickets', [
                'title' => $title,
                'description' => $description,
                'category_id' => $category_id,
                'priority' => $priority,
            ]);

            if ($createRes['status'] === 201 && !empty($createRes['body']['data'])) {
                $successData = $createRes['body']['data'];
            } else {
                $errorMessage = $createRes['body']['message'] ?? 'Failed to submit ticket. Please try again.';
            }
        }
    }
}

$csrfToken = get_csrf_token();
require_once __DIR__ . '/includes/header.php';
require_once __DIR__ . '/includes/sidebar.php';
?>

<div class="app-main">
  <?php require_once __DIR__ . '/includes/topbar.php'; ?>

  <main class="app-content">
    <div class="page-header">
      <div class="page-title">
        <h2>Raise a Support Ticket</h2>
        <p>Submit your technical issue or service request to the IT Support team</p>
      </div>
      <div class="page-actions">
        <a href="ticket-list.php" class="btn btn-outline-custom">
          <i class="bi bi-arrow-left"></i> Back to Tickets
        </a>
      </div>
    </div>

    <?php if ($successData): ?>
      <!-- Success Confirmation Card -->
      <div class="card-custom text-center py-5 border-success border-2 shadow-sm">
        <div class="kpi-icon green mx-auto mb-3" style="width: 64px; height: 64px; font-size: 32px;">
          <i class="bi bi-check2-circle"></i>
        </div>
        <h3 class="fw-bold text-dark mb-2">Ticket Created Successfully!</h3>
        <p class="text-muted mb-4" style="max-width: 480px; margin: 0 auto;">
          Your request has been queued in our HelpDesk system. Our support team has been notified.
        </p>

        <div class="d-inline-flex flex-column align-items-center bg-light p-3 rounded-3 border mb-4">
          <span class="text-muted small">Generated Reference Number:</span>
          <span class="fs-4 fw-bold text-primary"><?= e($successData['ticket_number']) ?></span>
          <span class="badge bg-primary text-white mt-1"><?= e($successData['status']) ?></span>
        </div>

        <div class="d-flex justify-content-center gap-3">
          <a href="ticket-details.php?id=<?= e($successData['id']) ?>" class="btn btn-primary-custom px-4">
            <i class="bi bi-eye"></i> View Ticket Details
          </a>
          <a href="create-ticket.php" class="btn btn-outline-custom px-4">
            <i class="bi bi-plus-lg"></i> Create Another Ticket
          </a>
        </div>
      </div>
    <?php else: ?>

      <?php if (!empty($errorMessage)): ?>
        <div class="alert alert-danger alert-custom mb-4" role="alert">
          <i class="bi bi-exclamation-triangle-fill fs-5"></i>
          <div><?= e($errorMessage) ?></div>
        </div>
      <?php endif; ?>

      <!-- Create Ticket Form Card -->
      <div class="row">
        <div class="col-lg-8">
          <div class="card-custom">
            <div class="card-custom-header">
              <h5 class="card-custom-title"><i class="bi bi-pencil-square text-primary"></i> Ticket Information</h5>
              <span class="text-muted small">* All fields required</span>
            </div>

            <form method="POST" action="create-ticket.php" data-prevent-double-submit>
              <input type="hidden" name="csrf_token" value="<?= e($csrfToken) ?>">

              <div class="form-group mb-3">
                <label for="title" class="form-label">Subject / Short Title <span class="text-danger">*</span></label>
                <input type="text" id="title" name="title" class="form-control form-control-custom" 
                       placeholder="e.g., Laptop cannot connect to office Wi-Fi" required maxlength="180"
                       value="<?= e($_POST['title'] ?? '') ?>">
                <small class="text-muted">Summarize the issue clearly in one concise sentence.</small>
              </div>

              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label for="category_id" class="form-label">Issue Category <span class="text-danger">*</span></label>
                  <select id="category_id" name="category_id" class="form-select form-control-custom" required>
                    <option value="">-- Select a Category --</option>
                    <?php foreach ($categories as $cat): ?>
                      <option value="<?= e($cat['id']) ?>" <?= (isset($_POST['category_id']) && $_POST['category_id'] == $cat['id']) ? 'selected' : '' ?>>
                        <?= e($cat['name']) ?>
                      </option>
                    <?php endforeach; ?>
                  </select>
                </div>

                <div class="col-md-6">
                  <label for="priority" class="form-label">Priority Level <span class="text-danger">*</span></label>
                  <select id="priority" name="priority" class="form-select form-control-custom" required>
                    <option value="Low" <?= (isset($_POST['priority']) && $_POST['priority'] === 'Low') ? 'selected' : '' ?>>Low - Non-urgent inquiry or minor request</option>
                    <option value="Medium" <?= (!isset($_POST['priority']) || $_POST['priority'] === 'Medium') ? 'selected' : '' ?>>Medium - Normal day-to-day work impediment</option>
                    <option value="High" <?= (isset($_POST['priority']) && $_POST['priority'] === 'High') ? 'selected' : '' ?>>High - Significant disruption to productivity</option>
                    <option value="Critical" <?= (isset($_POST['priority']) && $_POST['priority'] === 'Critical') ? 'selected' : '' ?>>Critical - Complete system outage or work stoppage</option>
                  </select>
                </div>
              </div>

              <div class="form-group mb-4">
                <label for="description" class="form-label">Detailed Description of the Issue <span class="text-danger">*</span></label>
                <textarea id="description" name="description" class="form-control form-control-custom" rows="6" 
                          placeholder="Please provide steps to reproduce, any error codes displayed, equipment identifiers, or relevant context..." required><?= e($_POST['description'] ?? '') ?></textarea>
              </div>

              <div class="d-flex align-items-center justify-content-between pt-2 border-top">
                <a href="ticket-list.php" class="btn btn-outline-custom">Cancel</a>
                <button type="submit" class="btn btn-primary-custom px-4">
                  <i class="bi bi-send-fill"></i> Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Help Sidebar Column -->
        <div class="col-lg-4">
          <div class="card-custom bg-light border-0">
            <h6 class="fw-bold text-dark mb-3"><i class="bi bi-lightbulb text-warning me-2"></i>Helpful Submission Tips</h6>
            <ul class="list-unstyled text-muted small mb-0" style="line-height: 1.8;">
              <li class="mb-2"><i class="bi bi-check-circle-fill text-success me-2"></i><strong>Be specific:</strong> Include exact error numbers and screenshots descriptions.</li>
              <li class="mb-2"><i class="bi bi-check-circle-fill text-success me-2"></i><strong>Equipment:</strong> Mention asset tags or laptop brand/models if applicable.</li>
              <li class="mb-2"><i class="bi bi-check-circle-fill text-success me-2"></i><strong>Response SLA:</strong> Critical requests are triaged within 1 hour; standard requests within 4 hours.</li>
              <li><i class="bi bi-check-circle-fill text-success me-2"></i><strong>Follow up:</strong> You can add comments anytime once your ticket is created.</li>
            </ul>
          </div>
        </div>
      </div>
    <?php endif; ?>
  </main>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
