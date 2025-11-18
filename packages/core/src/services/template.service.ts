import { PrismaClient, TemplateStatus } from '@prisma/client';
import { logInfo, logDebug } from '../lib/logger';
import { incrementCounter } from '../lib/metrics';
import { eventBus } from '../lib/events';
import { NotFoundError, ValidationError } from '../lib/errors';

export interface CreateTemplateParams {
  communityId: string;
  name: string;
  description?: string;
  currencyId: string;
  fromPattern: string; // e.g., "system:treasury" or "pool:*"
  toPattern: string;
  amountType: 'fixed' | 'variable';
  fixedAmount?: number | string;
  reasonCode: string;
  metadata?: Record<string, any>;
  createdBy?: string;
}

export class TemplateService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a transaction template
   */
  async createTemplate(params: CreateTemplateParams) {
    logDebug('Creating transaction template', {
      communityId: params.communityId,
      name: params.name,
    });

    // Validate amount type and fixed amount
    if (params.amountType === 'fixed' && !params.fixedAmount) {
      throw new ValidationError('Fixed amount is required for fixed amount type');
    }

    // Verify currency exists
    const currency = await this.prisma.currency.findUnique({
      where: { id: params.currencyId },
    });
    if (!currency) {
      throw new NotFoundError('Currency', params.currencyId);
    }

    if (currency.communityId !== params.communityId) {
      throw new ValidationError('Currency must belong to the same community');
    }

    const template = await this.prisma.transactionTemplate.create({
      data: {
        communityId: params.communityId,
        name: params.name,
        description: params.description,
        currencyId: params.currencyId,
        fromPattern: params.fromPattern,
        toPattern: params.toPattern,
        amountType: params.amountType,
        fixedAmount: params.fixedAmount,
        reasonCode: params.reasonCode,
        metadataJson: params.metadata ? JSON.stringify(params.metadata) : null,
        status: 'active',
        createdBy: params.createdBy,
      },
    });

    logInfo('Transaction template created', {
      templateId: template.id,
      communityId: params.communityId,
      name: params.name,
    });

    incrementCounter('economy.template.created', 1, {
      communityId: params.communityId,
    });

    await eventBus.emit('template.created', {
      templateId: template.id,
      communityId: params.communityId,
      name: params.name,
      amountType: params.amountType,
    }, { communityId: params.communityId });

    return template;
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string) {
    return await this.prisma.transactionTemplate.findUnique({
      where: { id: templateId },
      include: {
        currency: true,
        community: true,
      },
    });
  }

  /**
   * List templates for a community
   */
  async listTemplates(communityId: string, status?: TemplateStatus) {
    const where: any = { communityId };
    if (status) {
      where.status = status;
    }

    return await this.prisma.transactionTemplate.findMany({
      where,
      include: {
        currency: true,
        _count: {
          select: {
            scheduledTransactions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update template status
   */
  async updateStatus(templateId: string, status: TemplateStatus) {
    const template = await this.prisma.transactionTemplate.update({
      where: { id: templateId },
      data: { status },
    });

    logInfo('Template status updated', {
      templateId,
      status,
    });

    return template;
  }

  /**
   * Delete template (only if no scheduled transactions)
   */
  async deleteTemplate(templateId: string) {
    const template = await this.prisma.transactionTemplate.findUnique({
      where: { id: templateId },
      include: {
        _count: {
          select: {
            scheduledTransactions: true,
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundError('TransactionTemplate', templateId);
    }

    if (template._count.scheduledTransactions > 0) {
      throw new ValidationError(
        'Cannot delete template with scheduled transactions. Archive it instead.'
      );
    }

    await this.prisma.transactionTemplate.delete({
      where: { id: templateId },
    });

    logInfo('Template deleted', { templateId });
  }
}
