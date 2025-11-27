import { contractsRepository } from '../repositories/contracts-repository';
import { walletService } from './wallet-service';
import { walletRepository } from '../repositories/wallet-repository';
import { tasksRepository } from '../repositories/tasks-repository';
import { centsToAmount } from '../utils/money';

export class ContractService {
    async createOffer(taskId: string, performerId: string, organizationId: string, amount: number, currency: 'RUB' | 'USD' = 'RUB') {
        // 1. Validate
        // Check if task exists (in memory repo)
        const task = tasksRepository.findById(taskId);
        if (!task) throw new Error('Task not found');

        // Check if contract already exists
        const existing = await contractsRepository.findByTask(taskId);
        if (existing) throw new Error('Contract already exists for this task');

        // 2. Create Contract (Status: Offer)
        const contract = await contractsRepository.create({
            taskId,
            performerId,
            organizationId,
            amount: amount, // Assumed to be passed in cents (number/bigint)
            currency,
            status: 'offer'
        });

        return contract;
    }

    async acceptOffer(contractId: string, userId: string) {
        const contract = await contractsRepository.findById(contractId);
        if (!contract) throw new Error('Contract not found');

        if (contract.performerId !== userId) throw new Error('Unauthorized');
        if (contract.status !== 'offer') throw new Error('Invalid contract status');

        // Update status
        return contractsRepository.updateStatus(contractId, 'accepted');
    }

    async fundContract(contractId: string, _actorId: string) {
        void _actorId;
        const contract = await contractsRepository.findById(contractId);
        if (!contract) throw new Error('Contract not found');

        // Verify actor is organization owner/admin (assuming checked by route)

        if (contract.status !== 'accepted') throw new Error('Contract must be accepted before funding');

        // Hold funds
        // contract.amount is in cents. walletService.holdFunds takes "amount" string (e.g. "10.00")
        const amountString = centsToAmount(BigInt(contract.amount));

        await walletService.holdFunds(
            contract.organizationId,
            'organization',
            amountString,
            contract.id,
            'contract'
        );

        // Update status
        return contractsRepository.updateStatus(contractId, 'funded');
    }

    async completeContract(contractId: string, _actorId: string) {
        void _actorId;
        const contract = await contractsRepository.findById(contractId);
        if (!contract) throw new Error('Contract not found');

        if (contract.status !== 'funded') throw new Error('Contract not funded');

        // Find the hold transaction
        const holdTx = await walletRepository.findTransactionByReference(
            contract.id,
            'contract',
            'payment',
            'pending'
        );

        if (!holdTx) {
            throw new Error('Hold transaction not found');
        }

        // Release funds to performer
        await walletService.releaseFunds(
            holdTx.id,
            contract.performerId,
            'user'
        );

        // Update status
        return contractsRepository.updateStatus(contractId, 'paid');
    }
}

export const contractService = new ContractService();
