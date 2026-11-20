const bcrypt = require("bcrypt");
const pool = require("./db");
const readline = require("readline/promises");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function createAdmin() {
    try {
        const username = await rl.question("Enter admin username: ");
        const password = await rl.question("Enter admin password: ");

        const passwordHash = await bcrypt.hash(password, 12);

        await pool.query(
            "INSERT INTO admins (username, password_hash) VALUES ($1, $2)",
            [username, passwordHash]
        );

        console.log("Admin account created successfully!");

    } catch (error) {
        console.log("Error:", error.message);
    } finally {
        rl.close();
        await pool.end();
    }
}

createAdmin();