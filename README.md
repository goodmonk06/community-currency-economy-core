# Community Currency Economy Core

> コミュニティ専用ポイント・トークン・貢献度を扱う「内側の経済圏」コアエンジン

A robust, double-entry bookkeeping system for managing community currencies, points, and tokens. Built to power internal economies within communities, supporting multiple currencies, real-time balance tracking, and event-driven integrations.

## Features

- **Multi-Currency Support**: Each community can have multiple currencies (karma, coins, blessings, etc.)
- **Double-Entry Accounting**: All transactions are recorded using proper double-entry bookkeeping principles
- **Real-Time Balances**: Instant balance calculations with periodic snapshot support for performance
- **Webhook Integration**: Event-driven architecture for notifying external services
- **RESTful API**: Clean API for integration with gamification, marketplace, and other services
- **Admin Dashboard**: Next.js web interface for managing communities, accounts, and viewing transactions
- **Type-Safe**: Built with TypeScript for robust type safety
- **Tested**: Comprehensive test suite for core transaction logic

## Architecture

This is a monorepo containing:

```
community-currency-economy-core/
├── apps/
│   ├── api/          # Fastify REST API server
│   └── web/          # Next.js admin dashboard
└── packages/
    └── core/         # Core business logic & Prisma schema
```

### Technology Stack

- **Backend**: Node.js, Fastify, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Frontend**: Next.js 15, React 19
- **Testing**: Vitest
- **Build**: Turbo (monorepo build system)
- **Package Manager**: pnpm

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 14+ (or use Docker)

### Installation

1. **Clone and install dependencies**:

```bash
git clone <repository-url>
cd community-currency-economy-core
pnpm install
```

2. **Start PostgreSQL** (using Docker):

```bash
docker-compose up -d postgres
```

Or use your own PostgreSQL instance and update the `DATABASE_URL` in `.env`.

3. **Setup environment variables**:

```bash
cp .env.example .env
```

Edit `.env` with your configuration (DATABASE_URL, etc.).

4. **Initialize database**:

```bash
# Push schema to database
pnpm db:push

# Seed with demo data
pnpm db:seed
```

5. **Start development servers**:

```bash
pnpm dev
```

This will start:
- API server at http://localhost:3001
- Web dashboard at http://localhost:3000

### Using Make (Alternative)

We provide a Makefile for convenience:

```bash
make setup   # Install, push schema, and seed
make dev     # Run development servers
make test    # Run tests
```

See `make help` for all available commands.

## Understanding Double-Entry Bookkeeping

This system implements **double-entry accounting**, where every transaction has two sides:

- **Debit (From Account)**: The account that sends value
- **Credit (To Account)**: The account that receives value

### Example Transaction

When Alice sends 20 KARMA to Bob:

```
LedgerEntry:
  - fromAccount: Alice
  - toAccount: Bob
  - amount: 20
  - currency: KARMA
```

This single ledger entry records both sides:
- Alice's balance decreases by 20
- Bob's balance increases by 20

### Balance Calculation

Account balances are calculated in real-time:

```
Balance = (Sum of incoming transfers) - (Sum of outgoing transfers)
```

For performance optimization, the system also supports periodic balance snapshots.

## Core Domain Model

### Community

An isolated economic space (e.g., "Tech Community", "Art Collective").

```typescript
{
  id: string
  slug: string        // URL-friendly identifier
  name: string
  currencies: Currency[]
}
```

### Currency

A type of value within a community (e.g., KARMA, COINS, BLESSINGS).

```typescript
{
  id: string
  communityId: string
  code: string        // e.g., "KARMA"
  name: string
  description: string
  decimals: number    // 0 = whole numbers, 2 = cents, etc.
}
```

### Account

An entity that can hold balances (member, pool, or system account).

```typescript
{
  id: string
  communityId: string
  ownerType: 'member' | 'pool' | 'system'
  ownerRef: string    // External reference (e.g., user_id)
  displayName: string
}
```

