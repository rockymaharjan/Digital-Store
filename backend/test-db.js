const pool = require("./db");

pool.query("SELECT NOW()")
    .then(result => {
        console.log("Database connected successfully!");
        console.log(result.rows[0]);
    })
    .catch(error => {
        console.log("Database connection failed:", error.message);
    })
    .finally(() => {
        pool.end();
    });