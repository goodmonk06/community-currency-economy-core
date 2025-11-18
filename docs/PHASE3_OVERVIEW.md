# Phase 3 Overview: Community Currency Economy Core

## Purpose Statement

The Community Currency Economy Core is a **production-grade double-entry bookkeeping engine** designed to power internal economies within communities, organizations, and digital platforms. It provides a robust foundation for managing multiple types of value (points, tokens, credits, karma) with full transaction history, real-time balance tracking, and event-driven integration capabilities. This system serves as a critical building block in larger ecosystems where communities need to:

- Track and reward member contributions (gamification, loyalty programs)
- Enable internal marketplaces with community-specific currencies
- Distribute rewards from shared pools (grants, treasuries, DAOs)
- Maintain transparent, auditable transaction histories
- Integrate with external services via webhooks and APIs

The system is explicitly designed to be **domain-neutral** and **horizontally scalable**, making it suitable for diverse use cases from online communities to local timebanking systems to organizational internal economies.

## Current Features (Post-Phase 1 & 2)

### Core Capabilities
- ✅ **Double-entry accounting**: All transactions maintain balance integrity
- ✅ **Multi-currency support**: Each community can define unlimited currency types
- ✅ **Three account types**: Member, Pool, and System accounts
- ✅ **Real-time balances**: Calculated from ledger with snapshot optimization
- ✅ **Webhook integration**: Event notifications with HMAC signing
- ✅ **REST API**: Complete CRUD operations for all entities
- ✅ **Admin dashboard**: Next.js UI for viewing communities, accounts, transactions
- ✅ **Comprehensive tests**: Transaction validation and balance calculation
- ✅ **Docker deployment**: Full containerization with docker-compose
- ✅ **Seed data**: Demo community with realistic transactions

### Technical Stack
- TypeScript monorepo (Turbo + pnpm)
- PostgreSQL + Prisma ORM
- Fastify (API) + Next.js 15 (UI)
- Vitest for testing
- Docker for deployment

## Current Limitations

### Domain Model
- No transaction templates or recurring transfers
- No account grouping or hierarchies
- No currency exchange rates between community currencies
- No audit logging or transaction history beyond raw ledger
- No account permissions or approval workflows
- No transaction reversals or refunds
- Limited metadata structure (free-form JSON)

### Integration & Extensibility
- Webhook system is basic (no retry, no dead letter queue)
- No adapter pattern for pluggable components
- No event sourcing or domain events beyond webhooks
- No metrics or observability hooks
- No notification adapters (email, push, SMS)

### DX & Operations
- No CLI tools for maintenance
- Basic validation (no Zod schemas)
- Simple error handling (not centralized)
- No structured logging
- Limited seed data (one scenario)
- No test fixtures or factories

### Advanced Features
- No scheduled/recurring transactions
- No multi-signature approvals
- No transaction batching
- No rate limiting per account
- No currency caps or supply limits
- No time-locked transactions

## Phase 3 Implementation Plan

### 1. Domain Model Expansion (New Entities)

**Transaction Templates**
- Reusable transaction patterns (e.g., "monthly reward", "welcome bonus")
- Enable scheduled/recurring transactions
- Support variable amounts and dynamic recipients

**Account Groups**
- Organize accounts into cohorts (e.g., "power users", "new members")
- Enable bulk operations and group-level analytics
- Support nested hierarchies

**Currency Exchange Rates**
- Define conversion rates between currencies within a community
- Enable cross-currency transfers
- Track rate history for auditing

**Audit Logs**
- Comprehensive activity logging beyond transactions
- Track account modifications, currency changes, admin actions
- Support compliance and debugging

**Transaction Policies**
- Configurable rules (daily limits, approval thresholds)
- Validation rules per currency or account type
- Rejection reasons and policy violation tracking

**Account Roles & Permissions**
- Fine-grained access control
- Delegation and signing authorities
- Approval workflows

### 2. Multiple Vertical Slices

**Slice 1: Gamification Rewards System**
- Create transaction templates for common rewards
- Implement scheduled reward distribution
- Track reward history per account
- Dashboard for reward analytics

**Slice 2: Internal Marketplace**
- Account groups for merchants vs. buyers
- Currency exchange for multi-currency purchases
- Transaction policies for fraud prevention
- Escrow-style holds and releases

**Slice 3: Treasury Management**
- Pool account hierarchies
- Budget allocation and tracking
- Scheduled distributions
- Audit logs for compliance

### 3. Extensibility Layer

**Adapter Interfaces**
- `INotificationAdapter`: Email, SMS, push notifications
- `IMetricsAdapter`: Prometheus, DataDog, custom metrics
- `IStorageAdapter`: S3, local filesystem for receipts/documents
- `IAuditAdapter`: External audit log systems
- `IAuthAdapter`: Integration with auth providers

**Domain Events System**
- Typed event bus for internal decoupling
- Event handlers for side effects
- Event replay for debugging
- Integration with external event streams

**Plugin Registry**
- Discoverable plugins for extending functionality
- Lifecycle hooks (before/after transaction, etc.)
- Configuration management

### 4. DX & Operational Excellence

**CLI Tools**
- `economy-cli account:create` - Quick account creation
- `economy-cli transfer:execute` - Test transfers
- `economy-cli report:balances` - Balance reports
- `economy-cli seed:scenario <name>` - Load specific scenarios
- `economy-cli migrate:audit` - Backfill audit logs

**Enhanced Validation**
- Zod schemas for all API inputs
- Runtime validation with helpful error messages
- Type generation from schemas

**Centralized Error Handling**
- Consistent error response format
- Error codes and categorization
- Localization support

**Structured Logging**
- Contextual logging with request IDs
- Log levels and filtering
- Integration with log aggregators

**Metrics & Observability**
- Transaction rate, volume, latency metrics
- Balance distribution histograms
- Error rates and types
- Custom business metrics

### 5. Testing & Quality

**Test Fixtures & Factories**
- `CommunityFactory.create()` - Generate test communities
- `TransactionFactory.build()` - Build transaction scenarios
- `AccountFactory.createGroup()` - Create account sets

**Integration Tests**
- Full vertical slice tests
- Multi-currency scenarios
- Webhook delivery tests
- Concurrent transaction tests

**Performance Tests**
- High-volume transaction processing
- Balance calculation at scale
- Query performance benchmarks

### 6. Documentation & Productization

**Architecture Docs**
- System design diagrams
- Data flow documentation
- Integration patterns

**Domain Docs**
- Entity relationship diagrams
- Business rule documentation
- Use case catalog

**Integration Recipes**
- Common integration patterns
- Code examples for each adapter
- Webhook consumer examples

**API Documentation**
- OpenAPI/Swagger spec generation
- Interactive API explorer
- Client SDK generation

## Success Criteria

After Phase 3, this repository should:
- ✅ Support 5+ realistic vertical slices out of the box
- ✅ Have clear extension points for 3+ external integrations
- ✅ Include 50+ meaningful tests with >80% coverage
- ✅ Contain documentation that enables self-service integration
- ✅ Provide CLI tools for all common operations
- ✅ Demonstrate 10x growth in code richness while maintaining consistency
- ✅ Serve as a reference implementation for other economy-related services

## Timeline Approach

Phase 3 will be implemented in the following order:
1. **Foundation** (validation, errors, logging, metrics)
2. **Domain expansion** (new entities and migrations)
3. **Vertical slices** (implement 3 complete flows)
4. **Extensibility** (adapters, events, plugins)
5. **DX** (CLI, test factories, enhanced seeds)
6. **Documentation** (comprehensive docs and examples)
7. **Quality** (test coverage, performance, consistency pass)
