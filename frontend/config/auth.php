<?php
require_once __DIR__ . '/api.php';

/**
 * Ensures user is authenticated and possesses the required role
 * @param array|string $allowed_roles
 * @return array The authenticated user data
 */
function require_auth($allowed_roles = []) {
    if (empty($_SESSION['jwt']) || empty($_SESSION['user'])) {
        header('Location: login.php?msg=' . urlencode('Please sign in to access this page.'));
        exit;
    }

    $user = $_SESSION['user'];

    if (!empty($allowed_roles)) {
        if (is_string($allowed_roles)) {
            $allowed_roles = [$allowed_roles];
        }

        if (!in_array($user['role'], $allowed_roles, true)) {
            // Redirect to their own dashboard with warning
            $dashboard = get_dashboard_url($user['role']);
            header("Location: {$dashboard}?error=" . urlencode('Access denied: You do not have permission for that page.'));
            exit;
        }
    }

    return $user;
}

/**
 * Returns role-appropriate dashboard URL
 */
function get_dashboard_url($role) {
    switch ($role) {
        case 'Admin':
            return 'admin-dashboard.php';
        case 'Support Staff':
            return 'support-dashboard.php';
        case 'Employee':
            return 'employee-dashboard.php';
        default:
            return 'login.php';
    }
}

/**
 * Generate or retrieve CSRF token
 */
function get_csrf_token() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Verify CSRF token from POST
 */
function verify_csrf_token($token) {
    if (empty($_SESSION['csrf_token']) || empty($token)) {
        return false;
    }
    return hash_equals($_SESSION['csrf_token'], $token);
}
