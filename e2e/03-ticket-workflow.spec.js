const { test, expect } = require('../backend/node_modules/@playwright/test');

test.describe('End-to-End Ticket Lifecycle & Workflow', () => {
  test.describe.configure({ mode: 'serial' });

  let ticketUrl = '';
  let ticketId = '';
  const testTitle = 'E2E Switch Port Failure ' + Date.now();

  test('Step 1: Employee creates ticket using Custom Select & AI Auto-Draft', async ({ page }) => {
    // Login Employee
    await page.goto('/login.php');
    await page.fill('#email', 'employee@helpdesk.local');
    await page.fill('#password', 'Employee@123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/employee-dashboard\.php/);

    // Go to Create Ticket
    await page.goto('/create-ticket.php');
    await page.fill('#title', testTitle);

    // Select category using custom select dropdown
    const catTrigger = page.locator('#trigger_category_id');
    await expect(catTrigger).toBeVisible();
    await catTrigger.click();

    const hwOption = page.locator('#wrapper_category_id .custom-select-option', { hasText: 'Hardware Issue' });
    await expect(hwOption).toBeVisible();
    await hwOption.click();

    // Verify trigger text updated
    await expect(catTrigger).toContainText('Hardware Issue');

    // Click AI Auto-Draft button
    const aiBtn = page.locator('#btnAiDraft');
    await aiBtn.click();

    // Wait for AI draft or fallback
    const descArea = page.locator('#description');
    await expect(descArea).not.toHaveValue('', { timeout: 6000 });
    const draftText = await descArea.inputValue();
    expect(draftText.length).toBeGreaterThan(30);

    // Submit ticket
    await page.click('button[type="submit"]');

    // Verify success card
    await expect(page.locator('h3')).toContainText('Ticket Created Successfully!');
    const viewBtn = page.locator('a.btn-primary-custom', { hasText: 'View Ticket Details' });
    await expect(viewBtn).toBeVisible();
    ticketUrl = await viewBtn.getAttribute('href');
    const match = ticketUrl.match(/id=(\d+)/);
    ticketId = match ? match[1] : '';
    expect(ticketId).toBeTruthy();
  });

  test('Step 2: Admin assigns ticket to Support Staff', async ({ page }) => {
    test.skip(!ticketId, 'No ticket created');

    // Login Admin
    await page.goto('/login.php');
    await page.fill('#email', 'admin@helpdesk.local');
    await page.fill('#password', 'Admin@123');
    await page.click('button[type="submit"]');

    // Go to ticket
    await page.goto(`/ticket-details.php?id=${ticketId}`);
    await expect(page.locator('.badge-status')).toContainText('Open');

    // Assign to Sarah Jenkins (id: 2)
    await page.selectOption('select[name="assigned_to"]', '2');
    await page.click('#btnAssignSubmit');

    // Status automatically updates to Assigned
    await expect(page.locator('.badge-status')).toContainText('Assigned');
    await expect(page.locator('body')).toContainText('Sarah Jenkins');
  });

  test('Step 3: Support Staff investigates and marks ticket as Resolved', async ({ page }) => {
    test.skip(!ticketId, 'No ticket created');

    // Login Support Staff
    await page.goto('/login.php');
    await page.fill('#email', 'support@helpdesk.local');
    await page.fill('#password', 'Support@123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/support-dashboard\.php/);

    // Go to ticket
    await page.goto(`/ticket-details.php?id=${ticketId}`);
    await expect(page.locator('.badge-status')).toContainText('Assigned');

    // Click "Start Investigation (In Progress)"
    const startBtn = page.locator('#btnStartWork');
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // Verify status updated to In Progress
    await expect(page.locator('.badge-status')).toContainText('In Progress');

    // Add a technical comment
    await page.fill('textarea[name="comment"]', 'Inspected switch port, replacing faulty SFP transceiver module.');
    await page.click('button:has-text("Post Comment")');
    await expect(page.locator('.comments-container')).toContainText('replacing faulty SFP transceiver module.');

    // Click "Mark as Resolved"
    const resolveBtn = page.locator('#btnOpenResolveModal');
    await expect(resolveBtn).toBeVisible();
    await resolveBtn.click();

    // Fill resolution modal
    await page.fill('#resolution', 'Replaced SFP module with Cisco 10G-SR and confirmed link established with 0 packet drops.');
    await page.click('#btnSubmitResolution');

    // Verify status updated to Resolved
    await expect(page.locator('.badge-status')).toContainText('Resolved');
    await expect(page.locator('.card-custom-title:has-text("Resolution Details")')).toBeVisible();
  });

  test('Step 4: Employee confirms resolution and Closes ticket', async ({ page }) => {
    test.skip(!ticketId, 'No ticket created');

    // Login Employee
    await page.goto('/login.php');
    await page.fill('#email', 'employee@helpdesk.local');
    await page.fill('#password', 'Employee@123');
    await page.click('button[type="submit"]');

    // Go to ticket
    await page.goto(`/ticket-details.php?id=${ticketId}`);
    await expect(page.locator('.badge-status')).toContainText('Resolved');

    // Confirm & Close Ticket
    page.on('dialog', dialog => dialog.accept());
    const closeBtn = page.locator('#btnConfirmClose');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // Status updated to Closed
    await expect(page.locator('.badge-status')).toContainText('Closed');
    await expect(page.locator('body')).toContainText('This ticket has been officially closed.');
  });

});
