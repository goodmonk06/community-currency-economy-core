import { PrismaClient, Prisma } from '@prisma/client';
import { Balance } from '../types';

export class BalanceService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Calculate real-time balance for an account in a specific currency
   */
  async getBalance(
    accountId: string,
    currencyId: string
  ): Promise<Prisma.Decimal> {
    // Sum all incoming transactions
    const incoming = await this.prisma.ledgerEntry.aggregate({
      where: {
        toAccountId: accountId,
        currencyId,
      },
      _sum: {
        amount: true,
      },
    });

    // Sum all outgoing transactions
    const outgoing = await this.prisma.ledgerEntry.aggregate({
      where: {
        fromAccountId: accountId,
        currencyId,
      },
      _sum: {
        amount: true,
      },
    });

    const incomingSum = incoming._sum.amount || new Prisma.Decimal(0);
    const outgoingSum = outgoing._sum.amount || new Prisma.Decimal(0);

    return incomingSum.minus(outgoingSum);
  }

  /**
   * Get balances for all currencies in an account
   */
  async getAllBalances(accountId: string): Promise<Balance[]> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: {
        community: {
          include: {
            currencies: true,
          },
        },
      },
    });

    if (!account) {
      return [];
    }

    const balances: Balance[] = [];
    const now = new Date();

    for (const currency of account.community.currencies) {
      const balance = await this.getBalance(accountId, currency.id);
      balances.push({
        accountId,
        currencyId: currency.id,
        currencyCode: currency.code,
        balance,
        asOf: now,
      });
    }

    return balances;
  }

  /**
   * Create a balance snapshot for an account and currency
   */
  async createSnapshot(accountId: string, currencyId: string) {
    const balance = await this.getBalance(accountId, currencyId);

    return await this.prisma.balanceSnapshot.create({
      data: {
        accountId,
        currencyId,
        balance,
        takenAt: new Date(),
      },
    });
  }

  /**
   * Create snapshots for all accounts in a community
   */
  async createSnapshotsForCommunity(communityId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { communityId },
    });

    const currencies = await this.prisma.currency.findMany({
      where: { communityId },
    });

    const snapshots = [];

    for (const account of accounts) {
      for (const currency of currencies) {
        const snapshot = await this.createSnapshot(account.id, currency.id);
        snapshots.push(snapshot);
      }
    }

    return snapshots;
  }

  /**
   * Get the latest snapshot for an account and currency
   */
  async getLatestSnapshot(accountId: string, currencyId: string) {
    return await this.prisma.balanceSnapshot.findFirst({
      where: {
        accountId,
        currencyId,
      },
      orderBy: {
        takenAt: 'desc',
      },
    });
  }
}