**Account Types**:
- `member`: Regular community member account
- `pool`: Shared pool (e.g., reward pool, treasury)
- `system`: System accounts for grants and special operations

### LedgerEntry

A transaction record in the double-entry system.

```typescript
{
  id: string
  communityId: string
  currencyId: string
  fromAccountId: string
  toAccountId: string
  amount: Decimal
  reasonCode: string        // e.g., "purchase", "reward", "transfer"
  metadataJson: string      // Additional context as JSON
  createdAt: DateTime
}
```

### WebhookSubscription

Subscribe to events for external service integration.

```typescript
{
  id: string
  communityId: string
  url: string
  secret: string            // For HMAC signature verification
  eventTypes: string[]      // Array of event types to subscribe to
  active: boolean
}
```

## API Reference

Base URL: `http://localhost:3001`

### Communities

#### Create a Community

```http
POST /communities
Content-Type: application/json

{
  "slug": "my-community",
  "name": "My Community"
}
```

#### List Communities

```http
GET /communities
```

#### Get Community

```http
GET /communities/:communityId
```

### Currencies

#### Create a Currency

```http
POST /communities/:communityId/currencies
Content-Type: application/json

{
  "code": "KARMA",
  "name": "Karma Points",
  "description": "Earned through contributions",
  "decimals": 0
}
```

#### List Currencies

```http
GET /communities/:communityId/currencies
```

### Accounts

#### Create an Account

```http
POST /communities/:communityId/accounts
Content-Type: application/json

{
  "ownerType": "member",
  "ownerRef": "user_123",
  "displayName": "Alice"
}
```

#### List Accounts

```http
GET /communities/:communityId/accounts
```

#### Get Account Balance

```http
GET /communities/:communityId/accounts/:accountId/balance
```

Response:
```json
{
  "balances": [
    {
      "accountId": "...",
      "currencyId": "...",
      "currencyCode": "KARMA",
      "balance": "150",
      "asOf": "2025-01-15T10:30:00Z"
    }
  ]
}
```

### Transactions

#### Execute a Transfer

```http
POST /communities/:communityId/transfer
Content-Type: application/json

{
  "currencyCode": "KARMA",
  "from": {
    "ownerType": "member",
    "ownerRef": "user_alice"
  },
  "to": {
    "ownerType": "member",
    "ownerRef": "user_bob"
  },
  "amount": 50,
  "reasonCode": "reward",
  "metadata": {
    "description": "Thanks for helping!",
    "projectId": "project_123"
  }
}
```

Response:
```json
{
  "transfer": {
    "ledgerEntryId": "...",
    "fromAccountId": "...",
    "toAccountId": "...",
    "amount": "50",
    "newFromBalance": "100",
    "newToBalance": "50"
  }
}
```

#### Get Ledger Entries

```http
GET /communities/:communityId/ledger?accountId=...&limit=50&offset=0
```

### Webhooks

#### Create Webhook Subscription

```http
POST /communities/:communityId/webhooks
Content-Type: application/json

{
  "url": "https://your-service.com/webhook",
  "eventTypes": ["transfer.created", "account.created"],
  "secret": "your-secret-key"  // Optional, will be generated if not provided
}
```

#### List Webhook Subscriptions

```http
GET /communities/:communityId/webhooks
```

## Webhook Events

The system emits the following webhook events:

### Event Types

- `transfer.created`: A new transfer was executed
- `account.created`: A new account was created
- `currency.created`: A new currency was created
- `balance.snapshot`: A balance snapshot was taken

### Webhook Payload Format

```json
{
  "event": "transfer.created",
  "communityId": "...",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "transfer": { ... },
    "currencyCode": "KARMA",
    "reasonCode": "reward",
    "metadata": { ... }
  }
}
```

### Webhook Signature Verification

Webhooks are signed using HMAC-SHA256. Verify the signature using the `X-Webhook-Signature` header:

```typescript
import crypto from 'crypto';

function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  return signature === expectedSignature;
}
```

## Integration Guide

