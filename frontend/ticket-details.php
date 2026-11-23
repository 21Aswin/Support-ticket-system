<?php
require_once __DIR__ . '/config/auth.php';
$user = require_auth();

$ticketId = $_GET['id'] ?? null;
if (!$ticketId) {
    header('Location: ticket-list.php');
    exit;
}

$errorMessage = $_GET['error'] ?? '';
$successMessage = $_GET['msg'] ?? '';

// Handle POST actions (Assign, Status Change, Comment)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $csrf = $_POST['csrf_token'] ?? '';
    if (!verify_csrf_token($csrf)) {
        $errorMessage = 'Security validation failed. Please refresh.';
    } else {
        $postAction = $_POST['form_action'] ?? '';

        if ($postAction === 'assign' && $user['role'] === 'Admin') {
            $assignedTo = intval($_POST['assigned_to'] ?? 0);
            $assignRes = api_request('PATCH', "/api/tickets/{$ticketId}/assign", [
                'assigned_to' => $assignedTo,
            ]);

            if ($assignRes['status'] === 200) {
                header("Location: ticket-details.php?id={$ticketId}&msg=" . urlencode('Ticket assigned successfully.'));
                exit;
            } else {
                $errorMessage = $assignRes['body']['message'] ?? 'Failed to assign ticket.';
            }
        } elseif ($postAction === 'update_status') {
            $nextStatus = trim($_POST['status'] ?? '');
            $resolution = trim($_POST['resolution'] ?? '');
            $reason = trim($_POST['reason'] ?? '');

            $statusRes = api_request('PATCH', "/api/tickets/{$ticketId}/status", [
                'status' => $nextStatus,
                'resolution' => $resolution,
                'reason' => $reason,
            ]);

            if ($statusRes['status'] === 200) {
                header("Location: ticket-details.php?id={$ticketId}&msg=" . urlencode("Ticket status updated to '{$nextStatus}'."));
                exit;
            } else {
                $errorMessage = $statusRes['body']['message'] ?? 'Failed to update ticket status.';
            }
        } elseif ($postAction === 'add_comment') {
            $comment = trim($_POST['comment'] ?? '');
            if (empty($comment)) {
                $errorMessage = 'Comment cannot be blank.';
            } else {
                $commentRes = api_request('POST', "/api/tickets/{$ticketId}/comments", [
                    'comment' => $comment,
                ]);

                if ($commentRes['status'] === 201) {
                    header("Location: ticket-details.php?id={$ticketId}&msg=" . urlencode('Comment posted successfully.'));
                    exit;
                } else {
                    $errorMessage = $commentRes['body']['message'] ?? 'Failed to add comment.';
                }
            }
        }
    }
}

// Fetch Ticket Details
$ticketRes = api_request('GET', "/api/tickets/{$ticketId}");
if ($ticketRes['status'] !== 200 || empty($ticketRes['body']['data'])) {
    $deniedMessage = $ticketRes['body']['message'] ?? 'Ticket not found or you lack authorization to access it.';
    header('Location: ticket-list.php?error=' . urlencode($deniedMessage));
    exit;
}
$ticket = $ticketRes['body']['data'];

// Fetch Comments
$commentsRes = api_request('GET', "/api/tickets/{$ticketId}/comments");
$comments = $commentsRes['body']['data'] ?? [];

// Fetch History
$historyRes = api_request('GET', "/api/tickets/{$ticketId}/history");
$history = $historyRes['body']['data'] ?? [];

// If Admin, fetch active support staff list for assignment dropdown
$supportStaffList = [];
if ($user['role'] === 'Admin') {
    $staffRes = api_request('GET', '/api/users?role=Support+Staff&is_active=true');
    $supportStaffList = $staffRes['body']['data'] ?? [];
}

$page_title = 'Ticket ' . $ticket['ticket_number'];
$csrfToken = get_csrf_token();

$statusSlug = strtolower(str_replace(' ', '-', $ticket['status']));
$prioritySlug = strtolower($ticket['priority']);

