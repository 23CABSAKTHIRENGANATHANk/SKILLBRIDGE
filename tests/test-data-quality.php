<?php
declare(strict_types=1);

require_once __DIR__ . '/../backend/services/DataQualityService.php';

$audit = DataQualityService::runAudit();
echo "=======================================================\n";
echo "DATA QUALITY AUDIT REPORT\n";
echo "=======================================================\n";
echo "Timestamp:            " . $audit['timestamp'] . "\n";
echo "Overall Health Index: " . $audit['overall_health_index'] . "% (" . $audit['health_status'] . ")\n";
echo "Is Acyclic DAG:       " . ($audit['graph_integrity']['is_acyclic_dag'] ? 'YES (0 cycles)' : 'NO (CYCLES FOUND!)') . "\n";
echo "Total Careers:        " . $audit['careers_catalog']['total_careers'] . "\n";
echo "Total Skills:         " . $audit['skills_catalog']['total_skills'] . "\n";
echo "Total Resources:      " . $audit['learning_resources']['total_resources'] . "\n";
echo "Total Projects:       " . $audit['project_blueprints']['total_projects'] . "\n";
echo "HTTPS Compliant:      " . $audit['learning_resources']['https_compliant'] . "\n";
echo "=======================================================\n";

// Write to docs/DATA_QUALITY_REPORT.md
$markdown = DataQualityService::generateMarkdownReport();
file_put_contents(__DIR__ . '/../docs/DATA_QUALITY_REPORT.md', $markdown);
echo "Written to docs/DATA_QUALITY_REPORT.md successfully.\n";
