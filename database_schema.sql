-- ============================================
-- Demo Credit - Database Schema for ER Diagram
-- ============================================
-- This SQL file represents the complete database schema
-- Use with MySQL Workbench (Database > Reverse Engineer) 
-- or dbdiagram.io to generate an ER diagram
-- ============================================

-- Drop existing tables (in correct order to handle foreign keys)
DROP TABLE IF EXISTS `wallet_transactions`;
DROP TABLE IF EXISTS `auth_tokens`;
DROP TABLE IF EXISTS `wallets`;
DROP TABLE IF EXISTS `users`;

-- ============================================
-- USERS TABLE
-- ============================================
-- Stores user account information and authentication details
CREATE TABLE `users` (
  `id` CHAR(36) PRIMARY KEY COMMENT 'UUID primary key',
  `email` VARCHAR(255) NOT NULL UNIQUE COMMENT 'User email address',
  `username` VARCHAR(255) NOT NULL UNIQUE COMMENT 'Unique username',
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'Bcrypt hashed password',
  `role` ENUM('admin', 'user') NOT NULL DEFAULT 'user' COMMENT 'User role for authorization',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Account active status',
  `verified` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Account verification status',
  `email_verified` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Email verification status',
  `token_version` INT NOT NULL DEFAULT 0 COMMENT 'Token version for invalidation',
  `wallet_id` CHAR(36) NULL COMMENT 'Reference to user wallet (circular FK)',
  `rating` DECIMAL(3,2) NULL COMMENT 'User rating (0.00-5.00)',
  `bio` TEXT NULL COMMENT 'User biography',
  `last_login` DATETIME NULL COMMENT 'Last login timestamp',
  `password_reset_token` VARCHAR(255) NULL COMMENT 'Password reset token',
  `password_reset_expires` DATETIME NULL COMMENT 'Password reset expiration',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation time',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record update time',
  
  INDEX `idx_email` (`email`),
  INDEX `idx_username` (`username`),
  INDEX `idx_wallet_id` (`wallet_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User accounts and authentication information';

-- ============================================
-- WALLETS TABLE
-- ============================================
-- Stores wallet balances and financial information
CREATE TABLE `wallets` (
  `id` CHAR(36) PRIMARY KEY COMMENT 'UUID primary key',
  `user_id` CHAR(36) NOT NULL COMMENT 'Owner of the wallet',
  `available_balance` DECIMAL(14,2) NOT NULL DEFAULT 0.00 COMMENT 'Available funds for withdrawal/transfer',
  `ledger_balance` DECIMAL(14,2) NOT NULL DEFAULT 0.00 COMMENT 'Total balance including pending',
  `loan_balance` DECIMAL(14,2) NOT NULL DEFAULT 0.00 COMMENT 'Outstanding loan amount',
  `currency` VARCHAR(10) NOT NULL DEFAULT 'NGN' COMMENT 'Currency code (NGN, USD, etc)',
  `status` ENUM('active', 'frozen', 'closed') NOT NULL DEFAULT 'active' COMMENT 'Wallet status',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation time',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record update time',
  
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_user_wallet` (`user_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User wallet balances and financial accounts';

-- ============================================
-- Add circular foreign key from users to wallets
-- ============================================
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_wallet_id` 
  FOREIGN KEY (`wallet_id`) REFERENCES `wallets`(`id`) ON DELETE SET NULL;

-- ============================================
-- AUTH_TOKENS TABLE
-- ============================================
-- Stores refresh tokens for authentication
CREATE TABLE `auth_tokens` (
  `id` CHAR(36) PRIMARY KEY COMMENT 'UUID primary key',
  `user_id` CHAR(36) NOT NULL COMMENT 'Token owner',
  `token` VARCHAR(512) NOT NULL COMMENT 'Refresh token (hashed)',
  `user_agent` VARCHAR(512) NULL COMMENT 'Client user agent string',
  `ip_address` VARCHAR(255) NULL COMMENT 'Client IP address',
  `expires_at` DATETIME NOT NULL COMMENT 'Token expiration timestamp',
  `revoked` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Token revocation status',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Token creation time',
  
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_token` (`token`(255)),
  INDEX `idx_expires_at` (`expires_at`),
  INDEX `idx_revoked` (`revoked`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Refresh tokens for user authentication';

-- ============================================
-- WALLET_TRANSACTIONS TABLE
-- ============================================
-- Stores all wallet transaction history
CREATE TABLE `wallet_transactions` (
  `id` CHAR(36) PRIMARY KEY COMMENT 'UUID primary key',
  `wallet_id` CHAR(36) NOT NULL COMMENT 'Wallet involved in transaction',
  `type` ENUM(
    'FUND',
    'TRANSFER_IN',
    'TRANSFER_OUT',
    'WITHDRAW',
    'LOAN_DISBURSE',
    'LOAN_REPAY'
  ) NOT NULL COMMENT 'Transaction type',
  `amount` DECIMAL(14,2) NOT NULL COMMENT 'Transaction amount',
  `currency` VARCHAR(10) NOT NULL DEFAULT 'NGN' COMMENT 'Transaction currency',
  `status` ENUM('pending', 'completed', 'failed') NOT NULL DEFAULT 'completed' COMMENT 'Transaction status',
  `reference` VARCHAR(255) NOT NULL UNIQUE COMMENT 'Unique transaction reference',
  `metadata` JSON NULL COMMENT 'Additional transaction metadata',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Transaction timestamp',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record update time',
  
  FOREIGN KEY (`wallet_id`) REFERENCES `wallets`(`id`) ON DELETE CASCADE,
  INDEX `idx_wallet_id` (`wallet_id`),
  INDEX `idx_type` (`type`),
  INDEX `idx_status` (`status`),
  INDEX `idx_reference` (`reference`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Complete transaction history for all wallets';

-- ============================================
-- ENTITY RELATIONSHIPS SUMMARY
-- ============================================
-- 1. users (1) <---> (1) wallets
--    - One user has one wallet
--    - Circular relationship: users.wallet_id -> wallets.id
--                            wallets.user_id -> users.id
--
-- 2. users (1) <---> (N) auth_tokens
--    - One user can have multiple refresh tokens
--    - CASCADE delete: deleting user removes all tokens
--
-- 3. wallets (1) <---> (N) wallet_transactions
--    - One wallet has many transactions
--    - CASCADE delete: deleting wallet removes all transactions
--
-- ============================================
-- INDEXES SUMMARY
-- ============================================
-- Primary Keys: All tables use UUID primary keys
-- Foreign Keys: Enforced with CASCADE/SET NULL actions
-- Unique Keys: email, username, user_wallet, reference
-- Performance Indexes: On frequently queried columns
--
-- ============================================
-- BUSINESS RULES ENFORCED BY SCHEMA
-- ============================================
-- 1. Email and username must be unique
-- 2. Each user has exactly one wallet (1:1)
-- 3. Balances are stored with 2 decimal precision
-- 4. Transaction references must be unique (idempotency)
-- 5. Tokens can be revoked without deletion
-- 6. Cascading deletes maintain referential integrity
--
-- ============================================
-- USAGE INSTRUCTIONS
-- ============================================
-- MySQL Workbench:
--   1. Database > Reverse Engineer
--   2. Select this SQL file
--   3. Generate EER Diagram
--
-- dbdiagram.io:
--   1. Convert to DBML format or
--   2. Import SQL directly (Pro feature)
--
-- draw.io / Lucidchart:
--   1. Import SQL file
--   2. Auto-generate ER diagram
--
-- Online Tools:
--   - https://dbdiagram.io/
--   - https://www.quickdatabasediagrams.com/
--   - https://sqldbm.com/
-- ============================================
