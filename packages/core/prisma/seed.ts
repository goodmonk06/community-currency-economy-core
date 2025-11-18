import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo community
  const community = await prisma.community.upsert({
    where: { slug: 'demo-community' },
    update: {},
    create: {
      slug: 'demo-community',
      name: 'Demo Community',
    },
  });
  console.log(`✅ Created community: ${community.name}`);

  // Create currencies
  const karmaCurrency = await prisma.currency.upsert({
    where: {
      communityId_code: {
        communityId: community.id,
        code: 'KARMA',
      },
    },
    update: {},
    create: {
      communityId: community.id,
      code: 'KARMA',
      name: 'Karma Points',
      description: 'Earned through community contributions',
      decimals: 0,
    },
  });
  console.log(`✅ Created currency: ${karmaCurrency.code}`);

  const coinsCurrency = await prisma.currency.upsert({
    where: {
      communityId_code: {
        communityId: community.id,
        code: 'COINS',
      },
    },
    update: {},
    create: {
      communityId: community.id,
      code: 'COINS',
      name: 'Community Coins',
      description: 'Tradeable currency for marketplace',
      decimals: 2,
    },
  });
  console.log(`✅ Created currency: ${coinsCurrency.code}`);

  const blessingsCurrency = await prisma.currency.upsert({
    where: {
      communityId_code: {
        communityId: community.id,
        code: 'BLESSINGS',
      },
    },
    update: {},
    create: {
      communityId: community.id,
      code: 'BLESSINGS',
      name: 'Blessings',
      description: 'Given for spiritual and emotional support',
      decimals: 0,
    },
  });
  console.log(`✅ Created currency: ${blessingsCurrency.code}`);

  // Create system pool account (acts as treasury)
  const systemAccount = await prisma.account.upsert({
    where: {
      communityId_ownerType_ownerRef: {
        communityId: community.id,
        ownerType: 'system',
        ownerRef: 'treasury',
      },
    },
    update: {},
    create: {
      communityId: community.id,
      ownerType: 'system',
      ownerRef: 'treasury',
      displayName: 'System Treasury',
    },
  });
  console.log(`✅ Created system account: ${systemAccount.displayName}`);

  // Create member accounts
  const alice = await prisma.account.upsert({
    where: {
      communityId_ownerType_ownerRef: {
        communityId: community.id,
        ownerType: 'member',
        ownerRef: 'user_alice',
      },
    },
    update: {},
    create: {
      communityId: community.id,
      ownerType: 'member',
      ownerRef: 'user_alice',
      displayName: 'Alice',
    },
  });
  console.log(`✅ Created member account: ${alice.displayName}`);

  const bob = await prisma.account.upsert({
    where: {
      communityId_ownerType_ownerRef: {
        communityId: community.id,
        ownerType: 'member',
        ownerRef: 'user_bob',
      },
    },
    update: {},
    create: {
      communityId: community.id,
      ownerType: 'member',
      ownerRef: 'user_bob',
      displayName: 'Bob',
    },
  });
  console.log(`✅ Created member account: ${bob.displayName}`);

  const charlie = await prisma.account.upsert({
    where: {
      communityId_ownerType_ownerRef: {
        communityId: community.id,
        ownerType: 'member',
        ownerRef: 'user_charlie',
      },
    },
    update: {},
    create: {
      communityId: community.id,
      ownerType: 'member',
      ownerRef: 'user_charlie',
      displayName: 'Charlie',
    },
  });
  console.log(`✅ Created member account: ${charlie.displayName}`);

  // Create a pool account
  const rewardPool = await prisma.account.upsert({
    where: {
      communityId_ownerType_ownerRef: {
        communityId: community.id,
        ownerType: 'pool',
        ownerRef: 'reward_pool',
      },
    },
    update: {},
    create: {
      communityId: community.id,
      ownerType: 'pool',
      ownerRef: 'reward_pool',
      displayName: 'Reward Pool',
    },
  });
  console.log(`✅ Created pool account: ${rewardPool.displayName}`);

  // Create initial grants from system to members (KARMA)
  const karmaGrants = [
    { account: alice, amount: new Prisma.Decimal(100) },
    { account: bob, amount: new Prisma.Decimal(150) },
    { account: charlie, amount: new Prisma.Decimal(75) },
    { account: rewardPool, amount: new Prisma.Decimal(1000) },
  ];

  for (const grant of karmaGrants) {
    await prisma.ledgerEntry.create({
      data: {
        communityId: community.id,
        currencyId: karmaCurrency.id,
        fromAccountId: systemAccount.id,
        toAccountId: grant.account.id,
        amount: grant.amount,
        reasonCode: 'initial_grant',
        metadataJson: JSON.stringify({
          note: 'Initial karma allocation',
        }),
      },
    });
  }
  console.log(`✅ Created ${karmaGrants.length} initial KARMA grants`);

  // Create initial grants (COINS)
  const coinsGrants = [
    { account: alice, amount: new Prisma.Decimal(50.25) },
    { account: bob, amount: new Prisma.Decimal(100.50) },
    { account: charlie, amount: new Prisma.Decimal(25.75) },
  ];

  for (const grant of coinsGrants) {
    await prisma.ledgerEntry.create({
      data: {
        communityId: community.id,
        currencyId: coinsCurrency.id,
        fromAccountId: systemAccount.id,
        toAccountId: grant.account.id,
        amount: grant.amount,
        reasonCode: 'initial_grant',
        metadataJson: JSON.stringify({
          note: 'Initial coins allocation',
        }),
      },
    });
  }
  console.log(`✅ Created ${coinsGrants.length} initial COINS grants`);

  // Create some demo transactions
  // Alice sends karma to Bob for helping with a project
  await prisma.ledgerEntry.create({
    data: {
      communityId: community.id,
      currencyId: karmaCurrency.id,
      fromAccountId: alice.id,
      toAccountId: bob.id,
      amount: new Prisma.Decimal(20),
      reasonCode: 'reward',
      metadataJson: JSON.stringify({
        note: 'Thanks for helping with the project!',
        projectId: 'project_123',
      }),
    },
  });
  console.log(`✅ Created demo transaction: Alice → Bob (KARMA)`);

  // Bob purchases something from Charlie using coins
  await prisma.ledgerEntry.create({
    data: {
      communityId: community.id,
      currencyId: coinsCurrency.id,
      fromAccountId: bob.id,
      toAccountId: charlie.id,
      amount: new Prisma.Decimal(15.50),
      reasonCode: 'purchase',
      metadataJson: JSON.stringify({
        note: 'Purchased handmade pottery',
        itemId: 'item_456',
      }),
    },
  });
  console.log(`✅ Created demo transaction: Bob → Charlie (COINS)`);

  // Reward pool distributes karma to Charlie
  await prisma.ledgerEntry.create({
    data: {
      communityId: community.id,
      currencyId: karmaCurrency.id,
      fromAccountId: rewardPool.id,
      toAccountId: charlie.id,
      amount: new Prisma.Decimal(50),
      reasonCode: 'monthly_reward',
      metadataJson: JSON.stringify({
        note: 'Monthly active contributor reward',
        period: '2025-01',
      }),
    },
  });
  console.log(`✅ Created demo transaction: Reward Pool → Charlie (KARMA)`);

  // Create some blessings
  await prisma.ledgerEntry.create({
    data: {
      communityId: community.id,
      currencyId: blessingsCurrency.id,
      fromAccountId: systemAccount.id,
      toAccountId: alice.id,
      amount: new Prisma.Decimal(5),
      reasonCode: 'initial_grant',
      metadataJson: JSON.stringify({
        note: 'Welcome blessings',
      }),
    },
  });
  console.log(`✅ Created demo transaction: System → Alice (BLESSINGS)`);

  // Create balance snapshots
  const accounts = [systemAccount, alice, bob, charlie, rewardPool];
  const currencies = [karmaCurrency, coinsCurrency, blessingsCurrency];

  let snapshotCount = 0;
  for (const account of accounts) {
    for (const currency of currencies) {
      // Calculate balance
      const incoming = await prisma.ledgerEntry.aggregate({
        where: {
          toAccountId: account.id,
          currencyId: currency.id,
        },
        _sum: { amount: true },
      });

      const outgoing = await prisma.ledgerEntry.aggregate({
        where: {
          fromAccountId: account.id,
          currencyId: currency.id,
        },
        _sum: { amount: true },
      });

      const balance = (incoming._sum.amount || new Prisma.Decimal(0)).minus(
        outgoing._sum.amount || new Prisma.Decimal(0)
      );

      if (!balance.equals(0)) {
        await prisma.balanceSnapshot.create({
          data: {
            accountId: account.id,
            currencyId: currency.id,
            balance,
            takenAt: new Date(),
          },
        });
        snapshotCount++;
      }
    }
  }
  console.log(`✅ Created ${snapshotCount} balance snapshots`);

  console.log('\n🎉 Seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - Community: ${community.name} (${community.slug})`);
  console.log(`   - Currencies: ${currencies.length}`);
  console.log(`   - Accounts: ${accounts.length}`);
  console.log(`   - Transactions: ${karmaGrants.length + coinsGrants.length + 4}`);
  console.log(`   - Balance Snapshots: ${snapshotCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
