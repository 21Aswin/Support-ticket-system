<?php
/**
 * HelpDesk API Client Helper
 * Communicates with the Node.js Express REST API layer via cURL.
 * PHP never queries PostgreSQL directly.
 */

/**
 * Multi-layer Configuration Resolver
 * Checks: 1) System environment (getenv / $_ENV / $_SERVER)
 *         2) Optional frontend/config/env.php
 *         3) Default fallback
 */
function get_config($key, $default = null) {
    static $localConfig = null;
    if ($localConfig === null) {
        $envFile = __DIR__ . '/env.php';
        if (file_exists($envFile)) {
            $localConfig = require $envFile;
        } else {
            $localConfig = [];
        }
    }

    $val = getenv($key);
    if ($val !== false && $val !== '') {
        return $val;
    }
    if (!empty($_ENV[$key])) {
        return $_ENV[$key];
    }
    if (!empty($_SERVER[$key])) {
        return $_SERVER[$key];
    }
    if (isset($localConfig[$key])) {
        return $localConfig[$key];
    }
    return $default;
}

// Application Timezone configuration (Defaults to Asia/Kolkata - IST UTC+05:30)
$appTimezone = get_config('APP_TIMEZONE', 'Asia/Kolkata');
date_default_timezone_set($appTimezone);

/**
 * Friendly Datetime Formatter (defaults to Asia/Kolkata local time)
 * e.g., "Nov 24, 2026 at 11:43 AM"
 */
function format_datetime($isoDate, $format = 'M j, Y \a\t g:i A') {
    if (empty($isoDate)) return '—';
    $ts = is_numeric($isoDate) ? (int)$isoDate : strtotime($isoDate);
    if (!$ts) return '—';
    return date($format, $ts);
}

/**
 * Friendly Date Formatter: "Nov 24, 2026"
 */
function format_date($isoDate, $format = 'M d, Y') {
    if (empty($isoDate)) return '—';
    $ts = is_numeric($isoDate) ? (int)$isoDate : strtotime($isoDate);
    if (!$ts) return '—';
    return date($format, $ts);
}

/**
 * Friendly Time Formatter: "11:43 AM"
 */
function format_time($isoDate, $format = 'g:i A') {
    if (empty($isoDate)) return '—';
    $ts = is_numeric($isoDate) ? (int)$isoDate : strtotime($isoDate);
    if (!$ts) return '—';
    return date($format, $ts);
}

if (session_status() === PHP_SESSION_NONE) {
    // Secure session cookies
    ini_set('session.cookie_httponly', 1);
    ini_set('session.use_only_cookies', 1);
    session_start();
}

function get_api_base_url() {
    $envUrl = get_config('HELPDESK_API_URL') ?: get_config('PHP_API_BASE_URL');
    if ($envUrl) {
        return rtrim($envUrl, '/');
    }
    return 'http://127.0.0.1:3000';
}

/**
 * Execute an HTTP/JSON request to the Node.js backend
 * @param string $method HTTP Method (GET, POST, PUT, PATCH, DELETE)
 * @param string $path Endpoint path starting with /api
 * @param array|null $payload Optional JSON body data
 * @return array ['status' => int, 'body' => array|null, 'error' => string|null]
 */
function api_request($method, $path, $payload = null) {
    $base = get_api_base_url();
    $url = $base . $path;

    $headers = [
        'Accept: application/json',
    ];

    if (!empty($_SESSION['jwt'])) {
        $headers[] = 'Authorization: Bearer ' . $_SESSION['jwt'];
    }

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, strtoupper($method));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);

    if ($payload !== null) {
        $jsonPayload = json_encode($payload);
        $headers[] = 'Content-Type: application/json';
        $headers[] = 'Content-Length: ' . strlen($jsonPayload);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonPayload);
    }

    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    $responseBody = curl_exec($ch);
    $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($responseBody === false) {
        return [
            'status' => 503,
            'body' => [
                'success' => false,
                'message' => 'Backend API service is currently unreachable (' . ($curlError ?: 'Connection timed out') . '). Please ensure Node.js is running.',
                'errors' => [$curlError]
            ],
            'error' => $curlError
        ];
    }

    $decoded = json_decode($responseBody, true);
    return [
        'status' => $statusCode,
        'body' => $decoded,
        'error' => null
    ];
}

/**
 * Helper to escape HTML safely
 */
function e($string) {
    return htmlspecialchars((string)$string, ENT_QUOTES, 'UTF-8');
}
