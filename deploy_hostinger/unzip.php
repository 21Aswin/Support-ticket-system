<?php
/**
 * Auto-Extractor for Hostinger deployment
 * - Extracts frontend.zip into current directory (public_html)
 * - Creates config/, includes/, assets/ folders properly
 * - Auto-deletes itself after successful extraction
 */
$zipFile = __DIR__ . '/frontend.zip';

if (!file_exists($zipFile)) {
    die("<h2 style='color:red;'>❌ frontend.zip not found! Please upload frontend.zip to public_html/ first.</h2>");
}

echo "<div style='font-family:Inter,sans-serif; max-width:600px; margin:40px auto; padding:20px;'>";
echo "<h2>🔧 Extracting frontend.zip...</h2>";

$zip = new ZipArchive();
$res = $zip->open($zipFile);

if ($res === TRUE) {
    $count = $zip->numFiles;
    
    // Extract all files - ZipArchive handles directory creation automatically
    $zip->extractTo(__DIR__);
    $zip->close();
    
    // Verify critical folders exist
    $checks = [
        'config/' => is_dir(__DIR__ . '/config'),
        'config/api.php' => file_exists(__DIR__ . '/config/api.php'),
        'config/auth.php' => file_exists(__DIR__ . '/config/auth.php'),
        'config/env.php' => file_exists(__DIR__ . '/config/env.php'),
        'includes/' => is_dir(__DIR__ . '/includes'),
        'includes/header.php' => file_exists(__DIR__ . '/includes/header.php'),
        'assets/' => is_dir(__DIR__ . '/assets'),
        'assets/css/style.css' => file_exists(__DIR__ . '/assets/css/style.css'),
        'assets/js/main.js' => file_exists(__DIR__ . '/assets/js/main.js'),
    ];
    
    $allOk = true;
    echo "<h3>📋 Verification:</h3><ul>";
    foreach ($checks as $path => $exists) {
        $icon = $exists ? '✅' : '❌';
        $color = $exists ? 'green' : 'red';
        echo "<li style='color:$color;'>$icon $path</li>";
        if (!$exists) $allOk = false;
    }
    echo "</ul>";
    
    if ($allOk) {
        // Clean up zip and self
        @unlink($zipFile);
        @unlink(__FILE__);
        
        echo "<h1 style='color:green;'>🎉 Extraction Successful!</h1>";
        echo "<p>Extracted <strong>$count files</strong> with proper folder structure.</p>";
        echo "<a href='login.php' style='display:inline-block; padding:12px 24px; background:#0B6DB7; color:white; text-decoration:none; border-radius:8px; font-weight:bold; margin-top:10px;'>→ Go to Login Page</a>";
    } else {
        echo "<h2 style='color:orange;'>⚠️ Some files may be missing. Check the list above.</h2>";
        echo "<p>Extracted $count entries, but some expected paths were not found.</p>";
    }
} else {
    $errors = [
        ZipArchive::ER_EXISTS => 'File already exists',
        ZipArchive::ER_INCONS => 'Inconsistent zip file',
        ZipArchive::ER_MEMORY => 'Memory allocation failure',
        ZipArchive::ER_NOENT => 'No such file',
        ZipArchive::ER_NOZIP => 'Not a zip archive',
        ZipArchive::ER_OPEN => 'Can\'t open file',
        ZipArchive::ER_READ => 'Read error',
        ZipArchive::ER_SEEK => 'Seek error',
    ];
    $errMsg = $errors[$res] ?? "Unknown error code: $res";
    echo "<h2 style='color:red;'>❌ Failed to extract: $errMsg</h2>";
}
echo "</div>";
