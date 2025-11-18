/**
 * Test factories for creating test data
 * These factories make it easy to create test entities with sensible defaults
 */

import { PrismaClient, Prisma, OwnerType } from '@prisma/client';

export class CommunityFactory {
  constructor(private prisma: PrismaClient) {}

  async create(data?: {
    slug?: string;
    name?: string;
  }) {
    const slug = data?.slug || `community-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const name = data?.name || `Test Community ${slug}`;

    return await this.prisma.community.create({
      data: {
        slug,
        name,
      },
    });
  }

  async createWithCurrencies(currencyCodes: string[] = ['KARMA', 'COINS']) {
    const community = await this.create();
    const currencies = [];

    for (const code of currencyCodes) {
      const currency = await this.prisma.currency.create({
        data: {
          communityId: community.id,
          code,
          name: `${code} Token`,
          description: `Test ${code} currency`,
          decimals: code === 'COINS' ? 2 : 0,
        },
      });
      currencies.push(currency);
    }

    return { community, currencies };
  }
}

export class CurrencyFactory {
  constructor(private prisma: PrismaClient) {}

  async create(
    communityId: string,
    data?: {
      code?: string;
      name?: string;
      decimals?: number;
    }
  ) {
    const code = data?.code || `TST${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    const name = data?.name || `Test ${code}`;
    const decimals = data?.decimals ?? 0;

    return await this.prisma.currency.create({
      data: {
        communityId,
        code,
        name,
        decimals,
      },
    });
  }
}

export class AccountFactory {
  constructor(private prisma: PrismaClient) {}

