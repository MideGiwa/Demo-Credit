import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

async function createSqlDump() {
    const config = {
        host: process.env.DB_HOST || "127.0.0.1",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        port: Number(process.env.DB_PORT) || 3306,
        database: "democredit",
    };

    console.log(`Connecting to database at ${config.host}:${config.port}...`);

    try {
        const connection = await mysql.createConnection(config);
        console.log("Connected successfully!");

        let sqlDump = `-- ============================================
-- Demo Credit Database Dump
-- Generated: ${new Date().toISOString()}
-- Database: democredit
-- ============================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- Drop existing tables
-- ============================================
DROP TABLE IF EXISTS \`wallet_transactions\`;
DROP TABLE IF EXISTS \`auth_tokens\`;
DROP TABLE IF EXISTS \`wallets\`;
DROP TABLE IF EXISTS \`users\`;
DROP TABLE IF EXISTS \`knex_migrations\`;
DROP TABLE IF EXISTS \`knex_migrations_lock\`;

`;

        // Get all tables
        const [tables] = await connection.query(
            "SHOW TABLES FROM democredit"
        );

        for (const tableRow of tables as any[]) {
            const tableName = Object.values(tableRow)[0] as string;
            console.log(`Dumping table: ${tableName}`);

            // Get CREATE TABLE statement
            const [createResult] = await connection.query(
                `SHOW CREATE TABLE \`${tableName}\``
            );
            const createStatement = (createResult as any[])[0]["Create Table"];

            sqlDump += `-- ============================================\n`;
            sqlDump += `-- Table: ${tableName}\n`;
            sqlDump += `-- ============================================\n`;
            sqlDump += `${createStatement};\n\n`;

            // Get table data
            const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``);
            const rowsArray = rows as any[];

            if (rowsArray.length > 0) {
                sqlDump += `-- Data for table: ${tableName}\n`;
                sqlDump += `INSERT INTO \`${tableName}\` VALUES\n`;

                const values = rowsArray.map((row) => {
                    const vals = Object.values(row).map((val) => {
                        if (val === null) return "NULL";
                        if (typeof val === "string") {
                            return `'${val.replace(/'/g, "''")}'`;
                        }
                        if (val instanceof Date) {
                            return `'${val.toISOString().slice(0, 19).replace("T", " ")}'`;
                        }
                        if (typeof val === "boolean") {
                            return val ? "1" : "0";
                        }
                        return val;
                    });
                    return `(${vals.join(", ")})`;
                });

                sqlDump += values.join(",\n");
                sqlDump += ";\n\n";
            }
        }

        sqlDump += `\nSET FOREIGN_KEY_CHECKS = 1;\n`;
        sqlDump += `\n-- End of dump\n`;

        // Write to file
        const outputPath = path.join(process.cwd(), "democredit_dump.sql");
        fs.writeFileSync(outputPath, sqlDump);

        console.log(`\nSQL dump created successfully: ${outputPath}`);
        console.log(`Total size: ${(sqlDump.length / 1024).toFixed(2)} KB`);

        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error("Error creating SQL dump:", error);
        process.exit(1);
    }
}

createSqlDump();
