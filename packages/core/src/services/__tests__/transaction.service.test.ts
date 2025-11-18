import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient, Prisma } from '@prisma/client';
import { TransactionService } from '../transaction.service';
import { CommunityService } from '../community.service';
import { BalanceService } from '../balance.service';
import {
  InsufficientBalanceError,
  InvalidAmountError,
  CurrencyNotFoundError,
} from '../../types';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/community_economy_test?schema=public',
    },
  },
});

describe('TransactionService', () => {
  let transactionService: TransactionService;
  let communityService: CommunityService;
  let balanceService: BalanceService;
  let testCommunityId: string;
  let testCurrencyCode: string;

  beforeAll(async () => {
    transactionService = new TransactionService(prisma);
    communityService = new CommunityService(prisma);
    balanceService = new BalanceService(prisma);
  });

  beforeEach(async () => {
    // Clean up database
    await prisma.ledgerEntry.deleteMany({});
    await prisma.balanceSnapshot.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.currency.deleteMany({});
    await prisma.community.deleteMany({});

    // Create test community and currency
    const community = await communityService.createCommunity(
      'test-community',
      'Test Community'
    );
    testCommunityId = community.id;

    const currency = await communityService.createCurrency(
      testCommunityId,
      'TEST',
      'Test Currency',
      'A test currency',
      2
    );
    testCurrencyCode = currency.code;

    // Create system account with initial balance
    await transactionService.grantBalance(
      testCommunityId,
      testCurrencyCode,
      { ownerType: 'system', ownerRef: 'treasury' },
      10000
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('transfer', () => {
    it('should successfully transfer funds between accounts', async () => {
      // Grant balance to Alice
      await transactionService.grantBalance(
        testCommunityId,
        testCurrencyCode,
        { ownerType: 'member', ownerRef: 'alice' },
        100
      );

      // Transfer from Alice to Bob
      const result = await transactionService.transfer({
        communityId: testCommunityId,
        currencyCode: testCurrencyCode,
        fromAccountRef: { ownerType: 'member', ownerRef: 'alice' },
        toAccountRef: { ownerType: 'member', ownerRef: 'bob' },
        amount: 30,
        reasonCode: 'test_transfer',
      });

      expect(result).toBeDefined();
      expect(result.amount).toEqual(new Prisma.Decimal(30));
      expect(result.newFromBalance).toEqual(new Prisma.Decimal(70));
      expect(result.newToBalance).toEqual(new Prisma.Decimal(30));
    });

    it('should throw InsufficientBalanceError when balance is too low', async () => {
      // Grant only 50 to Alice
      await transactionService.grantBalance(
        testCommunityId,
        testCurrencyCode,
        { ownerType: 'member', ownerRef: 'alice' },
        50
      );

      // Try to transfer 100 (more than available)
      await expect(
        transactionService.transfer({
          communityId: testCommunityId,
          currencyCode: testCurrencyCode,
          fromAccountRef: { ownerType: 'member', ownerRef: 'alice' },
          toAccountRef: { ownerType: 'member', ownerRef: 'bob' },
          amount: 100,
          reasonCode: 'test_transfer',
        })
      ).rejects.toThrow(InsufficientBalanceError);
    });

    it('should throw InvalidAmountError for negative amounts', async () => {
      await expect(
        transactionService.transfer({
          communityId: testCommunityId,
          currencyCode: testCurrencyCode,
          fromAccountRef: { ownerType: 'member', ownerRef: 'alice' },
          toAccountRef: { ownerType: 'member', ownerRef: 'bob' },
          amount: -10,
          reasonCode: 'test_transfer',
        })
      ).rejects.toThrow(InvalidAmountError);
    });

    it('should throw InvalidAmountError for zero amounts', async () => {
      await expect(
        transactionService.transfer({
          communityId: testCommunityId,
          currencyCode: testCurrencyCode,
          fromAccountRef: { ownerType: 'member', ownerRef: 'alice' },
          toAccountRef: { ownerType: 'member', ownerRef: 'bob' },
          amount: 0,
          reasonCode: 'test_transfer',
        })
      ).rejects.toThrow(InvalidAmountError);
    });

    it('should throw CurrencyNotFoundError for invalid currency', async () => {
      await expect(
        transactionService.transfer({
          communityId: testCommunityId,
          currencyCode: 'INVALID',
          fromAccountRef: { ownerType: 'member', ownerRef: 'alice' },
          toAccountRef: { ownerType: 'member', ownerRef: 'bob' },
          amount: 10,
          reasonCode: 'test_transfer',
        })
      ).rejects.toThrow(CurrencyNotFoundError);
    });

    it('should handle decimal amounts correctly', async () => {
      // Grant balance with decimals
      await transactionService.grantBalance(
        testCommunityId,
        testCurrencyCode,
        { ownerType: 'member', ownerRef: 'alice' },
        100.50
      );

      // Transfer decimal amount
      const result = await transactionService.transfer({
        communityId: testCommunityId,
        currencyCode: testCurrencyCode,
        fromAccountRef: { ownerType: 'member', ownerRef: 'alice' },
        toAccountRef: { ownerType: 'member', ownerRef: 'bob' },
        amount: 25.75,
        reasonCode: 'test_transfer',
      });

      expect(result.newFromBalance).toEqual(new Prisma.Decimal(74.75));
      expect(result.newToBalance).toEqual(new Prisma.Decimal(25.75));
    });

    it('should store metadata correctly', async () => {
      await transactionService.grantBalance(
        testCommunityId,
        testCurrencyCode,
        { ownerType: 'member', ownerRef: 'alice' },
        100
      );

      const metadata = {
        description: 'Payment for services',
        invoiceId: 'INV-123',
      };

      const result = await transactionService.transfer({
        communityId: testCommunityId,
        currencyCode: testCurrencyCode,
        fromAccountRef: { ownerType: 'member', ownerRef: 'alice' },
        toAccountRef: { ownerType: 'member', ownerRef: 'bob' },
        amount: 50,
        reasonCode: 'payment',
        metadata,
      });

      const ledgerEntry = await transactionService.getLedgerEntry(
        result.ledgerEntryId
      );

      expect(ledgerEntry).toBeDefined();
      expect(JSON.parse(ledgerEntry!.metadataJson!)).toEqual(metadata);
    });
  });

  describe('grantBalance', () => {
    it('should grant initial balance from system', async () => {
      const result = await transactionService.grantBalance(
        testCommunityId,
        testCurrencyCode,
        { ownerType: 'member', ownerRef: 'alice' },
        500,
        { note: 'Welcome bonus' }
      );

      expect(result).toBeDefined();
      expect(result.amount).toEqual(new Prisma.Decimal(500));
      expect(result.newToBalance).toEqual(new Prisma.Decimal(500));

      const ledgerEntry = await transactionService.getLedgerEntry(
        result.ledgerEntryId
      );
      expect(ledgerEntry?.reasonCode).toBe('initial_grant');
    });
  });

  describe('getLedger', () => {
    it('should retrieve ledger entries for a community', async () => {
      // Create some transactions
      await transactionService.grantBalance(
        testCommunityId,
        testCurrencyCode,
        { ownerType: 'member', ownerRef: 'alice' },
        100
      );

      await transactionService.grantBalance(
        testCommunityId,
        testCurrencyCode,
        { ownerType: 'member', ownerRef: 'bob' },
        200
      );

      const ledger = await transactionService.getLedger(testCommunityId);

      expect(ledger.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter ledger by account', async () => {
      // Grant to Alice
      const aliceGrant = await transactionService.grantBalance(
        testCommunityId,
        testCurrencyCode,
        { ownerType: 'member', ownerRef: 'alice' },
        100
      );

      // Grant to Bob
      await transactionService.grantBalance(
        testCommunityId,
        testCurrencyCode,
        { ownerType: 'member', ownerRef: 'bob' },
        200
      );

      // Get ledger for Alice's account only
      const ledger = await transactionService.getLedger(testCommunityId, {
        accountId: aliceGrant.toAccountId,
      });

      expect(ledger.length).toBeGreaterThan(0);
      expect(
        ledger.every(
          (entry) =>
            entry.fromAccountId === aliceGrant.toAccountId ||
            entry.toAccountId === aliceGrant.toAccountId
        )
      ).toBe(true);
    });
  });
});

describe('BalanceService', () => {
  let transactionService: TransactionService;
  let communityService: CommunityService;
  let balanceService: BalanceService;
  let testCommunityId: string;
  let testCurrencyCode: string;

  beforeAll(async () => {
    transactionService = new TransactionService(prisma);
    communityService = new CommunityService(prisma);
    balanceService = new BalanceService(prisma);
  });

  beforeEach(async () => {
    // Clean up
    await prisma.ledgerEntry.deleteMany({});
    await prisma.balanceSnapshot.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.currency.deleteMany({});
    await prisma.community.deleteMany({});

    // Setup
    const community = await communityService.createCommunity(
      'test-balance',
      'Test Balance'
    );
    testCommunityId = community.id;

    const currency = await communityService.createCurrency(
      testCommunityId,
      'TEST',
      'Test Currency'
    );
    testCurrencyCode = currency.code;

    await transactionService.grantBalance(
      testCommunityId,
      testCurrencyCode,
      { ownerType: 'system', ownerRef: 'treasury' },
      10000
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('getBalance', () => {
    it('should calculate balance correctly', async () => {
      // Grant 100 to Alice
      const grant = await transactionService.grantBalance(
        testCommunityId,
        testCurrencyCode,
        { ownerType: 'member', ownerRef: 'alice' },
        100
      );

      const currency = await communityService.getCurrency(
        testCommunityId,
        testCurrencyCode
      );

      const balance = await balanceService.getBalance(
        grant.toAccountId,
        currency!.id
      );

      expect(balance).toEqual(new Prisma.Decimal(100));
    });

    it('should reflect balance after multiple transactions', async () => {
      // Grant to Alice
      const grant = await transactionService.grantBalance(
        testCommunityId,
        testCurrencyCode,
        { ownerType: 'member', ownerRef: 'alice' },
        100
      );

      // Alice sends to Bob
      await transactionService.transfer({
        communityId: testCommunityId,
        currencyCode: testCurrencyCode,
        fromAccountRef: { ownerType: 'member', ownerRef: 'alice' },
        toAccountRef: { ownerType: 'member', ownerRef: 'bob' },
        amount: 30,
        reasonCode: 'test',
      });

      // Alice sends more to Bob
      await transactionService.transfer({
        communityId: testCommunityId,
        currencyCode: testCurrencyCode,
        fromAccountRef: { ownerType: 'member', ownerRef: 'alice' },
        toAccountRef: { ownerType: 'member', ownerRef: 'bob' },
        amount: 20,
        reasonCode: 'test',
      });

      const currency = await communityService.getCurrency(
        testCommunityId,
        testCurrencyCode
      );

      const balance = await balanceService.getBalance(
        grant.toAccountId,
        currency!.id
      );

      expect(balance).toEqual(new Prisma.Decimal(50));
    });
  });

  describe('createSnapshot', () => {
    it('should create a balance snapshot', async () => {
      const grant = await transactionService.grantBalance(
        testCommunityId,
        testCurrencyCode,
        { ownerType: 'member', ownerRef: 'alice' },
        100
      );

      const currency = await communityService.getCurrency(
        testCommunityId,
        testCurrencyCode
      );

      const snapshot = await balanceService.createSnapshot(
        grant.toAccountId,
        currency!.id
      );

      expect(snapshot).toBeDefined();
      expect(snapshot.balance).toEqual(new Prisma.Decimal(100));
    });
  });
});
