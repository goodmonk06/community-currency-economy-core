import { PrismaClient, Prisma } from '@prisma/client';
import {
  TransferParams,
  TransferResult,
  InsufficientBalanceError,
  CurrencyNotFoundError,
  InvalidAmountError,
  AccountReference,
} from '../types';
import { AccountService } from './account.service';
import { BalanceService } from './balance.service';

export class TransactionService {
  private accountService: AccountService;
  private balanceService: BalanceService;

  constructor(private prisma: PrismaClient) {
    this.accountService = new AccountService(prisma);
    this.balanceService = new BalanceService(prisma);
  }

  /**
   * Execute a transfer using double-entry bookkeeping
   * All transfers are atomic and include balance validation
   */
  async transfer(params: TransferParams): Promise<TransferResult> {
    const {
      communityId,
      currencyCode,
      fromAccountRef,
      toAccountRef,
      amount,
      reasonCode,
      metadata,
    } = params;

    // Validate amount
    const amountDecimal = new Prisma.Decimal(amount);
    if (amountDecimal.lessThanOrEqualTo(0)) {
      throw new InvalidAmountError(amountDecimal.toString());
    }

    // Use transaction to ensure atomicity
    return await this.prisma.$transaction(async (tx) => {
      // Get or create a temporary transaction service with the tx client
      const txAccountService = new AccountService(tx as any);
      const txBalanceService = new BalanceService(tx as any);

      // Get currency
      const currency = await tx.currency.findUnique({
        where: {
          communityId_code: {
            communityId,
            code: currencyCode,
          },
        },
      });

      if (!currency) {
        throw new CurrencyNotFoundError(communityId, currencyCode);
      }

      // Get or create accounts
      const fromAccount = await txAccountService.getOrCreateAccount(
        communityId,
        fromAccountRef
      );
      const toAccount = await txAccountService.getOrCreateAccount(
        communityId,
        toAccountRef
      );

      // Check sufficient balance
      const currentBalance = await txBalanceService.getBalance(
        fromAccount.id,
        currency.id
      );

      if (currentBalance.lessThan(amountDecimal)) {
        throw new InsufficientBalanceError(
          fromAccount.id,
          amountDecimal,
          currentBalance
        );
      }

      // Create ledger entry
      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          communityId,
          currencyId: currency.id,
          fromAccountId: fromAccount.id,
          toAccountId: toAccount.id,
          amount: amountDecimal,
          reasonCode,
          metadataJson: metadata ? JSON.stringify(metadata) : null,
        },
      });

      // Calculate new balances
      const newFromBalance = await txBalanceService.getBalance(
        fromAccount.id,
        currency.id
      );
      const newToBalance = await txBalanceService.getBalance(
        toAccount.id,
        currency.id
      );

      return {
        ledgerEntryId: ledgerEntry.id,
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
        amount: amountDecimal,
        newFromBalance,
        newToBalance,
      };
    });
  }

  /**
   * Get ledger entries for a community
   */
  async getLedger(
    communityId: string,
    options?: {
      accountId?: string;
      currencyId?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    const where: any = { communityId };

    if (options?.accountId) {
      where.OR = [
        { fromAccountId: options.accountId },
        { toAccountId: options.accountId },
      ];
    }

    if (options?.currencyId) {
      where.currencyId = options.currencyId;
    }

    return await this.prisma.ledgerEntry.findMany({
      where,
      include: {
        currency: true,
        fromAccount: true,
        toAccount: true,
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 100,
      skip: options?.offset || 0,
    });
  }

  /**
   * Get a specific ledger entry
   */
  async getLedgerEntry(id: string) {
    return await this.prisma.ledgerEntry.findUnique({
      where: { id },
      include: {
        currency: true,
        fromAccount: true,
        toAccount: true,
        community: true,
      },
    });
  }

  /**
   * Grant initial balance to an account (from system)
   */
  async grantBalance(
    communityId: string,
    currencyCode: string,
    toAccountRef: AccountReference,
    amount: number | string,
    metadata?: Record<string, any>
  ): Promise<TransferResult> {
    // System account reference
    const systemAccountRef: AccountReference = {
      ownerType: 'system',
      ownerRef: 'treasury',
    };

    return await this.transfer({
      communityId,
      currencyCode,
      fromAccountRef: systemAccountRef,
      toAccountRef,
      amount,
      reasonCode: 'initial_grant',
      metadata,
    });
  }
}
