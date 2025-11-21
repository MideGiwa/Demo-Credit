# Demo Credit - Lendsqr Backend Assessment

A production-ready wallet and lending platform API built with Node.js, TypeScript, Express, and MySQL.

## 🏗️ Architecture Overview

### Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express 5.x
- **Database**: MySQL 8.x with Knex.js query builder
- **Authentication**: JWT (access + refresh tokens)
- **Testing**: Vitest + Supertest
- **Package Manager**: pnpm

### Project Structure

```
├── config/           # Database and auth configuration
├── controllers/      # HTTP request handlers
├── service/          # Business logic layer
├── middleware/       # Auth, error handling, logging
├── models/           # TypeScript interfaces and table constants
├── migrations/       # Database schema migrations
├── router/           # Route definitions
├── utils/            # JWT, hashing, and helper utilities
├── errors/           # Custom error classes and logger
├── tests/            # Unit and integration tests
└── types/            # TypeScript type extensions
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- MySQL 8.x
- pnpm (or npm/yarn)

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Configure your .env file with database credentials
```

### Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=democredit

# JWT Secrets
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret

# Adjutor API (for KYC blacklist checks)
ADJUTOR_API_KEY=your_api_key
ADJUTOR_BASE_URL=https://adjutor.lendsqr.com/v2
```

### Database Setup

```bash
# Run migrations
pnpm knex migrate:latest

# For test environment
NODE_ENV=test pnpm knex migrate:latest
```

### Running the Application

```bash
# Development mode with auto-reload
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securePassword123"
}
```

**Response**: `201 Created`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "johndoe"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response**: `200 OK`
```json
{
  "accessToken": "eyJhbGc..."
}
```
*Sets HTTP-only `refresh_token` cookie*

#### Refresh Access Token
```http
POST /auth/refresh
Cookie: refresh_token=...
```

**Response**: `200 OK`
```json
{
  "accessToken": "eyJhbGc..."
}
```

#### Logout
```http
POST /auth/logout
Cookie: refresh_token=...
```

**Response**: `200 OK`

### Wallet Endpoints

All wallet endpoints require authentication via `Authorization: Bearer <accessToken>` header.

#### Fund Wallet
```http
POST /wallet/fund
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "amount": 10000,
  "currency": "NGN",
  "reference": "optional-ref-123",
  "treatAsLoanDisbursement": false
}
```

**Response**: `200 OK`
```json
{
  "available_balance": 10000,
  "ledger_balance": 10000,
  "loan_balance": 0
}
```

#### Transfer Funds
```http
POST /wallet/transfer
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "amount": 5000,
  "recipientUserId": "recipient-uuid",
  "reference": "optional-ref-456"
}
```

*Alternative: Use `recipientEmail` instead of `recipientUserId`*

**Response**: `200 OK`
```json
{
  "sender": {
    "available_balance": 5000,
    "ledger_balance": 5000
  },
  "recipient": {
    "available_balance": 5000,
    "ledger_balance": 5000
  }
}
```

#### Withdraw Funds
```http
POST /wallet/withdraw
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "amount": 2000,
  "reference": "optional-ref-789"
}
```

**Response**: `200 OK`
```json
{
  "available_balance": 3000,
  "ledger_balance": 3000
}
```

#### Get Transaction History
```http
GET /wallet/transactions?limit=20&offset=0
Authorization: Bearer <accessToken>
```

**Response**: `200 OK`
```json
{
  "transactions": [
    {
      "id": "uuid",
      "type": "FUND",
      "amount": 10000,
      "currency": "NGN",
      "status": "COMPLETED",
      "reference": "ref-123",
      "created_at": "2025-11-21T12:00:00Z"
    }
  ]
}
```

## 🔐 Security Features

### Authentication Flow

1. **Registration**: Passwords are hashed using bcrypt before storage
2. **Login**: Returns JWT access token (15min TTL) and HTTP-only refresh token cookie (7d TTL)
3. **Token Refresh**: Refresh tokens can generate new access tokens without re-authentication
4. **Token Revocation**: Logout invalidates refresh tokens; token version tracking prevents replay attacks
5. **KYC Integration**: Adjutor API integration checks user karma/blacklist status during registration

### Wallet Security

- **Atomic Transactions**: All wallet operations use database transactions with row-level locking
- **Balance Validation**: Prevents overdrafts and negative balances
- **Idempotency**: Transaction references prevent duplicate operations
- **Audit Trail**: Complete transaction history with immutable records

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test tests/auth/routes.test.ts

# Run tests in watch mode
pnpm test:watch
```

