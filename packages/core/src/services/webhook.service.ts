import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

export type WebhookEventType =
  | 'transfer.created'
  | 'account.created'
  | 'currency.created'
  | 'balance.snapshot';

export interface WebhookPayload {
  event: WebhookEventType;
  communityId: string;
  timestamp: string;
  data: any;
}

export class WebhookService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a webhook subscription
   */
  async createSubscription(
    communityId: string,
    url: string,
    eventTypes: WebhookEventType[],
    secret?: string
  ) {
    const webhookSecret =
      secret || crypto.randomBytes(32).toString('base64url');

    return await this.prisma.webhookSubscription.create({
      data: {
        communityId,
        url,
        secret: webhookSecret,
        eventTypesJson: JSON.stringify(eventTypes),
        active: true,
      },
    });
  }

  /**
   * Get active subscriptions for a community and event type
   */
  async getActiveSubscriptions(
    communityId: string,
    eventType: WebhookEventType
  ) {
    const subscriptions = await this.prisma.webhookSubscription.findMany({
      where: {
        communityId,
        active: true,
      },
    });

    // Filter by event type
    return subscriptions.filter((sub) => {
      const eventTypes = JSON.parse(sub.eventTypesJson) as WebhookEventType[];
      return eventTypes.includes(eventType);
    });
  }

  /**
   * Sign a webhook payload
   */
  signPayload(payload: string, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    return hmac.digest('hex');
  }

  /**
   * Emit a webhook event
   */
  async emitEvent(
    communityId: string,
    eventType: WebhookEventType,
    data: any
  ): Promise<void> {
    const subscriptions = await this.getActiveSubscriptions(
      communityId,
      eventType
    );

    if (subscriptions.length === 0) {
      return;
    }

    const payload: WebhookPayload = {
      event: eventType,
      communityId,
      timestamp: new Date().toISOString(),
      data,
    };

    const payloadString = JSON.stringify(payload);

    // Send webhooks in parallel (don't await individual calls)
    const promises = subscriptions.map(async (subscription) => {
      try {
        const signature = this.signPayload(payloadString, subscription.secret);

        await fetch(subscription.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': eventType,
          },
          body: payloadString,
        });
      } catch (error) {
        console.error(
          `Failed to send webhook to ${subscription.url}:`,
          error
        );
        // In production, you might want to implement retry logic or dead letter queue
      }
    });

    // Fire and forget - we don't wait for webhooks to complete
    Promise.allSettled(promises).catch((error) => {
      console.error('Error sending webhooks:', error);
    });
  }

  /**
   * List all subscriptions for a community
   */
  async listSubscriptions(communityId: string) {
    return await this.prisma.webhookSubscription.findMany({
      where: { communityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Deactivate a subscription
   */
  async deactivateSubscription(id: string) {
    return await this.prisma.webhookSubscription.update({
      where: { id },
      data: { active: false },
    });
  }

  /**
   * Activate a subscription
   */
  async activateSubscription(id: string) {
    return await this.prisma.webhookSubscription.update({
      where: { id },
      data: { active: true },
    });
  }
}
