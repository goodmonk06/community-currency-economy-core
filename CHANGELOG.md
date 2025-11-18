# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Phase 3] - 2025-01-18

### Added

#### Domain Model
- **AccountGroup**: Organize accounts into hierarchical cohorts
- **AccountGroupMember**: Many-to-many relationship with roles
- **TransactionTemplate**: Reusable transaction patterns (fixed/variable amounts)
- **ScheduledTransaction**: Future and recurring transactions
- **TransactionPolicy**: Rules and limits (daily limits, approval thresholds, rate limits)
- **AuditLog**: Comprehensive activity logging for compliance
- **CurrencyExchangeRate**: Multi-currency exchange support

#### Services
- `AccountGroupService`: Create groups, add/remove members, hierarchies
- `AuditService`: Log and query audit events
- `TemplateService`: Manage transaction templates

#### Infrastructure
- **Validation**: Zod schemas for all API endpoints
- **Logging**: Structured logging with Pino (contextual logs)
- **Metrics**: Pluggable metrics abstraction (counters, histograms, gauges)
- **Error Handling**: Centralized error classes with consistent API responses
- **Domain Events**: Event bus for internal decoupling

#### Extensibility
- **Adapter Pattern**: Pluggable interfaces for external integrations
  - `INotificationAdapter`: Email, SMS, push notifications
  - `IStorageAdapter`: File storage (S3, local)
  - `IAuditAdapter`: External audit systems
  - `IAuthAdapter`: Authentication providers
  - `MetricsAdapter`: Prometheus, DataDog, custom metrics
- **Global Adapter Registry**: Easy registration and swapping

#### Developer Experience
- **CLI Tools**: `economy-cli` with 10+ commands for operations
- **Test Factories**: Comprehensive factories for all entities
- **Scenario Factory**: One-line economy creation for tests
- **Enhanced Seed Data**: 3 realistic scenarios (gamification, marketplace, treasury)
- **Scripts**: Added `typecheck`, `lint`, `cli` scripts

#### Documentation
- `docs/PHASE3_OVERVIEW.md`: Implementation plan and architecture
- `docs/INTEGRATION_RECIPES.md`: Practical integration examples
- `docs/DOMAIN_NOTES.md`: Deep dive into domain model
- Updated `README.md` with Phase 3 section

#### Vertical Slices
- **Gamification System**: Reward pools, templates, group-based rewards
- **Marketplace**: Merchant/buyer groups, purchase transactions
- **Treasury Management**: Grant pools, disbursements, audit trails

### Changed
- Moved error classes from `types/index.ts` to centralized `lib/errors/index.ts`
- Updated all exports in `src/index.ts` to include new modules
- Enhanced Prisma schema with new entities and relationships
- Added logging and metrics to core services

### Technical Details
- Added 7 new Prisma models
- Created 3 new service classes
- Implemented 5 adapter interfaces
- Added 8 test factory classes
- Created 10+ CLI commands
- Added 3 comprehensive documentation files
- Expanded README by 250+ lines

## [Phase 1-2] - 2025-01-18

### Added

#### Core Features
- Double-entry bookkeeping system
- Multi-currency support per community
- Real-time balance calculation
- Balance snapshots for performance
- Webhook integration with HMAC signing
- REST API with Fastify
- Next.js admin dashboard
- Docker deployment setup

#### Domain Model
- `Community`: Isolated economic spaces
- `Currency`: Multiple currencies per community
- `Account`: Member, pool, and system accounts
- `LedgerEntry`: Immutable transaction records
- `BalanceSnapshot`: Periodic balance caching
- `WebhookSubscription`: Event notifications

#### Services
- `CommunityService`: Community and currency management
- `AccountService`: Account CRUD operations
- `TransactionService`: Double-entry transfers with validation
- `BalanceService`: Real-time balance calculation
- `WebhookService`: Event emission with signing

#### Infrastructure
- Monorepo setup with Turbo
- PostgreSQL + Prisma ORM
- Fastify API server
- Next.js 15 admin UI
- Docker Compose setup
- Vitest testing framework

#### Documentation
- Comprehensive README
- API reference
- Docker setup guide
- Integration examples
- Webhook documentation

### Technical Stack
- TypeScript 5.6
- Node.js 20+
- PostgreSQL 14+
- Prisma 6
- Fastify 5
- Next.js 15
- Turbo (monorepo)
- pnpm (package manager)

## Roadmap

### Phase 4 (Future)
- [ ] API validation middleware implementation
- [ ] GraphQL API option
- [ ] Real-time WebSocket updates
- [ ] Scheduled transaction executor service
- [ ] Policy enforcement engine
- [ ] Multi-signature approvals
- [ ] Transaction reversals with audit trail
- [ ] Advanced analytics dashboard
- [ ] Performance optimizations (query caching, read replicas)
- [ ] Horizontal scaling guides

### Integration Enhancements
- [ ] Auth0 adapter implementation
- [ ] SendGrid adapter implementation
- [ ] Prometheus/Grafana adapter
- [ ] S3 storage adapter
- [ ] Kafka event stream integration
- [ ] Redis caching layer

### Developer Experience
- [ ] Interactive API documentation (Swagger/OpenAPI)
- [ ] Client SDK generation
- [ ] More CLI commands (reports, maintenance)
- [ ] VS Code extension
- [ ] Postman collection
- [ ] More seed scenarios

---

For detailed implementation notes, see `docs/PHASE3_OVERVIEW.md`.
For integration examples, see `docs/INTEGRATION_RECIPES.md`.
For domain model details, see `docs/DOMAIN_NOTES.md`.
