<?php
// ============================================
// NexMart - Cart API
// Endpoint: /nexmart/api/cart.php
// ============================================
require_once 'config.php';

$user = getAuthUser();
if (!$user) response(false, 'Please login to use cart', null, 401);

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'get';
$db     = getDB();

switch ($action) {

    // ---- GET CART ----
    case 'get':
        $stmt = $db->prepare("
            SELECT c.id, c.quantity, c.added_at,
                   p.id AS product_id, p.name, p.price, p.original_price,
                   p.emoji, p.stock, p.badge
            FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
            ORDER BY c.added_at DESC
        ");
        $stmt->execute([$user['id']]);
        $items = $stmt->fetchAll();

        $subtotal = array_sum(array_map(fn($i) => $i['price'] * $i['quantity'], $items));
        $count    = array_sum(array_column($items, 'quantity'));

        response(true, 'OK', [
            'items'    => $items,
            'subtotal' => round($subtotal, 2),
            'count'    => $count
        ]);
        break;

    // ---- ADD TO CART ----
    case 'add':
        $data       = getInput();
        $productId  = (int)($data['product_id'] ?? 0);
        $qty        = max(1, (int)($data['quantity'] ?? 1));

        if (!$productId) response(false, 'Product ID required');

        // Check product exists and has stock
        $pStmt = $db->prepare("SELECT id, stock FROM products WHERE id = ?");
        $pStmt->execute([$productId]);
        $product = $pStmt->fetch();

        if (!$product) response(false, 'Product not found', null, 404);
        if ($product['stock'] < $qty) response(false, 'Insufficient stock');

        // Upsert cart item
        $stmt = $db->prepare("
            INSERT INTO cart (user_id, product_id, quantity)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
        ");
        $stmt->execute([$user['id'], $productId, $qty]);

        // Return updated count
        $countStmt = $db->prepare("SELECT SUM(quantity) FROM cart WHERE user_id = ?");
        $countStmt->execute([$user['id']]);
        $count = (int)$countStmt->fetchColumn();

        response(true, 'Added to cart', ['cart_count' => $count]);
        break;

    // ---- UPDATE QUANTITY ----
    case 'update':
        $data      = getInput();
        $productId = (int)($data['product_id'] ?? 0);
        $qty       = (int)($data['quantity'] ?? 1);

        if (!$productId) response(false, 'Product ID required');

        if ($qty <= 0) {
            $db->prepare("DELETE FROM cart WHERE user_id = ? AND product_id = ?")
               ->execute([$user['id'], $productId]);
            response(true, 'Item removed from cart');
        }

        $db->prepare("UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ?")
           ->execute([$qty, $user['id'], $productId]);

        response(true, 'Cart updated');
        break;

    // ---- REMOVE ITEM ----
    case 'remove':
        $data      = getInput();
        $productId = (int)($data['product_id'] ?? $_GET['product_id'] ?? 0);

        if (!$productId) response(false, 'Product ID required');

        $db->prepare("DELETE FROM cart WHERE user_id = ? AND product_id = ?")
           ->execute([$user['id'], $productId]);

        response(true, 'Item removed from cart');
        break;

    // ---- CLEAR CART ----
    case 'clear':
        $db->prepare("DELETE FROM cart WHERE user_id = ?")->execute([$user['id']]);
        response(true, 'Cart cleared');
        break;

    default:
        response(false, 'Invalid action', null, 400);
}
?>
