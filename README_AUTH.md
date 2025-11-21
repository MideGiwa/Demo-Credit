## Auth & Logging Overview

- **Register**: `POST /auth/register` with JSON `{ "email": "", "username": "", "password": "" }`.
- **Login**: `POST /auth/login` with JSON `{ "email": "", "password": "" }` returns an `accessToken` (bearer) and sets an HTTP-only `refresh_token` cookie.
- **Refresh token**: `POST /auth/refresh` (cookie or JSON `{ "refresh_token": "" }`) returns a new `accessToken`.
- **Logout**: `POST /auth/logout` revokes the refresh token and clears the cookie.
- **User-protected route**: `GET /auth/me` with header `Authorization: Bearer <accessToken>`.
- **Admin-only route**: `GET /auth/admin/ping` with an admin `accessToken`.

The logger writes to `logs/app.log` and `logs/error.log` and is wired globally in `index.ts`. Use `logger.info|error|warn|debug` from `errors/logger.ts` inside controllers or services.

## Testing

* [ ]  Run all tests with `pnpm test`.

Run tests in watch mode with `pnpm test:watch`.

Tests are written with Vitest in the `tests/` directory and use `supertest` for HTTP route testing.

## Wallet APIs

- `POST /wallet/fund` – Body `{ "amount": 1000, "currency": "NGN", "reference": "optional", "treatAsLoanDisbursement": true|false }`. Credits the authenticated user’s wallet, with optional loan balance increase.
- `POST /wallet/transfer` – Body `{ "amount": 500, "recipientUserId": "...", "reference": "optional" }` (or `recipientEmail`). Moves funds between wallets atomically.
- `POST /wallet/withdraw` – Body `{ "amount": 250, "reference": "optional" }`. Debits available balance (fails on insufficient funds).
- `GET /wallet/transactions?limit=20&offset=0` – Returns the latest wallet ledger entries for the signed-in user.

Every wallet operation records a transaction in `wallet_transactions` with a shared `reference`, enabling reconciliation between FUND, TRANSFER, WITHDRAW, LOAN_DISBURSE, and LOAN_REPAY events. Balances tracked per wallet:

- `available_balance`: funds the borrower can immediately move/withdraw.
- `ledger_balance`: total running balance including in-flight amounts.
- `loan_balance`: outstanding loan principal disbursed via the wallet.

### Wallet Testing Notes

- Unit tests for `walletService` ensure validation and transactional invariants (see `tests/service/walletService.test.ts`).
- Route tests in `tests/wallet/routes.test.ts` mock the service layer to verify request/response shapes for fund/transfer/withdraw/history endpoints.
- All wallet tests run as part of `pnpm test`, sharing the existing Vitest configuration.
