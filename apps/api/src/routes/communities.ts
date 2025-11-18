import { FastifyPluginAsync } from 'fastify';
import {
  CommunityService,
  AccountService,
  TransactionService,
  BalanceService,
  WebhookService,
  prisma,
} from '@community-economy/core';

const communityService = new CommunityService(prisma);
const accountService = new AccountService(prisma);
const transactionService = new TransactionService(prisma);
const balanceService = new BalanceService(prisma);
const webhookService = new WebhookService(prisma);

const communitiesRoutes: FastifyPluginAsync = async (fastify) => {
  // List all communities
  fastify.get('/', async (request, reply) => {
    const communities = await communityService.listCommunities();
    return { communities };
  });

  // Create a community
  fastify.post<{
    Body: { slug: string; name: string };
  }>('/', async (request, reply) => {
    const { slug, name } = request.body;
    const community = await communityService.createCommunity(slug, name);
    return { community };
  });

  // Get a specific community
  fastify.get<{
    Params: { communityId: string };
  }>('/:communityId', async (request, reply) => {
    const { communityId } = request.params;
    const community = await communityService.getCommunityById(communityId);

    if (!community) {
      return reply.status(404).send({ error: 'Community not found' });
    }

    return { community };
  });

  // Create a currency
  fastify.post<{
    Params: { communityId: string };
    Body: {
      code: string;
      name: string;
      description?: string;
      decimals?: number;
    };
  }>('/:communityId/currencies', async (request, reply) => {
    const { communityId } = request.params;
    const { code, name, description, decimals } = request.body;

    const currency = await communityService.createCurrency(
      communityId,
      code,
      name,
      description,
      decimals
    );

    // Emit webhook event
    await webhookService.emitEvent(communityId, 'currency.created', {
      currency,
    });

    return { currency };
  });

  // List currencies
  fastify.get<{
    Params: { communityId: string };
  }>('/:communityId/currencies', async (request, reply) => {
    const { communityId } = request.params;
    const currencies = await communityService.listCurrencies(communityId);
    return { currencies };
  });

  // Create an account
  fastify.post<{
    Params: { communityId: string };
    Body: {
      ownerType: 'member' | 'pool' | 'system';
      ownerRef: string;
      displayName?: string;
    };
  }>('/:communityId/accounts', async (request, reply) => {
    const { communityId } = request.params;
    const { ownerType, ownerRef, displayName } = request.body;

    const account = await accountService.createAccount(
      communityId,
      { ownerType, ownerRef },
      displayName
    );

    // Emit webhook event
    await webhookService.emitEvent(communityId, 'account.created', {
      account,
    });

    return { account };
  });

  // List accounts
  fastify.get<{
    Params: { communityId: string };
  }>('/:communityId/accounts', async (request, reply) => {
    const { communityId } = request.params;
    const accounts = await accountService.listAccounts(communityId);
    return { accounts };
  });

  // Get account balance
  fastify.get<{
    Params: { communityId: string; accountId: string };
  }>('/:communityId/accounts/:accountId/balance', async (request, reply) => {
    const { accountId } = request.params;
    const balances = await balanceService.getAllBalances(accountId);
    return { balances };
  });

  // Execute a transfer
  fastify.post<{
    Params: { communityId: string };
    Body: {
      currencyCode: string;
      from: {
        ownerType: 'member' | 'pool' | 'system';
        ownerRef: string;
      };
      to: {
        ownerType: 'member' | 'pool' | 'system';
        ownerRef: string;
      };
      amount: number | string;
      reasonCode: string;
      metadata?: Record<string, any>;
    };
  }>('/:communityId/transfer', async (request, reply) => {
    const { communityId } = request.params;
    const { currencyCode, from, to, amount, reasonCode, metadata } =
      request.body;

    try {
      const result = await transactionService.transfer({
        communityId,
        currencyCode,
        fromAccountRef: from,
        toAccountRef: to,
        amount,
        reasonCode,
        metadata,
      });

      // Emit webhook event
      await webhookService.emitEvent(communityId, 'transfer.created', {
        transfer: result,
        currencyCode,
        reasonCode,
        metadata,
      });

      return { transfer: result };
    } catch (error: any) {
      if (error.name === 'InsufficientBalanceError') {
        return reply.status(400).send({
          error: 'Insufficient balance',
          details: error.message,
        });
      }
      if (error.name === 'AccountNotFoundError') {
        return reply.status(404).send({
          error: 'Account not found',
          details: error.message,
        });
      }
      if (error.name === 'CurrencyNotFoundError') {
        return reply.status(404).send({
          error: 'Currency not found',
          details: error.message,
        });
      }
      if (error.name === 'InvalidAmountError') {
        return reply.status(400).send({
          error: 'Invalid amount',
          details: error.message,
        });
      }
      throw error;
    }
  });

  // Get ledger entries
  fastify.get<{
    Params: { communityId: string };
    Querystring: {
      accountId?: string;
      currencyId?: string;
      limit?: string;
      offset?: string;
    };
  }>('/:communityId/ledger', async (request, reply) => {
    const { communityId } = request.params;
    const { accountId, currencyId, limit, offset } = request.query;

    const entries = await transactionService.getLedger(communityId, {
      accountId,
      currencyId,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    return { entries };
  });

  // Create webhook subscription
  fastify.post<{
    Params: { communityId: string };
    Body: {
      url: string;
      eventTypes: Array<
        | 'transfer.created'
        | 'account.created'
        | 'currency.created'
        | 'balance.snapshot'
      >;
      secret?: string;
    };
  }>('/:communityId/webhooks', async (request, reply) => {
    const { communityId } = request.params;
    const { url, eventTypes, secret } = request.body;

    const subscription = await webhookService.createSubscription(
      communityId,
      url,
      eventTypes,
      secret
    );

    // Don't return the secret in the response
    const { secret: _, ...subscriptionWithoutSecret } = subscription;

    return { subscription: subscriptionWithoutSecret };
  });

  // List webhook subscriptions
  fastify.get<{
    Params: { communityId: string };
  }>('/:communityId/webhooks', async (request, reply) => {
    const { communityId } = request.params;
    const subscriptions = await webhookService.listSubscriptions(communityId);

    // Don't return secrets
    const subscriptionsWithoutSecrets = subscriptions.map((sub) => {
      const { secret: _, ...rest } = sub;
      return rest;
    });

    return { subscriptions: subscriptionsWithoutSecrets };
  });
};

export default communitiesRoutes;