### Test Coverage

- **Unit Tests**: Service layer validation and business logic
- **Integration Tests**: API endpoint testing with real database
- **Authentication Tests**: Registration, login, token refresh flows
- **Wallet Tests**: Fund, transfer, withdraw operations with balance verification

### Test Database

Tests run against a separate `democredit_test` database. Ensure migrations are run:

```bash
NODE_ENV=test pnpm knex migrate:latest
```

## 🗄️ Database Schema

### Entity-Relationship Diagram

![Database E-R Diagram](./E-R%20Diagram.png)

The database consists of four main entities with the following relationships:
- **Users ↔ Wallets**: One-to-one relationship (circular foreign keys)
- **Users → Auth Tokens**: One-to-many relationship
- **Wallets → Wallet Transactions**: One-to-many relationship

### Users Table
- `id` (UUID, PK)
- `email` (unique)
- `username` (unique)
- `password_hash`
- `role` (user/admin)
- `token_version` (for token revocation)
- `wallet_id` (FK to wallets)

### Wallets Table
- `id` (UUID, PK)
- `user_id` (FK to users)
- `available_balance` (decimal)
- `ledger_balance` (decimal)
- `loan_balance` (decimal)
- `currency` (default: NGN)

### Wallet Transactions Table
- `id` (UUID, PK)
- `wallet_id` (FK to wallets)
- `type` (FUND/TRANSFER/WITHDRAW/LOAN_DISBURSE/LOAN_REPAY)
- `amount` (decimal)
- `reference` (unique per transaction)
- `status` (PENDING/COMPLETED/FAILED)
- `metadata` (JSON)

### Auth Tokens Table
- `id` (UUID, PK)
- `user_id` (FK to users)
- `token` (refresh token hash)
- `revoked` (boolean)
- `expires_at` (timestamp)

## 📝 Design Decisions

### Service Layer Architecture

Business logic is separated into service modules (`authService`, `walletService`) to:
- Decouple from HTTP layer for testability
- Enable code reuse across different interfaces
- Centralize validation and error handling

### Transaction Management

Wallet operations use Knex transactions with `.forUpdate()` row locking to prevent:
- Race conditions in concurrent transfers
- Double-spending attacks
- Balance inconsistencies

### Error Handling

Custom `HttpError` classes provide:
- Consistent error responses
- Proper HTTP status codes
- Centralized logging via middleware

### Logging

Winston-based logger writes to:
- `logs/app.log` - All application logs
- `logs/error.log` - Error-level logs only
- Console - Development environment

## 🔧 Troubleshooting

### Common Issues

**Database Connection Timeout**
- Increase `acquireTimeoutMillis` in `knexfile.ts` for remote databases
- Check firewall/network connectivity

**Test Failures**
- Ensure test database exists and migrations are current
- Run tests sequentially: `pnpm test -- --no-file-parallelism`
- Clear test data: `NODE_ENV=test pnpm knex migrate:rollback --all && NODE_ENV=test pnpm knex migrate:latest`

**JWT Errors**
- Verify `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are set in `.env`
- Check token expiration times in `config/auth.ts`

## 📦 Deployment

### Production Checklist

- [ ] Set strong JWT secrets
- [ ] Configure production database with SSL
- [ ] Enable CORS for allowed origins only
- [ ] Set `NODE_ENV=production`
- [ ] Configure reverse proxy (nginx/Apache)
- [ ] Set up monitoring and alerting
- [ ] Enable rate limiting
- [ ] Configure log rotation

### Environment-Specific Configs

Development and production use separate Knex configurations in `knexfile.ts`. Adjust connection pools and timeouts based on your infrastructure.

## 🤝 Contributing

This is an assessment project. For production use, consider:
- Adding API rate limiting
- Implementing request validation middleware (e.g., Joi, Zod)
- Adding comprehensive API documentation (Swagger/OpenAPI)
- Setting up CI/CD pipelines
- Implementing monitoring (Prometheus, DataDog)

## 📄 License

ISC

## 👤 Author

Demo Credit - Lendsqr Backend Assessment Project
