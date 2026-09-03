<?php
declare(strict_types=1);

require_once __DIR__ . '/../../backend/config/database.php';

$db = Database::getConnection();

$skills = [
    'WebAssembly (Wasm)', 'eBPF Kernel Tracing', 'SIMD Vectorization', 'CUDA GPU Acceleration',
    'OpenCL Computing', 'WebGPU', 'Three.js 3D Graphics', 'Babylon.js',
    'Shader programming (GLSL)', 'WebXR Virtual Reality', 'Tauri Desktop Apps', 'Electron Framework',
    'Capacitor Mobile', 'Apache Cordova', 'React Native Paper', 'Expo Framework',
    'Flutter Web', 'SwiftUI Architecture', 'Jetpack Compose Architecture', 'Kotlin Coroutines Flow',
    'ReactiveX (RxJava/RxJS)', 'Apache Flink CEP', 'Apache Beam SDK', 'Vector Database Pinecone',
    'Apache Lucene Engine', 'OpenSearch Cluster', 'Meilisearch Engine', 'Typesense Search',
    'PostGIS Spatial Database', 'TimescaleDB Time-Series', 'QuestDB Engine'
];

$stmt = $db->prepare("
    INSERT INTO skills (id, name, normalized_name, category, slug, description, difficulty, aliases, prerequisites, related_skills, applicable_careers)
    VALUES (?, ?, ?, 'Engineering', ?, 'Advanced systems engineering technology', 'advanced', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)
    ON CONFLICT (name) DO NOTHING
");

$db->beginTransaction();
foreach ($skills as $s) {
    $clean = str_replace(['++', '#', '.'], ['plusplus', 'sharp', 'dot'], $s);
    $norm = substr(strtolower(trim(preg_replace('/[^a-zA-Z0-9]/', '', $clean))), 0, 95);
    $slug = substr(strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', $s), '-')), 0, 95);
    $id = 'sk_' . substr(md5($s), 0, 30);
    $stmt->execute([$id, $s, $norm, $slug]);
}
$db->commit();

echo "Final Skills Count: " . $db->query('SELECT count(*) FROM skills')->fetchColumn() . PHP_EOL;
