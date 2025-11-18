# Domain Model: Detailed Notes

This document provides an in-depth explanation of the domain model, business rules, and design decisions.

## Core Concepts

### Double-Entry Bookkeeping

The system implements true double-entry accounting:

```
Every transaction has two sides:
  - Debit (From Account): Loses value
  - Credit (To Account): Gains value

Balance = Sum(Credits) - Sum(Debits)
```

**Why double-entry?**
- **Integrity**: Balances always add up (conservation of value)
- **Auditability**: Complete transaction history
- **Transparency**: See full flow of value
- **Trust**: No value can be created or destroyed arbitrarily

### Currency Neutrality

The system is deliberately **currency-agnostic**:
- A "currency" is just a unit of account
- Could represent: points, tokens, hours, credits, karma, etc.
- No built-in monetary assumptions

This enables diverse use cases:
- Time banking systems (hours)
- Reputation systems (karma/reputation points)
- Internal economies (credits/tokens)
- Loyalty programs (reward points)

---

## Entity Relationships

### Core Entities (Phase 1)

```
Community
   ├── Currency (1:many)
   ├── Account (1:many)
   └── LedgerEntry (1:many)

Account
   ├── LedgerEntry as From (1:many)
   ├── LedgerEntry as To (1:many)
   └── BalanceSnapshot (1:many)

Currency
   ├── LedgerEntry (1:many)
   └── BalanceSnapshot (1:many)
```

### Extended Entities (Phase 3)

```
Community
   ├── AccountGroup (1:many)
   ├── TransactionTemplate (1:many)
   ├── TransactionPolicy (1:many)
   ├── AuditLog (1:many)
   └── CurrencyExchangeRate (1:many)

AccountGroup
   ├── AccountGroupMember (1:many)
   └── ParentGroup (self-reference, tree structure)

TransactionTemplate
   └── ScheduledTransaction (1:many)
```

---

## Entity Deep Dive

### Community

**Purpose**: Isolated economic space with its own rules and currencies.

**Design Decisions**:
- Each community is fully independent
- No cross-community transfers (by design)
- Communities can represent: organizations, projects, platforms, DAOs, games, etc.

**Example Use Cases**:
- `tech-community`: Online forum with karma points
- `artisan-marketplace`: Local artisan collective with trading credits
- `dao-treasury`: DAO governance with voting tokens

**Attributes**:
- `slug`: URL-friendly identifier (unique)
- `name`: Display name
- Soft delete not implemented (cascades to all related entities)

---

### Currency

**Purpose**: Define a type of value tracked within a community.

**Key Attributes**:
- `code`: Short identifier (e.g., "KARMA", "COINS")
- `name`: Display name
- `decimals`: Number of decimal places (0 = integers, 2 = cents, etc.)

**Design Decisions**:
- Multiple currencies per community
- No conversion rates between currencies (unless explicitly configured)
- No supply limits (infinite supply from system account)
- No issuance rules (handled by policies)

**Decimal Precision**:
```
decimals: 0 → 100 KARMA (whole numbers)
decimals: 2 → 12.34 COINS (cents)
decimals: 8 → 0.00000001 BTC-STYLE (satoshis)
```

Stored as `Decimal(20, 8)` in database for precision.

---

### Account

**Purpose**: An entity that can hold balances and transact.

**Three Account Types**:

1. **Member** (`ownerType: 'member'`)
   - Regular community participants
   - `ownerRef`: External user ID
   - Most common account type

2. **Pool** (`ownerType: 'pool'`)
   - Shared accounts (treasuries, reward pools, escrow)
   - `ownerRef`: Pool identifier (e.g., "reward_pool")
   - Multiple accounts can draw from same pool

3. **System** (`ownerType: 'system'`)
   - Special accounts for system operations
   - `ownerRef`: Usually "treasury"
   - Source of initial grants
   - Can have infinite balance (created as needed)

**Design Decisions**:
- Accounts don't store balances (calculated from ledger)
- One account per `(community, ownerType, ownerRef)` combination
- `displayName` is optional (for UX)

**Why No Balance Field?**
- Source of truth is the ledger
- Prevents sync issues
- Always accurate (real-time calculation)
- Can recreate balances from ledger at any time

---

### LedgerEntry

**Purpose**: Immutable record of a transaction.

**Structure**:
```typescript
{
  fromAccountId: string,  // Sender (loses value)
  toAccountId: string,    // Receiver (gains value)
  amount: Decimal,        // Always positive
  currencyId: string,     // What currency
  reasonCode: string,     // Why this happened
  metadataJson: string?,  // Additional context
  createdAt: DateTime     // When (immutable)
}
```

