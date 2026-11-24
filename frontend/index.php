<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

if (!file_exists(__DIR__ . '/config/api.php')) {
    header('Location: login.php');
    exit;
}

require_once __DIR__ . '/config/api.php';
require_once __DIR__ . '/config/auth.php';

if (!empty($_SESSION['jwt']) && !empty($_SESSION['user']['role'])) {
    header('Location: ' . get_dashboard_url($_SESSION['user']['role']));
    exit;
} else {
    header('Location: login.php');
    exit;
}
