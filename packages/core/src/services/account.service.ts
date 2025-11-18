import { PrismaClient, OwnerType } from '@prisma/client';
import { AccountReference, AccountNotFoundError } from '../types';

export class AccountService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get or create an account for a given owner reference
   */
  async getOrCreateAccount(
    communityId: string,
    accountRef: AccountReference,
    displayName?: string
  ) {
    const existing = await this.prisma.account.findUnique({
      where: {
        communityId_ownerType_ownerRef: {
          communityId,
          ownerType: accountRef.ownerType as OwnerType,
          ownerRef: accountRef.ownerRef,
        },
      },
    });

    if (existing) {
      return existing;
    }

    return await this.prisma.account.create({
      data: {
        communityId,
        ownerType: accountRef.ownerType as OwnerType,
        ownerRef: accountRef.ownerRef,
        displayName,
      },
    });
  }

  /**
   * Get an existing account
   */
  async getAccount(communityId: string, accountRef: AccountReference) {
    const account = await this.prisma.account.findUnique({
      where: {
        communityId_ownerType_ownerRef: {
          communityId,
          ownerType: accountRef.ownerType as OwnerType,
          ownerRef: accountRef.ownerRef,
        },
      },
    });

    if (!account) {
      throw new AccountNotFoundError(accountRef);
    }

    return account;
  }

  /**
   * Get account by ID
   */
  async getAccountById(accountId: string) {
    return await this.prisma.account.findUnique({
      where: { id: accountId },
      include: {
        community: true,
      },
    });
  }

  /**
   * List all accounts in a community
   */
  async listAccounts(communityId: string) {
    return await this.prisma.account.findMany({
      where: { communityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a new account
   */
  async createAccount(
    communityId: string,
    accountRef: AccountReference,
    displayName?: string
  ) {
    return await this.prisma.account.create({
      data: {
        communityId,
        ownerType: accountRef.ownerType as OwnerType,
        ownerRef: accountRef.ownerRef,
        displayName,
      },
    });
  }
}
