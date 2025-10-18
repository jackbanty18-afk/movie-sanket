import { logAppEvent } from './db';

// Rate limit storage - in production, use Redis
const rateLimitStore = new Map<string, { count: number; resetTime: number; blocked?: boolean }>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  max: number;           // Max requests per window
  skipSuccessfulRequests?: boolean;  // Don't count 2xx responses
  skipFailedRequests?: boolean;      // Don't count 4xx/5xx responses
  standardHeaders?: boolean;         // Send standard headers
  legacyHeaders?: boolean;          // Send legacy headers
  message?: string;                 // Custom error message
  blockDuration?: number;           // Block duration after limit (0 = no block)
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  current: number;
  remaining: number;
  resetTime: number;
  blocked?: boolean;
  blockExpires?: number;
}

// Rate limit configurations for different route types
export const RATE_LIMITS = {
  // Authentication routes - stricter limits
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,                   // 5 attempts per 15 minutes
    blockDuration: 30 * 60 * 1000, // Block for 30 minutes after limit
    message: 'Too many authentication attempts. Please try again later.'
  },
  
  // Admin routes - moderate limits
  admin: {
    windowMs: 60 * 1000,      // 1 minute
    max: 100,                 // 100 requests per minute
    message: 'Too many admin requests. Please slow down.'
  },
  
  // API routes - standard limits
  api: {
    windowMs: 60 * 1000,      // 1 minute
    max: 200,                 // 200 requests per minute
    message: 'Too many API requests. Please slow down.'
  },
  
  // Public routes - generous limits
  public: {
    windowMs: 60 * 1000,      // 1 minute
    max: 500,                 // 500 requests per minute
    message: 'Too many requests. Please slow down.'
  },
  
  // File upload - very strict
  upload: {
    windowMs: 60 * 1000,      // 1 minute
    max: 10,                  // 10 uploads per minute
    message: 'Too many upload requests. Please wait before uploading again.'
  },
  
  // Password reset - very strict
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,                   // 3 attempts per hour
    blockDuration: 60 * 60 * 1000, // Block for 1 hour
    message: 'Too many password reset attempts. Please try again later.'
  }
} as const;

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
  requestId?: string
): RateLimitResult {
  const now = Date.now();
  const key = `${identifier}:${config.windowMs}:${config.max}`;
  
  let data = rateLimitStore.get(key);
  
  // Check if currently blocked
  if (data?.blocked && data.resetTime > now) {
    return {
      allowed: false,
      limit: config.max,
      current: data.count,
      remaining: 0,
      resetTime: data.resetTime,
      blocked: true,
      blockExpires: data.resetTime
    };
  }
  
  // Reset if window expired or first request
  if (!data || data.resetTime <= now) {
    data = {
      count: 1,
      resetTime: now + config.windowMs,
      blocked: false
    };
    rateLimitStore.set(key, data);
    
    return {
      allowed: true,
      limit: config.max,
      current: 1,
      remaining: config.max - 1,
      resetTime: data.resetTime
    };
  }
  
  // Increment counter
  data.count++;
  
  // Check if limit exceeded
  if (data.count > config.max) {
    // Apply block if configured
    if (config.blockDuration && config.blockDuration > 0) {
      data.blocked = true;
      data.resetTime = now + config.blockDuration;
      
      // Log rate limit block
      logAppEvent({
        requestId,
        level: 'warn',
        category: 'security',
        message: `Rate limit exceeded and blocked: ${identifier}`,
        metadata: { identifier, limit: config.max, blockDuration: config.blockDuration }
      });
    }
    
    return {
      allowed: false,
      limit: config.max,
      current: data.count,
      remaining: 0,
      resetTime: data.resetTime,
      blocked: data.blocked,
      blockExpires: data.blocked ? data.resetTime : undefined
    };
  }
  
  return {
    allowed: true,
    limit: config.max,
    current: data.count,
    remaining: config.max - data.count,
    resetTime: data.resetTime
  };
}

export function getRateLimitIdentifier(req: Request, userEmail?: string): string {
  // Use user email if authenticated, otherwise use IP
  if (userEmail) {
    return `user:${userEmail}`;
  }
  
  // Try to get IP from various headers
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return `ip:${forwarded.split(',')[0].trim()}`;
  }
  
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return `ip:${realIP}`;
  }
  
  const remoteAddr = req.headers.get('remote-addr');
  if (remoteAddr) {
    return `ip:${remoteAddr}`;
  }
  
  // Fallback to a generic identifier
  return `ip:unknown`;
}

