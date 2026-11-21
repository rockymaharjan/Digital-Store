
const express = require("express");
const cors = require("cors");
const pool = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { generateEsewaSignature } = require("./esewa");

const app = express();

app.use(cors());
app.use(express.json());


// Verify admin login token
function verifyAdminToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            error: "Access denied"
        });
    }

    try {
        req.admin = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (error) {
        return res.status(403).json({
            error: "Invalid or expired token"
        });
    }
}


// GET: Fetch all products
app.get("/api/products", async function(req, res) {
    try {
        const result = await pool.query(
            "SELECT * FROM products ORDER BY id"
        );

        res.json(result.rows);

    } catch (error) {
        console.log("Product error:", error.message);

        res.status(500).json({
            error: "Failed to fetch products"
        });
    }
});


// POST: Add a new product
app.post("/api/products", async function(req, res) {
    try {
        const { name, price } = req.body;

        if (
            !name ||
            !Number.isFinite(Number(price)) ||
            Number(price) <= 0
        ) {
            return res.status(400).json({
                error: "Invalid product details"
            });
        }

        const result = await pool.query(
            `INSERT INTO products (name, price)
             VALUES ($1, $2)
             RETURNING *`,
            [name, Number(price)]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.log("Add product error:", error.message);

        res.status(500).json({
            error: "Failed to add product"
        });
    }
});


// POST: Initiate eSewa payment
app.post("/api/esewa/initiate", async function(req, res) {
    let client;
    let transactionStarted = false;

    try {
        const {
            name,
            email,
            phone,
            country,
            address,
            products
        } = req.body;

        // Validate customer and order details
        if (
            !name ||
            !email ||
            !phone ||
            !country ||
            !address ||
            !Array.isArray(products) ||
            products.length === 0
        ) {
            return res.status(400).json({
                error: "Please provide all order details"
            });
        }

        // Check eSewa configuration
        if (
            !process.env.ESEWA_PRODUCT_CODE ||
            !process.env.ESEWA_FORM_URL ||
            !process.env.ESEWA_SUCCESS_URL ||
            !process.env.ESEWA_FAILURE_URL ||
            !process.env.ESEWA_SECRET_KEY
        ) {
            throw new Error("eSewa configuration is incomplete");
        }

        // Combine duplicate products
        const productQuantities = new Map();

        for (const item of products) {
            const productId = Number(item.productId);
            const quantity = Number(item.quantity);

            if (
                !Number.isInteger(productId) ||
                productId <= 0 ||
                !Number.isInteger(quantity) ||
                quantity <= 0
            ) {
                return res.status(400).json({
                    error: "Invalid product or quantity"
                });
            }

            productQuantities.set(
                productId,
                (productQuantities.get(productId) || 0) + quantity
            );
        }

        client = await pool.connect();

        await client.query("BEGIN");
        transactionStarted = true;

        let total = 0;
        const orderProducts = [];

        // Check products, prices and stock
        for (const [productId, quantity] of productQuantities) {
            const result = await client.query(
                `SELECT id, name, price, stock
                 FROM products
                 WHERE id = $1
                 FOR UPDATE`,
                [productId]
            );

            if (result.rows.length === 0) {
                const error = new Error("Product not found");
                error.statusCode = 400;
                throw error;
            }

            const product = result.rows[0];

            if (Number(product.stock) < quantity) {
                const error = new Error(
                    product.name + " has insufficient stock"
                );
                error.statusCode = 400;
                throw error;
            }

            const price = Number(product.price);

            total += price * quantity;

            orderProducts.push({
                id: product.id,
                price: price,
                quantity: quantity
            });
        }

        total = Number(total.toFixed(2));

        if (!Number.isFinite(total) || total <= 0) {
            const error = new Error("Invalid order total");
            error.statusCode = 400;
            throw error;
        }

        // Create the pending order
        const orderResult = await client.query(
            `INSERT INTO orders
            (
                customer_name,
                customer_email,
                customer_phone,
                customer_country,
                customer_address,
                payment_method,
                total_amount,
                order_status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id`,
            [
                name,
                email,
                phone,
                country,
                address,
                "eSewa",
                total,
                "Pending"
            ]
        );

        const orderId = orderResult.rows[0].id;

        // Save order items and reserve stock
        for (const item of orderProducts) {
            await client.query(
                `INSERT INTO order_items
                (order_id, product_id, quantity, price)
                VALUES ($1, $2, $3, $4)`,
                [
                    orderId,
                    item.id,
                    item.quantity,
                    item.price
                ]
            );

            await client.query(
                `UPDATE products
                 SET stock = stock - $1
                 WHERE id = $2`,
                [item.quantity, item.id]
            );
        }

        // Generate eSewa transaction details
        const transactionUuid = crypto.randomUUID();
        const productCode = process.env.ESEWA_PRODUCT_CODE;
        const totalAmount = total.toFixed(2);

        const signature = generateEsewaSignature(
            totalAmount,
            transactionUuid,
            productCode
        );

        // Save pending payment record
        await client.query(
            `INSERT INTO payments
            (
                order_id,
                payment_method,
                amount,
                payment_status,
                transaction_id,
                gateway_name
            )
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                orderId,
                "eSewa",
                total,
                "Pending",
                transactionUuid,
                "eSewa"
            ]
        );

        // Commit the order and payment together
        await client.query("COMMIT");
        transactionStarted = false;

        res.status(201).json({
            orderId: orderId,
            paymentUrl: process.env.ESEWA_FORM_URL,
            paymentData: {
                amount: totalAmount,
                tax_amount: "0",
                total_amount: totalAmount,
                transaction_uuid: transactionUuid,
                product_code: productCode,
                product_service_charge: "0",
                product_delivery_charge: "0",
                success_url: process.env.ESEWA_SUCCESS_URL,
                failure_url: process.env.ESEWA_FAILURE_URL,
                signed_field_names:
                    "total_amount,transaction_uuid,product_code",
                signature: signature
            }
        });

    } catch (error) {
        if (client && transactionStarted) {
            await client.query("ROLLBACK");
            transactionStarted = false;
        }

        console.log("eSewa initiation error:", error.message);

        res.status(error.statusCode || 500).json({
            error: error.statusCode
                ? error.message
                : "Could not initiate eSewa payment"
        });

    } finally {
        if (client) {
            client.release();
        }
    }
});


// POST: Create a customer order
app.post("/api/orders", async function(req, res) {
    let client;
    let transactionStarted = false;

    try {
        const {
            name,
            email,
            phone,
            country,
            address,
            payment,
            products
        } = req.body;

        // Validate customer and order details
        if (
            !name ||
            !email ||
            !phone ||
            !country ||
            !address ||
            !payment ||
            !Array.isArray(products) ||
            products.length === 0
        ) {
            return res.status(400).json({
                error: "Please provide all order details"
            });
        }

        // eSewa must use its separate initiation endpoint
        if (payment === "eSewa") {
            return res.status(400).json({
                error: "Please use the eSewa payment process"
            });
        }

        client = await pool.connect();

        // Combine duplicate products into one quantity
        const productQuantities = new Map();

        for (const item of products) {
            const productId = Number(item.productId);
            const quantity = Number(item.quantity);

            if (
                !Number.isInteger(productId) ||
                productId <= 0 ||
                !Number.isInteger(quantity) ||
                quantity <= 0
            ) {
                const error = new Error("Invalid product or quantity");
                error.statusCode = 400;
                throw error;
            }

            productQuantities.set(
                productId,
                (productQuantities.get(productId) || 0) + quantity
            );
        }

        await client.query("BEGIN");
        transactionStarted = true;

        let total = 0;
        const orderProducts = [];

        // Check products, prices and available stock
        for (const [productId, quantity] of productQuantities) {
            const result = await client.query(
                `SELECT id, name, price, stock
                 FROM products
                 WHERE id = $1
                 FOR UPDATE`,
                [productId]
            );

            if (result.rows.length === 0) {
                const error = new Error("Product not found");
                error.statusCode = 400;
                throw error;
            }

            const product = result.rows[0];

            if (Number(product.stock) < quantity) {
                const error = new Error(
                    product.name + " has insufficient stock"
                );
                error.statusCode = 400;
                throw error;
            }

            const itemPrice = Number(product.price);

            total += itemPrice * quantity;

            orderProducts.push({
                id: product.id,
                price: itemPrice,
                quantity: quantity
            });
        }

        // Create the main order
        const orderResult = await client.query(
            `INSERT INTO orders
            (
                customer_name,
                customer_email,
                customer_phone,
                customer_country,
                customer_address,
                payment_method,
                total_amount,
                order_status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id`,
            [
                name,
                email,
                phone,
                country,
                address,
                payment,
                total,
                "Pending"
            ]
        );

        const orderId = orderResult.rows[0].id;

        // Save order items and reduce stock
        for (const item of orderProducts) {
            await client.query(
                `INSERT INTO order_items
                (order_id, product_id, quantity, price)
                VALUES ($1, $2, $3, $4)`,
                [
                    orderId,
                    item.id,
                    item.quantity,
                    item.price
                ]
            );

            await client.query(
                `UPDATE products
                 SET stock = stock - $1
                 WHERE id = $2`,
                [item.quantity, item.id]
            );
        }

        // Create one payment record with Pending status
        await client.query(
            `INSERT INTO payments
            (order_id, payment_method, amount, payment_status)
            VALUES ($1, $2, $3, $4)`,
            [
                orderId,
                payment,
                total,
                "Pending"
            ]
        );

        // Save all changes together
        await client.query("COMMIT");
        transactionStarted = false;

        res.status(201).json({
            message: "Order placed successfully",
            orderId: orderId,
            total: total
        });

    } catch (error) {
        if (client && transactionStarted) {
            await client.query("ROLLBACK");
            transactionStarted = false;
        }

        console.log("Order error:", error.message);

        res.status(error.statusCode || 500).json({
            error: error.statusCode
                ? error.message
                : "Failed to create order"
        });

    } finally {
        if (client) {
            client.release();
        }
    }
});


// POST: Admin login
app.post("/api/admin/login", async function(req, res) {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                error: "Username and password are required"
            });
        }

        const result = await pool.query(
            "SELECT * FROM admins WHERE username = $1",
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: "Invalid username or password"
            });
        }

        const admin = result.rows[0];

        const passwordMatch = await bcrypt.compare(
            password,
            admin.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                error: "Invalid username or password"
            });
        }

        const token = jwt.sign(
            {
                adminId: admin.id,
                username: admin.username
            },
            process.env.JWT_SECRET,
            { expiresIn: "2h" }
        );

        res.json({
            message: "Login successful",
            token: token,
            admin: {
                id: admin.id,
                username: admin.username
            }
        });

    } catch (error) {
        console.log("Login error:", error.message);

        res.status(500).json({
            error: "Login failed"
        });
    }
});


// GET: Fetch all orders for admin dashboard
app.get("/api/admin/orders", verifyAdminToken, async function(req, res) {
    try {
        const result = await pool.query(
            `SELECT
                orders.*,
                payments.payment_status
             FROM orders
             LEFT JOIN payments
             ON orders.id = payments.order_id
             ORDER BY orders.id DESC`
        );

        res.json(result.rows);

    } catch (error) {
        console.log("Admin orders error:", error.message);

        res.status(500).json({
            error: "Failed to fetch orders"
        });
    }
});


// GET: Fetch one order with its products and payments
app.get("/api/admin/orders/:id", verifyAdminToken, async function(req, res) {
    try {
        const orderId = Number(req.params.id);

        if (!Number.isInteger(orderId) || orderId <= 0) {
            return res.status(400).json({
                error: "Invalid order ID"
            });
        }

        const orderResult = await pool.query(
            "SELECT * FROM orders WHERE id = $1",
            [orderId]
        );

        if (orderResult.rows.length === 0) {
            return res.status(404).json({
                error: "Order not found"
            });
        }

        const itemsResult = await pool.query(
            `SELECT
                oi.id,
                oi.product_id,
                p.name,
                oi.quantity,
                oi.price
             FROM order_items oi
             JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = $1`,
            [orderId]
        );

        const paymentsResult = await pool.query(
            "SELECT * FROM payments WHERE order_id = $1",
            [orderId]
        );

        res.json({
            order: orderResult.rows[0],
            items: itemsResult.rows,
            payments: paymentsResult.rows
        });

    } catch (error) {
        console.log("Order details error:", error.message);

        res.status(500).json({
            error: "Failed to fetch order details"
        });
    }
});


// PATCH: Update an individual order's status
app.patch("/api/admin/orders/:id/status", verifyAdminToken, async function(req, res) {
    try {
        const orderId = Number(req.params.id);
        const { status } = req.body;

        const allowedStatuses = [
            "Pending",
            "Confirmed",
            "Processing",
            "Shipped",
            "Delivered",
            "Cancelled"
        ];

        if (
            !Number.isInteger(orderId) ||
            orderId <= 0 ||
            !allowedStatuses.includes(status)
        ) {
            return res.status(400).json({
                error: "Invalid order ID or status"
            });
        }

        const result = await pool.query(
            `UPDATE orders
             SET order_status = $1
             WHERE id = $2
             RETURNING id, order_status`,
            [status, orderId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Order not found"
            });
        }

        res.json({
            message: "Order status updated",
            order: result.rows[0]
        });

    } catch (error) {
        console.log("Status update error:", error.message);

        res.status(500).json({
            error: "Failed to update status"
        });
    }
});


// PATCH: Update payment status
app.patch("/api/admin/payments/:id/status", verifyAdminToken, async function(req, res) {
    try {
        const paymentId = Number(req.params.id);
        const { status } = req.body;

        const allowedStatuses = [
            "Pending",
            "Paid",
            "Failed",
            "Refunded"
        ];

        if (
            !Number.isInteger(paymentId) ||
            paymentId <= 0 ||
            !allowedStatuses.includes(status)
        ) {
            return res.status(400).json({
                error: "Invalid payment ID or status"
            });
        }

        const result = await pool.query(
            `UPDATE payments
             SET payment_status = $1,
                 payment_date = CASE
                     WHEN $2 THEN CURRENT_TIMESTAMP
                     ELSE payment_date
                 END
             WHERE id = $3
             RETURNING id, order_id, payment_status, payment_date`,
            [status, status === "Paid", paymentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Payment not found"
            });
        }

        res.json({
            message: "Payment status updated",
            payment: result.rows[0]
        });

    } catch (error) {
        console.log("Payment status error:", error.message);

        res.status(500).json({
            error: "Failed to update payment status"
        });
    }
});


// GET: Fetch sales and payment ledger for admin
app.get("/api/admin/ledger", verifyAdminToken, async function(req, res) {
    try {
        const result = await pool.query(
            `SELECT
                o.id AS order_id,
                o.order_date,
                o.customer_name,
                o.customer_email,
                o.payment_method,
                o.total_amount,
                o.order_status,
                p.id AS payment_id,
                p.amount AS payment_amount,
                p.payment_status,
                p.payment_date
             FROM orders o
             LEFT JOIN payments p
             ON o.id = p.order_id
             ORDER BY o.id DESC`
        );

        res.json(result.rows);

    } catch (error) {
        console.log("Ledger error:", error.message);

        res.status(500).json({
            error: "Failed to fetch ledger"
        });
    }
});


// Start backend server

const PORT = process.env.PORT || 5000;

app.listen(PORT, function() {

    console.log(`Server running on port ${PORT}`);

});