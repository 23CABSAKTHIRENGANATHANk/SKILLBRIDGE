<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/cors.php';

class NotificationController {
    public static function list(array $currentUser): void {
        $db = Database::getConnection();
        $stmt = $db->prepare('
            SELECT id, title, message, link, is_read, created_at 
            FROM notifications 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 30
        ');
        $stmt->execute([$currentUser['user_id']]);
        $notifications = $stmt->fetchAll();

        $unreadCount = 0;
        foreach ($notifications as &$notif) {
            $notif['is_read'] = (bool)$notif['is_read'];
            if (!$notif['is_read']) {
                $unreadCount++;
            }
        }

        jsonResponse([
            'success' => true,
            'unreadCount' => $unreadCount,
            'notifications' => $notifications
        ]);
    }

    public static function markRead(array $currentUser): void {
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $notifId = trim($input['id'] ?? '');

        if (!empty($notifId)) {
            $stmt = $db->prepare('UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?');
            $stmt->execute([$notifId, $currentUser['user_id']]);
        } else {
            $stmt = $db->prepare('UPDATE notifications SET is_read = TRUE WHERE user_id = ?');
            $stmt->execute([$currentUser['user_id']]);
        }

        jsonResponse([
            'success' => true,
            'message' => 'Notifications updated.'
        ]);
    }
}
