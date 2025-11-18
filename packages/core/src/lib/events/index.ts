/**
 * Domain events system for internal decoupling and extensibility
 */

import { logDebug, logError } from '../logger';

// ─────────────────────────────────────────────────────────────────────────────
// Event types
// ─────────────────────────────────────────────────────────────────────────────

export type DomainEventType =
  | 'community.created'
  | 'currency.created'
  | 'account.created'
  | 'account.group.created'
  | 'account.group.member.added'
  | 'transfer.created'
  | 'transfer.scheduled'
  | 'transfer.completed'
  | 'transfer.failed'
  | 'balance.snapshot.created'
  | 'policy.violated'
  | 'template.created'
  | 'webhook.sent'
  | 'webhook.failed';

export interface DomainEvent<T = any> {
  id: string;
  type: DomainEventType;
  timestamp: Date;
  communityId?: string;
  actorId?: string;
  data: T;
  metadata?: Record<string, any>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Specific event payloads
// ─────────────────────────────────────────────────────────────────────────────

export interface TransferCreatedEvent {
  ledgerEntryId: string;
  communityId: string;
  currencyId: string;
  currencyCode: string;
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  reasonCode: string;
  metadata?: any;
}

export interface AccountCreatedEvent {
  accountId: string;
  communityId: string;
  ownerType: string;
  ownerRef: string;
  displayName?: string;
}

export interface CurrencyCreatedEvent {
  currencyId: string;
  communityId: string;
  code: string;
  name: string;
  decimals: number;
}

export interface PolicyViolatedEvent {
  policyId: string;
  policyName: string;
  communityId: string;
  accountId?: string;
  currencyId?: string;
  attemptedAmount?: string;
  violationType: string;
  details: any;
}

// ─────────────────────────────────────────────────────────────────────────────
// Event handler
// ─────────────────────────────────────────────────────────────────────────────

export type EventHandler<T = any> = (event: DomainEvent<T>) => Promise<void> | void;

// ─────────────────────────────────────────────────────────────────────────────
// Event bus
// ─────────────────────────────────────────────────────────────────────────────

class EventBus {
  private handlers: Map<DomainEventType, EventHandler[]> = new Map();
  private wildcardHandlers: EventHandler[] = [];

  /**
   * Subscribe to a specific event type
   */
  on(eventType: DomainEventType, handler: EventHandler): () => void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(eventType) || [];
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to all events
   */
  onAny(handler: EventHandler): () => void {
    this.wildcardHandlers.push(handler);

    // Return unsubscribe function
    return () => {
      const index = this.wildcardHandlers.indexOf(handler);
      if (index > -1) {
        this.wildcardHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Emit an event
   */
  async emit<T>(
    type: DomainEventType,
    data: T,
    options?: {
      communityId?: string;
      actorId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    const event: DomainEvent<T> = {
      id: generateEventId(),
      type,
      timestamp: new Date(),
      communityId: options?.communityId,
      actorId: options?.actorId,
      data,
      metadata: options?.metadata,
    };

    logDebug(`Event emitted: ${type}`, {
      eventId: event.id,
      communityId: event.communityId,
    });

    // Get handlers for this event type
    const typeHandlers = this.handlers.get(type) || [];
    const allHandlers = [...typeHandlers, ...this.wildcardHandlers];

    // Execute all handlers
    await Promise.allSettled(
      allHandlers.map(async (handler) => {
        try {
          await handler(event);
        } catch (error) {
          logError(
            `Error in event handler for ${type}`,
            error as Error,
            {
              eventId: event.id,
              communityId: event.communityId,
            }
          );
        }
      })
    );
  }

  /**
   * Clear all handlers (useful for testing)
   */
  clear() {
    this.handlers.clear();
    this.wildcardHandlers = [];
  }

  /**
   * Get handler count for debugging
   */
  getHandlerCount(eventType?: DomainEventType): number {
    if (eventType) {
      return (this.handlers.get(eventType) || []).length;
    }
    let total = this.wildcardHandlers.length;
    for (const handlers of this.handlers.values()) {
      total += handlers.length;
    }
    return total;
  }
}

// Global event bus instance
export const eventBus = new EventBus();

// Helper functions
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience functions
// ─────────────────────────────────────────────────────────────────────────────

export function onTransferCreated(handler: EventHandler<TransferCreatedEvent>) {
  return eventBus.on('transfer.created', handler);
}

export function onAccountCreated(handler: EventHandler<AccountCreatedEvent>) {
  return eventBus.on('account.created', handler);
}

export function onCurrencyCreated(handler: EventHandler<CurrencyCreatedEvent>) {
  return eventBus.on('currency.created', handler);
}

export function onPolicyViolated(handler: EventHandler<PolicyViolatedEvent>) {
  return eventBus.on('policy.violated', handler);
}
