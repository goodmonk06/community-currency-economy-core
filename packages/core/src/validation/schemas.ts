import { z } from 'zod';

/**
 * Common validation patterns
 */
export const OwnerTypeSchema = z.enum(['member', 'pool', 'system']);

export const AccountReferenceSchema = z.object({
  ownerType: OwnerTypeSchema,
  ownerRef: z.string().min(1).max(255),
});

/**
 * Community validation schemas
 */
export const CreateCommunitySchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  name: z.string().min(1).max(255),
});

export const GetCommunitySchema = z.object({
  communityId: z.string().cuid(),
});

/**
 * Currency validation schemas
 */
export const CreateCurrencySchema = z.object({
  communityId: z.string().cuid(),
  code: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Z0-9_]+$/, 'Currency code must contain only uppercase letters, numbers, and underscores'),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  decimals: z.number().int().min(0).max(8).default(0),
});

export const GetCurrencySchema = z.object({
  communityId: z.string().cuid(),
  currencyId: z.string().cuid(),
});

/**
 * Account validation schemas
 */
export const CreateAccountSchema = z.object({
  communityId: z.string().cuid(),
  ownerType: OwnerTypeSchema,
  ownerRef: z.string().min(1).max(255),
  displayName: z.string().min(1).max(255).optional(),
});

export const GetAccountSchema = z.object({
  communityId: z.string().cuid(),
  accountId: z.string().cuid(),
});

export const GetAccountBalanceSchema = z.object({
  communityId: z.string().cuid(),
  accountId: z.string().cuid(),
});

/**
 * Transaction validation schemas
 */
export const TransferSchema = z.object({
  communityId: z.string().cuid(),
  currencyCode: z.string().min(1).max(20),
  from: AccountReferenceSchema,
  to: AccountReferenceSchema,
  amount: z.union([
    z.number().positive(),
    z.string().regex(/^\d+(\.\d+)?$/, 'Amount must be a positive number'),
  ]),
  reasonCode: z.string().min(1).max(100),
  metadata: z.record(z.any()).optional(),
});

export const GetLedgerSchema = z.object({
  communityId: z.string().cuid(),
  accountId: z.string().cuid().optional(),
  currencyId: z.string().cuid().optional(),
  limit: z.number().int().positive().max(1000).default(100).optional(),
  offset: z.number().int().min(0).default(0).optional(),
});

export const GetLedgerEntrySchema = z.object({
  ledgerEntryId: z.string().cuid(),
});

/**
 * Webhook validation schemas
 */
export const WebhookEventTypeSchema = z.enum([
  'transfer.created',
  'account.created',
  'currency.created',
  'balance.snapshot',
]);

export const CreateWebhookSubscriptionSchema = z.object({
  communityId: z.string().cuid(),
  url: z.string().url(),
  eventTypes: z.array(WebhookEventTypeSchema).min(1),
  secret: z.string().min(16).optional(),
});

export const GetWebhookSubscriptionsSchema = z.object({
  communityId: z.string().cuid(),
});

export const UpdateWebhookSubscriptionSchema = z.object({
  subscriptionId: z.string().cuid(),
  active: z.boolean().optional(),
  url: z.string().url().optional(),
  eventTypes: z.array(WebhookEventTypeSchema).min(1).optional(),
});

/**
 * Type inference helpers
 */
export type CreateCommunityInput = z.infer<typeof CreateCommunitySchema>;
export type GetCommunityInput = z.infer<typeof GetCommunitySchema>;

export type CreateCurrencyInput = z.infer<typeof CreateCurrencySchema>;
export type GetCurrencyInput = z.infer<typeof GetCurrencySchema>;

export type CreateAccountInput = z.infer<typeof CreateAccountSchema>;
export type GetAccountInput = z.infer<typeof GetAccountSchema>;
export type GetAccountBalanceInput = z.infer<typeof GetAccountBalanceSchema>;

export type TransferInput = z.infer<typeof TransferSchema>;
export type GetLedgerInput = z.infer<typeof GetLedgerSchema>;
export type GetLedgerEntryInput = z.infer<typeof GetLedgerEntrySchema>;

export type CreateWebhookSubscriptionInput = z.infer<typeof CreateWebhookSubscriptionSchema>;
export type GetWebhookSubscriptionsInput = z.infer<typeof GetWebhookSubscriptionsSchema>;
export type UpdateWebhookSubscriptionInput = z.infer<typeof UpdateWebhookSubscriptionSchema>;

/**
 * Validation helper
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safe validation helper (returns error instead of throwing)
 */
export function validateSafe<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
