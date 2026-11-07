const express = require("express");
const cors = require("cors");
const pool = require("./db");
const app = express();

app.use(cors());
app.use(express.json());

// Our first API route
app.get("/api/products", async function(req, res) {
    try {
        const result = await pool.query("SELECT * FROM products ORDER BY id");
        res.json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Failed to fetch products" });
    }
    app.post("/api/products", async function(req, res) {
    try {
        const { name, price } = req.body;

        if (!name || !Number.isFinite(Number(price)) || Number(price) <= 0) {
            return res.status(400).json({ error: "Invalid product details" });
        }

        const result = await pool.query(
            "INSERT INTO products (name, price) VALUES ($1, $2) RETURNING *",
            [name, Number(price)]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Failed to add product" });
    }
});
});
app.listen(5000, function() {
    console.log("Server running on port 5000");
});
fetch("http://localhost:5000/api/products")
    .then(function(response) {
        return response.json();
    })
    .then(function(products) {
        console.log("Products received from backend:", products);
    })
    .catch(function(error) {
        console.log("Error:", error);
    });