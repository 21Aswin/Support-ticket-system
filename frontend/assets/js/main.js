/**
 * HelpDesk Enterprise Support System
 * Client-Side Utility & Interactive Script
 */

document.addEventListener('DOMContentLoaded', function () {
  // 1. Sidebar Toggle (Both Desktop Collapsible & Mobile Drawer)
  const sidebar = document.querySelector('.app-sidebar');
  const toggleBtn = document.querySelector('.sidebar-toggle-btn') || document.getElementById('sidebarToggleBtn');
  const collapseBtn = document.getElementById('sidebarCollapseBtn');
  const overlay = document.querySelector('.sidebar-overlay');

  // Restore saved desktop collapsed state from localStorage
  const savedState = localStorage.getItem('helpdesk_sidebar_collapsed');
  if (savedState === 'true' && window.innerWidth >= 992) {
    document.body.classList.add('sidebar-collapsed');
  }

  function toggleSidebar() {
    if (window.innerWidth < 992) {
      // Mobile / Tablet drawer mode
      sidebar.classList.toggle('show');
      if (overlay) overlay.classList.toggle('show');
    } else {
      // Desktop collapse / expand mode
      document.body.classList.toggle('sidebar-collapsed');
      const isCollapsed = document.body.classList.contains('sidebar-collapsed');
      localStorage.setItem('helpdesk_sidebar_collapsed', isCollapsed ? 'true' : 'false');
    }
  }

  function closeSidebar() {
    if (window.innerWidth < 992) {
      if (sidebar) sidebar.classList.remove('show');
      if (overlay) overlay.classList.remove('show');
    } else {
      document.body.classList.add('sidebar-collapsed');
      localStorage.setItem('helpdesk_sidebar_collapsed', 'true');
    }
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', function (e) {
      e.preventDefault();
      toggleSidebar();
    });
  }

  if (collapseBtn) {
    collapseBtn.addEventListener('click', function (e) {
      e.preventDefault();
      closeSidebar();
    });
  }

  if (overlay) {
    overlay.addEventListener('click', function () {
      closeSidebar();
    });
  }

  // Close mobile sidebar on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeSidebar();
    }
  });

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
        const originalText = submitBtn.innerHTML;
        setTimeout(function () {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Processing...';
        }, 10);
        
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
