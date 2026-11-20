const bcrypt = require("bcrypt");
const pool = require("./db");
const readline = require("readline/promises");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function changePassword() {
    try {
        const username = await rl.question("Admin username: ");
        const newPassword = await rl.question("New password: ");

        if (newPassword.length < 8) {
            throw new Error("Password must be at least 8 characters.");
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);

        const result = await pool.query(
            "UPDATE admins SET password_hash = $1 WHERE username = $2 RETURNING id",
            [passwordHash, username]
        );

        if (result.rowCount === 0) {
            console.log("Admin username not found.");
        } else {
            console.log("Password changed successfully!");
        }

    } catch (error) {
        console.log("Error:", error.message);
    } finally {
        rl.close();
        await pool.end();
    }
}

changePassword();