import { PrismaClient } from '@prisma/client';

export class CommunityService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new community
   */
  async createCommunity(slug: string, name: string) {
    return await this.prisma.community.create({
      data: {
        slug,
        name,
      },
    });
  }

  /**
   * Get a community by slug
   */
  async getCommunityBySlug(slug: string) {
    return await this.prisma.community.findUnique({
      where: { slug },
      include: {
        currencies: true,
      },
    });
  }

  /**
   * Get a community by ID
   */
  async getCommunityById(id: string) {
    return await this.prisma.community.findUnique({
      where: { id },
      include: {
        currencies: true,
      },
    });
  }

  /**
   * List all communities
   */
  async listCommunities() {
    return await this.prisma.community.findMany({
      include: {
        currencies: true,
        _count: {
          select: {
            accounts: true,
            ledgerEntries: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a currency for a community
   */
  async createCurrency(
    communityId: string,
    code: string,
    name: string,
    description?: string,
    decimals: number = 0
  ) {
    return await this.prisma.currency.create({
      data: {
        communityId,
        code: code.toUpperCase(),
        name,
        description,
        decimals,
      },
    });
  }

  /**
   * Get a currency by code
   */
  async getCurrency(communityId: string, code: string) {
    return await this.prisma.currency.findUnique({
      where: {
        communityId_code: {
          communityId,
          code: code.toUpperCase(),
        },
      },
    });
  }

  /**
   * List all currencies in a community
   */
  async listCurrencies(communityId: string) {
    return await this.prisma.currency.findMany({
      where: { communityId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