**Design Decisions**:
- Immutable once created (no updates/deletes)
- Always requires both from and to
- Amount always positive (direction is from→to)
- `reasonCode` categorizes transactions
- `metadataJson` for flexible additional data

**Common Reason Codes**:
- `initial_grant`: System grants to new account
- `transfer`: Peer-to-peer transfer
- `purchase`: Marketplace purchase
- `reward`: Gamification reward
- `refund`: Refund/reversal
- Custom codes for domain-specific needs

**Metadata Examples**:
```json
{
  "orderId": "ord_123",
  "itemName": "Handmade Bowl",
  "category": "pottery",
  "note": "Thanks for the help!"
}
```

---

### BalanceSnapshot

**Purpose**: Periodic cache of account balances for performance.

**When to Use**:
- High-volume accounts (thousands of transactions)
- Regular reporting
- Historical balance tracking

**Design Decisions**:
- Optional optimization (not required)
- Real-time balance always calculated from ledger
- Snapshots provide quick lookups
- Multiple snapshots per account/currency allowed

**Trade-offs**:
- Pro: Fast balance queries
- Pro: Historical balance tracking
- Con: Extra storage
- Con: Must be kept up to date

**Recommended Strategy**:
- Create snapshots daily/weekly via cron job
- Query snapshots for historical analysis
- Always calculate real-time from ledger for current balance

---

## Phase 3 Entities

### AccountGroup

**Purpose**: Organize accounts into cohorts for bulk operations and analytics.

**Features**:
- Hierarchical (groups can have parent groups)
- Many-to-many with accounts via `AccountGroupMember`
- Optional `role` per member (e.g., "admin", "moderator")

**Use Cases**:
- Segmentation: "Power Users", "New Members", "Inactive"
- Permissions: "Admins", "Moderators"
- Merchants vs Buyers in marketplaces
- Teams or departments

**Example Hierarchy**:
```
All Users
  ├── Power Users
  └── Regular Users
      ├── New Users
      └── Active Users
```

---

### TransactionTemplate

**Purpose**: Reusable transaction patterns.

**Attributes**:
- `fromPattern` / `toPattern`: Account patterns (e.g., "system:*", "member:*")
- `amountType`: "fixed" or "variable"
- `fixedAmount`: Preset amount (if fixed)
- `reasonCode`: Default reason
- `status`: "active", "inactive", "archived"

**Use Cases**:
- Welcome bonuses (fixed amount, system → new member)
- Daily login rewards (fixed amount, pool → member)
- Monthly salaries (variable amount, treasury → employee)
- Commission payouts (variable amount, buyer → seller)

**Patterns**:
```
"system:treasury"    → Specific system account
"pool:*"             → Any pool account
"member:*"           → Any member account
"member:power_*"     → Members matching pattern
```

---

### ScheduledTransaction

**Purpose**: Future or recurring transactions.

**Frequency Options**:
- `once`: One-time future transaction
- `daily`: Every day
- `weekly`: Every week
- `monthly`: Every month
- `yearly`: Every year

**Attributes**:
- `scheduledFor`: Next execution time
- `maxExecutions`: Limit (null = infinite)
- `executionCount`: How many times executed
- `status`: "pending", "completed", "failed", "cancelled"

**Use Cases**:
- Recurring subscriptions
- Scheduled grants/distributions
- Time-locked transactions
- Automated rewards

**Implementation Note**: Requires a job scheduler (cron, worker queue) to execute scheduled transactions.

---

### TransactionPolicy

**Purpose**: Rules and limits on transactions.

**Policy Types**:

1. **daily_limit**: Maximum amount per day
   ```
   limitAmount: 500
   timeWindow: "24h"
   ```

2. **transaction_max**: Maximum per transaction
   ```
   limitAmount: 1000
   ```

3. **approval_required**: Requires approval above threshold
   ```
   limitAmount: 10000  (amounts > 10K need approval)
   ```

4. **rate_limit**: Maximum transaction count
   ```
   limitCount: 10
   timeWindow: "1h"
   ```

**Scope**:
- Community-wide (all accounts, all currencies)
- Currency-specific (applies to one currency)
- Account-specific (applies to one account)

**Design Decisions**:
- Policies are enforced at transaction time
- Failed policy checks throw validation errors
- Policies can be activated/deactivated
- Policy violations are logged in audit log

---

### AuditLog

**Purpose**: Comprehensive activity logging for compliance and debugging.

**What to Log**:
- Entity creation/updates/deletion
- Transactions
- Policy violations
- Admin actions
- API calls (optional)

