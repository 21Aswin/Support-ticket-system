<?php
require_once __DIR__ . '/config/auth.php';
$user = require_auth(['Employee', 'Admin']);

// Handle AJAX request for AI description drafting
if (isset($_GET['ajax']) && $_GET['ajax'] === 'ai_draft') {
    header('Content-Type: application/json');
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true) ?? [];

    $res = api_request('POST', '/api/tickets/generate-description', [
        'title' => $input['title'] ?? '',
        'category' => $input['category'] ?? '',
        'priority' => $input['priority'] ?? 'Medium',
    ]);

    if ($res['status'] === 200 && !empty($res['body']['data']['description'])) {
        echo json_encode([
            'success' => true,
            'description' => $res['body']['data']['description'],
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => $res['body']['message'] ?? 'Could not generate description at this time.',
        ]);
    }
    exit;
}

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
                <div class="d-flex align-items-center justify-content-between mb-2">
                  <label for="description" class="form-label mb-0 fw-bold">
                    Detailed Description of the Issue <span class="text-danger">*</span>
                  </label>
                  <div class="desc-toolbar">
                    <button type="button" id="btnAiDraft" class="btn-ai-sparkle" title="Auto-draft a structured technical description based on Subject & Category">
                      <i class="bi bi-stars"></i> <span id="btnAiDraftText">✨ AI Auto-Draft</span>
                    </button>
                    <button type="button" id="btnSelectAllDesc" class="btn btn-sm btn-outline-secondary btn-desc-tool" title="Select all text in description">
                      <i class="bi bi-check-all"></i> Select All
                    </button>
                    <button type="button" id="btnClearDesc" class="btn btn-sm btn-outline-danger btn-desc-tool" title="Clear description text">
                      <i class="bi bi-trash3"></i> Clear
                    </button>
                  </div>
                </div>

                <textarea id="description" name="description" class="form-control form-control-custom" rows="8" 
                          placeholder="Please provide steps to reproduce, any error codes displayed, equipment identifiers, or relevant context..." required><?= e($_POST['description'] ?? '') ?></textarea>
                
                <div class="d-flex justify-content-between align-items-center mt-1">
                  <small class="text-muted ai-status-hint" id="aiStatusHint">
                    <i class="bi bi-info-circle me-1"></i> Fill Subject & Category, then click <strong>✨ AI Auto-Draft</strong> for a tailored technical report.
                  </small>
                  <small class="text-muted" id="charCounter">0 characters</small>
                </div>
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
          <!-- AI Assistant Feature Tip -->
          <div class="card-custom mb-3 border-0" style="background: linear-gradient(145deg, #E9F5FB 0%, #F4F8FC 100%); border-left: 4px solid var(--secondary-blue) !important;">
            <h6 class="fw-bold text-dark mb-2"><i class="bi bi-stars text-primary me-2"></i>Smart AI Assistant</h6>
            <p class="text-muted small mb-2">
              Unsure what technical details support needs? Type your issue subject and choose a category, then click <strong>✨ AI Auto-Draft</strong>.
            </p>
            <p class="text-muted small mb-0">
              Not what you wanted? Use <strong>Select All</strong> or <strong>Clear</strong> to quickly wipe the text and type your own details.
            </p>
          </div>

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

  <script>
  (function () {
    console.log('[HelpDesk] AI Script initializing...');
    function initAiDescription() {
      const titleInput = document.getElementById('title');
      const categorySelect = document.getElementById('category_id');
      const prioritySelect = document.getElementById('priority');
      const descTextarea = document.getElementById('description');
      const btnAiDraft = document.getElementById('btnAiDraft');
      const btnAiDraftText = document.getElementById('btnAiDraftText');
      const btnSelectAll = document.getElementById('btnSelectAllDesc');
      const btnClear = document.getElementById('btnClearDesc');
      const aiStatusHint = document.getElementById('aiStatusHint');
      const charCounter = document.getElementById('charCounter');

      if (!descTextarea) {
        console.log('[HelpDesk] descTextarea not found');
        return;
      }
      console.log('[HelpDesk] Elements found, binding events...');

      // Update character counter
      function updateCharCount() {
        const len = descTextarea.value.length;
        if (charCounter) {
          charCounter.textContent = `${len} character${len === 1 ? '' : 's'}`;
        }
      }
      descTextarea.addEventListener('input', updateCharCount);
      updateCharCount();

      // 1. AI Auto-Draft Button
      if (btnAiDraft) {
        btnAiDraft.addEventListener('click', async function (e) {
          e.preventDefault();
          console.log('[HelpDesk] btnAiDraft clicked!');
          const currentTitleInput = document.getElementById('title');
          const title = currentTitleInput ? currentTitleInput.value.trim() : '';
          console.log('[HelpDesk] Current title input value:', title);
          const currentCatSelect = document.getElementById('category_id');
          const catText = (currentCatSelect && currentCatSelect.selectedIndex > 0) 
            ? currentCatSelect.options[currentCatSelect.selectedIndex].text 
            : '';
          const currentPriority = document.getElementById('priority');
          const priority = currentPriority ? currentPriority.value : 'Medium';

          if (!title) {
            console.log('[HelpDesk] Title is empty');
            if (currentTitleInput) {
              currentTitleInput.focus();
              currentTitleInput.classList.add('is-invalid');
              setTimeout(() => currentTitleInput.classList.remove('is-invalid'), 2500);
            }
            if (aiStatusHint) {
              aiStatusHint.innerHTML = '<span class="text-danger"><i class="bi bi-exclamation-circle-fill me-1"></i>Please enter a Subject / Title above first.</span>';
            }
            return;
          }

          // Show loading state
          const originalText = btnAiDraftText ? btnAiDraftText.innerHTML : 'AI Auto-Draft';
          btnAiDraft.disabled = true;
          if (btnAiDraftText) {
            btnAiDraftText.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Drafting...';
          }
          if (aiStatusHint) {
            aiStatusHint.innerHTML = '<span class="text-primary"><i class="bi bi-hourglass-split me-1"></i>Analyzing issue details and composing structured description...</span>';
          }

          try {
            console.log('[HelpDesk] Fetching AI draft from backend...', { title, catText, priority });
            const res = await fetch('create-ticket.php?ajax=ai_draft', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: title,
                category: catText,
                priority: priority
              })
            });

            const data = await res.json();
            console.log('[HelpDesk] AI draft response:', data);
            if (data.success && data.description) {
              descTextarea.value = data.description;
              updateCharCount();
              if (aiStatusHint) {
                aiStatusHint.innerHTML = '<span class="text-success fw-semibold"><i class="bi bi-check-circle-fill me-1"></i>AI description generated! Feel free to edit, or click Clear to write your own.</span>';
              }
            } else {
              throw new Error(data.message || 'Generation failed');
            }
          } catch (err) {
            console.warn('[HelpDesk] AI Draft fetch failed, using fallback:', err);
            descTextarea.value = generateFallbackTemplate(title, catText, priority);
            updateCharCount();
            if (aiStatusHint) {
              aiStatusHint.innerHTML = '<span class="text-success fw-semibold"><i class="bi bi-check-circle-fill me-1"></i>Draft generated! Feel free to edit, or click Clear to write your own.</span>';
            }
          } finally {
            btnAiDraft.disabled = false;
            if (btnAiDraftText) {
              btnAiDraftText.innerHTML = originalText;
            }
          }
        });
      }

      // 2. Select All Button
      if (btnSelectAll) {
        btnSelectAll.addEventListener('click', function (e) {
          e.preventDefault();
          descTextarea.focus();
          descTextarea.select();
          if (aiStatusHint) {
            aiStatusHint.innerHTML = '<span class="text-secondary"><i class="bi bi-check-all me-1"></i>All description text selected. Press any key to replace, or Backspace to delete.</span>';
          }
        });
      }

      // 3. Clear Button
      if (btnClear) {
        btnClear.addEventListener('click', function (e) {
          e.preventDefault();
          descTextarea.value = '';
          descTextarea.focus();
          updateCharCount();
          if (aiStatusHint) {
            aiStatusHint.innerHTML = '<span class="text-muted"><i class="bi bi-eraser-fill me-1"></i>Description cleared. You can type your own text or click ✨ AI Auto-Draft again.</span>';
          }
        });
      }

      // 4. Client-side fallback generator
      function generateFallbackTemplate(title, category, priority) {
        return `[Issue Summary]\n${title}\n\n[Category & Urgency]\n- Issue Category: ${category || 'Technical Support'}\n- Priority Level: ${priority}\n\n[Observed Symptoms]\n- Primary Problem: ${title}\n- Error / Behavior: Encountered unexpected failure during standard operations.\n- Frequency: Ongoing / Reproducible during office working hours.\n\n[Troubleshooting Steps Attempted]\n1. Restarted application and workstation hardware.\n2. Verified physical connections and network status.\n\n[Requested IT Action]\nKindly investigate this issue and assist with diagnosis and remediation.`;
      }

      // 5. Smart Hint on Category change
      if (categorySelect) {
        categorySelect.addEventListener('change', function () {
          if (titleInput && titleInput.value.trim() && !descTextarea.value.trim()) {
            if (aiStatusHint) {
              aiStatusHint.innerHTML = '<span class="text-primary fw-semibold"><i class="bi bi-stars text-warning me-1"></i>Subject & Category selected! Click <strong>✨ AI Auto-Draft</strong> to auto-fill description.</span>';
            }
          }
        });
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initAiDescription);
    } else {
      initAiDescription();
    }
  })();
  </script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