### Integrating with External Services

This core system is designed to be integrated with external services like:

1. **Gamification/Loyalty Engine**: Award points for achievements
2. **Marketplace**: Use community currency for purchases
3. **Social Platform**: Track and display user contributions
4. **Analytics**: Monitor economic activity

### Integration Pattern

1. **Create accounts** for your users via the API
2. **Execute transfers** when users perform actions
3. **Subscribe to webhooks** to react to economic events
4. **Query balances** to display user wealth

### Example: Gamification Integration

```typescript
// When user completes an achievement
async function awardAchievement(userId: string, achievementId: string) {
  const response = await fetch('http://localhost:3001/communities/my-community-id/transfer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currencyCode: 'KARMA',
      from: {
        ownerType: 'pool',
        ownerRef: 'reward_pool'
      },
      to: {
        ownerType: 'member',
        ownerRef: userId
      },
      amount: 100,
      reasonCode: 'achievement',
      metadata: {
        achievementId,
        timestamp: new Date().toISOString()
      }
    })
  });

  return response.json();
}
```

## Development

### Project Structure

```
├── apps/
│   ├── api/                    # Fastify API
│   │   ├── src/
│   │   │   ├── routes/         # API route handlers
│   │   │   └── index.ts        # Server entry point
│   │   └── Dockerfile
│   └── web/                    # Next.js Dashboard
│       ├── src/
│       │   ├── app/            # App router pages
│       │   └── lib/            # Utilities
│       └── Dockerfile
└── packages/
    └── core/                   # Core business logic
        ├── prisma/
        │   ├── schema.prisma   # Database schema
        │   └── seed.ts         # Seed data
        └── src/
            ├── services/       # Business logic services
            ├── types/          # TypeScript types
            └── lib/            # Utilities
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests for a specific package
pnpm --filter @community-economy/core test
```

### Database Management

```bash
# Open Prisma Studio (DB GUI)
pnpm db:studio

# Create a new migration
pnpm db:migrate

# Reset database (WARNING: Deletes all data)
cd packages/core && pnpm prisma migrate reset
```

## Docker Deployment

### Build and Run with Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

The Docker setup includes:
- PostgreSQL database
- API server (port 3001)
- Web dashboard (port 3000)

### Production Environment Variables

Create a `.env.production` file:

```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname?schema=public
API_PORT=3001
API_HOST=0.0.0.0
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
WEBHOOK_SECRET=your-production-webhook-secret
```

## Common Use Cases

### 1. Initial Grant to New Members

```typescript
// Grant welcome bonus
await transactionService.grantBalance(
  communityId,
  'KARMA',
  { ownerType: 'member', ownerRef: 'user_newbie' },
  100,
  { reason: 'Welcome bonus' }
);
```

### 2. Peer-to-Peer Transfer

```typescript
// Alice tips Bob
await transactionService.transfer({
  communityId,
  currencyCode: 'KARMA',
  fromAccountRef: { ownerType: 'member', ownerRef: 'user_alice' },
  toAccountRef: { ownerType: 'member', ownerRef: 'user_bob' },
  amount: 20,
  reasonCode: 'tip',
  metadata: { message: 'Great work!' }
});
```

### 3. Pool Distribution

```typescript
// Reward pool distributes to members
await transactionService.transfer({
  communityId,
  currencyCode: 'KARMA',
  fromAccountRef: { ownerType: 'pool', ownerRef: 'reward_pool' },
  toAccountRef: { ownerType: 'member', ownerRef: 'user_charlie' },
  amount: 50,
  reasonCode: 'monthly_reward',
  metadata: { period: '2025-01' }
});
```

### 4. Marketplace Purchase

