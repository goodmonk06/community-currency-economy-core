import { PrismaClient } from '@prisma/client';
import { logInfo, logDebug } from '../lib/logger';
import { incrementCounter } from '../lib/metrics';
import { eventBus } from '../lib/events';
import { NotFoundError, ConflictError } from '../lib/errors';

export class AccountGroupService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create an account group
   */
  async createGroup(
    communityId: string,
    name: string,
    description?: string,
    parentId?: string,
    metadata?: Record<string, any>
  ) {
    logDebug('Creating account group', { communityId, name, parentId });

    // Check if group with same name exists
    const existing = await this.prisma.accountGroup.findUnique({
      where: {
        communityId_name: {
          communityId,
          name,
        },
      },
    });

    if (existing) {
      throw new ConflictError(`Group '${name}' already exists in this community`);
    }

    // If parent specified, verify it exists
    if (parentId) {
      const parent = await this.prisma.accountGroup.findUnique({
        where: { id: parentId },
      });
      if (!parent) {
        throw new NotFoundError('AccountGroup', parentId);
      }
      if (parent.communityId !== communityId) {
        throw new ConflictError('Parent group must be in the same community');
      }
    }

    const group = await this.prisma.accountGroup.create({
      data: {
        communityId,
        name,
        description,
        parentId,
        metadataJson: metadata ? JSON.stringify(metadata) : null,
      },
    });

    logInfo('Account group created', { groupId: group.id, communityId, name });
    incrementCounter('economy.account_group.created', 1, { communityId });

    await eventBus.emit('account.group.created', {
      groupId: group.id,
      communityId,
      name,
      parentId,
    }, { communityId });

    return group;
  }

  /**
   * Add account to group
   */
  async addMember(
    groupId: string,
    accountId: string,
    role?: string
  ) {
    logDebug('Adding account to group', { groupId, accountId, role });

    // Verify group exists
    const group = await this.prisma.accountGroup.findUnique({
      where: { id: groupId },
    });
    if (!group) {
      throw new NotFoundError('AccountGroup', groupId);
    }

    // Verify account exists and is in same community
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });
    if (!account) {
      throw new NotFoundError('Account', accountId);
    }
    if (account.communityId !== group.communityId) {
      throw new ConflictError('Account must be in the same community as the group');
    }

    // Check if already a member
    const existing = await this.prisma.accountGroupMember.findUnique({
      where: {
        groupId_accountId: {
          groupId,
          accountId,
        },
      },
    });

    if (existing) {
      throw new ConflictError('Account is already a member of this group');
    }

    const membership = await this.prisma.accountGroupMember.create({
      data: {
        groupId,
        accountId,
        role,
      },
    });

    logInfo('Account added to group', { groupId, accountId, role });
    incrementCounter('economy.account_group.member_added', 1, {
      communityId: group.communityId
    });

    await eventBus.emit('account.group.member.added', {
      groupId,
      accountId,
      role,
      communityId: group.communityId,
    }, { communityId: group.communityId });

    return membership;
  }

  /**
   * Remove account from group
   */
  async removeMember(groupId: string, accountId: string) {
    await this.prisma.accountGroupMember.delete({
      where: {
        groupId_accountId: {
          groupId,
          accountId,
        },
      },
    });

    logInfo('Account removed from group', { groupId, accountId });
  }

  /**
   * Get all groups in a community
   */
  async listGroups(communityId: string, parentId?: string | null) {
    const where: any = { communityId };
    if (parentId !== undefined) {
      where.parentId = parentId;
    }

    return await this.prisma.accountGroup.findMany({
      where,
      include: {
        _count: {
          select: {
            memberships: true,
            children: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get group by ID
   */
  async getGroup(groupId: string) {
    return await this.prisma.accountGroup.findUnique({
      where: { id: groupId },
      include: {
        memberships: {
          include: {
            account: true,
          },
        },
        parent: true,
        children: true,
      },
    });
  }

  /**
   * Get all accounts in a group
   */
  async getMembers(groupId: string) {
    return await this.prisma.accountGroupMember.findMany({
      where: { groupId },
      include: {
        account: true,
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  /**
   * Get all groups an account belongs to
   */
  async getAccountGroups(accountId: string) {
    return await this.prisma.accountGroupMember.findMany({
      where: { accountId },
      include: {
        group: true,
      },
    });
  }
}
