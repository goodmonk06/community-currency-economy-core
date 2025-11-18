/**
 * Adapter interfaces for extensibility
 * These allow plugging in different implementations for various services
 */

// ─────────────────────────────────────────────────────────────────────────────
// Notification Adapter
// ─────────────────────────────────────────────────────────────────────────────

export interface NotificationMessage {
  to: string; // Email, phone, user ID, etc.
  subject?: string;
  body: string;
  template?: string;
  data?: Record<string, any>;
}

export interface INotificationAdapter {
  sendEmail(message: NotificationMessage): Promise<void>;
  sendSMS(message: NotificationMessage): Promise<void>;
  sendPush(message: NotificationMessage): Promise<void>;
}

/**
 * No-op notification adapter (default)
 */
export class NoOpNotificationAdapter implements INotificationAdapter {
  async sendEmail(message: NotificationMessage): Promise<void> {
    console.log('[NoOpNotificationAdapter] Email would be sent:', message);
  }

  async sendSMS(message: NotificationMessage): Promise<void> {
    console.log('[NoOpNotificationAdapter] SMS would be sent:', message);
  }

  async sendPush(message: NotificationMessage): Promise<void> {
    console.log('[NoOpNotificationAdapter] Push would be sent:', message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage Adapter
// ─────────────────────────────────────────────────────────────────────────────

export interface StorageFile {
  key: string;
  content: Buffer | string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface IStorageAdapter {
  upload(file: StorageFile): Promise<string>; // Returns URL or key
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
}

/**
 * In-memory storage adapter (default, for testing)
 */
export class InMemoryStorageAdapter implements IStorageAdapter {
  private storage: Map<string, Buffer> = new Map();

  async upload(file: StorageFile): Promise<string> {
    const content =
      typeof file.content === 'string'
        ? Buffer.from(file.content)
        : file.content;
    this.storage.set(file.key, content);
    return file.key;
  }

  async download(key: string): Promise<Buffer> {
    const content = this.storage.get(key);
    if (!content) {
      throw new Error(`File not found: ${key}`);
    }
    return content;
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.storage.has(key);
  }

  async getSignedUrl(key: string, expiresIn: number): Promise<string> {
    return `in-memory://${key}?expires=${Date.now() + expiresIn}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit Adapter
// ─────────────────────────────────────────────────────────────────────────────

export interface AuditEntry {
  entityType: string;
  entityId: string;
  action: string;
  actorType: string;
  actorRef: string;
  changes?: any;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface IAuditAdapter {
  log(entry: AuditEntry): Promise<void>;
  query(filters: {
    entityType?: string;
    entityId?: string;
    actorRef?: string;
    from?: Date;
    to?: Date;
  }): Promise<AuditEntry[]>;
}

/**
 * Console audit adapter (default)
 */
export class ConsoleAuditAdapter implements IAuditAdapter {
  async log(entry: AuditEntry): Promise<void> {
    console.log('[AUDIT]', JSON.stringify(entry, null, 2));
  }

  async query(filters: any): Promise<AuditEntry[]> {
    console.log('[AUDIT] Query:', filters);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth Adapter
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email?: string;
  roles: string[];
  metadata?: Record<string, any>;
}

export interface IAuthAdapter {
  verifyToken(token: string): Promise<AuthUser | null>;
  hasPermission(userId: string, permission: string): Promise<boolean>;
  getRoles(userId: string): Promise<string[]>;
}

/**
 * Pass-through auth adapter (default, no auth)
 */
export class NoOpAuthAdapter implements IAuthAdapter {
  async verifyToken(token: string): Promise<AuthUser | null> {
    // No-op: always return a default user
    return {
      id: 'anonymous',
      roles: ['user'],
    };
  }

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    return true; // No-op: always allow
  }

  async getRoles(userId: string): Promise<string[]> {
    return ['user'];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Global adapter registry
// ─────────────────────────────────────────────────────────────────────────────

class AdapterRegistry {
  private notification: INotificationAdapter = new NoOpNotificationAdapter();
  private storage: IStorageAdapter = new InMemoryStorageAdapter();
  private audit: IAuditAdapter = new ConsoleAuditAdapter();
  private auth: IAuthAdapter = new NoOpAuthAdapter();

  setNotificationAdapter(adapter: INotificationAdapter) {
    this.notification = adapter;
  }

  getNotificationAdapter(): INotificationAdapter {
    return this.notification;
  }

  setStorageAdapter(adapter: IStorageAdapter) {
    this.storage = adapter;
  }

  getStorageAdapter(): IStorageAdapter {
    return this.storage;
  }

  setAuditAdapter(adapter: IAuditAdapter) {
    this.audit = adapter;
  }

  getAuditAdapter(): IAuditAdapter {
    return this.audit;
  }

  setAuthAdapter(adapter: IAuthAdapter) {
    this.auth = adapter;
  }

  getAuthAdapter(): IAuthAdapter {
    return this.auth;
  }
}

export const adapters = new AdapterRegistry();
