import { db } from '../db/config';
import type { Database } from '../db/config';
import { wallets, transactions } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
type DbTx = Parameters<Parameters<Database['transaction']>[0]>[0];
type DbOrTx = Database | DbTx;
type WalletRecord = typeof wallets.$inferSelect;
type TransactionRecord = typeof transactions.$inferSelect;

export type WalletType = 'user' | 'organization';
export type Currency = 'USD' | 'RUB';
export type TransactionType = 'deposit' | 'withdrawal' | 'payment' | 'refund' | 'payout';

export class WalletRepository {
    async createWallet(entityId: string, entityType: WalletType, currency: Currency = 'RUB', tx: DbOrTx = db): Promise<WalletRecord | null> {
        const [wallet] = await tx.insert(wallets).values({
            entityId,
            entityType,
            currency,
            balance: 0,
            status: 'active'
        }).returning();
        return wallet ?? null;
    }

    async findByEntity(entityId: string, entityType: WalletType, tx: DbOrTx = db): Promise<WalletRecord | null> {
        const [wallet] = await tx.select().from(wallets).where(
            and(eq(wallets.entityId, entityId), eq(wallets.entityType, entityType))
        );
        return wallet || null;
    }

    async getById(id: string, tx: DbOrTx = db): Promise<WalletRecord | null> {
        const [wallet] = await tx.select().from(wallets).where(eq(wallets.id, id));
        return wallet || null;
    }

    async createTransaction(data: typeof transactions.$inferInsert, tx: DbOrTx = db): Promise<TransactionRecord | null> {
        const [transaction] = await tx.insert(transactions).values(data).returning();
        return transaction ?? null;
    }

    async findTransactionById(id: string, tx: DbOrTx = db): Promise<TransactionRecord | null> {
        const [transaction] = await tx.select().from(transactions).where(eq(transactions.id, id));
        return transaction || null;
    }

    async findTransactionByReference(
        referenceId: string,
        referenceType: string,
        type: TransactionType,
        status: typeof transactions.$inferSelect.status,
        tx: DbOrTx = db
    ): Promise<TransactionRecord | null> {
        const [transaction] = await tx.select().from(transactions).where(
            and(
                eq(transactions.referenceId, referenceId),
                eq(transactions.referenceType, referenceType),
                eq(transactions.type, type),
                eq(transactions.status, status)
            )
        );
        return transaction || null;
    }

    async updateTransactionStatus(id: string, status: typeof transactions.$inferSelect.status, tx: DbOrTx = db): Promise<TransactionRecord | null> {
        const [updated] = await tx.update(transactions)
            .set({ status, updatedAt: new Date() })
            .where(eq(transactions.id, id))
            .returning();
        return updated ?? null;
    }

    async updateBalance(walletId: string, deltaCents: number, tx: DbOrTx = db): Promise<WalletRecord | null> {
        const [updated] = await tx.update(wallets)
            .set({
                balance: sql`${wallets.balance} + ${deltaCents}`,
                updatedAt: new Date()
            })
            .where(eq(wallets.id, walletId))
            .returning();
        return updated ?? null;
    }
}

export const walletRepository = new WalletRepository();
