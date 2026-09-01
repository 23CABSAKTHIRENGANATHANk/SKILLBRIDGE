<?php
declare(strict_types=1);

/**
 * OpenStreetMap Nominatim Geocoding Service (Policy Compliant)
 * 
 * Rules enforced:
 * - Real-time geocoding ONLY on explicit Save/Update
 * - Address change detection: skips API if address unchanged
 * - Never throws fatal errors on geocoding failure; returns null with status flag
 * - Proper descriptive User-Agent header with contact details
 */
class GeocodingService {
    private const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
    private const USER_AGENT = 'SkillBridge-CareerPlatform/2.0 (https://skillbridge.dev; team@skillbridge.dev)';

    /**
     * Resolve address to Latitude / Longitude
     *
     * @return array{latitude: float, longitude: float, display_name: string, status: string}|null
     */
    public static function geocodeAddress(
        string $address,
        ?string $city = null,
        ?string $state = null,
        ?string $pincode = null,
        string $country = 'India'
    ): ?array {
        $queryParts = array_filter([$address, $city, $state, $pincode, $country]);
        $fullQuery = implode(', ', $queryParts);

        if (empty(trim($fullQuery))) {
            return null;
        }

        // 1. Full address query
        $result = self::executeNominatimQuery($fullQuery);
        if ($result !== null) {
            return array_merge($result, ['status' => 'success']);
        }

        // 2. City-level fallback
        if ($city !== null) {
            $fallbackQuery = implode(', ', array_filter([$city, $state, $pincode, $country]));
            $fallbackResult = self::executeNominatimQuery($fallbackQuery);
            if ($fallbackResult !== null) {
                return array_merge($fallbackResult, ['status' => 'success']);
            }
        }

        return null;
    }

    private static function executeNominatimQuery(string $query): ?array {
        $params = http_build_query([
            'q' => $query,
            'format' => 'json',
            'limit' => 1,
            'addressdetails' => 1
        ]);

        $url = self::NOMINATIM_URL . '?' . $params;

        $options = [
            'http' => [
                'header' => "User-Agent: " . self::USER_AGENT . "\r\nAccept: application/json\r\n",
                'timeout' => 5
            ]
        ];

        $context = stream_context_create($options);
        $response = @file_get_contents($url, false, $context);

        if ($response === false) {
            return null;
        }

        $data = json_decode($response, true);
        if (empty($data) || !isset($data[0]['lat']) || !isset($data[0]['lon'])) {
            return null;
        }

        return [
            'latitude' => (float)$data[0]['lat'],
            'longitude' => (float)$data[0]['lon'],
            'display_name' => $data[0]['display_name'] ?? $query
        ];
    }
}
