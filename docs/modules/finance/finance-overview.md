# Финансы — Обзор

## Completed Phases

1.  **Phase 1: Backend Data & Foundation**
    *   Database Schema: Created `wallets`, `transactions`, `contracts` tables.
    *   Repositories: `WalletRepository`, `ContractsRepository`.
    *   Services: `WalletService` (with balance, top-up, hold, release logic), `ContractService` (offer, accept, fund, payout).
    *   API Endpoints:
        *   `GET /api/finance/balance`
        *   `POST /api/finance/top-up`
        *   `POST /api/contracts` (Create Offer)
        *   `POST /api/contracts/[id]/accept`
        *   `POST /api/contracts/[id]/fund`
        *   `POST /api/contracts/[id]/complete`

2.  **Phase 2: Organization Interface**
    *   Organization Finance Page: `apps/web/app/(app)/org/[orgId]/finance/page.tsx`.
    *   Finance Client Component: `OrganizationFinanceClient.tsx` (Balance display & Top-up).

## Next Steps

### Phase 3: Integration into Tasks (In Progress)

*   [ ] **Update Task Creation UI**: Add `price` and `currency` fields to `CreateTaskModal.tsx`.
*   [ ] **Update Task Details UI**:
    *   Display Price in `TaskDetailDrawer.tsx` / `TaskDetailModal.tsx`.
    *   Add "Make Offer" / "Accept Offer" / "Pay" actions based on user role and contract status.
    *   Connect UI to `ContractService` API endpoints.

### Phase 4: Performer Interface

*   [ ] **My Wallet Page**: Create `/settings/wallet` or `/finance/earnings` for users.
    *   Show current balance.
    *   Withdrawal button (stub).
    *   Transaction history.

### Notes for Next Developer

*   The `ContractService` expects amounts in **cents** (integer), but `WalletService` internal logic (via `money.ts` utils) handles normalization.
*   The API endpoints handle conversion from "100.00" string to cents.
*   Ensure to export `walletService` and `contractService` in `apps/api/src/index.ts` (Done).
*   Check `apps/web/hooks/use-wallet.ts` (Not created yet, direct fetch used in client component). Consider refactoring to a hook if reused.