require_once __DIR__ . '/includes/header.php';
require_once __DIR__ . '/includes/sidebar.php';
?>

<div class="app-main">
  <?php require_once __DIR__ . '/includes/topbar.php'; ?>

  <main class="app-content">
    <!-- Header with Back Link & Title -->
    <div class="page-header">
      <div class="page-title">
        <div class="d-flex align-items-center gap-3 mb-1">
          <span class="fs-4 fw-bold text-dark"><?= e($ticket['ticket_number']) ?></span>
          <span class="badge-status badge-<?= e($statusSlug) ?> fs-6"><?= e($ticket['status']) ?></span>
          <span class="badge-priority badge-<?= e($prioritySlug) ?>"><?= e($ticket['priority']) ?> Priority</span>
        </div>
        <p class="text-muted mb-0">Created on <?= date('F j, Y \a\t g:i A', strtotime($ticket['created_at'])) ?></p>
      </div>
      <div class="page-actions">
        <a href="ticket-list.php" class="btn btn-outline-custom">
          <i class="bi bi-arrow-left"></i> All Tickets
        </a>
      </div>
    </div>

    <!-- Alert Messages -->
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
      <!-- Left Column: Details, Resolution, Comments, History -->
      <div class="col-lg-8">
        <!-- Main Ticket Description Card -->
        <div class="card-custom">
          <h4 class="fw-bold text-dark mb-3"><?= e($ticket['title']) ?></h4>
          <div class="p-3 bg-light rounded-3 text-dark border mb-3" style="font-size: 14px; line-height: 1.7; white-space: pre-wrap;">
            <?= e($ticket['description']) ?>
          </div>
        </div>

        <!-- Resolution Details (if resolved or closed) -->
        <?php if (!empty($ticket['resolution'])): ?>
          <div class="card-custom border-success" style="background-color: #F6FCF5;">
            <div class="card-custom-header border-success">
              <h5 class="card-custom-title text-success">
                <i class="bi bi-check-circle-fill"></i> Resolution Details
              </h5>
              <?php if (!empty($ticket['resolved_at'])): ?>
                <span class="text-muted small">Resolved at <?= date('M d, Y H:i', strtotime($ticket['resolved_at'])) ?></span>
              <?php endif; ?>
            </div>
            <div class="p-3 bg-white rounded-3 border text-dark" style="font-size: 13.5px; line-height: 1.6; white-space: pre-wrap;">
              <?= e($ticket['resolution']) ?>
            </div>
          </div>
        <?php endif; ?>

        <!-- Conversation & Comments Section -->
        <div class="card-custom">
          <div class="card-custom-header">
            <h5 class="card-custom-title">
              <i class="bi bi-chat-left-text-fill text-primary"></i> 
              Discussion Thread (<?= count($comments) ?>)
            </h5>
          </div>

          <!-- Comments List -->
          <div class="comments-container mb-4">
            <?php if (!empty($comments)): ?>
              <?php foreach ($comments as $comm): ?>
                <?php
                  $authorRoleClass = 'badge-role-employee';
                  if ($comm['user_role'] === 'Admin') $authorRoleClass = 'badge-role-admin';
                  elseif ($comm['user_role'] === 'Support Staff') $authorRoleClass = 'badge-role-support';
                  
                  $initials = strtoupper(substr($comm['user_name'], 0, 1));
                ?>
                <div class="comment-card">
                  <div class="comment-header">
                    <div class="comment-author-info">
                      <div class="user-avatar-circle" style="width: 30px; height: 30px; font-size: 12px;">
                        <?= e($initials) ?>
                      </div>
                      <div>
                        <span class="comment-author-name"><?= e($comm['user_name']) ?></span>
                        <span class="user-profile-badge <?= e($authorRoleClass) ?> ms-1"><?= e($comm['user_role']) ?></span>
                      </div>
                    </div>
                    <span class="comment-time"><?= date('M j, Y \a\t g:i A', strtotime($comm['created_at'])) ?></span>
                  </div>
                  <div class="comment-body">
                    <?= e($comm['comment']) ?>
                  </div>
                </div>
              <?php endforeach; ?>
            <?php else: ?>
              <p class="text-muted text-center py-3">No comments posted yet. Add a response below.</p>
            <?php endif; ?>
          </div>

          <!-- Add Comment Form (Disabled if Closed) -->
          <?php if ($ticket['status'] !== 'Closed'): ?>
            <div class="border-top pt-3">
              <h6 class="fw-bold text-dark mb-2">Leave a Comment</h6>
              <form method="POST" action="ticket-details.php?id=<?= e($ticketId) ?>" data-prevent-double-submit>
                <input type="hidden" name="csrf_token" value="<?= e($csrfToken) ?>">
                <input type="hidden" name="form_action" value="add_comment">

                <div class="form-group mb-3">
                  <textarea name="comment" class="form-control form-control-custom" rows="3" 
                            placeholder="Type your reply or progress update here..." required></textarea>
                </div>
                <div class="text-end">
                  <button type="submit" class="btn btn-primary-custom">
                    <i class="bi bi-chat-dots-fill"></i> Post Comment
                  </button>
                </div>
              </form>
            </div>
          <?php else: ?>
            <div class="alert alert-secondary py-2 mb-0" style="font-size: 13px;">
              <i class="bi bi-lock-fill me-1"></i> This ticket is closed. Reopen the ticket to post new comments.
            </div>
          <?php endif; ?>
        </div>

        <!-- Activity Audit History Timeline -->
        <div class="card-custom">
          <div class="card-custom-header">
            <h5 class="card-custom-title">
              <i class="bi bi-clock-history text-secondary"></i> Activity Audit History
            </h5>
          </div>

          <div class="timeline">
            <?php if (!empty($history)): ?>
              <?php foreach ($history as $event): ?>
                <?php
                  $dotClass = 'dot-status';
                  if ($event['action'] === 'CREATED') $dotClass = 'dot-created';
                  elseif ($event['action'] === 'ASSIGNED') $dotClass = 'dot-assignment';
                ?>
                <div class="timeline-item">
                  <div class="timeline-dot <?= e($dotClass) ?>"></div>
                  <div class="timeline-content">
                    <div class="timeline-meta">
                      <span class="timeline-author">
                        <?= e($event['actor_name']) ?> (<?= e($event['actor_role']) ?>)
                      </span>
                      <span><?= date('M j, Y \a\t g:i A', strtotime($event['created_at'])) ?></span>
                    </div>
                    <div class="timeline-body">
                      <strong><?= e($event['action']) ?></strong>: <?= e($event['details']) ?>
                    </div>
                  </div>
                </div>
              <?php endforeach; ?>
            <?php else: ?>
              <p class="text-muted">No activity history recorded.</p>
            <?php endif; ?>
          </div>
        </div>
      </div>

      <!-- Right Column: Meta Information & Workflow Actions -->
      <div class="col-lg-4">
        <!-- Ticket Actions Card -->
        <div class="card-custom">
          <div class="card-custom-header">
            <h5 class="card-custom-title">
              <i class="bi bi-lightning-charge-fill text-warning"></i> Workflow Actions
            </h5>
          </div>

          <!-- ADMIN: Assignment Form -->
          <?php if ($user['role'] === 'Admin'): ?>
            <div class="mb-4">
              <label class="form-label fw-bold">Assign Ticket</label>
              <form method="POST" action="ticket-details.php?id=<?= e($ticketId) ?>" data-prevent-double-submit>
                <input type="hidden" name="csrf_token" value="<?= e($csrfToken) ?>">
                <input type="hidden" name="form_action" value="assign">

                <div class="mb-2">
                  <select name="assigned_to" class="form-select form-control-custom" required <?= $ticket['status'] === 'Closed' ? 'disabled' : '' ?>>
                    <option value="">-- Choose Support Staff --</option>
                    <?php foreach ($supportStaffList as $staff): ?>
                      <option value="<?= e($staff['id']) ?>" <?= ($ticket['assigned_to'] == $staff['id']) ? 'selected' : '' ?>>
                        <?= e($staff['name']) ?> (<?= e($staff['email']) ?>)
                      </option>
                    <?php endforeach; ?>
                  </select>
                </div>
                <button type="submit" class="btn btn-primary-custom w-100 justify-content-center" <?= $ticket['status'] === 'Closed' ? 'disabled' : '' ?>>
                  <i class="bi bi-person-check-fill"></i> <?= empty($ticket['assigned_to']) ? 'Assign Ticket' : 'Reassign Staff' ?>
                </button>
              </form>
            </div>
            <hr class="my-3">
          <?php endif; ?>

          <!-- SUPPORT STAFF: Start Work (Assigned -> In Progress) -->
          <?php if (($user['role'] === 'Support Staff' || $user['role'] === 'Admin') && $ticket['status'] === 'Assigned'): ?>
            <form method="POST" action="ticket-details.php?id=<?= e($ticketId) ?>" class="mb-3" data-prevent-double-submit>
              <input type="hidden" name="csrf_token" value="<?= e($csrfToken) ?>">
              <input type="hidden" name="form_action" value="update_status">
              <input type="hidden" name="status" value="In Progress">
              <button type="submit" class="btn btn-primary-custom w-100 justify-content-center">
                <i class="bi bi-play-fill fs-5"></i> Start Investigation (In Progress)
              </button>
            </form>
          <?php endif; ?>

          <!-- SUPPORT STAFF: Mark Resolved (In Progress or Reopened -> Resolved) -->
          <?php if (($user['role'] === 'Support Staff' || $user['role'] === 'Admin') && in_array($ticket['status'], ['In Progress', 'Reopened'], true)): ?>
            <button type="button" class="btn btn-success-custom w-100 justify-content-center mb-3" data-bs-toggle="modal" data-bs-target="#resolveModal">
              <i class="bi bi-check-lg fs-5"></i> Mark as Resolved
            </button>
          <?php endif; ?>

          <!-- EMPLOYEE or ADMIN: Close Resolved Ticket -->
          <?php if ($ticket['status'] === 'Resolved' && ($user['role'] === 'Employee' || $user['role'] === 'Admin')): ?>
            <form method="POST" action="ticket-details.php?id=<?= e($ticketId) ?>" class="mb-2" onsubmit="return confirmAction('Are you sure the issue is completely resolved and you want to close this ticket?');" data-prevent-double-submit>
              <input type="hidden" name="csrf_token" value="<?= e($csrfToken) ?>">
              <input type="hidden" name="form_action" value="update_status">
              <input type="hidden" name="status" value="Closed">
              <button type="submit" class="btn btn-outline-custom w-100 justify-content-center">
                <i class="bi bi-check2-all text-success"></i> Confirm & Close Ticket
              </button>
            </form>

            <button type="button" class="btn btn-danger-custom w-100 justify-content-center" data-bs-toggle="modal" data-bs-target="#reopenModal">
              <i class="bi bi-arrow-counterclockwise"></i> Reopen Ticket
            </button>
          <?php endif; ?>

          <?php if ($ticket['status'] === 'Closed'): ?>
            <div class="alert alert-secondary text-center mb-0" style="font-size: 13px;">
              <i class="bi bi-check-circle-fill text-success fs-5 d-block mb-1"></i>
              This ticket has been officially closed.
            </div>
          <?php endif; ?>
        </div>

        <!-- Ticket Meta Information Card -->
        <div class="card-custom">
          <div class="card-custom-header">
            <h5 class="card-custom-title">
              <i class="bi bi-info-circle text-primary"></i> Ticket Metadata
            </h5>
          </div>

          <div class="mb-3">
            <span class="text-muted d-block small">Category</span>
            <span class="fw-semibold text-dark"><?= e($ticket['category_name']) ?></span>
          </div>

          <div class="mb-3">
            <span class="text-muted d-block small">Priority Level</span>
            <span class="badge-priority badge-<?= e($prioritySlug) ?>"><?= e($ticket['priority']) ?></span>
          </div>

          <div class="mb-3">
            <span class="text-muted d-block small">Requester</span>
            <div class="fw-semibold text-dark"><?= e($ticket['requester_name']) ?></div>
            <div class="text-muted small"><?= e($ticket['requester_email']) ?></div>
          </div>

          <div class="mb-3">
            <span class="text-muted d-block small">Assigned Staff</span>
            <?php if (!empty($ticket['assigned_name'])): ?>
              <div class="fw-semibold text-dark"><?= e($ticket['assigned_name']) ?></div>
              <div class="text-muted small"><?= e($ticket['assigned_email']) ?></div>
            <?php else: ?>
              <span class="text-muted fst-italic">Unassigned</span>
            <?php endif; ?>
          </div>

          <div class="mb-3">
            <span class="text-muted d-block small">Submitted On</span>
            <span class="text-dark small"><?= date('M d, Y H:i', strtotime($ticket['created_at'])) ?></span>
          </div>

          <div>
            <span class="text-muted d-block small">Last Modified</span>
            <span class="text-dark small"><?= date('M d, Y H:i', strtotime($ticket['updated_at'])) ?></span>
          </div>
        </div>
      </div>
    </div>
  </main>

  <!-- Modal: Mark Ticket Resolved -->
  <div class="modal fade" id="resolveModal" tabindex="-1" aria-labelledby="resolveModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <form method="POST" action="ticket-details.php?id=<?= e($ticketId) ?>" data-prevent-double-submit>
          <input type="hidden" name="csrf_token" value="<?= e($csrfToken) ?>">
          <input type="hidden" name="form_action" value="update_status">
          <input type="hidden" name="status" value="Resolved">

          <div class="modal-header">
            <h5 class="modal-title fw-bold" id="resolveModalLabel">
              <i class="bi bi-check-circle-fill text-success me-2"></i>Resolve Ticket
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="form-group mb-3">
              <label for="resolution" class="form-label">Resolution Summary / Fix Details <span class="text-danger">*</span></label>
              <textarea id="resolution" name="resolution" class="form-control form-control-custom" rows="4" 
                        placeholder="Explain the troubleshooting steps taken, changes made, and verification results..." required></textarea>
            </div>
            <p class="text-muted small mb-0">The employee requester will be notified to confirm the resolution.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-custom" data-bs-dismiss="modal">Cancel</button>
            <button type="submit" class="btn btn-success-custom">
              <i class="bi bi-check-circle"></i> Submit Resolution
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- Modal: Reopen Ticket -->
  <div class="modal fade" id="reopenModal" tabindex="-1" aria-labelledby="reopenModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <form method="POST" action="ticket-details.php?id=<?= e($ticketId) ?>" data-prevent-double-submit>
          <input type="hidden" name="csrf_token" value="<?= e($csrfToken) ?>">
          <input type="hidden" name="form_action" value="update_status">
          <input type="hidden" name="status" value="Reopened">

          <div class="modal-header">
            <h5 class="modal-title fw-bold text-danger" id="reopenModalLabel">
              <i class="bi bi-arrow-counterclockwise me-2"></i>Reopen Support Ticket
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="form-group mb-3">
              <label for="reason" class="form-label">Reason for Reopening <span class="text-danger">*</span></label>
              <textarea id="reason" name="reason" class="form-control form-control-custom" rows="3" 
                        placeholder="Describe why the previous resolution was unsatisfactory or what issue persists..." required></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-custom" data-bs-dismiss="modal">Cancel</button>
            <button type="submit" class="btn btn-danger-custom">Reopen Ticket</button>
          </div>
        </form>
      </div>
    </div>
  </div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
