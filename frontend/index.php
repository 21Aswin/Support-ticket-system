<?php
require_once __DIR__ . '/config/api.php';
require_once __DIR__ . '/config/auth.php';

if (!empty($_SESSION['jwt']) && !empty($_SESSION['user']['role'])) {
    header('Location: ' . get_dashboard_url($_SESSION['user']['role']));
    exit;
} else {
    header('Location: login.php');
    exit;
}
