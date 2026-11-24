const { test, expect } = require('../backend/node_modules/@playwright/test');

test.describe('Mobile Responsiveness & Dropdown Safeguards', () => {

  test('Mobile viewport has zero horizontal overflow', async ({ page }) => {
    // Set to 375px mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/login.php');
    await page.fill('#email', 'admin@helpdesk.local');
    await page.fill('#password', 'Admin@123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/admin-dashboard\.php/);

    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(isOverflowing).toBe(false);
  });

  test('Mobile hamburger menu opens and closes sidebar navigation drawer', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/login.php');
    await page.fill('#email', 'admin@helpdesk.local');
    await page.fill('#password', 'Admin@123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/admin-dashboard\.php/);
    await page.waitForLoadState('domcontentloaded');

    const toggleBtn = page.locator('#sidebarToggleBtn');
    await expect(toggleBtn).toBeVisible();

    // Click to open sidebar
    await toggleBtn.click();
    const sidebar = page.locator('.app-sidebar');
    await expect(sidebar).toHaveClass(/show/);

    // Click backdrop to close (click outside sidebar drawer at x: 320)
    const backdrop = page.locator('.sidebar-overlay');
    await expect(backdrop).toHaveClass(/show/);
    await backdrop.click({ position: { x: 320, y: 300 } });
    await expect(sidebar).not.toHaveClass(/show/);
  });

  test('Mobile topbar notification dropdown is strictly bounded within screen', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/login.php');
    await page.fill('#email', 'admin@helpdesk.local');
    await page.fill('#password', 'Admin@123');
    await page.click('button[type="submit"]');

    const bell = page.locator('button[title="Notifications"]');
    await bell.click();

    const notifMenu = page.locator('.notif-dropdown-menu');
    await expect(notifMenu).toBeVisible();

    const box = await notifMenu.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(375 + 1); // allows subpixel rounding
    }
  });

  test('Custom select dropdown popup stays strictly within card boundary on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/login.php');
    await page.fill('#email', 'employee@helpdesk.local');
    await page.fill('#password', 'Employee@123');
    await page.click('button[type="submit"]');

    await page.goto('/create-ticket.php');
    const catTrigger = page.locator('#trigger_category_id');
    await catTrigger.click();

    const menu = page.locator('#wrapper_category_id .custom-select-menu');
    await expect(menu).toBeVisible();

    const box = await menu.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(375);
    }
  });

});
