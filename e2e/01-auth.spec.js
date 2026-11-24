const { test, expect } = require('../backend/node_modules/@playwright/test');

test.describe('Authentication & Security Suite', () => {

  test('Login page renders branding and elements correctly', async ({ page }) => {
    await page.goto('/login.php');
    await expect(page).toHaveTitle(/Sign In | HelpDesk/);
    await expect(page.locator('.login-brand h3')).toHaveText('HelpDesk');
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Password eye toggle reveals and masks password', async ({ page }) => {
    await page.goto('/login.php');
    const pwdInput = page.locator('#password');
    const toggleBtn = page.locator('.password-toggle-btn[data-target="password"]');

    await expect(pwdInput).toHaveAttribute('type', 'password');
    await toggleBtn.click();
    await expect(pwdInput).toHaveAttribute('type', 'text');
    await toggleBtn.click();
    await expect(pwdInput).toHaveAttribute('type', 'password');
  });

  test('Invalid login credentials show error alert', async ({ page }) => {
    await page.goto('/login.php');
    await page.fill('#email', 'nonexistent@helpdesk.local');
    await page.fill('#password', 'WrongPassword@123');
    await page.click('button[type="submit"]');

    const alert = page.locator('.alert-danger');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/Invalid email or password/i);
  });

  test('Employee can register a new account', async ({ page }) => {
    await page.goto('/register.php');
    await expect(page).toHaveTitle(/Create Account | HelpDesk/);

    const testEmail = `test.employee.${Date.now()}@helpdesk.local`;
    await page.fill('#name', 'Automated Test Employee');
    await page.fill('#email', testEmail);
    await page.fill('#password', 'TestPass@2026');
    await page.fill('#confirm_password', 'TestPass@2026');

    await page.click('button[type="submit"]');
    // On success, automatically logged in and reaches employee-dashboard
    await expect(page).toHaveURL(/employee-dashboard\.php/);
    await expect(page.locator('body')).toContainText('Automated Test Employee');
  });

  test('Forgot password flow generates reset link and updates password', async ({ page }) => {
    await page.goto('/forgot-password.php');
    await page.fill('#email', 'employee@helpdesk.local');
    await page.click('button[type="submit"]');

    // Reset token is generated
    const proceedLink = page.locator('a.btn-primary-custom', { hasText: 'Proceed to Reset Password' });
    await expect(proceedLink).toBeVisible();
    const href = await proceedLink.getAttribute('href');
    expect(href).toContain('reset-password.php?token=');

    // Follow reset link
    await page.goto(href);
    await expect(page).toHaveTitle(/Reset Password | HelpDesk/);
    await page.fill('#password', 'Employee@123');
    await page.fill('#confirm_password', 'Employee@123');
    await page.click('button[type="submit"]');

    // Redirected to login with confirmation
    await expect(page).toHaveURL(/login\.php\?msg=/);
    await expect(page.locator('.alert-success')).toContainText(/Password reset successful/i);
  });

});
