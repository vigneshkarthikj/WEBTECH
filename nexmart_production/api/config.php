<?php
// ============================================
// NexMart - Database Configuration
// Place this in your XAMPP htdocs/nexmart/ folder
// ============================================

$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$isLocal = strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false;

if ($isLocal) {
    // ============================================
    // LOCALHOST (XAMPP) CREDENTIALS
    // ============================================
    define('DB_HOST', 'localhost');
    define('DB_USER', 'root');
    define('DB_PASS', '');
    define('DB_NAME', 'nexmart');
} else {
    // ============================================
    // PRODUCTION (INFINITYFREE) CREDENTIALS
    // Replace these with your actual details from cPanel!
    // ============================================
    define('DB_HOST', 'localhost');      // CHANGE TO: e.g., 'sql123.epizy.com'
    define('DB_USER', 'root');           // CHANGE TO: e.g., 'epiz_12345678'
    define('DB_PASS', '');               // CHANGE TO: Your vPanel password
    define('DB_NAME', 'nexmart');        // CHANGE TO: e.g., 'epiz_12345678_nexmart'
}
define('DB_CHARSET', 'utf8mb4');

// Application Settings
define('APP_NAME', 'NexMart');
define('APP_URL', 'http://localhost/nexmart');
define('SESSION_NAME', 'nexmart_session');
define('JWT_SECRET', 'nexmart_secret_key_2024_change_in_production');

// CORS Headers - allow frontend requests
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Global Exception Handler to prevent 500 errors from hiding the actual problem
set_exception_handler(function($e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server Crash: ' . $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
    exit();
});

// ============================================
// Database Connection (PDO)
// ============================================
function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]);
            exit();
        }
    }
    return $pdo;
}

// ============================================
// Helper Functions
// ============================================
function response($success, $message = '', $data = null, $code = 200) {
    http_response_code($code);
    $res = ['success' => $success, 'message' => $message];
    if ($data !== null) $res['data'] = $data;
    echo json_encode($res);
    exit();
}

function getInput() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!$data) $data = $_POST;
    return $data;
}

function sanitize($str) {
    return htmlspecialchars(strip_tags(trim($str)), ENT_QUOTES, 'UTF-8');
}

function getAuthUser() {
    $token = '';
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        $token = $headers['Authorization'] ?? $headers['X-Auth-Token'] ?? '';
    }
    if (empty($token) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $token = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (empty($token) && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $token = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    } elseif (empty($token) && isset($_SERVER['HTTP_X_AUTH_TOKEN'])) {
        $token = $_SERVER['HTTP_X_AUTH_TOKEN'];
    }

    $token = str_replace('Bearer ', '', $token);
    
    if (empty($token)) return null;
    
    // Simple token decode (base64 encoded user_id:timestamp)
    $decoded = base64_decode($token);
    if (!$decoded) return null;
    
    $parts = explode(':', $decoded);
    if (count($parts) < 2) return null;
    
    $userId = (int)$parts[0];
    $timestamp = (int)$parts[1];
    
    // Token expires in 7 days
    if (time() - $timestamp > 604800) return null;
    
    $db = getDB();
    $stmt = $db->prepare("SELECT id, name, email, role, avatar FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    return $stmt->fetch();
}

function generateToken($userId) {
    return base64_encode($userId . ':' . time());
}
?>
