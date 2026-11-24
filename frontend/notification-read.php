<?php
/**
 * HelpDesk Notification Read & Redirect Controller
 * Marks notifications as read and safely navigates to the associated ticket.
 */
require_once __DIR__ . '/config/auth.php';
$user = require_auth();

$notifId = intval($_GET['id'] ?? 0);
$ticketId = intval($_GET['ticket_id'] ?? 0);
$action = $_GET['action'] ?? 'read';

// Handle Mark All as Read
if ($action === 'mark_all_read') {
    $res = api_request('PATCH', '/api/notifications/read-all');
    if (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') {
        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'unread_count' => 0]);
        exit;
    }
    $referer = $_SERVER['HTTP_REFERER'] ?? 'notifications.php';
    header("Location: {$referer}");
    exit;
}

// Mark single notification as read in database
if ($notifId > 0) {
    api_request('PATCH', "/api/notifications/{$notifId}/read");
}

// Mark any other notifications for this ticket as read
if ($ticketId > 0) {
    api_request('PATCH', "/api/notifications/ticket/{$ticketId}/read");
}

// Return JSON for AJAX requests
if (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') {
    $countRes = api_request('GET', '/api/notifications/unread-count');
    $unreadCount = $countRes['body']['data']['unread_count'] ?? 0;
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'unread_count' => $unreadCount]);
    exit;
}

// Redirect to ticket details or notifications page
if ($ticketId > 0) {
    header("Location: ticket-details.php?id={$ticketId}");
    exit;
}

header('Location: notifications.php');
exit;
