<?php
// ============================================
// NexMart - Auth API
// Endpoint: /nexmart/api/auth.php
// ============================================
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($action) {

    // ---- REGISTER ----
    case 'register':
        if ($method !== 'POST') response(false, 'Method not allowed', null, 405);
        
        $data = getInput();
        $name  = sanitize($data['name'] ?? '');
        $email = strtolower(trim($data['email'] ?? ''));
        $pass  = $data['password'] ?? '';
        
        if (empty($name) || empty($email) || empty($pass))
            response(false, 'All fields are required');
        
        if (!filter_var($email, FILTER_VALIDATE_EMAIL))
            response(false, 'Invalid email address');
        
        if (strlen($pass) < 6)
            response(false, 'Password must be at least 6 characters');
        
        $db = getDB();
        $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) response(false, 'Email already registered');
        
        $hashed = password_hash($pass, PASSWORD_BCRYPT);
        $avatars = ['🛍️','🌟','🚀','💎','🎯','🔥','⚡','🌈'];
        $avatar = $avatars[array_rand($avatars)];
        
        $stmt = $db->prepare("INSERT INTO users (name, email, password, avatar) VALUES (?, ?, ?, ?)");
        $stmt->execute([$name, $email, $hashed, $avatar]);
        $userId = $db->lastInsertId();
        
        $token = generateToken($userId);
        response(true, 'Account created successfully', [
            'token' => $token,
            'user'  => ['id' => $userId, 'name' => $name, 'email' => $email, 'avatar' => $avatar, 'role' => 'user']
        ]);
        break;

    // ---- LOGIN ----
    case 'login':
        if ($method !== 'POST') response(false, 'Method not allowed', null, 405);
        
        $data  = getInput();
        $email = strtolower(trim($data['email'] ?? ''));
        $pass  = $data['password'] ?? '';
        
        if (empty($email) || empty($pass))
            response(false, 'Email and password are required');
        
        $db = getDB();
        $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if (!$user || !password_verify($pass, $user['password']))
            response(false, 'Invalid email or password');
        
        $token = generateToken($user['id']);
        response(true, 'Login successful', [
            'token' => $token,
            'user'  => [
                'id'     => $user['id'],
                'name'   => $user['name'],
                'email'  => $user['email'],
                'avatar' => $user['avatar'],
                'role'   => $user['role']
            ]
        ]);
        break;

    // ---- PROFILE ----
    case 'profile':
        $user = getAuthUser();
        if (!$user) response(false, 'Unauthorized', null, 401);
        response(true, 'OK', ['user' => $user]);
        break;

    default:
        response(false, 'Invalid action', null, 400);
}
?>
