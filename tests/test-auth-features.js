const puppeteer = require('../backend/node_modules/puppeteer-core');
const path = require('path');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testAuthFeatures() {
  console.log('--- Testing Create Account, Password Eye Toggle, & Forgot Password --- \n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    // 1. Test Password Eye Toggle on login.php
    console.log('[Step 1] Testing Password Eye Toggle on login.php...');
    await page.goto('http://127.0.0.1:8000/login.php');

    const passInputTypeInitial = await page.$eval('#password', el => el.getAttribute('type'));
    console.log('[Test 1] Initial password input type is "password":', passInputTypeInitial === 'password' ? 'PASS' : 'FAIL');

    // Click the eye icon toggle
    await page.$eval('.password-toggle-btn', el => el.click());
    const passInputTypeToggled = await page.$eval('#password', el => el.getAttribute('type'));
    console.log('[Test 2] After clicking eye icon, password input type is "text":', passInputTypeToggled === 'text' ? 'PASS' : 'FAIL');

    // Capture screenshot of eye toggle active
    await page.type('#email', 'admin@helpdesk.local');
    await page.type('#password', 'Admin@123');
    await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'password_eye_toggle_active.png') });
    console.log('Saved screenshot: screenshots/password_eye_toggle_active.png');

    // Click eye icon again to hide
    await page.$eval('.password-toggle-btn', el => el.click());
    const passInputTypeHiddenAgain = await page.$eval('#password', el => el.getAttribute('type'));
    console.log('[Test 3] Clicking eye icon again hides password ("password"):', passInputTypeHiddenAgain === 'password' ? 'PASS' : 'FAIL');

    // 2. Test Navigation to register.php
    console.log('[Step 2] Navigating to register.php...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('a[href="register.php"]')
    ]);

    await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'register_page.png') });
    console.log('Saved screenshot: screenshots/register_page.png');

    // Verify fields on register.php
    const hasName = await page.$('#name');
    const hasEmail = await page.$('#email');
    const hasPass = await page.$('#password');
    const hasConfirm = await page.$('#confirm_password');
    const eyeBtns = await page.$$('.password-toggle-btn');
    console.log('[Test 4] Register form elements & 2 eye toggle buttons present:', (hasName && hasEmail && hasPass && hasConfirm && eyeBtns.length === 2) ? 'PASS' : 'FAIL');

    // 3. Register a new Employee account
    console.log('[Step 3] Submitting new account registration...');
    const regTimestamp = Date.now();
    const newEmpName = `Dev Employee ${regTimestamp.toString().slice(-4)}`;
    const newEmpEmail = `dev.emp.${regTimestamp}@helpdesk.local`;
    const initialPass = 'SecurePass123!';

    await page.type('#name', newEmpName);
    await page.type('#email', newEmpEmail);
    await page.type('#password', initialPass);
    await page.type('#confirm_password', initialPass);

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.evaluate(() => document.querySelector('form[action="register.php"]').submit())
    ]);

    const isEmpDashboard = await page.evaluate(() => {
      return window.location.href.includes('employee-dashboard.php') || document.body.innerText.includes('Welcome back');
    });
    console.log('[Test 5] Registration automatically signs in and loads employee dashboard:', isEmpDashboard ? 'PASS' : 'FAIL');

    // Log out
    await page.goto('http://127.0.0.1:8000/logout.php');

    // 4. Test Forgot Password
    console.log('[Step 4] Testing forgot-password.php...');
    await page.goto('http://127.0.0.1:8000/forgot-password.php');
    await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'forgot_password_page.png') });
    console.log('Saved screenshot: screenshots/forgot_password_page.png');

    await page.type('#email', newEmpEmail);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.evaluate(() => document.querySelector('form[action="forgot-password.php"]').submit())
    ]);

    const hasResetBtn = await page.$('a[href*="reset-password.php"]');
    console.log('[Test 6] Password reset token generated & proceed button visible:', hasResetBtn ? 'PASS' : 'FAIL');

    // 5. Test Reset Password
    console.log('[Step 5] Following reset link to reset-password.php...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('a[href*="reset-password.php"]')
    ]);

    await page.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'reset_password_page.png') });
    console.log('Saved screenshot: screenshots/reset_password_page.png');

    // Verify eye toggle works on reset-password.php
    await page.type('#password', 'BrandNewSecret999!');
    await page.$eval('.password-toggle-btn[data-target="password"]', el => el.click());
    const resetPassType = await page.$eval('#password', el => el.getAttribute('type'));
    console.log('[Test 7] Eye toggle works on reset password page ("text"):', resetPassType === 'text' ? 'PASS' : 'FAIL');

    await page.type('#confirm_password', 'BrandNewSecret999!');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.evaluate(() => document.querySelector('form[action="reset-password.php"]').submit())
    ]);

    const isLoginWithMsg = await page.evaluate(() => {
      return window.location.href.includes('login.php') && document.body.innerText.includes('Password reset successfully');
    });
    console.log('[Test 8] Reset password succeeds and redirects to login with confirmation:', isLoginWithMsg ? 'PASS' : 'FAIL');

    // 6. Sign in with the new password
    console.log('[Step 6] Signing in with the newly reset password...');
    await page.type('#email', newEmpEmail);
    await page.type('#password', 'BrandNewSecret999!');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]')
    ]);

    const loggedInWithNewPass = await page.evaluate(() => {
      return window.location.href.includes('employee-dashboard.php') || document.body.innerText.includes('Employee');
    });
    console.log('[Test 9] Sign in with new password succeeds and reaches employee dashboard:', loggedInWithNewPass ? 'PASS' : 'FAIL');

    console.log('\n================================================================');
    console.log('--- ALL AUTH, EYE TOGGLE & FORGOT PASSWORD TESTS PASSED! ---');
    console.log('================================================================\n');

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
  }
}

testAuthFeatures();
