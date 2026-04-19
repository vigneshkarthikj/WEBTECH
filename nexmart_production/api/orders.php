<?php
// ============================================
// NexMart - Orders API
// Endpoint: /nexmart/api/orders.php
// ============================================
require_once 'config.php';

$user = getAuthUser();
if (!$user) response(false, 'Please login to view orders', null, 401);

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'list';
$db     = getDB();

switch ($action) {

    // ---- CHECKOUT ----
    case 'checkout':
        if ($method !== 'POST') response(false, 'Method not allowed', null, 405);

        $data    = getInput();
        $address = sanitize($data['address'] ?? '');
        $payment = sanitize($data['payment_method'] ?? 'card');

        if (empty($address)) response(false, 'Shipping address is required');

        // Fetch cart items
        $cartStmt = $db->prepare("
            SELECT c.quantity, p.id AS product_id, p.price, p.stock, p.name
            FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
        ");
        $cartStmt->execute([$user['id']]);
        $cartItems = $cartStmt->fetchAll();

        if (empty($cartItems)) response(false, 'Your cart is empty');

        // Validate stock & calculate total
        $total = 0;
        foreach ($cartItems as $item) {
            if ($item['stock'] < $item['quantity'])
                response(false, "'{$item['name']}' is out of stock");
            $total += $item['price'] * $item['quantity'];
        }

        // Create order (transaction)
        $db->beginTransaction();
        try {
            // Insert order
            $orderStmt = $db->prepare("
                INSERT INTO orders (user_id, total, shipping_address, payment_method)
                VALUES (?, ?, ?, ?)
            ");
            $orderStmt->execute([$user['id'], round($total, 2), $address, $payment]);
            $orderId = $db->lastInsertId();

            // Insert order items & decrement stock
            $itemStmt  = $db->prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)");
            $stockStmt = $db->prepare("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?");

            foreach ($cartItems as $item) {
                $itemStmt->execute([$orderId, $item['product_id'], $item['quantity'], $item['price']]);
                $stockStmt->execute([$item['quantity'], $item['product_id'], $item['quantity']]);
            }

            // Clear cart
            $db->prepare("DELETE FROM cart WHERE user_id = ?")->execute([$user['id']]);

            $db->commit();
            response(true, 'Order placed successfully!', [
                'order_id' => $orderId,
                'total'    => round($total, 2),
                'status'   => 'pending'
            ]);
        } catch (Exception $e) {
            $db->rollBack();
            response(false, 'Checkout failed. Please try again.', null, 500);
        }
        break;

    // ---- ORDER LIST ----
    case 'list':
        $stmt = $db->prepare("
            SELECT o.id, o.total, o.status, o.payment_method, o.created_at,
                   COUNT(oi.id) AS item_count
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.user_id = ?
            GROUP BY o.id
            ORDER BY o.created_at DESC
        ");
        $stmt->execute([$user['id']]);
        response(true, 'OK', ['orders' => $stmt->fetchAll()]);
        break;

    // ---- ORDER DETAIL ----
    case 'detail':
        $orderId = (int)($_GET['id'] ?? 0);
        if (!$orderId) response(false, 'Order ID required');

        $orderStmt = $db->prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?");
        $orderStmt->execute([$orderId, $user['id']]);
        $order = $orderStmt->fetch();

        if (!$order) response(false, 'Order not found', null, 404);

        $itemsStmt = $db->prepare("
            SELECT oi.quantity, oi.price, p.name, p.emoji, p.id AS product_id
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        ");
        $itemsStmt->execute([$orderId]);
        $order['items'] = $itemsStmt->fetchAll();

        response(true, 'OK', ['order' => $order]);
        break;

    default:
        response(false, 'Invalid action', null, 400);
}
?>