```typescript
// Bob buys item from Charlie using COINS
await transactionService.transfer({
  communityId,
  currencyCode: 'COINS',
  fromAccountRef: { ownerType: 'member', ownerRef: 'user_bob' },
  toAccountRef: { ownerType: 'member', ownerRef: 'user_charlie' },
  amount: 15.50,
  reasonCode: 'purchase',
  metadata: {
    itemId: 'item_456',
    itemName: 'Handmade Pottery'
  }
});
```

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `400 Bad Request`: Invalid amount, insufficient balance
- `404 Not Found`: Community, currency, or account not found
- `500 Internal Server Error`: Unexpected server error

Error response format:

```json
{
  "error": "Insufficient balance",
  "details": "Insufficient balance. Required: 100, Available: 50"
}
```

## Performance Considerations

### Balance Snapshots

For accounts with high transaction volume, use balance snapshots to improve query performance:

```typescript
// Create snapshot for an account
await balanceService.createSnapshot(accountId, currencyId);

// Create snapshots for entire community (run periodically)
await balanceService.createSnapshotsForCommunity(communityId);
```

Run snapshot creation as a scheduled job (e.g., daily or weekly).

### Query Optimization

- Ledger entries are indexed by account, currency, and timestamp
- Use pagination when querying ledger entries
- Consider archiving old transactions for long-running communities

## Security Best Practices

1. **Validate all inputs**: The API validates amounts, account references, etc.
2. **Use HTTPS in production**: Never send credentials over HTTP
3. **Secure webhook secrets**: Store webhook secrets securely
4. **Rate limiting**: Implement rate limiting on your API gateway
5. **Access control**: Add authentication/authorization layer before the API

## Phase 3 Enhancements

The system has been enhanced with advanced features for production use:

### New Domain Entities

**Account Groups**: Organize accounts into cohorts with hierarchies
```typescript
// Create merchant group
const merchantGroup = await groupService.createGroup(
  communityId,
  'Merchants',
  'Verified sellers'
);

// Add members
await groupService.addMember(merchantGroup.id, accountId, 'seller');
```

**Transaction Templates**: Reusable transaction patterns
```typescript
// Create welcome bonus template
const template = await templateService.createTemplate({
  communityId,
  name: 'Welcome Bonus',
  currencyId,
  fromPattern: 'system:treasury',
  toPattern: 'member:*',
  amountType: 'fixed',
  fixedAmount: 100,
  reasonCode: 'welcome_bonus',
});
```

**Transaction Policies**: Rules and limits
```typescript
// Daily spending limit
const policy = await prisma.transactionPolicy.create({
  data: {
    communityId,
    name: 'Daily Purchase Limit',
    policyType: 'daily_limit',
    limitAmount: 500,
    timeWindow: '24h',
  },
});
```

**Audit Logs**: Comprehensive activity tracking
```typescript
await auditService.log({
  entityType: 'ledger_entry',
  entityId: transferId,
  action: 'create',
  actorType: 'user',
  actorRef: userId,
  ipAddress: req.ip,
});
```

**Currency Exchange Rates**: Multi-currency operations
```typescript
// Set exchange rate: 1 KARMA = 0.5 COINS
await prisma.currencyExchangeRate.create({
  data: {
    fromCurrencyId: karmaId,
    toCurrencyId: coinsId,
    rate: 0.5,
    effectiveFrom: new Date(),
  },
});
```

### Infrastructure Improvements

**Validation with Zod**: Type-safe API validation
```typescript
import { TransferSchema } from '@community-economy/core';

const validated = TransferSchema.parse(requestBody);
```

**Structured Logging**: Contextual logging with Pino
```typescript
import { logInfo, logError } from '@community-economy/core';

logInfo('Transfer executed', {
  transferId,
  amount,
  communityId,
});
```

**Metrics**: Pluggable metrics abstraction
```typescript
import { incrementCounter, recordHistogram } from '@community-economy/core';

incrementCounter('economy.transfer.created', 1, { communityId });
recordHistogram('economy.transfer.duration_ms', duration);
```

**Domain Events**: Event-driven architecture
```typescript
import { eventBus } from '@community-economy/core';

eventBus.on('transfer.created', async (event) => {
  await sendNotification(event.data);
  await updateAnalytics(event.data);
});
```

