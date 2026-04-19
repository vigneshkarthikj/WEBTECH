<?php
// ============================================
// NexMart - Analytics API
// Endpoint: /nexmart/api/analytics.php
// ============================================
require_once 'config.php';

$db = getDB();

// ---- METRICS ----
$totalOrders = $db->query("SELECT COUNT(*) FROM orders")->fetchColumn();
$totalRevenue = $db->query("SELECT COALESCE(SUM(total), 0) FROM orders WHERE status != 'cancelled'")->fetchColumn();
$totalUsers   = $db->query("SELECT COUNT(*) FROM users WHERE role = 'user'")->fetchColumn();
$totalProducts = $db->query("SELECT COUNT(*) FROM products WHERE stock > 0")->fetchColumn();
$avgOrder      = $totalOrders > 0 ? round($totalRevenue / $totalOrders, 2) : 0;
$pendingOrders = $db->query("SELECT COUNT(*) FROM orders WHERE status = 'pending'")->fetchColumn();

// ---- MOST VIEWED PRODUCTS ----
$topViewed = $db->query("
    SELECT p.name, p.emoji, p.views, p.price, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ORDER BY p.views DESC
    LIMIT 8
")->fetchAll();

// ---- TOP CATEGORIES BY VIEWS ----
$topCategories = $db->query("
    SELECT c.name, c.icon,
           SUM(p.views) AS total_views,
           COUNT(p.id) AS product_count,
           SUM(p.price * (100 - p.stock)) * 0.1 AS est_revenue
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id
    ORDER BY total_views DESC
")->fetchAll();

// ---- RECENT ORDERS ----
$recentOrders = $db->query("
    SELECT o.id, o.total, o.status, o.created_at, u.name AS user_name, u.avatar
    FROM orders o
    JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC
    LIMIT 5
")->fetchAll();

// ---- ORDERS BY STATUS ----
$ordersByStatus = $db->query("
    SELECT status, COUNT(*) AS count
    FROM orders
    GROUP BY status
")->fetchAll();

// ---- DAILY VIEWS (last 7 days) ----
$dailyViews = $db->query("
    SELECT DATE(viewed_at) AS date, COUNT(*) AS views
    FROM product_views
    WHERE viewed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY DATE(viewed_at)
    ORDER BY date ASC
")->fetchAll();

response(true, 'OK', [
    'metrics' => [
        'total_orders'   => (int)$totalOrders,
        'total_revenue'  => round((float)$totalRevenue, 2),
        'total_users'    => (int)$totalUsers,
        'total_products' => (int)$totalProducts,
        'avg_order'      => $avgOrder,
        'pending_orders' => (int)$pendingOrders,
    ],
    'top_viewed'     => $topViewed,
    'top_categories' => $topCategories,
    'recent_orders'  => $recentOrders,
    'orders_status'  => $ordersByStatus,
    'daily_views'    => $dailyViews,
]);
?>
