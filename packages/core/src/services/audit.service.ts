import { PrismaClient, AuditAction, AuditEntityType } from '@prisma/client';
import { logDebug } from '../lib/logger';

export interface AuditLogEntry {
  communityId?: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  actorType: string;
  actorRef: string;
  changes?: any;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Log an audit entry
   */
  async log(entry: AuditLogEntry) {
    logDebug('Creating audit log entry', {
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
    });

    return await this.prisma.auditLog.create({
      data: {
        communityId: entry.communityId,
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        actorType: entry.actorType,
        actorRef: entry.actorRef,
        changes: entry.changes ? JSON.stringify(entry.changes) : null,
        metadataJson: entry.metadata ? JSON.stringify(entry.metadata) : null,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
  }

  /**
   * Query audit logs
   */
  async query(filters: {
    communityId?: string;
    entityType?: AuditEntityType;
    entityId?: string;
    actorRef?: string;
    action?: AuditAction;
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.communityId) where.communityId = filters.communityId;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.actorRef) where.actorRef = filters.actorRef;
    if (filters.action) where.action = filters.action;

    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = filters.from;
      if (filters.to) where.createdAt.lte = filters.to;
    }

    return await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 100,
      skip: filters.offset || 0,
    });
  }

  /**
   * Get audit trail for a specific entity
   */
  async getEntityHistory(entityType: AuditEntityType, entityId: string) {
    return await this.prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all actions by an actor
   */
  async getActorHistory(actorRef: string, limit = 100) {
    return await this.prisma.auditLog.findMany({
      where: { actorRef },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
