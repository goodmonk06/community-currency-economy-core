import { Prisma } from '@prisma/client';

export interface TransferParams {
  communityId: string;
  currencyCode: string;
  fromAccountRef: AccountReference;
  toAccountRef: AccountReference;
  amount: number | string;
  reasonCode: string;
  metadata?: Record<string, any>;
}

export interface AccountReference {
  ownerType: 'member' | 'pool' | 'system';
  ownerRef: string;
}

export interface Balance {
  accountId: string;
  currencyId: string;
  currencyCode: string;
  balance: Prisma.Decimal;
  asOf: Date;
}

export interface TransferResult {
  ledgerEntryId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: Prisma.Decimal;
  newFromBalance: Prisma.Decimal;
  newToBalance: Prisma.Decimal;
}

export class InsufficientBalanceError extends Error {
  constructor(
    public accountId: string,
    public required: Prisma.Decimal,
    public available: Prisma.Decimal
  ) {
    super(
      `Insufficient balance. Required: ${required.toString()}, Available: ${available.toString()}`
    );
    this.name = 'InsufficientBalanceError';
  }
}

export class AccountNotFoundError extends Error {
  constructor(public accountRef: AccountReference) {
    super(
      `Account not found: ${accountRef.ownerType}:${accountRef.ownerRef}`
    );
    this.name = 'AccountNotFoundError';
  }
}

export class CurrencyNotFoundError extends Error {
  constructor(public communityId: string, public currencyCode: string) {
    super(`Currency not found: ${currencyCode} in community ${communityId}`);
    this.name = 'CurrencyNotFoundError';
  }
}

export class InvalidAmountError extends Error {
  constructor(amount: string) {
    super(`Invalid amount: ${amount}. Amount must be positive.`);
    this.name = 'InvalidAmountError';
  }
}
