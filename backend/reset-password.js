const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

async function main() {
    const email = "admin@gmail.com";
    const newPassword = "QuangAdmin@2026";

    // Tạo bcrypt hash
    const password_hash = await bcrypt.hash(newPassword, 10);

    // Kết nối MySQL XAMPP
    const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "", // Mật khẩu MySQL XAMPP
        database: "study_ai_db",
        port: 3306
    });

    const [result] = await connection.execute(
        "UPDATE User SET password_hash = ? WHERE email = ?",
        [password_hash, email]
    );

    console.log("Số tài khoản được cập nhật:", result.affectedRows);

    await connection.end();
}

main().catch(console.error);