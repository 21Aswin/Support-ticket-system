/**
 * HelpDesk Custom Select Dropdown System
 * Converts standard <select data-custom-select> into responsive, accessible,
 * and beautifully styled HelpDesk dropdowns that never overflow their container.
 */
document.addEventListener('DOMContentLoaded', function () {
  initCustomSelects();
});

function initCustomSelects() {
  const selects = document.querySelectorAll('select[data-custom-select="true"]');
  
  selects.forEach(select => {
    if (select.dataset.customSelectInitialized === 'true') return;
    select.dataset.customSelectInitialized = 'true';

    const selectKey = (select.id || select.name || '').toLowerCase();

    function getOptionMeta(option, key) {
      const text = option.text.trim();
      const val = option.value;
      let iconHtml = '';
      let badgeHtml = '';

      if (key.includes('category')) {
        if (text.includes('Hardware')) iconHtml = '<span class="custom-select-icon"><i class="bi bi-laptop"></i></span>';
        else if (text.includes('Software')) iconHtml = '<span class="custom-select-icon"><i class="bi bi-code-slash"></i></span>';
        else if (text.includes('Network')) iconHtml = '<span class="custom-select-icon"><i class="bi bi-wifi"></i></span>';
        else if (text.includes('Access')) iconHtml = '<span class="custom-select-icon"><i class="bi bi-shield-lock"></i></span>';
        else if (text.includes('Email')) iconHtml = '<span class="custom-select-icon"><i class="bi bi-envelope"></i></span>';
        else if (text.includes('Other')) iconHtml = '<span class="custom-select-icon"><i class="bi bi-tag"></i></span>';
        else if (val === '') iconHtml = '<span class="custom-select-icon" style="background:#F1F5F9; color:#94A3B8;"><i class="bi bi-grid"></i></span>';
      } else if (key.includes('priority')) {
        if (val === 'Low') badgeHtml = '<span class="priority-badge-dot low"></span>';
        else if (val === 'Medium') badgeHtml = '<span class="priority-badge-dot medium"></span>';
        else if (val === 'High') badgeHtml = '<span class="priority-badge-dot high"></span>';
        else if (val === 'Critical') badgeHtml = '<span class="priority-badge-dot critical"></span>';
        else if (val === '') iconHtml = '<span class="custom-select-icon" style="background:#F1F5F9; color:#94A3B8;"><i class="bi bi-flag"></i></span>';
      } else if (key.includes('status')) {
        if (val === 'Open') iconHtml = '<span class="custom-select-icon text-primary" style="background:#EBF5FF;"><i class="bi bi-circle"></i></span>';
        else if (val === 'Assigned') iconHtml = '<span class="custom-select-icon text-info" style="background:#E0F2FE;"><i class="bi bi-person-check"></i></span>';
        else if (val === 'In Progress') iconHtml = '<span class="custom-select-icon text-warning" style="background:#FEF3C7;"><i class="bi bi-play-circle"></i></span>';
        else if (val === 'Resolved') iconHtml = '<span class="custom-select-icon text-success" style="background:#DCFCE7;"><i class="bi bi-check-circle"></i></span>';
        else if (val === 'Closed') iconHtml = '<span class="custom-select-icon text-secondary" style="background:#F1F5F9;"><i class="bi bi-x-circle"></i></span>';
        else if (val === 'Reopened') iconHtml = '<span class="custom-select-icon text-danger" style="background:#FEE2E2;"><i class="bi bi-arrow-counterclockwise"></i></span>';
        else if (val === '') iconHtml = '<span class="custom-select-icon text-muted" style="background:#F1F5F9;"><i class="bi bi-funnel"></i></span>';
      }
      return { iconHtml, badgeHtml, text, val };
    }

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';
    wrapper.id = 'wrapper_' + (select.id || Math.random().toString(36).substring(7));

    // Create Trigger
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'custom-select-trigger';
    trigger.id = 'trigger_' + (select.id || '');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    const textSpan = document.createElement('span');
    textSpan.className = 'custom-select-text';
    trigger.appendChild(textSpan);

    const arrowIcon = document.createElement('i');
    arrowIcon.className = 'bi bi-chevron-down custom-select-arrow';
    trigger.appendChild(arrowIcon);

    // Create Menu
    const menu = document.createElement('div');
    menu.className = 'custom-select-menu';
    menu.setAttribute('role', 'listbox');

    function updateTriggerDisplay() {
      const selectedOption = select.options[select.selectedIndex];
      if (!selectedOption || (selectedOption.value === '' && select.selectedIndex === 0)) {
        textSpan.innerHTML = `<span class="custom-select-placeholder">${selectedOption ? selectedOption.text : '-- Select --'}</span>`;
      } else {
        const meta = getOptionMeta(selectedOption, selectKey);
        textSpan.innerHTML = `${meta.iconHtml || meta.badgeHtml} <span class="custom-select-option-label">${meta.text}</span>`;
      }
    }

    // Populate options
    Array.from(select.options).forEach((opt, index) => {
      const meta = getOptionMeta(opt, selectKey);
      const optDiv = document.createElement('div');
      optDiv.className = 'custom-select-option' + (opt.selected ? ' selected' : '');
      optDiv.setAttribute('role', 'option');
      optDiv.setAttribute('data-value', opt.value);
      optDiv.setAttribute('data-index', index);

      optDiv.innerHTML = `
        <div class="custom-select-option-content">
          ${meta.iconHtml || meta.badgeHtml}
          <span class="custom-select-option-label">${meta.text}</span>
        </div>
        <i class="bi bi-check2 custom-select-check"></i>
      `;

      optDiv.addEventListener('click', function (e) {
        e.stopPropagation();
        select.selectedIndex = index;
        select.value = opt.value;

        // Update selected class
        menu.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
        optDiv.classList.add('selected');

        // Update trigger display
        updateTriggerDisplay();

        // Close menu
        closeMenu();

        // Clear invalid state
        trigger.classList.remove('is-invalid');

        // Fire native events so AI draft and forms detect change
        select.dispatchEvent(new Event('change', { bubbles: true }));
        select.dispatchEvent(new Event('input', { bubbles: true }));

        // Trigger onchange / submit if defined
        if (select.hasAttribute('onchange')) {
          if (typeof select.onchange === 'function') {
            select.onchange();
          } else if (select.form) {
            select.form.submit();
          }
        }
      });

      menu.appendChild(optDiv);
    });

    function toggleMenu() {
      const isOpen = wrapper.classList.contains('open');
      if (isOpen) {
        closeMenu();
      } else {
        // Close any other open custom selects
        document.querySelectorAll('.custom-select-wrapper.open').forEach(w => {
          if (w !== wrapper) {
            w.classList.remove('open');
            const t = w.querySelector('.custom-select-trigger');
            if (t) t.setAttribute('aria-expanded', 'false');
          }
        });
        wrapper.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');

        // Viewport & boundary safeguard (never spill outside screen)
        const triggerRect = trigger.getBoundingClientRect();
        if (triggerRect.right > window.innerWidth - 15) {
          menu.style.right = '0px';
          menu.style.left = 'auto';
        } else {
          menu.style.left = '0px';
          menu.style.right = '0px';
        }

        const parentRow = wrapper.closest('.row');
        if (parentRow) parentRow.classList.add('has-open-select');
        const parentFormGroup = wrapper.closest('.form-group');
        if (parentFormGroup) parentFormGroup.classList.add('has-open-select');
        const parentFilter = wrapper.closest('.filter-bar');
        if (parentFilter) parentFilter.classList.add('has-open-select');
        
        // Scroll selected item into view
        const selectedOpt = menu.querySelector('.custom-select-option.selected');
        if (selectedOpt) {
          selectedOpt.scrollIntoView({ block: 'nearest' });
        }
      }
    }

    function closeMenu() {
      wrapper.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
      if (!document.querySelector('.custom-select-wrapper.open')) {
        document.querySelectorAll('.has-open-select').forEach(el => el.classList.remove('has-open-select'));
      }
    }

    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggleMenu();
    });

    // Keyboard navigation
    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!wrapper.classList.contains('open')) {
          toggleMenu();
        } else if (e.key === 'ArrowDown') {
          const next = select.selectedIndex < select.options.length - 1 ? select.selectedIndex + 1 : 0;
          const targetOpt = menu.children[next];
          if (targetOpt) targetOpt.click();
        } else if (e.key === 'ArrowUp') {
          const prev = select.selectedIndex > 0 ? select.selectedIndex - 1 : select.options.length - 1;
          const targetOpt = menu.children[prev];
          if (targetOpt) targetOpt.click();
        }
      } else if (e.key === 'Escape') {
        closeMenu();
      }
    });

    // Listen for external programmatic changes to select
    select.addEventListener('change', function () {
      updateTriggerDisplay();
      menu.querySelectorAll('.custom-select-option').forEach((optDiv, idx) => {
        if (idx === select.selectedIndex) optDiv.classList.add('selected');
        else optDiv.classList.remove('selected');
      });
    });

    // Insert wrapper into DOM
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(trigger);
    wrapper.appendChild(menu);
    wrapper.appendChild(select);

    // Apply native hidden styling
    select.classList.add('custom-select-hidden-native');

    // Initial display
    updateTriggerDisplay();
  });

  // Global click outside listener
  document.addEventListener('click', function (e) {
    document.querySelectorAll('.custom-select-wrapper.open').forEach(wrapper => {
      if (!wrapper.contains(e.target)) {
        wrapper.classList.remove('open');
        const trigger = wrapper.querySelector('.custom-select-trigger');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      }
    });
  });

  // Global Esc key listener
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.custom-select-wrapper.open').forEach(wrapper => {
        wrapper.classList.remove('open');
        const trigger = wrapper.querySelector('.custom-select-trigger');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      });
    }
  });
}
