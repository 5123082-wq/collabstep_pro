import { db } from '../db/config';
import { walletRepository, WalletType } from '../repositories/wallet-repository';
import { amountToCents, centsToAmount, normalizeAmount } from '../utils/money';

export class WalletService {
    async getBalance(entityId: string, entityType: WalletType) {
        let wallet = await walletRepository.findByEntity(entityId, entityType);
        if (!wallet) {
            wallet = await walletRepository.createWallet(entityId, entityType);
            if (!wallet) {
                throw new Error('Failed to create wallet');
            }
        }
        return {
            cents: wallet.balance,
            amount: centsToAmount(BigInt(wallet.balance)),
            currency: wallet.currency
        };
    }

    async topUp(entityId: string, entityType: WalletType, amount: string | number, sourceRef?: string) {
        const normalizedAmount = normalizeAmount(amount);
        const cents = Number(amountToCents(normalizedAmount));

        if (cents <= 0) {
            throw new Error("Amount must be positive");
        }

        return db.transaction(async (tx) => {
            let wallet = await walletRepository.findByEntity(entityId, entityType, tx);
            if (!wallet) {
                wallet = await walletRepository.createWallet(entityId, entityType, 'RUB', tx);
                if (!wallet) {
                    throw new Error('Failed to create wallet');
                }
            }

            // Create Transaction
            const transaction = await walletRepository.createTransaction({
                walletId: wallet.id,
                type: 'deposit',
                amount: cents,
                status: 'completed',
                referenceId: sourceRef,
                metadata: { source: 'top_up' }
            }, tx);

            // Update Balance
            const updatedWallet = await walletRepository.updateBalance(wallet.id, cents, tx);
            if (!updatedWallet) {
                throw new Error('Failed to update wallet balance');
            }

            return {
                transaction,
                newBalance: centsToAmount(BigInt(updatedWallet.balance))
            };
        });
    }

    async holdFunds(
        entityId: string,
        entityType: WalletType,
        amount: string | number,
        referenceId: string,
        referenceType: 'project' | 'task' | 'contract' | 'stripe_charge'
    ) {
        const normalizedAmount = normalizeAmount(amount);
        const cents = Number(amountToCents(normalizedAmount));

        if (cents <= 0) {
            throw new Error("Amount must be positive");
        }

        return db.transaction(async (tx) => {
            const wallet = await walletRepository.findByEntity(entityId, entityType, tx);
            if (!wallet) {
                throw new Error("Wallet not found");
            }

            if (wallet.balance < cents) {
                throw new Error("Insufficient funds");
            }

            // Deduct funds (Create negative balance change)
            const updatedWallet = await walletRepository.updateBalance(wallet.id, -cents, tx);
            if (!updatedWallet) {
                throw new Error('Failed to update wallet balance');
            }

            // Create Transaction Record (Pending Payment)
            const transaction = await walletRepository.createTransaction({
                walletId: wallet.id,
                type: 'payment',
                amount: -cents, // Stored as negative for debit
                status: 'pending', // Pending means "Held" in this context
                referenceId,
                referenceType,
                metadata: { action: 'hold_funds' }
            }, tx);

            return {
                transaction,
                remainingBalance: centsToAmount(BigInt(updatedWallet.balance))
            };
        });
    }

    async releaseFunds(
        holdTransactionId: string,
        receiverId: string,
        receiverType: WalletType
    ) {
        return db.transaction(async (tx) => {
            const holdTx = await walletRepository.findTransactionById(holdTransactionId, tx);
            if (!holdTx) {
                throw new Error("Transaction not found");
            }
            if (holdTx.type !== 'payment' || holdTx.status !== 'pending') {
                throw new Error("Invalid hold transaction");
            }

            // Mark hold transaction as completed (Sender has paid)
            await walletRepository.updateTransactionStatus(holdTx.id, 'completed', tx);

            // Credit Receiver
            let receiverWallet = await walletRepository.findByEntity(receiverId, receiverType, tx);
            if (!receiverWallet) {
                receiverWallet = await walletRepository.createWallet(receiverId, receiverType, 'RUB', tx);
                if (!receiverWallet) {
                    throw new Error('Failed to create receiver wallet');
                }
            }

            const amount = Math.abs(holdTx.amount); // Should be positive for credit

            const creditTx = await walletRepository.createTransaction({
                walletId: receiverWallet.id,
                type: 'deposit',
                amount: amount,
                status: 'completed',
                referenceId: holdTx.referenceId,
                referenceType: holdTx.referenceType,
                metadata: {
                    source_transaction_id: holdTx.id,
                    action: 'release_funds'
                }
            }, tx);

            const updatedReceiver = await walletRepository.updateBalance(receiverWallet.id, amount, tx);
            if (!updatedReceiver) {
                throw new Error('Failed to update receiver wallet balance');
            }

            return {
                transaction: creditTx,
                amount: centsToAmount(BigInt(amount)),
                receiverBalance: centsToAmount(BigInt(updatedReceiver.balance))
            };
        });
    }
}

export const walletService = new WalletService();
