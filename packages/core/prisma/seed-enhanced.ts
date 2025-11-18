import { PrismaClient, Prisma } from '@prisma/client';
import {
  CommunityFactory,
  AccountFactory,
  TransactionFactory,
  AccountGroupFactory,
  TemplateFactory,
  ScenarioFactory,
} from '../src/test-utils/factories';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with enhanced Phase 3 data...\n');

  const scenarioFactory = new ScenarioFactory(prisma);

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario 1: Gamification & Rewards System
  // ══════════════════════════════════════════════════════════════════════════
  console.log('📊 Creating Gamification Scenario...');
  const gamificationScenario = await scenarioFactory.createGamificationScenario();

  console.log(`  ✅ Community: ${gamificationScenario.community.name}`);
  console.log(`  ✅ Currencies: ${gamificationScenario.currencies.length}`);
  console.log(`  ✅ Accounts: ${gamificationScenario.accounts.length + 2}`); // +system +pool
  console.log(`  ✅ Groups: ${Object.keys(gamificationScenario.groups).length}`);
  console.log(`  ✅ Templates: ${Object.keys(gamificationScenario.templates).length}`);

  // Create additional reward scenarios
  const karmaRewards = [
    { account: gamificationScenario.accounts[0], amount: 50, reason: 'answered_question' },
    { account: gamificationScenario.accounts[1], amount: 25, reason: 'posted_content' },
    { account: gamificationScenario.accounts[2], amount: 100, reason: 'completed_challenge' },
  ];

  for (const reward of karmaRewards) {
    await prisma.ledgerEntry.create({
      data: {
        communityId: gamificationScenario.community.id,
        currencyId: gamificationScenario.currencies[0].id,
        fromAccountId: gamificationScenario.rewardPool.id,
        toAccountId: reward.account.id,
        amount: new Prisma.Decimal(reward.amount),
        reasonCode: reward.reason,
        metadataJson: JSON.stringify({
          category: 'reward',
          timestamp: new Date().toISOString(),
        }),
      },
    });
  }
  console.log(`  ✅ Created ${karmaRewards.length} reward transactions\n`);

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario 2: Internal Marketplace
  // ══════════════════════════════════════════════════════════════════════════
  console.log('🛍️  Creating Marketplace Scenario...');

  const marketplace = await prisma.community.create({
    data: {
      slug: 'artisan-collective',
      name: 'Artisan Collective',
    },
  });

  const marketplaceCurrency = await prisma.currency.create({
    data: {
      communityId: marketplace.id,
      code: 'CREDITS',
      name: 'Artisan Credits',
      description: 'Internal marketplace currency',
      decimals: 2,
    },
  });

  // Create merchant and buyer accounts
  const systemAccount2 = await prisma.account.create({
    data: {
      communityId: marketplace.id,
      ownerType: 'system',
      ownerRef: 'treasury',
      displayName: 'System Treasury',
    },
  });

  const merchants = await Promise.all([
    prisma.account.create({
      data: {
        communityId: marketplace.id,
        ownerType: 'member',
        ownerRef: 'merchant_alice',
        displayName: 'Alice (Potter)',
      },
    }),
    prisma.account.create({
      data: {
        communityId: marketplace.id,
        ownerType: 'member',
        ownerRef: 'merchant_bob',
        displayName: 'Bob (Woodworker)',
      },
    }),
  ]);

  const buyers = await Promise.all([
    prisma.account.create({
      data: {
        communityId: marketplace.id,
        ownerType: 'member',
        ownerRef: 'buyer_charlie',
        displayName: 'Charlie',
      },
    }),
    prisma.account.create({
      data: {
        communityId: marketplace.id,
        ownerType: 'member',
        ownerRef: 'buyer_diana',
        displayName: 'Diana',
      },
    }),
  ]);

  // Create merchant and buyer groups
  const merchantGroup = await prisma.accountGroup.create({
    data: {
      communityId: marketplace.id,
      name: 'Merchants',
      description: 'Verified artisans and sellers',
    },
  });

  const buyerGroup = await prisma.accountGroup.create({
    data: {
      communityId: marketplace.id,
      name: 'Buyers',
      description: 'Active marketplace participants',
    },
  });

  for (const merchant of merchants) {
    await prisma.accountGroupMember.create({
      data: {
        groupId: merchantGroup.id,
        accountId: merchant.id,
        role: 'seller',
      },
    });
  }

  for (const buyer of buyers) {
    await prisma.accountGroupMember.create({
      data: {
        groupId: buyerGroup.id,
        accountId: buyer.id,
        role: 'buyer',
      },
    });
  }

  // Grant initial credits to all participants
  for (const account of [...merchants, ...buyers]) {
    await prisma.ledgerEntry.create({
      data: {
        communityId: marketplace.id,
        currencyId: marketplaceCurrency.id,
        fromAccountId: systemAccount2.id,
        toAccountId: account.id,
        amount: new Prisma.Decimal(1000),
        reasonCode: 'initial_grant',
        metadataJson: JSON.stringify({ note: 'Welcome credits' }),
      },
    });
  }

  // Create marketplace transactions
  const purchases = [
    { from: buyers[0], to: merchants[0], amount: 45.99, item: 'Handmade Bowl' },
    { from: buyers[1], to: merchants[1], amount: 125.00, item: 'Wooden Chair' },
    { from: buyers[0], to: merchants[1], amount: 32.50, item: 'Picture Frame' },
    { from: buyers[1], to: merchants[0], amount: 18.75, item: 'Coffee Mug' },
  ];

  for (const purchase of purchases) {
    await prisma.ledgerEntry.create({
      data: {
        communityId: marketplace.id,
        currencyId: marketplaceCurrency.id,
        fromAccountId: purchase.from.id,
        toAccountId: purchase.to.id,
        amount: new Prisma.Decimal(purchase.amount),
        reasonCode: 'purchase',
        metadataJson: JSON.stringify({
          itemName: purchase.item,
          category: 'handmade',
        }),
      },
    });
  }

  console.log(`  ✅ Community: ${marketplace.name}`);
  console.log(`  ✅ Merchants: ${merchants.length}`);
  console.log(`  ✅ Buyers: ${buyers.length}`);
  console.log(`  ✅ Purchases: ${purchases.length}\n`);

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario 3: Treasury & Grant Management
  // ══════════════════════════════════════════════════════════════════════════
  console.log('🏛️  Creating Treasury Management Scenario...');

  const dao = await prisma.community.create({
    data: {
      slug: 'community-dao',
      name: 'Community DAO',
    },
  });

  const governanceToken = await prisma.currency.create({
    data: {
      communityId: dao.id,
      code: 'GOV',
      name: 'Governance Token',
      description: 'Voting and governance rights',
      decimals: 0,
    },
  });

  const systemAccount3 = await prisma.account.create({
    data: {
      communityId: dao.id,
      ownerType: 'system',
      ownerRef: 'treasury',
      displayName: 'DAO Treasury',
    },
  });

  // Create grant pools
  const grantPools = await Promise.all([
    prisma.account.create({
      data: {
        communityId: dao.id,
        ownerType: 'pool',
        ownerRef: 'development_grants',
        displayName: 'Development Grants Pool',
      },
    }),
    prisma.account.create({
      data: {
        communityId: dao.id,
        ownerType: 'pool',
        ownerRef: 'community_grants',
        displayName: 'Community Grants Pool',
      },
    }),
  ]);

  // Fund the pools
  for (const pool of grantPools) {
    await prisma.ledgerEntry.create({
      data: {
        communityId: dao.id,
        currencyId: governanceToken.id,
        fromAccountId: systemAccount3.id,
        toAccountId: pool.id,
        amount: new Prisma.Decimal(50000),
        reasonCode: 'pool_funding',
        metadataJson: JSON.stringify({
          budgetCycle: 'Q1-2025',
        }),
      },
    });
  }

  // Create grantees
  const grantees = await Promise.all([
    prisma.account.create({
      data: {
        communityId: dao.id,
        ownerType: 'member',
        ownerRef: 'project_alpha',
        displayName: 'Project Alpha Team',
      },
    }),
    prisma.account.create({
      data: {
        communityId: dao.id,
        ownerType: 'member',
        ownerRef: 'project_beta',
        displayName: 'Project Beta Team',
      },
    }),
  ]);

  // Distribute grants
  await prisma.ledgerEntry.create({
    data: {
      communityId: dao.id,
      currencyId: governanceToken.id,
      fromAccountId: grantPools[0].id,
      toAccountId: grantees[0].id,
      amount: new Prisma.Decimal(15000),
      reasonCode: 'grant_disbursement',
      metadataJson: JSON.stringify({
        grantTitle: 'Mobile App Development',
        approvalDate: '2025-01-15',
      }),
    },
  });

  await prisma.ledgerEntry.create({
    data: {
      communityId: dao.id,
      currencyId: governanceToken.id,
      fromAccountId: grantPools[1].id,
      toAccountId: grantees[1].id,
      amount: new Prisma.Decimal(8000),
      reasonCode: 'grant_disbursement',
      metadataJson: JSON.stringify({
        grantTitle: 'Community Events Series',
        approvalDate: '2025-01-18',
      }),
    },
  });

  console.log(`  ✅ Community: ${dao.name}`);
  console.log(`  ✅ Grant Pools: ${grantPools.length}`);
  console.log(`  ✅ Grantees: ${grantees.length}\n`);

  // ══════════════════════════════════════════════════════════════════════════
  // Create Transaction Templates (reusable patterns)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('📋 Creating Transaction Templates...');

  const templates = await Promise.all([
    prisma.transactionTemplate.create({
      data: {
        communityId: gamificationScenario.community.id,
        name: 'Welcome Bonus',
        description: 'Automatic welcome bonus for new members',
        currencyId: gamificationScenario.currencies[0].id,
        fromPattern: 'system:treasury',
        toPattern: 'member:*',
        amountType: 'fixed',
        fixedAmount: new Prisma.Decimal(100),
        reasonCode: 'welcome_bonus',
        status: 'active',
      },
    }),
    prisma.transactionTemplate.create({
      data: {
        communityId: marketplace.id,
        name: 'Merchant Payout',
        description: 'Weekly merchant earnings payout',
        currencyId: marketplaceCurrency.id,
        fromPattern: 'system:treasury',
        toPattern: 'member:merchant_*',
        amountType: 'variable',
        reasonCode: 'weekly_payout',
        status: 'active',
      },
    }),
  ]);

  console.log(`  ✅ Created ${templates.length} transaction templates\n`);

  // ══════════════════════════════════════════════════════════════════════════
  // Create Transaction Policies (rules and limits)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('🔒 Creating Transaction Policies...');

  const policies = await Promise.all([
    prisma.transactionPolicy.create({
      data: {
        communityId: marketplace.id,
        name: 'Daily Purchase Limit',
        description: 'Maximum spending per day',
        policyType: 'daily_limit',
        currencyId: marketplaceCurrency.id,
        limitAmount: new Prisma.Decimal(500),
        timeWindow: '24h',
        active: true,
      },
    }),
    prisma.transactionPolicy.create({
      data: {
        communityId: dao.id,
        name: 'Large Grant Approval',
        description: 'Grants over 10K require approval',
        policyType: 'approval_required',
        currencyId: governanceToken.id,
        limitAmount: new Prisma.Decimal(10000),
        active: true,
      },
    }),
  ]);

  console.log(`  ✅ Created ${policies.length} transaction policies\n`);

  // ══════════════════════════════════════════════════════════════════════════
  // Create Audit Logs
  // ══════════════════════════════════════════════════════════════════════════
  console.log('📝 Creating Audit Logs...');

  const auditLogs = await Promise.all([
    prisma.auditLog.create({
      data: {
        communityId: gamificationScenario.community.id,
        entityType: 'community',
        entityId: gamificationScenario.community.id,
        action: 'create',
        actorType: 'system',
        actorRef: 'seed_script',
        metadataJson: JSON.stringify({ scenario: 'gamification' }),
      },
    }),
    prisma.auditLog.create({
      data: {
        communityId: marketplace.id,
        entityType: 'community',
        entityId: marketplace.id,
        action: 'create',
        actorType: 'system',
        actorRef: 'seed_script',
        metadataJson: JSON.stringify({ scenario: 'marketplace' }),
      },
    }),
    prisma.auditLog.create({
      data: {
        communityId: dao.id,
        entityType: 'community',
        entityId: dao.id,
        action: 'create',
        actorType: 'system',
        actorRef: 'seed_script',
        metadataJson: JSON.stringify({ scenario: 'treasury' }),
      },
    }),
  ]);

  console.log(`  ✅ Created ${auditLogs.length} audit log entries\n`);

  // ══════════════════════════════════════════════════════════════════════════
  // Summary
  // ══════════════════════════════════════════════════════════════════════════
  console.log('═'.repeat(60));
  console.log('🎉 Enhanced seeding completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   - Communities: 3`);
  console.log(`   - Scenarios: Gamification, Marketplace, Treasury`);
  console.log(`   - Account Groups: Multiple organized cohorts`);
  console.log(`   - Transaction Templates: ${templates.length}`);
  console.log(`   - Transaction Policies: ${policies.length}`);
  console.log(`   - Audit Logs: ${auditLogs.length}`);
  console.log(`\n✨ The system is ready for exploration and testing!`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