  async create(
    communityId: string,
    data?: {
      ownerType?: OwnerType;
      ownerRef?: string;
      displayName?: string;
    }
  ) {
    const ownerType = data?.ownerType || 'member';
    const ownerRef = data?.ownerRef || `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const displayName = data?.displayName || `Test ${ownerType} ${ownerRef}`;

    return await this.prisma.account.create({
      data: {
        communityId,
        ownerType,
        ownerRef,
        displayName,
      },
    });
  }

  async createMany(communityId: string, count: number, ownerType: OwnerType = 'member') {
    const accounts = [];
    for (let i = 0; i < count; i++) {
      const account = await this.create(communityId, {
        ownerType,
        ownerRef: `${ownerType}_${i + 1}`,
        displayName: `Test ${ownerType} ${i + 1}`,
      });
      accounts.push(account);
    }
    return accounts;
  }

  async createSystemAccount(communityId: string, ref: string = 'treasury') {
    return await this.create(communityId, {
      ownerType: 'system',
      ownerRef: ref,
      displayName: `System ${ref}`,
    });
  }

  async createPoolAccount(communityId: string, ref: string = 'reward_pool') {
    return await this.create(communityId, {
      ownerType: 'pool',
      ownerRef: ref,
      displayName: `Pool ${ref}`,
    });
  }
}

export class TransactionFactory {
  constructor(private prisma: PrismaClient) {}

  async createLedgerEntry(
    communityId: string,
    currencyId: string,
    fromAccountId: string,
    toAccountId: string,
    data?: {
      amount?: number | string;
      reasonCode?: string;
      metadata?: Record<string, any>;
    }
  ) {
    const amount = data?.amount || 100;
    const reasonCode = data?.reasonCode || 'test_transfer';

    return await this.prisma.ledgerEntry.create({
      data: {
        communityId,
        currencyId,
        fromAccountId,
        toAccountId,
        amount: new Prisma.Decimal(amount),
        reasonCode,
        metadataJson: data?.metadata ? JSON.stringify(data.metadata) : null,
      },
    });
  }

  async createTransferChain(
    communityId: string,
    currencyId: string,
    accounts: string[],
    amount: number = 50
  ) {
    const entries = [];

    for (let i = 0; i < accounts.length - 1; i++) {
      const entry = await this.createLedgerEntry(
        communityId,
        currencyId,
        accounts[i],
        accounts[i + 1],
        { amount }
      );
      entries.push(entry);
    }

    return entries;
  }
}

export class AccountGroupFactory {
  constructor(private prisma: PrismaClient) {}

  async create(
    communityId: string,
    data?: {
      name?: string;
      description?: string;
      parentId?: string;
    }
  ) {
    const name = data?.name || `Group ${Date.now()}`;

    return await this.prisma.accountGroup.create({
      data: {
        communityId,
        name,
        description: data?.description,
        parentId: data?.parentId,
      },
    });
  }

  async createWithMembers(
    communityId: string,
    accountIds: string[],
    groupName?: string
  ) {
    const group = await this.create(communityId, { name: groupName });

    const memberships = [];
    for (const accountId of accountIds) {
      const membership = await this.prisma.accountGroupMember.create({
        data: {
          groupId: group.id,
          accountId,
        },
      });
      memberships.push(membership);
    }

    return { group, memberships };
  }
}

export class TemplateFactory {
  constructor(private prisma: PrismaClient) {}

  async create(
    communityId: string,
    currencyId: string,
    data?: {
      name?: string;
      fromPattern?: string;
      toPattern?: string;
      fixedAmount?: number;
    }
  ) {
    const name = data?.name || `Template ${Date.now()}`;

    return await this.prisma.transactionTemplate.create({
      data: {
        communityId,
        currencyId,
        name,
        fromPattern: data?.fromPattern || 'system:treasury',
        toPattern: data?.toPattern || 'member:*',
        amountType: data?.fixedAmount ? 'fixed' : 'variable',
        fixedAmount: data?.fixedAmount,
        reasonCode: 'template_transfer',
      },
    });
  }
}

/**
 * Factory builder for creating complete test scenarios
 */
export class ScenarioFactory {
  private prisma: PrismaClient;
  private communityFactory: CommunityFactory;
  private currencyFactory: CurrencyFactory;
  private accountFactory: AccountFactory;
  private transactionFactory: TransactionFactory;
  private groupFactory: AccountGroupFactory;
  private templateFactory: TemplateFactory;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.communityFactory = new CommunityFactory(prisma);
    this.currencyFactory = new CurrencyFactory(prisma);
    this.accountFactory = new AccountFactory(prisma);
    this.transactionFactory = new TransactionFactory(prisma);
    this.groupFactory = new AccountGroupFactory(prisma);
    this.templateFactory = new TemplateFactory(prisma);
  }

  /**
   * Create a complete economy with community, currencies, accounts, and initial grants
   */
  async createBasicEconomy() {
    const { community, currencies } = await this.communityFactory.createWithCurrencies();
    const systemAccount = await this.accountFactory.createSystemAccount(community.id);
    const accounts = await this.accountFactory.createMany(community.id, 3);

    // Grant initial balances
    const grants = [];
    for (const account of accounts) {
      for (const currency of currencies) {
        const grant = await this.transactionFactory.createLedgerEntry(
          community.id,
          currency.id,
          systemAccount.id,
          account.id,
          { amount: 1000, reasonCode: 'initial_grant' }
        );
        grants.push(grant);
      }
    }

    return {
      community,
      currencies,
      systemAccount,
      accounts,
      grants,
    };
  }

  /**
   * Create a gamification scenario with reward pools and groups
   */
  async createGamificationScenario() {
    const economy = await this.createBasicEconomy();
    const rewardPool = await this.accountFactory.createPoolAccount(
      economy.community.id,
      'reward_pool'
    );

    // Grant pool initial balance
    await this.transactionFactory.createLedgerEntry(
      economy.community.id,
      economy.currencies[0].id,
      economy.systemAccount.id,
      rewardPool.id,
      { amount: 10000, reasonCode: 'pool_funding' }
    );

    // Create user groups
    const { group: powerUsers } = await this.groupFactory.createWithMembers(
      economy.community.id,
      [economy.accounts[0].id],
      'Power Users'
    );

    const { group: newUsers } = await this.groupFactory.createWithMembers(
      economy.community.id,
      [economy.accounts[1].id, economy.accounts[2].id],
      'New Users'
    );

    // Create reward templates
    const dailyRewardTemplate = await this.templateFactory.create(
      economy.community.id,
      economy.currencies[0].id,
      {
        name: 'Daily Login Reward',
        fromPattern: 'pool:reward_pool',
        toPattern: 'member:*',
        fixedAmount: 10,
      }
    );

    return {
      ...economy,
      rewardPool,
      groups: { powerUsers, newUsers },
      templates: { dailyRewardTemplate },
    };
  }

  get communities() {
    return this.communityFactory;
  }

  get currencies() {
    return this.currencyFactory;
  }

  get accounts() {
    return this.accountFactory;
  }

  get transactions() {
    return this.transactionFactory;
  }

  get groups() {
    return this.groupFactory;
  }

  get templates() {
    return this.templateFactory;
  }
}
