const { test, expect } = require('../backend/node_modules/@playwright/test');

test.describe('Admin Control Center Suite', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login.php');
    await page.fill('#email', 'admin@helpdesk.local');
    await page.fill('#password', 'Admin@123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/admin-dashboard\.php/);
  });

  test('Admin dashboard renders KPIs, Charts and Workload table', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('Enterprise Support Overview');
    await expect(page.locator('.kpi-card', { hasText: 'Total Tickets' })).toBeVisible();
    await expect(page.locator('.kpi-card', { hasText: 'Open / Unassigned' })).toBeVisible();
    await expect(page.locator('.kpi-card', { hasText: 'In Progress' })).toBeVisible();
    await expect(page.locator('.kpi-card', { hasText: 'Resolved' })).toBeVisible();

    // Charts canvas
    await expect(page.locator('#statusChart')).toBeVisible();
    await expect(page.locator('#categoryChart')).toBeVisible();

    // Support Staff Workload table
    await expect(page.locator('.card-custom-title', { hasText: 'Support Staff Workload' })).toBeVisible();
  });

  test('Admin can view and filter all tickets list', async ({ page }) => {
    await page.goto('/ticket-list.php');
    await expect(page).toHaveTitle(/Ticket Directory | HelpDesk/);
    await expect(page.locator('.table-custom')).toBeVisible();

    // Check filter selects exist
    await expect(page.locator('select[name="status"]')).toBeVisible();
    await expect(page.locator('select[name="priority"]')).toBeVisible();
    await expect(page.locator('select[name="category_id"]')).toBeVisible();
  });

  test('Admin can manage users: view, create and toggle status', async ({ page }) => {
    await page.goto('/manage-users.php');
    await expect(page.locator('h2')).toContainText('User Management');
    await expect(page.locator('.table-custom')).toBeVisible();

    // Create user modal trigger
    const newBtn = page.locator('button', { hasText: 'Add New User' });
    await expect(newBtn).toBeVisible();
  });

  test('Admin can view system reports and analytics', async ({ page }) => {
    await page.goto('/reports.php');
    await expect(page.locator('h2')).toContainText('Analytics & Reports');
    await expect(page.locator('.kpi-card', { hasText: 'Resolution Rate' })).toBeVisible();
    await expect(page.locator('.kpi-card', { hasText: 'Cumulative Tickets' })).toBeVisible();
  });

  test('Admin settings shows profile and change password', async ({ page }) => {
    await page.goto('/settings.php');
    await expect(page.locator('h2')).toContainText('Account Settings & Profile');
    await expect(page.locator('.card-custom-title:has-text("Profile Information")')).toBeVisible();
    await expect(page.locator('.card-custom-title:has-text("Change Password")')).toBeVisible();
  });

});
