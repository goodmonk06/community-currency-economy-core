# Integration Recipes

This document provides practical recipes for integrating the Community Economy Core with other systems in your ecosystem.

## Table of Contents

1. [Authentication Integration](#authentication-integration)
2. [Notification Integration](#notification-integration)
3. [Gamification Engine Integration](#gamification-engine-integration)
4. [Marketplace Integration](#marketplace-integration)
5. [Analytics & Metrics Integration](#analytics--metrics-integration)
6. [Event-Driven Architecture](#event-driven-architecture)
7. [Multi-Tenant Setup](#multi-tenant-setup)

---

## Authentication Integration

### Using Custom Auth Adapter

```typescript
import { IAuthAdapter, AuthUser, adapters } from '@community-economy/core';

class MyAuthAdapter implements IAuthAdapter {
  constructor(private authService: MyAuthService) {}

  async verifyToken(token: string): Promise<AuthUser | null> {
    const user = await this.authService.verify(token);
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      roles: user.roles,
      metadata: user.metadata,
    };
  }

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    return await this.authService.checkPermission(userId, permission);
  }

  async getRoles(userId: string): Promise<string[]> {
    const user = await this.authService.getUser(userId);
    return user.roles;
  }
}

// Register your adapter
adapters.setAuthAdapter(new MyAuthAdapter(authService));
```

### API Middleware for Authentication

```typescript
// In your Fastify API
import { adapters } from '@community-economy/core';

fastify.addHook('preHandler', async (request, reply) => {
  const token = request.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const user = await adapters.getAuthAdapter().verifyToken(token);
  if (!user) {
    return reply.status(401).send({ error: 'Invalid token' });
  }

  request.user = user; // Attach to request
});
```

---

## Notification Integration

### Email Notifications for Transactions

```typescript
import { INotificationAdapter, adapters, eventBus } from '@community-economy/core';
import { SendGridAdapter } from './sendgrid-adapter';

// Implement notification adapter
class EmailNotificationAdapter implements INotificationAdapter {
  constructor(private emailService: EmailService) {}

  async sendEmail(message: NotificationMessage): Promise<void> {
    await this.emailService.send({
      to: message.to,
      subject: message.subject,
      html: this.renderTemplate(message.template, message.data),
    });
  }

  async sendSMS(message: NotificationMessage): Promise<void> {
    // Implement SMS logic
  }

  async sendPush(message: NotificationMessage): Promise<void> {
    // Implement push notification logic
  }

  private renderTemplate(template?: string, data?: any): string {
    // Template rendering logic
    return `...`;
  }
}

// Register adapter
adapters.setNotificationAdapter(new EmailNotificationAdapter(emailService));

// Listen to transfer events and send notifications
eventBus.on('transfer.created', async (event) => {
  const { data } = event;

  // Notify recipient
  await adapters.getNotificationAdapter().sendEmail({
    to: data.toAccountId,  // Map to user email
    subject: 'You received funds!',
    template: 'transfer_received',
    data: {
      amount: data.amount,
      currency: data.currencyCode,
      reason: data.reasonCode,
    },
  });
});
```

---

## Gamification Engine Integration

### Awarding Points for Achievements

```typescript
import { TransactionService, prisma } from '@community-economy/core';

const transactionService = new TransactionService(prisma);

// When user completes an achievement
async function awardAchievement(
  userId: string,
  achievementId: string,
  points: number
) {
  const communityId = 'your-community-id';

  const result = await transactionService.transfer({
    communityId,
    currencyCode: 'KARMA',
    fromAccountRef: {
      ownerType: 'pool',
      ownerRef: 'reward_pool',
    },
    toAccountRef: {
      ownerType: 'member',
      ownerRef: userId,
    },
    amount: points,
    reasonCode: 'achievement',
    metadata: {
      achievementId,
      achievementName: 'Master Contributor',
      timestamp: new Date().toISOString(),
    },
  });

  return result;
}
```

### Daily Login Rewards with Templates

```typescript
import { TemplateService, prisma } from '@community-economy/core';

const templateService = new TemplateService(prisma);

// Create template
const dailyRewardTemplate = await templateService.createTemplate({
  communityId: 'your-community-id',
  name: 'Daily Login Reward',
  description: 'Reward for logging in',
  currencyId: karmaCurrencyId,
  fromPattern: 'pool:reward_pool',
  toPattern: 'member:*',
  amountType: 'fixed',
  fixedAmount: 10,
  reasonCode: 'daily_login',
});

// Use template to award users
async function awardDailyLogin(userId: string) {
  const template = await templateService.getTemplate(dailyRewardTemplate.id);

  await transactionService.transfer({
    communityId: template.communityId,
    currencyCode: template.currency.code,
    fromAccountRef: {
      ownerType: 'pool',
      ownerRef: 'reward_pool',
    },
    toAccountRef: {
      ownerType: 'member',
      ownerRef: userId,
    },
    amount: template.fixedAmount,
    reasonCode: template.reasonCode,
    metadata: {
      templateId: template.id,
      date: new Date().toISOString(),
    },
  });
}
```

---

## Marketplace Integration

### Processing Purchases

```typescript
import { TransactionService, BalanceService, prisma } from '@community-economy/core';

const transactionService = new TransactionService(prisma);
const balanceService = new BalanceService(prisma);

async function processPurchase(
  buyerId: string,
  sellerId: string,
  itemId: string,
  price: number
) {
  const communityId = 'marketplace-community-id';

  // Check buyer has sufficient balance
  const buyerBalances = await balanceService.getAllBalances(buyerId);
  const coinsBalance = buyerBalances.find(b => b.currencyCode === 'COINS');

  if (!coinsBalance || coinsBalance.balance.lessThan(price)) {
    throw new Error('Insufficient balance');
  }

  // Execute purchase transfer
  const result = await transactionService.transfer({
    communityId,
    currencyCode: 'COINS',
    fromAccountRef: {
      ownerType: 'member',
      ownerRef: buyerId,
    },
    toAccountRef: {
      ownerType: 'member',
      ownerRef: sellerId,
    },
    amount: price,
    reasonCode: 'purchase',
    metadata: {
      itemId,
      itemName: 'Handmade Bowl',
      category: 'pottery',
      timestamp: new Date().toISOString(),
    },
  });

  return result;
}
```

### Escrow System (Hold and Release)

```typescript
// Create an escrow pool
const escrowPool = await prisma.account.create({
  data: {
    communityId,
    ownerType: 'pool',
    ownerRef: `escrow_${orderId}`,
    displayName: `Escrow for Order ${orderId}`,
  },
});

// Step 1: Transfer to escrow
await transactionService.transfer({
  communityId,
  currencyCode: 'COINS',
  fromAccountRef: { ownerType: 'member', ownerRef: buyerId },
  toAccountRef: { ownerType: 'pool', ownerRef: `escrow_${orderId}` },
  amount: price,
  reasonCode: 'escrow_hold',
  metadata: { orderId, status: 'pending' },
});

// Step 2: Release to seller when item delivered
await transactionService.transfer({
  communityId,
  currencyCode: 'COINS',
  fromAccountRef: { ownerType: 'pool', ownerRef: `escrow_${orderId}` },
  toAccountRef: { ownerType: 'member', ownerRef: sellerId },
  amount: price,
  reasonCode: 'escrow_release',
  metadata: { orderId, status: 'delivered' },
});
```

---

## Analytics & Metrics Integration

### Custom Metrics Adapter (Prometheus)

```typescript
import { MetricsAdapter, MetricLabels, setMetricsAdapter } from '@community-economy/core';
import { Counter, Histogram, Gauge, register } from 'prom-client';

class PrometheusMetricsAdapter implements MetricsAdapter {
  private counters: Map<string, Counter> = new Map();
  private histograms: Map<string, Histogram> = new Map();
  private gauges: Map<string, Gauge> = new Map();

  incrementCounter(name: string, value: number = 1, labels?: MetricLabels): void {
    let counter = this.counters.get(name);
    if (!counter) {
      counter = new Counter({
        name,
        help: `Counter for ${name}`,
        labelNames: labels ? Object.keys(labels) : [],
      });
      this.counters.set(name, counter);
    }
    counter.inc(labels || {}, value);
  }

  recordHistogram(name: string, value: number, labels?: MetricLabels): void {
    let histogram = this.histograms.get(name);
    if (!histogram) {
      histogram = new Histogram({
        name,
        help: `Histogram for ${name}`,
        labelNames: labels ? Object.keys(labels) : [],
      });
      this.histograms.set(name, histogram);
    }
    histogram.observe(labels || {}, value);
  }

  recordGauge(name: string, value: number, labels?: MetricLabels): void {
    let gauge = this.gauges.get(name);
    if (!gauge) {
      gauge = new Gauge({
        name,
        help: `Gauge for ${name}`,
        labelNames: labels ? Object.keys(labels) : [],
      });
      this.gauges.set(name, gauge);
    }
    gauge.set(labels || {}, value);
  }

  startTimer(name: string, labels?: MetricLabels): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.recordHistogram(name, duration, labels);
    };
  }
}

// Register adapter
setMetricsAdapter(new PrometheusMetricsAdapter());

// Expose metrics endpoint
fastify.get('/metrics', async (request, reply) => {
  reply.type('text/plain');
  return register.metrics();
});
```

---

## Event-Driven Architecture

### Consuming Domain Events

```typescript
import { eventBus, DomainEvent } from '@community-economy/core';

// Listen to all events
eventBus.onAny(async (event: DomainEvent) => {
  console.log(`Event: ${event.type}`, event.data);

  // Send to external event stream (Kafka, RabbitMQ, etc.)
  await eventStream.publish(event.type, event.data);
});

// Listen to specific events
eventBus.on('transfer.created', async (event) => {
  // Update analytics database
  await analyticsDB.recordTransfer({
    communityId: event.communityId,
    amount: event.data.amount,
    currency: event.data.currencyCode,
    timestamp: event.timestamp,
  });

  // Check for milestones
  const totalSpent = await calculateTotalSpent(event.data.fromAccountId);
  if (totalSpent > 1000) {
    await awardAchievement(event.data.fromAccountId, 'big_spender', 100);
  }
});
```

### Webhook Consumers

```typescript
// Receive webhooks from economy core
import crypto from 'crypto';

app.post('/webhooks/economy', async (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);

  // Verify signature
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');

  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }

  const event = req.body;

  // Handle different event types
  switch (event.event) {
    case 'transfer.created':
      await handleTransferCreated(event.data);
      break;
    case 'account.created':
      await handleAccountCreated(event.data);
      break;
    // ... other events
  }

  res.status(200).send('OK');
});
```

---

## Multi-Tenant Setup

### Creating Isolated Communities

```typescript
import { CommunityService, prisma } from '@community-economy/core';

const communityService = new CommunityService(prisma);

// Create community for each tenant
async function provisionTenant(tenantData: {
  slug: string;
  name: string;
  currencyConfig: Array<{ code: string; name: string; decimals: number }>;
}) {
  // Create community
  const community = await communityService.createCommunity(
    tenantData.slug,
    tenantData.name
  );

  // Create currencies
  const currencies = [];
  for (const currencyConfig of tenantData.currencyConfig) {
    const currency = await communityService.createCurrency(
      community.id,
      currencyConfig.code,
      currencyConfig.name,
      undefined,
      currencyConfig.decimals
    );
    currencies.push(currency);
  }

  // Create system account
  const systemAccount = await accountService.createAccount(
    community.id,
    { ownerType: 'system', ownerRef: 'treasury' },
    'System Treasury'
  );

  // Grant initial balances to system
  for (const currency of currencies) {
    await transactionService.grantBalance(
      community.id,
      currency.code,
      { ownerType: 'system', ownerRef: 'treasury' },
      1000000,
      { note: 'Initial system funding' }
    );
  }

  return { community, currencies, systemAccount };
}
```

### Tenant Isolation Middleware

```typescript
// Fastify plugin for tenant isolation
fastify.addHook('preHandler', async (request, reply) => {
  const tenantId = request.headers['x-tenant-id'] || request.query.tenantId;

  if (!tenantId) {
    return reply.status(400).send({ error: 'Tenant ID required' });
  }

  // Verify tenant exists
  const community = await communityService.getCommunityBySlug(tenantId);
  if (!community) {
    return reply.status(404).send({ error: 'Tenant not found' });
  }

  request.tenantId = tenantId;
  request.communityId = community.id;
});
```

---

## Best Practices

1. **Use Adapters for External Integrations**
   - Always implement adapter interfaces for clean separation
   - Easy to swap implementations without changing core code

2. **Listen to Domain Events**
   - Use event bus for reactive integrations
   - Decouple services through events

3. **Validate at Integration Boundaries**
   - Use Zod schemas to validate external data
   - Return clear error messages

4. **Monitor Everything**
   - Implement custom metrics adapter for your monitoring stack
   - Track business metrics (not just technical metrics)

5. **Audit External Actions**
   - Log all integration actions via AuditService
   - Include context (IP, user agent, etc.)

6. **Handle Failures Gracefully**
   - Implement retries for webhooks
   - Use circuit breakers for external services
   - Log failures for debugging

7. **Test Integrations**
   - Use test factories to create realistic scenarios
   - Test both happy paths and error cases
   - Mock external services in tests

---

## Example: Complete Integration

Here's a complete example integrating all pieces:

```typescript
import {
  adapters,
  eventBus,
  TransactionService,
  prisma,
  setMetricsAdapter,
} from '@community-economy/core';

// 1. Setup adapters
adapters.setAuthAdapter(new Auth0Adapter(auth0Config));
adapters.setNotificationAdapter(new SendGridAdapter(sendgridConfig));
setMetricsAdapter(new DataDogAdapter(datadogConfig));

// 2. Setup event listeners
eventBus.on('transfer.created', async (event) => {
  // Send notification
  await adapters.getNotificationAdapter().sendEmail({
    to: event.data.toAccountId, // Map to user
    template: 'transfer_received',
    data: event.data,
  });

  // Track in analytics
  await analytics.track('Transfer', {
    userId: event.actorId,
    amount: event.data.amount,
    currency: event.data.currencyCode,
  });
});

// 3. Use in your application
const transactionService = new TransactionService(prisma);

app.post('/api/reward-user', async (req, res) => {
  const { userId, points, reason } = req.body;

  try {
    const result = await transactionService.transfer({
      communityId: req.communityId,
      currencyCode: 'KARMA',
      fromAccountRef: { ownerType: 'pool', ownerRef: 'reward_pool' },
      toAccountRef: { ownerType: 'member', ownerRef: userId },
      amount: points,
      reasonCode: reason,
    });

    res.json({ success: true, result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

This integrated setup provides authentication, notifications, metrics, and event-driven workflows out of the box!
