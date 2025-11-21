const mysql = require('mysql2/promise');
require('dotenv').config();

async function createDb() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
        });

        await connection.query('CREATE DATABASE IF NOT EXISTS democredit_test');
        console.log('Database democredit_test created or already exists.');
        await connection.end();
    } catch (error) {
        console.error('Failed to create database:', error);
        process.exit(1);
    }
}

createDb();
