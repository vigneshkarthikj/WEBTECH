<?php
// ============================================
// NexMart - Products API
// Endpoint: /nexmart/api/products.php
// ============================================
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'list';

switch ($action) {

    // ---- LIST / FILTER PRODUCTS ----
    case 'list':
        $db = getDB();
        $category = sanitize($_GET['category'] ?? '');
        $search   = sanitize($_GET['search'] ?? '');
        $sort     = sanitize($_GET['sort'] ?? 'views');
        $limit    = min((int)($_GET['limit'] ?? 20), 50);

        $where = ["p.stock > 0"];
        $params = [];

        if ($category && $category !== 'all') {
            $where[] = "c.slug = ?";
            $params[] = $category;
        }

        if ($search) {
            $where[] = "(p.name LIKE ? OR p.description LIKE ? OR p.tags LIKE ?)";
            $term = "%$search%";
            array_push($params, $term, $term, $term);
        }

        $whereSQL = 'WHERE ' . implode(' AND ', $where);

        $sortMap = [
            'views'      => 'p.views DESC',
            'price_asc'  => 'p.price ASC',
            'price_desc' => 'p.price DESC',
            'rating'     => 'p.rating DESC',
            'newest'     => 'p.created_at DESC',
        ];
        $orderSQL = 'ORDER BY ' . ($sortMap[$sort] ?? 'p.views DESC');

        $stmt = $db->prepare("
            SELECT p.*, c.name AS category_name, c.slug AS category_slug
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            $whereSQL
            $orderSQL
            LIMIT $limit
        ");
        $stmt->execute($params);
        $products = $stmt->fetchAll();

        // Total count
        $countStmt = $db->prepare("SELECT COUNT(*) FROM products p LEFT JOIN categories c ON p.category_id = c.id $whereSQL");
        $countStmt->execute($params);
        $total = $countStmt->fetchColumn();

        response(true, 'OK', ['products' => $products, 'total' => (int)$total]);
        break;

    // ---- SINGLE PRODUCT DETAIL ----
    case 'detail':
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) response(false, 'Product ID required');

        $db = getDB();
        $stmt = $db->prepare("
            SELECT p.*, c.name AS category_name, c.slug AS category_slug
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ?
        ");
        $stmt->execute([$id]);
        $product = $stmt->fetch();

        if (!$product) response(false, 'Product not found', null, 404);

        // Increment view counter
        $db->prepare("UPDATE products SET views = views + 1 WHERE id = ?")->execute([$id]);

        // Log view in product_views
        $user = getAuthUser();
        $sessionId = session_id() ?: uniqid('sess_', true);
        $db->prepare("INSERT INTO product_views (user_id, product_id, session_id) VALUES (?, ?, ?)")
            ->execute([$user ? $user['id'] : null, $id, $sessionId]);

        response(true, 'OK', ['product' => $product]);
        break;

    // ---- SEARCH SUGGESTIONS (AI-style keyword matching) ----
    case 'search_suggest':
        $q  = sanitize($_GET['q'] ?? '');
        if (strlen($q) < 2) response(true, 'OK', ['suggestions' => []]);

        $db = getDB();
        $term = "%$q%";
        $stmt = $db->prepare("
            SELECT id, name, emoji, price, category_id
            FROM products
            WHERE (name LIKE ? OR tags LIKE ?)
            AND stock > 0
            ORDER BY views DESC
            LIMIT 6
        ");
        $stmt->execute([$term, $term]);
        $results = $stmt->fetchAll();

        // Also suggest categories
        $catStmt = $db->prepare("SELECT name, icon FROM categories WHERE name LIKE ? LIMIT 3");
        $catStmt->execute([$term]);
        $cats = $catStmt->fetchAll();

        response(true, 'OK', ['suggestions' => $results, 'categories' => $cats]);
        break;





    // ---- CATEGORIES ----
    case 'categories':
        $db = getDB();
        $stmt = $db->query("
            SELECT c.*, COUNT(p.id) AS product_count
            FROM categories c
            LEFT JOIN products p ON p.category_id = c.id AND p.stock > 0
            GROUP BY c.id
            ORDER BY product_count DESC
        ");
        response(true, 'OK', ['categories' => $stmt->fetchAll()]);
        break;

    default:
        response(false, 'Invalid action', null, 400);
}
?>