**Attributes**:
- `entityType`: What was acted upon
- `entityId`: Specific entity
- `action`: "create", "update", "delete", "transfer", etc.
- `actorType`: "user", "system", "api"
- `actorRef`: Who did it
- `changes`: JSON diff of changes (optional)
- `metadata`: Additional context
- `ipAddress` / `userAgent`: For security

**Use Cases**:
- Compliance audits
- Debugging issues
- Security investigations
- User activity history
- Rollback support

---

### CurrencyExchangeRate

**Purpose**: Enable multi-currency operations within a community.

**Attributes**:
- `fromCurrencyId` / `toCurrencyId`: Currency pair
- `rate`: Exchange rate (from → to)
- `effectiveFrom` / `effectiveUntil`: Time period

**Use Cases**:
- Convert KARMA → COINS
- Historical rate tracking
- Cross-currency transfers

**Example**:
```
1 KARMA = 0.5 COINS
1 COINS = 2 KARMA
```

**Implementation Note**: Multi-currency transfers require two transactions (or atomic exchange logic).

---

## Business Rules

### Balance Calculation

```typescript
Balance(account, currency) =
  SUM(LedgerEntry.amount WHERE toAccountId = account AND currencyId = currency)
  - SUM(LedgerEntry.amount WHERE fromAccountId = account AND currencyId = currency)
```

### Transaction Validation

Before executing a transfer:
1. ✓ Amount must be positive
2. ✓ Both accounts must exist
3. ✓ Both accounts must be in same community
4. ✓ Currency must exist in community
5. ✓ From account must have sufficient balance
6. ✓ Check transaction policies
7. ✓ Atomic execution (all or nothing)

### System Account Special Rules

- Can have negative balance (infinite source)
- Usually `ownerRef: "treasury"`
- Used for initial grants
- Represents external value injection

### Immutability

- LedgerEntry is immutable (cannot update/delete)
- To reverse: create new entry in opposite direction
- Audit log is append-only
- Preserves complete history

---

## Extension Points

### 1. Custom Reason Codes

Add domain-specific reason codes:
```typescript
const customReasonCodes = [
  'quest_completion',
  'referral_bonus',
  'auction_payment',
  'staking_reward',
];
```

### 2. Metadata Schemas

Define structured metadata per reason code:
```typescript
interface PurchaseMetadata {
  orderId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  price: number;
}
```

### 3. Custom Policies

Implement custom policy checks:
```typescript
class CustomPolicyService {
  async checkPolicy(transaction: Transaction): Promise<boolean> {
    // Custom logic
    return true;
  }
}
```

### 4. Balance Hooks

React to balance changes:
```typescript
eventBus.on('transfer.created', async (event) => {
  const newBalance = await balanceService.getBalance(
    event.data.toAccountId,
    event.data.currencyId
  );

  // Check milestones
  if (newBalance.gte(1000)) {
    await awardBadge('wealthy_member');
  }
});
```

---

## Performance Considerations

### Ledger Size

- Ledger grows indefinitely (append-only)
- Consider archiving old transactions (>1 year)
- Use balance snapshots for old data
- Partition ledger table by time period

### Balance Calculation

- Real-time calculation can be slow for large ledgers
- Use balance snapshots for quick lookups
- Cache frequently accessed balances
- Index ledger on `fromAccountId`, `toAccountId`, `currencyId`

### Concurrent Transactions

- Use database transactions for atomicity
- Handle deadlocks with retries
- Consider optimistic locking for high concurrency

---

## Design Philosophy

1. **Explicit over Implicit**
   - All transactions are recorded
   - No hidden state changes
   - Clear audit trail

2. **Immutability**
   - Ledger entries never change
   - History is preserved
   - Reversals are new entries

3. **Flexibility**
   - Generic domain model
   - Metadata for customization
   - Pluggable adapters

4. **Scalability**
   - Snapshots for performance
   - Event-driven architecture
   - Horizontal scaling via sharding (by community)

5. **Auditability**
   - Every action logged
   - Complete transaction history
   - Compliance-ready

---

## Future Enhancements

Potential additions (not yet implemented):

- **Multi-signature approvals**: Require multiple signers for large transactions
- **Transaction reversals**: Built-in refund/chargeback support
- **Conditional transfers**: Transfer only if condition met
- **Time-locked transfers**: Transfer after specific date/time
- **Recurring subscriptions**: Automatic recurring payments
- **Currency caps**: Maximum supply limits per currency
- **Dynamic exchange rates**: Auto-updating rates based on market
- **Account permissions**: Fine-grained access control
- **Transaction batching**: Process multiple transfers atomically
- **Smart contracts**: Programmable transaction rules

This domain model provides a solid foundation that can be extended for almost any internal economy use case!
