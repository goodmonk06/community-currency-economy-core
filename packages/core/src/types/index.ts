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

// Re-export error classes from centralized errors module
export {
  InsufficientBalanceError,
  AccountNotFoundError,
  CurrencyNotFoundError,
  InvalidAmountError,
  ValidationError,
  NotFoundError,
  ConflictError,
  AppError,
} from '../lib/errors';
