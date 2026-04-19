-- ============================================
-- NexMart AI E-Commerce Database
-- Import this in phpMyAdmin or run via MySQL
-- ============================================

DROP DATABASE IF EXISTS nexmart;
CREATE DATABASE IF NOT EXISTS nexmart CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nexmart;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    avatar VARCHAR(255) DEFAULT 'https://placehold.co/100x100/161625/e8c97d?text=User',
    role ENUM('user','admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(255) DEFAULT 'https://placehold.co/100x100/161625/e8c97d?text=Cat',
    slug VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2) DEFAULT NULL,
    category_id INT,
    emoji VARCHAR(255) DEFAULT 'https://placehold.co/400x400/161625/e8c97d?text=Prod',
    badge ENUM('sale','new','hot','') DEFAULT '',
    rating DECIMAL(3,2) DEFAULT 4.5,
    stock INT DEFAULT 100,
    tags VARCHAR(500) DEFAULT '',
    views INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Cart Table
CREATE TABLE IF NOT EXISTS cart (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT DEFAULT 1,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_cart (user_id, product_id)
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    status ENUM('pending','processing','shipped','delivered','cancelled') DEFAULT 'pending',
    shipping_address TEXT,
    payment_method VARCHAR(50) DEFAULT 'card',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Product Views / Browse History Table
CREATE TABLE IF NOT EXISTS product_views (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    product_id INT NOT NULL,
    session_id VARCHAR(100),
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ============================================
-- SEED DATA
-- ============================================

INSERT INTO categories (name, icon, slug) VALUES
('Electronics', 'https://placehold.co/100x100/161625/e8c97d?text=Elec', 'electronics'),
('Gaming', 'https://placehold.co/100x100/161625/e8c97d?text=Game', 'gaming'),
('Audio', 'https://placehold.co/100x100/161625/e8c97d?text=Audio', 'audio'),
('Fashion', 'https://placehold.co/100x100/161625/e8c97d?text=Fash', 'fashion'),
('Wearables', 'https://placehold.co/100x100/161625/e8c97d?text=Wear', 'wearables'),
('Home & Smart', 'https://placehold.co/100x100/161625/e8c97d?text=Home', 'home');

INSERT INTO products (name, description, price, original_price, category_id, emoji, badge, rating, stock, tags, views) VALUES
('ProGamer Headset X9', 'Immersive 7.1 surround sound with noise-cancelling mic and RGB lighting. Perfect for marathon gaming sessions with ultra-soft earcups.', 89.00, 129.00, 3, 'assets/img/headset.png', 'sale', 4.8, 85, 'gaming,audio,RGB,headset', 420),
('UltraBook Pro 14"', 'Powered by the latest M3 chip with 18-hour battery life and a stunning Liquid Retina display. The ultimate productivity machine for professionals.', 1299.00, NULL, 1, 'assets/img/laptop.png', 'new', 4.9, 40, 'laptop,productivity,premium,ultrabook', 890),
('AirBuds Elite Pro', '40-hour total playtime with active noise cancellation and spatial audio. Wireless freedom completely redefined for audiophiles.', 149.00, 199.00, 3, 'assets/img/earbuds.png', 'sale', 4.7, 120, 'audio,wireless,ANC,earbuds', 610),
('SmartWatch Series 10', 'ECG monitoring, built-in GPS, and 2-day battery life. Your comprehensive health and fitness companion strapped to your wrist.', 349.00, NULL, 5, 'assets/img/smartwatch.png', '', 4.6, 60, 'wearable,health,smart,fitness', 380),
('4K Gaming Monitor 27"', '165Hz refresh rate with 1ms response time and HDR600. Experience buttery-smooth competitive gaming like never before.', 599.00, 799.00, 2, 'assets/img/monitor.png', 'sale', 4.8, 30, 'gaming,display,4K,monitor', 720),
('Mechanical Keyboard RGB', 'Cherry MX Red switches with per-key RGB and a solid aluminum frame. Experience tactile typing pleasure that elevates your setup.', 129.00, NULL, 2, 'assets/img/keyboard.png', 'hot', 4.5, 90, 'gaming,keyboard,RGB,mechanical', 290),
('Minimalist Leather Sneakers', 'Premium full-grain leather with a memory foam insole and timeless silhouette. Where style meets all-day comfort.', 119.00, 159.00, 4, 'assets/img/sneakers.png', 'sale', 4.4, 75, 'fashion,shoes,leather,premium', 185),
('Smart Home Hub Gen 3', 'Control all your smart devices from a single beautiful hub. Compatible with 10,000+ devices and all major voice assistants.', 79.00, NULL, 6, 'assets/img/smarthub.png', 'new', 4.3, 200, 'home,smart,automation,IoT', 210),
('20W Wireless Charging Pad', '20W fast Qi wireless charging supporting multiple devices simultaneously. Declutter your desk in elegant minimalist style.', 39.00, NULL, 1, 'assets/img/charger.png', '', 4.5, 300, 'charging,wireless,accessories', 150),
('Pro Webcam 4K AI', 'Sony-grade sensor with HDR and AI-powered auto-framing. Look absolutely flawless in every video call and stream.', 199.00, 249.00, 1, 'assets/img/webcam.png', 'sale', 4.7, 55, 'webcam,streaming,4K,AI', 330),
('Ergonomic Gaming Chair', 'Full lumbar support, 4D adjustable armrests, and reclines flat to 180°. Game and work in supreme ergonomic luxury.', 449.00, 599.00, 2, 'assets/img/chair.png', 'hot', 4.6, 25, 'gaming,furniture,ergonomic,chair', 490),
('Vintage Leather Jacket', 'Full-grain cowhide leather with premium YKK zippers and custom satin lining. A timeless piece that only gets better with age.', 289.00, NULL, 4, 'assets/img/jacket.png', 'new', 4.8, 35, 'fashion,leather,jacket,premium', 275),
('RGB Gaming Mouse Pro', 'PMW3395 sensor, 26000 DPI, ultra-lightweight 58g frame. Dominate every match with precision built for champions.', 79.00, 99.00, 2, 'assets/img/mouse.png', 'sale', 4.6, 110, 'gaming,mouse,RGB,precision', 360),
('Smart Air Purifier', 'HEPA H13 filter with real-time air quality monitoring and whisper-quiet 22dB operation. Breathe cleaner, live better.', 249.00, NULL, 6, 'assets/img/purifier.png', 'new', 4.4, 45, 'home,air,smart,health', 120),
('Titanium Sunglasses', 'Ultra-lightweight titanium frame with polarized UV400 lenses. Italian craftsmanship meeting modern minimalist design.', 199.00, 259.00, 4, 'assets/img/sunglasses.png', 'sale', 4.7, 60, 'fashion,eyewear,titanium,premium', 180);

-- Demo admin user (password: admin123)
INSERT INTO users (name, email, password, role, avatar) VALUES
('Admin User', 'admin@nexmart.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'https://placehold.co/100x100/7b6ef6/ffffff?text=Admin');
