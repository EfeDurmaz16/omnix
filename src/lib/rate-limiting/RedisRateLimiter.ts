import Redis from 'ioredis';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export class RedisRateLimiter {
  private redis: Redis | null = null;
  private fallbackStore = new Map<string, { count: number; resetTime: number }>();

  constructor() {
    try {
      // Initialize Redis connection if available
      const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
      if (redisUrl) {
        this.redis = new Redis(redisUrl, {
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true
        });
        
        this.redis.on('error', (err) => {
          console.warn('Redis connection error, falling back to memory:', err.message);
          this.redis = null;
        });
      }
    } catch (error) {
      console.warn('Failed to initialize Redis, using memory fallback:', error);
    }
  }

  /**
   * Sliding window rate limiter using Redis or memory fallback
   */
  async checkRateLimit(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (this.redis) {
      return this.checkRateLimitRedis(key, limit, windowMs, now, windowStart);
    } else {
      return this.checkRateLimitMemory(key, limit, windowMs, now);
    }
  }

  private async checkRateLimitRedis(
    key: string,
    limit: number,
    windowMs: number,
    now: number,
    windowStart: number
  ): Promise<RateLimitResult> {
    try {
      // Sliding window log approach using Redis sorted sets
      const pipeline = this.redis!.pipeline();
      
      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, windowStart);
      
      // Count current requests in window
      pipeline.zcard(key);
      
      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      
      // Set expiration for cleanup
      pipeline.expire(key, Math.ceil(windowMs / 1000));
      
      const results = await pipeline.exec();
      
      if (!results || results.some(([err]) => err)) {
        throw new Error('Redis pipeline failed');
      }

      const count = (results[1][1] as number) + 1; // +1 for current request
      const remaining = Math.max(0, limit - count);
      const resetTime = now + windowMs;

      return {
        allowed: count <= limit,
        limit,
        remaining,
        resetTime,
        retryAfter: count > limit ? Math.ceil(windowMs / 1000) : undefined
      };

    } catch (error) {
      console.warn('Redis rate limit check failed, falling back to memory:', error);
      this.redis = null;
      return this.checkRateLimitMemory(key, limit, windowMs, now);
    }
  }

  private checkRateLimitMemory(
    key: string,
    limit: number,
    windowMs: number,
    now: number
  ): RateLimitResult {
    const rateLimitData = this.fallbackStore.get(key);
    const resetTime = now + windowMs;

    // Reset if window has expired
    if (!rateLimitData || now > rateLimitData.resetTime) {
      this.fallbackStore.set(key, {
        count: 1,
        resetTime
      });
      
      return {
        allowed: true,
        limit,
        remaining: limit - 1,
        resetTime
      };
    }

    // Check if limit exceeded
    if (rateLimitData.count >= limit) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetTime: rateLimitData.resetTime,
        retryAfter: Math.ceil((rateLimitData.resetTime - now) / 1000)
      };
    }

    // Increment count
    rateLimitData.count++;
    this.fallbackStore.set(key, rateLimitData);

    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - rateLimitData.count),
      resetTime: rateLimitData.resetTime
    };
  }

  /**
   * Clean up expired entries from memory store
   */
  cleanupMemoryStore(): void {
    const now = Date.now();
    for (const [key, data] of this.fallbackStore) {
      if (now > data.resetTime) {
        this.fallbackStore.delete(key);
      }
    }
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getRateLimitStatus(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<Omit<RateLimitResult, 'allowed'>> {
    const now = Date.now();

    if (this.redis) {
      try {
        const windowStart = now - windowMs;
        await this.redis.zremrangebyscore(key, 0, windowStart);
        const count = await this.redis.zcard(key);
        
        return {
          limit,
          remaining: Math.max(0, limit - count),
          resetTime: now + windowMs
        };
      } catch (error) {
        console.warn('Redis status check failed, falling back to memory:', error);
        this.redis = null;
      }
    }

    // Memory fallback
    const rateLimitData = this.fallbackStore.get(key);
    if (!rateLimitData || now > rateLimitData.resetTime) {
      return {
        limit,
        remaining: limit,
        resetTime: now + windowMs
      };
    }

    return {
      limit,
      remaining: Math.max(0, limit - rateLimitData.count),
      resetTime: rateLimitData.resetTime
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  async resetRateLimit(key: string): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.del(key);
        return;
      } catch (error) {
        console.warn('Redis reset failed, falling back to memory:', error);
        this.redis = null;
      }
    }

    this.fallbackStore.delete(key);
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

// Global instance
export const rateLimiter = new RedisRateLimiter();

// Cleanup memory store every 5 minutes
setInterval(() => {
  rateLimiter.cleanupMemoryStore();
}, 5 * 60 * 1000);