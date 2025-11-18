#!/usr/bin/env node

/**
 * CLI tool for community economy management
 * Usage: economy-cli <command> [options]
 */

import { prisma } from '../lib/prisma';
import { CommunityService } from '../services/community.service';
import { AccountService } from '../services/account.service';
import { TransactionService } from '../services/transaction.service';
import { BalanceService } from '../services/balance.service';
import { AccountGroupService } from '../services/account-group.service';

const communityService = new CommunityService(prisma);
const accountService = new AccountService(prisma);
const transactionService = new TransactionService(prisma);
const balanceService = new BalanceService(prisma);
const groupService = new AccountGroupService(prisma);

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    printHelp();
    process.exit(0);
  }

  try {
    switch (command) {
      case 'community:list':
        await listCommunities();
        break;
      case 'community:create':
        await createCommunity(args[1], args[2]);
        break;
      case 'account:create':
        await createAccount(args[1], args[2], args[3], args[4]);
        break;
      case 'transfer:execute':
        await executeTransfer(args.slice(1));
        break;
      case 'balance:show':
        await showBalance(args[1], args[2]);
        break;
      case 'balance:snapshot':
        await createSnapshots(args[1]);
        break;
      case 'group:create':
        await createGroup(args[1], args[2], args[3]);
        break;
      case 'group:add-member':
        await addGroupMember(args[1], args[2]);
        break;
      case 'help':
        printHelp();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function listCommunities() {
  const communities = await communityService.listCommunities();
  console.log(`\nFound ${communities.length} communities:\n`);

  for (const community of communities) {
    console.log(`ID: ${community.id}`);
    console.log(`Slug: ${community.slug}`);
    console.log(`Name: ${community.name}`);
    console.log(`Currencies: ${community.currencies.length}`);
    console.log(`Accounts: ${community._count.accounts}`);
    console.log(`Transactions: ${community._count.ledgerEntries}`);
    console.log('─'.repeat(50));
  }
}

async function createCommunity(slug: string, name: string) {
  if (!slug || !name) {
    console.error('Usage: economy-cli community:create <slug> <name>');
    process.exit(1);
  }

  const community = await communityService.createCommunity(slug, name);
  console.log(`\nCommunity created successfully!`);
  console.log(`ID: ${community.id}`);
  console.log(`Slug: ${community.slug}`);
  console.log(`Name: ${community.name}`);
}

async function createAccount(
  communityId: string,
  ownerType: string,
  ownerRef: string,
  displayName?: string
) {
  if (!communityId || !ownerType || !ownerRef) {
    console.error('Usage: economy-cli account:create <communityId> <ownerType> <ownerRef> [displayName]');
    process.exit(1);
  }

  const account = await accountService.createAccount(
    communityId,
    { ownerType: ownerType as any, ownerRef },
    displayName
  );

  console.log(`\nAccount created successfully!`);
  console.log(`ID: ${account.id}`);
  console.log(`Owner: ${account.ownerType}:${account.ownerRef}`);
  console.log(`Display Name: ${account.displayName || 'N/A'}`);
}

async function executeTransfer(args: string[]) {
  // Simplified transfer: communityId currencyCode fromOwnerRef toOwnerRef amount reasonCode
  if (args.length < 6) {
    console.error('Usage: economy-cli transfer:execute <communityId> <currencyCode> <fromOwnerRef> <toOwnerRef> <amount> <reasonCode>');
    process.exit(1);
  }

  const [communityId, currencyCode, fromOwnerRef, toOwnerRef, amount, reasonCode] = args;

  const result = await transactionService.transfer({
    communityId,
    currencyCode,
    fromAccountRef: { ownerType: 'member', ownerRef: fromOwnerRef },
    toAccountRef: { ownerType: 'member', ownerRef: toOwnerRef },
    amount,
    reasonCode,
  });

  console.log(`\nTransfer executed successfully!`);
  console.log(`Ledger Entry ID: ${result.ledgerEntryId}`);
  console.log(`Amount: ${result.amount}`);
  console.log(`New balances:`);
  console.log(`  From: ${result.newFromBalance}`);
  console.log(`  To: ${result.newToBalance}`);
}

async function showBalance(communityId: string, accountId: string) {
  if (!communityId || !accountId) {
    console.error('Usage: economy-cli balance:show <communityId> <accountId>');
    process.exit(1);
  }

  const balances = await balanceService.getAllBalances(accountId);
  console.log(`\nBalances for account ${accountId}:\n`);

  for (const balance of balances) {
    console.log(`${balance.currencyCode}: ${balance.balance}`);
  }
}

async function createSnapshots(communityId: string) {
  if (!communityId) {
    console.error('Usage: economy-cli balance:snapshot <communityId>');
    process.exit(1);
  }

  const snapshots = await balanceService.createSnapshotsForCommunity(communityId);
  console.log(`\nCreated ${snapshots.length} balance snapshots for community ${communityId}`);
}

async function createGroup(communityId: string, name: string, description?: string) {
  if (!communityId || !name) {
    console.error('Usage: economy-cli group:create <communityId> <name> [description]');
    process.exit(1);
  }

  const group = await groupService.createGroup(communityId, name, description);
  console.log(`\nGroup created successfully!`);
  console.log(`ID: ${group.id}`);
  console.log(`Name: ${group.name}`);
}

async function addGroupMember(groupId: string, accountId: string) {
  if (!groupId || !accountId) {
    console.error('Usage: economy-cli group:add-member <groupId> <accountId>');
    process.exit(1);
  }

  await groupService.addMember(groupId, accountId);
  console.log(`\nAccount ${accountId} added to group ${groupId}`);
}

function printHelp() {
  console.log(`
Community Economy CLI

Usage: economy-cli <command> [options]

Commands:
  community:list                           List all communities
  community:create <slug> <name>           Create a new community

  account:create <communityId> <ownerType> <ownerRef> [displayName]
                                           Create a new account

  transfer:execute <communityId> <currencyCode> <fromOwnerRef> <toOwnerRef> <amount> <reasonCode>
                                           Execute a transfer

  balance:show <communityId> <accountId>   Show balances for an account
  balance:snapshot <communityId>           Create balance snapshots for all accounts

  group:create <communityId> <name> [description]
                                           Create an account group
  group:add-member <groupId> <accountId>   Add account to group

  help                                     Show this help message

Examples:
  economy-cli community:list
  economy-cli community:create my-community "My Community"
  economy-cli balance:show <communityId> <accountId>

Environment Variables:
  DATABASE_URL    PostgreSQL connection string
  DEBUG           Enable debug output
`);
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { main as cli };