### Extensibility Layer

**Adapter Pattern**: Pluggable external integrations
```typescript
import { adapters, INotificationAdapter } from '@community-economy/core';

class MyNotificationAdapter implements INotificationAdapter {
  async sendEmail(message) { /* ... */ }
  async sendSMS(message) { /* ... */ }
  async sendPush(message) { /* ... */ }
}

adapters.setNotificationAdapter(new MyNotificationAdapter());
```

Available adapters:
- `INotificationAdapter`: Email, SMS, push notifications
- `IStorageAdapter`: File storage (S3, local, etc.)
- `IAuditAdapter`: External audit systems
- `IAuthAdapter`: Authentication providers
- `MetricsAdapter`: Prometheus, DataDog, etc.

### Test Infrastructure

**Test Factories**: Easy test data creation
```typescript
import { ScenarioFactory } from '@community-economy/core';

const scenario = new ScenarioFactory(prisma);

// Create complete economy with one line
const economy = await scenario.createBasicEconomy();
// Returns: community, currencies, accounts, initial grants

// Or create specific scenarios
const gamification = await scenario.createGamificationScenario();
```

Individual factories available:
- `CommunityFactory`: Create communities
- `CurrencyFactory`: Create currencies
- `AccountFactory`: Create accounts (member, pool, system)
- `TransactionFactory`: Create transfers
- `AccountGroupFactory`: Create groups with members
- `TemplateFactory`: Create transaction templates

### CLI Tools

Command-line interface for operations:

```bash
# List communities
pnpm cli community:list

# Create community
pnpm cli community:create my-community "My Community"

# Show account balances
pnpm cli balance:show <communityId> <accountId>

# Execute transfer
pnpm cli transfer:execute <communityId> <currencyCode> <from> <to> <amount> <reason>

# Create account group
pnpm cli group:create <communityId> <name> [description]

# Create balance snapshots
pnpm cli balance:snapshot <communityId>
```

### Enhanced Seed Data

Multiple realistic scenarios for demonstration:

```bash
# Run enhanced seed (includes 3 scenarios)
pnpm --filter @community-economy/core prisma:seed
# Or manually:
tsx packages/core/prisma/seed-enhanced.ts
```

**Scenario 1: Gamification & Rewards**
- Community with KARMA and COINS
- Power users vs new users groups
- Reward pool with templates
- Achievement rewards

**Scenario 2: Internal Marketplace**
- Artisan collective with CREDITS
- Merchant and buyer groups
- Realistic purchase transactions
- Group-based organization

**Scenario 3: Treasury & Grant Management**
- DAO with governance tokens
- Grant pools (development, community)
- Project teams receiving grants
- Budget cycle tracking

### Documentation

Comprehensive documentation added:

- `docs/PHASE3_OVERVIEW.md`: Phase 3 implementation plan and architecture
- `docs/INTEGRATION_RECIPES.md`: Practical integration examples
- `docs/DOMAIN_NOTES.md`: Deep dive into domain model and design decisions

### Vertical Slices Implemented

Three complete end-to-end flows:

1. **Gamification System**: Reward pools → templates → group-based rewards
2. **Marketplace**: Merchant/buyer groups → purchases → exchange rates
3. **Treasury Management**: Grant pools → disbursements → audit trails

All slices include:
- Domain logic (services)
- Data persistence (Prisma)
- Seed data (realistic examples)
- Test factories (for testing)
- CLI commands (for operations)

## Roadmap

Future enhancements:

- [ ] Transaction reversal/refund support
- [ ] Multi-signature approval workflows
- [ ] Currency exchange rates between community currencies
- [ ] Advanced analytics and reporting
- [ ] GraphQL API option
- [ ] Real-time WebSocket updates
- [ ] Automatic balance snapshot scheduling

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

See [LICENSE](./LICENSE) file.

## Support

For questions and support:

- Open an issue on GitHub
- Check existing documentation
- Review test files for usage examples

---

Built with ❤️ for community economies
