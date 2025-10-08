/**
 * Real-World Test Setup: E-Commerce Database
 * Creates SQLite database with realistic test data
 */

import * as sqlite3 from 'sqlite3';
import * as fs from 'fs';
import * as path from 'path';

async function createTestDatabase(): Promise<void> {
    const dbPath = path.join(__dirname, 'test-ecommerce.db');
    
    // Remove existing database
    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
    }

    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }

            console.log('📦 Creating e-commerce test database...');

            // Create tables
            db.serialize(() => {
                // Users table
                db.run(`
                    CREATE TABLE users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username VARCHAR(50) UNIQUE NOT NULL,
                        email VARCHAR(100) UNIQUE NOT NULL,
                        password_hash VARCHAR(255) NOT NULL,
                        first_name VARCHAR(50) NOT NULL,
                        last_name VARCHAR(50) NOT NULL,
                        phone VARCHAR(20),
                        address TEXT,
                        city VARCHAR(50),
                        country VARCHAR(50),
                        postal_code VARCHAR(20),
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        is_active BOOLEAN DEFAULT 1
                    )
                `);

                // Products table
                db.run(`
                    CREATE TABLE products (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name VARCHAR(200) NOT NULL,
                        description TEXT,
                        price DECIMAL(10,2) NOT NULL,
                        stock_quantity INTEGER DEFAULT 0,
                        category VARCHAR(100),
                        brand VARCHAR(100),
                        sku VARCHAR(100) UNIQUE,
                        weight DECIMAL(8,2),
                        dimensions VARCHAR(100),
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        is_active BOOLEAN DEFAULT 1
                    )
                `);

                // Orders table
                db.run(`
                    CREATE TABLE orders (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        order_number VARCHAR(50) UNIQUE NOT NULL,
                        status VARCHAR(20) DEFAULT 'pending',
                        total_amount DECIMAL(10,2) NOT NULL,
                        shipping_amount DECIMAL(10,2) DEFAULT 0,
                        tax_amount DECIMAL(10,2) DEFAULT 0,
                        discount_amount DECIMAL(10,2) DEFAULT 0,
                        payment_method VARCHAR(50),
                        payment_status VARCHAR(20) DEFAULT 'pending',
                        shipping_address TEXT,
                        billing_address TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id)
                    )
                `);

                // Order items table
                db.run(`
                    CREATE TABLE order_items (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        order_id INTEGER NOT NULL,
                        product_id INTEGER NOT NULL,
                        quantity INTEGER NOT NULL,
                        unit_price DECIMAL(10,2) NOT NULL,
                        total_price DECIMAL(10,2) NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (order_id) REFERENCES orders(id),
                        FOREIGN KEY (product_id) REFERENCES products(id)
                    )
                `);

                console.log('✅ Tables created successfully');

                // Insert test data
                console.log('📊 Inserting realistic test data...');

                // Insert users
                const userStmt = db.prepare(`
                    INSERT INTO users (username, email, password_hash, first_name, last_name, phone, address, city, country, postal_code)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);

                const users = [
                    ['john_doe', 'john.doe@email.com', 'hash123', 'John', 'Doe', '+1-555-0101', '123 Main St', 'New York', 'USA', '10001'],
                    ['jane_smith', 'jane.smith@email.com', 'hash456', 'Jane', 'Smith', '+1-555-0102', '456 Oak Ave', 'Los Angeles', 'USA', '90210'],
                    ['mike_wilson', 'mike.wilson@email.com', 'hash789', 'Mike', 'Wilson', '+1-555-0103', '789 Pine Rd', 'Chicago', 'USA', '60601'],
                    ['sarah_brown', 'sarah.brown@email.com', 'hash101', 'Sarah', 'Brown', '+1-555-0104', '321 Elm St', 'Houston', 'USA', '77001'],
                    ['david_jones', 'david.jones@email.com', 'hash202', 'David', 'Jones', '+1-555-0105', '654 Cedar Ln', 'Phoenix', 'USA', '85001']
                ];

                users.forEach(user => userStmt.run(user));
                userStmt.finalize();

                // Insert products
                const productStmt = db.prepare(`
                    INSERT INTO products (name, description, price, stock_quantity, category, brand, sku, weight)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `);

                const products = [
                    ['Laptop Pro 15"', 'High-performance laptop with 16GB RAM', 1299.99, 50, 'Electronics', 'TechBrand', 'LPT-001', 2.1],
                    ['Wireless Mouse', 'Ergonomic wireless mouse with USB receiver', 29.99, 200, 'Electronics', 'TechBrand', 'MSE-001', 0.1],
                    ['Coffee Mug', 'Ceramic coffee mug with company logo', 12.99, 100, 'Office', 'BrandCorp', 'MUG-001', 0.3],
                    ['Desk Chair', 'Ergonomic office chair with lumbar support', 249.99, 25, 'Furniture', 'OfficeMax', 'CHR-001', 15.5],
                    ['USB Cable', 'High-speed USB-C cable 6ft', 19.99, 150, 'Electronics', 'TechBrand', 'CBL-001', 0.2],
                    ['Notebook', 'Professional spiral notebook 200 pages', 8.99, 300, 'Office', 'PaperCo', 'NTB-001', 0.5],
                    ['Smartphone', 'Latest smartphone with 128GB storage', 699.99, 75, 'Electronics', 'PhoneBrand', 'PHN-001', 0.18],
                    ['Water Bottle', 'Stainless steel water bottle 750ml', 24.99, 120, 'Lifestyle', 'HydroLife', 'WTR-001', 0.4]
                ];

                products.forEach(product => productStmt.run(product));
                productStmt.finalize();

                // Insert orders
                const orderStmt = db.prepare(`
                    INSERT INTO orders (user_id, order_number, status, total_amount, shipping_amount, tax_amount, payment_method, payment_status, shipping_address)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);

                const orders = [
                    [1, 'ORD-2025-001', 'completed', 1349.98, 19.99, 108.00, 'credit_card', 'paid', '123 Main St, New York, USA 10001'],
                    [2, 'ORD-2025-002', 'shipped', 42.98, 9.99, 4.24, 'paypal', 'paid', '456 Oak Ave, Los Angeles, USA 90210'],
                    [3, 'ORD-2025-003', 'processing', 274.98, 15.99, 23.20, 'credit_card', 'paid', '789 Pine Rd, Chicago, USA 60601'],
                    [1, 'ORD-2025-004', 'pending', 729.98, 12.99, 59.44, 'apple_pay', 'pending', '123 Main St, New York, USA 10001'],
                    [4, 'ORD-2025-005', 'completed', 53.97, 8.99, 5.04, 'credit_card', 'paid', '321 Elm St, Houston, USA 77001']
                ];

                orders.forEach(order => orderStmt.run(order));
                orderStmt.finalize();

                // Insert order items
                const itemStmt = db.prepare(`
                    INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
                    VALUES (?, ?, ?, ?, ?)
                `);

                const orderItems = [
                    // Order 1: Laptop + Mouse
                    [1, 1, 1, 1299.99, 1299.99],
                    [1, 2, 1, 29.99, 29.99],
                    
                    // Order 2: Coffee Mug + Notebook
                    [2, 3, 1, 12.99, 12.99],
                    [2, 6, 1, 8.99, 8.99],
                    
                    // Order 3: Desk Chair + USB Cable
                    [3, 4, 1, 249.99, 249.99],
                    [3, 5, 1, 19.99, 19.99],
                    
                    // Order 4: Smartphone + Water Bottle
                    [4, 7, 1, 699.99, 699.99],
                    [4, 8, 1, 24.99, 24.99],
                    
                    // Order 5: Multiple items
                    [5, 2, 1, 29.99, 29.99],
                    [5, 5, 1, 19.99, 19.99],
                    [5, 6, 1, 8.99, 8.99]
                ];

                orderItems.forEach(item => itemStmt.run(item));
                itemStmt.finalize();

                console.log('✅ Test data inserted successfully');
                console.log('📊 Database Summary:');
                console.log('   - Users: 5 customers');
                console.log('   - Products: 8 items across multiple categories');
                console.log('   - Orders: 5 orders with different statuses');
                console.log('   - Order Items: 11 line items');
                console.log('');
                console.log(`💾 Database saved to: ${dbPath}`);

                db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        });
    });
}

// Run the setup
createTestDatabase()
    .then(() => {
        console.log('🎉 E-commerce test database created successfully!');
        console.log('🚀 Ready for real-world migration testing');
    })
    .catch((error) => {
        console.error('❌ Failed to create test database:', error);
        process.exit(1);
    });