export function withRateLimit(
  handler: (req: Request, ...args: any[]) => Promise<Response>,
  config: RateLimitConfig
) {
  return async (req: Request, ...args: any[]): Promise<Response> => {
    const requestId = (req as any).requestId;
    const userEmail = (req as any).userEmail;
    
    const identifier = getRateLimitIdentifier(req, userEmail);
    const result = checkRateLimit(identifier, config, requestId);
    
    if (!result.allowed) {
      // Log rate limit violation
      logAppEvent({
        requestId,
        level: 'warn',
        category: 'security',
        message: 'Rate limit exceeded',
        metadata: {
          identifier,
          limit: result.limit,
          current: result.current,
          blocked: result.blocked,
          path: new URL(req.url).pathname
        },
        userEmail
      });
      
      const response = new Response(
        JSON.stringify({
          error: config.message || 'Too many requests',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
          limit: result.limit,
          remaining: result.remaining
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
          }
        }
      );
      
      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', result.limit.toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', result.resetTime.toString());
      
      if (result.blocked) {
        response.headers.set('X-RateLimit-Blocked', 'true');
        response.headers.set('X-RateLimit-Block-Expires', result.blockExpires!.toString());
      }
      
      return response;
    }
    
    // Execute the handler
    const response = await handler(req, ...args);
    
    // Add rate limit headers to successful responses
    if (config.standardHeaders !== false) {
      response.headers.set('X-RateLimit-Limit', result.limit.toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', result.resetTime.toString());
    }
    
    return response;
  };
}

// Predefined rate limit wrappers for common use cases
export function withAuthRateLimit(handler: (req: Request, ...args: any[]) => Promise<Response>) {
  return withRateLimit(handler, RATE_LIMITS.auth);
}

export function withAdminRateLimit(handler: (req: Request, ...args: any[]) => Promise<Response>) {
  return withRateLimit(handler, RATE_LIMITS.admin);
}

export function withApiRateLimit(handler: (req: Request, ...args: any[]) => Promise<Response>) {
  return withRateLimit(handler, RATE_LIMITS.api);
}

export function withPublicRateLimit(handler: (req: Request, ...args: any[]) => Promise<Response>) {
  return withRateLimit(handler, RATE_LIMITS.public);
}

export function withUploadRateLimit(handler: (req: Request, ...args: any[]) => Promise<Response>) {
  return withRateLimit(handler, RATE_LIMITS.upload);
}

export function withPasswordResetRateLimit(handler: (req: Request, ...args: any[]) => Promise<Response>) {
  return withRateLimit(handler, RATE_LIMITS.passwordReset);
}

// Advanced rate limiting for specific scenarios
export function withDynamicRateLimit(
  handler: (req: Request, ...args: any[]) => Promise<Response>,
  configSelector: (req: Request) => RateLimitConfig
) {
  return async (req: Request, ...args: any[]): Promise<Response> => {
    const config = configSelector(req);
    return withRateLimit(handler, config)(req, ...args);
  };
}

// Rate limit bypass for trusted sources (use carefully)
export function withBypassableRateLimit(
  handler: (req: Request, ...args: any[]) => Promise<Response>,
  config: RateLimitConfig,
  bypassChecker: (req: Request) => boolean
) {
  return async (req: Request, ...args: any[]): Promise<Response> => {
    if (bypassChecker(req)) {
      return handler(req, ...args);
    }
    return withRateLimit(handler, config)(req, ...args);
  };
}

// Get current rate limit status
export function getRateLimitStatus(identifier: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const key = `${identifier}:${config.windowMs}:${config.max}`;
  const data = rateLimitStore.get(key);
  
  if (!data || data.resetTime <= now) {
    return {
      allowed: true,
      limit: config.max,
      current: 0,
      remaining: config.max,
      resetTime: now + config.windowMs
    };
  }
  
  return {
    allowed: data.count < config.max,
    limit: config.max,
    current: data.count,
    remaining: Math.max(0, config.max - data.count),
    resetTime: data.resetTime,
    blocked: data.blocked,
    blockExpires: data.blocked ? data.resetTime : undefined
  };
}

// Clear rate limit for a specific identifier (admin function)
export function clearRateLimit(identifier: string, config?: RateLimitConfig): boolean {
  if (config) {
    const key = `${identifier}:${config.windowMs}:${config.max}`;
    return rateLimitStore.delete(key);
  } else {
    // Clear all rate limits for this identifier
    let cleared = false;
    for (const key of rateLimitStore.keys()) {
      if (key.startsWith(`${identifier}:`)) {
        rateLimitStore.delete(key);
        cleared = true;
      }
    }
    return cleared;
  }
}

// Get rate limit statistics
export function getRateLimitStats(): {
  totalEntries: number;
  activeBlocks: number;
  topIdentifiers: Array<{ identifier: string; count: number; blocked: boolean }>;
} {
  const now = Date.now();
  const stats = {
    totalEntries: rateLimitStore.size,
    activeBlocks: 0,
    topIdentifiers: [] as Array<{ identifier: string; count: number; blocked: boolean }>
  };
  
  const identifierCounts = new Map<string, { count: number; blocked: boolean }>();
  
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetTime > now) {
      const identifier = key.split(':')[0] + ':' + key.split(':')[1];
      const existing = identifierCounts.get(identifier) || { count: 0, blocked: false };
      existing.count += data.count;
      existing.blocked = existing.blocked || data.blocked || false;
      identifierCounts.set(identifier, existing);
      
      if (data.blocked && data.resetTime > now) {
        stats.activeBlocks++;
      }
    }
  }
  
  stats.topIdentifiers = Array.from(identifierCounts.entries())
    .map(([identifier, data]) => ({ identifier, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return stats;
}