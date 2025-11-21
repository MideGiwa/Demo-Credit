import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function recreateDb() {
    const config = {
        host: process.env.DB_HOST || "127.0.0.1",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        port: Number(process.env.DB_PORT) || 3306,
    };

    console.log(`Connecting to MySQL at ${config.host}:${config.port}...`);

    try {
        const connection = await mysql.createConnection({
            host: config.host,
            user: config.user,
            password: config.password,
            port: config.port,
        });

        console.log("Connected. Dropping and recreating databases...");

        await connection.query(`DROP DATABASE IF EXISTS democredit`);
        await connection.query(`CREATE DATABASE democredit`);
        console.log("Database 'democredit' recreated.");

        await connection.query(`DROP DATABASE IF EXISTS democredit_test`);
        await connection.query(`CREATE DATABASE democredit_test`);
        console.log("Database 'democredit_test' recreated.");

        await connection.end();
        console.log("Done.");
        process.exit(0);
    } catch (error) {
        console.error("Error creating databases:", error);
        process.exit(1);
    }
}

recreateDb();
