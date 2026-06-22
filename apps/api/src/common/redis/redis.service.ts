import type { OnModuleDestroy } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import Redis from "ioredis";

function asNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST ?? "localhost",
      port: asNumber(process.env.REDIS_PORT, 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      db: asNumber(process.env.REDIS_DB, 0),
      maxRetriesPerRequest: 2,
      lazyConnect: true,
    });
  }

  async getJson<T>(key: string, fallback: T): Promise<T> {
    const raw = await this.safeExec(() => this.client.get(key));

    if (!raw) {
      return fallback;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number) {
    const payload = JSON.stringify(value);

    await this.safeExec(async () => {
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, payload, "EX", ttlSeconds);
        return;
      }

      await this.client.set(key, payload);
    });
  }

  async delete(key: string) {
    await this.safeExec(() => this.client.del(key));
  }

  async setIfAbsent(key: string, value: string, ttlSeconds: number) {
    const result = await this.safeExec(() =>
      this.client.set(key, value, "EX", ttlSeconds, "NX")
    );

    return result === "OK";
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  private async safeExec<T>(executor: () => Promise<T>): Promise<T> {
    if (this.client.status === "wait") {
      await this.client.connect();
    }

    return executor();
  }
}
