<?php
declare(strict_types=1);

require_once __DIR__ . '/../../backend/config/database.php';

final class YouTubeResourcesFetcher
{
    public static function fetchToStaging(string $batchId, string $skill): array
    {
        $key = getenv('YOUTUBE_API_KEY');
        if (!$key || trim($skill) === '') return ['staged' => 0, 'status' => 'api_key_required'];
        $query = http_build_query(['part' => 'snippet', 'q' => $skill . ' tutorial', 'type' => 'video', 'maxResults' => 10, 'key' => $key]);
        $ch = curl_init('https://www.googleapis.com/youtube/v3/search?' . $query);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_FOLLOWLOCATION => true, CURLOPT_HTTPHEADER => ['User-Agent: SkillBridge-Career-Platform/3.0']]);
        $response = curl_exec($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($httpCode !== 200 || !$response) return ['staged' => 0, 'status' => 'api_unavailable', 'http_code' => $httpCode];
        $items = json_decode($response, true)['items'] ?? [];
        $db = Database::getConnection();
        $stmt = $db->prepare("INSERT INTO staging_learning_resources (batch_id, source_id, skill, title, provider, resource_type, level, url, is_free, raw_payload, validation_status, content_hash) VALUES (?, 'src_youtube_api', ?, ?, ?, 'video', 'beginner', ?, TRUE, ?, 'pending', ?) ON CONFLICT DO NOTHING");
        $staged = 0;
        foreach ($items as $item) {
            $videoId = $item['id']['videoId'] ?? null;
            $title = trim((string)($item['snippet']['title'] ?? ''));
            if (!$videoId || $title === '') continue;
            $url = 'https://www.youtube.com/watch?v=' . rawurlencode($videoId);
            $safe = ['video_id' => $videoId, 'channel_id' => $item['snippet']['channelId'] ?? null, 'published_at' => $item['snippet']['publishedAt'] ?? null];
            $json = json_encode($safe, JSON_THROW_ON_ERROR);
            $stmt->execute([$batchId, $skill, $title, $item['snippet']['channelTitle'] ?? 'YouTube', $url, $json, hash('sha256', $url)]);
            $staged++;
        }
        return ['staged' => $staged, 'status' => 'staged', 'http_code' => $httpCode];
    }
}
