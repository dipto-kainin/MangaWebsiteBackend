import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private connectPromise?: Promise<void>;

  constructor() {
    super();
    this.connectPromise = this.$connect().catch((err) => {
      console.warn('[PrismaService] Failed to connect to database:', err.message);
    });
  }

  async ensureConnected(): Promise<void> {
    if (this.connectPromise) {
      await this.connectPromise;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect().catch(() => {});
  }
}
