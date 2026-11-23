/**
 * HelpDesk Enterprise Support System
 * Client-Side Utility & Interactive Script
 */

document.addEventListener('DOMContentLoaded', function () {
  // 1. Mobile Sidebar Toggle
  const sidebar = document.querySelector('.app-sidebar');
  const toggleBtn = document.querySelector('.sidebar-toggle-btn');
  const overlay = document.querySelector('.sidebar-overlay');

  if (toggleBtn && sidebar && overlay) {
    toggleBtn.addEventListener('click', function () {
      sidebar.classList.toggle('show');
      overlay.classList.toggle('show');
    });

    overlay.addEventListener('click', function () {
      sidebar.classList.remove('show');
      overlay.classList.remove('show');
    });
  }

  // 2. Prevent Double Submissions on Forms
  const forms = document.querySelectorAll('form[data-prevent-double-submit]');
  forms.forEach(function (form) {
    form.addEventListener('submit', function (e) {
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        if (submitBtn.dataset.submitted === 'true') {
          e.preventDefault();
          return false;
        }
        submitBtn.dataset.submitted = 'true';
        submitBtn.disabled = true;
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Processing...';
        
        // Re-enable after timeout in case of client-side validation abortion
        setTimeout(function () {
          submitBtn.disabled = false;
          submitBtn.dataset.submitted = 'false';
          submitBtn.innerHTML = originalText;
        }, 8000);
      }
    });
  });

  // 3. User profile dropdown toggle
  const userProfileTrigger = document.querySelector('.user-profile-trigger');
  const userProfileMenu = document.querySelector('.user-profile-menu');
  if (userProfileTrigger && userProfileMenu) {
    userProfileTrigger.addEventListener('click', function (e) {
      e.stopPropagation();
      userProfileMenu.classList.toggle('show');
    });

    document.addEventListener('click', function () {
      userProfileMenu.classList.remove('show');
    });
  }

  // 4. Auto-dismiss alerts after 5 seconds
  const autoDismissAlerts = document.querySelectorAll('.alert-auto-dismiss');
  autoDismissAlerts.forEach(function (alert) {
    setTimeout(function () {
      alert.style.transition = 'opacity 0.4s ease';
      alert.style.opacity = '0';
      setTimeout(function () { alert.remove(); }, 400);
    }, 5000);
  });
});

/**
 * Standard confirmation helper
 */
function confirmAction(message) {
  return confirm(message || 'Are you sure you want to perform this action?');
}
