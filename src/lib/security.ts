import { logAppEvent } from './db';

// Security configuration interface
export interface SecurityConfig {
  contentSecurityPolicy?: {
    enabled?: boolean;
    directives?: Record<string, string | string[]>;
    reportOnly?: boolean;
    reportUri?: string;
  };
  
  hsts?: {
    enabled?: boolean;
    maxAge?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };
  
  xssProtection?: {
    enabled?: boolean;
    mode?: 'block' | 'sanitize';
  };
  
  contentTypeOptions?: {
    enabled?: boolean;
  };
  
  frameOptions?: {
    enabled?: boolean;
    policy?: 'deny' | 'sameorigin' | string;
  };
  
  referrerPolicy?: {
    enabled?: boolean;
    policy?: 'no-referrer' | 'origin' | 'strict-origin' | 'same-origin' | string;
  };
  
  permissionsPolicy?: {
    enabled?: boolean;
    directives?: Record<string, string | string[]>;
  };
  
  cors?: {
    enabled?: boolean;
    origin?: string | string[] | boolean;
    credentials?: boolean;
    methods?: string[];
    headers?: string[];
    maxAge?: number;
  };
}

// Default security configuration
export const DEFAULT_SECURITY_CONFIG: Required<SecurityConfig> = {
  contentSecurityPolicy: {
    enabled: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'img-src': ["'self'", 'data:', 'https:'],
      'connect-src': ["'self'"],
      'object-src': ["'none'"],
      'frame-ancestors': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"]
    },
    reportOnly: false,
    reportUri: '/api/csp-report'
  },
  
  hsts: {
    enabled: true,
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: false
  },
  
  xssProtection: {
    enabled: true,
    mode: 'block'
  },
  
  contentTypeOptions: {
    enabled: true
  },
  
  frameOptions: {
    enabled: true,
    policy: 'deny'
  },
  
  referrerPolicy: {
    enabled: true,
    policy: 'strict-origin-when-cross-origin'
  },
  
  permissionsPolicy: {
    enabled: true,
    directives: {
      camera: ['()'],
      microphone: ['()'],
      geolocation: ['()'],
      payment: ['()'],
      usb: ['()'],
      magnetometer: ['()'],
      accelerometer: ['()'],
      gyroscope: ['()']
    }
  },
  
  cors: {
    enabled: true,
    origin: false, // Disable CORS by default, enable only where needed
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    headers: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400
  }
};

// Generate Content Security Policy header value
function generateCSPHeader(csp: SecurityConfig['contentSecurityPolicy']): string {
  if (!csp?.enabled || !csp.directives) return '';
  
  const directives = Object.entries(csp.directives).map(([key, values]) => {
    const valueArray = Array.isArray(values) ? values : [values];
    return `${key} ${valueArray.join(' ')}`;
  });
  
  return directives.join('; ');
}

// Generate Permissions Policy header value
function generatePermissionsPolicyHeader(pp: SecurityConfig['permissionsPolicy']): string {
  if (!pp?.enabled || !pp.directives) return '';
  
  const directives = Object.entries(pp.directives).map(([key, values]) => {
    const valueArray = Array.isArray(values) ? values : [values];
    return `${key}=(${valueArray.join(' ')})`;
  });
  
  return directives.join(', ');
}

// Security headers middleware
export function withSecurityHeaders(
  handler: (req: Request, ...args: any[]) => Promise<Response>,
  config: SecurityConfig = {}
) {
  const fullConfig = mergeConfig(DEFAULT_SECURITY_CONFIG, config);
  
  return async (req: Request, ...args: any[]): Promise<Response> => {
    const requestId = (req as any).requestId;
    
    // Execute the handler first
    const response = await handler(req, ...args);
    
    // Clone response to add headers (Response headers are immutable)
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers)
    });
    
    // Add security headers
    
    // Content Security Policy
    if (fullConfig.contentSecurityPolicy.enabled) {
      const cspValue = generateCSPHeader(fullConfig.contentSecurityPolicy);
      if (cspValue) {
        const headerName = fullConfig.contentSecurityPolicy.reportOnly 
          ? 'Content-Security-Policy-Report-Only' 
          : 'Content-Security-Policy';
        newResponse.headers.set(headerName, cspValue);
      }
    }
    
    // HTTP Strict Transport Security
    if (fullConfig.hsts.enabled && req.url.startsWith('https://')) {
      let hstsValue = `max-age=${fullConfig.hsts.maxAge}`;
      if (fullConfig.hsts.includeSubDomains) hstsValue += '; includeSubDomains';
      if (fullConfig.hsts.preload) hstsValue += '; preload';
      newResponse.headers.set('Strict-Transport-Security', hstsValue);
    }
    
    // XSS Protection
    if (fullConfig.xssProtection.enabled) {
      const xssValue = fullConfig.xssProtection.mode === 'block' 
        ? '1; mode=block' 
        : '1';
      newResponse.headers.set('X-XSS-Protection', xssValue);
    }
    
    // Content Type Options
    if (fullConfig.contentTypeOptions.enabled) {
      newResponse.headers.set('X-Content-Type-Options', 'nosniff');
    }
    
    // Frame Options
    if (fullConfig.frameOptions.enabled) {
      newResponse.headers.set('X-Frame-Options', fullConfig.frameOptions.policy.toUpperCase());
    }
    
    // Referrer Policy
    if (fullConfig.referrerPolicy.enabled) {
      newResponse.headers.set('Referrer-Policy', fullConfig.referrerPolicy.policy);
    }
    
    // Permissions Policy
    if (fullConfig.permissionsPolicy.enabled) {
      const ppValue = generatePermissionsPolicyHeader(fullConfig.permissionsPolicy);
      if (ppValue) {
        newResponse.headers.set('Permissions-Policy', ppValue);
      }
    }
    
    // Additional security headers
    newResponse.headers.set('X-Powered-By', ''); // Remove X-Powered-By header
    newResponse.headers.set('Server', ''); // Remove Server header
    
    // CORS handling
    if (fullConfig.cors.enabled) {
      const origin = req.headers.get('origin');
      
      if (shouldAllowOrigin(origin, fullConfig.cors.origin)) {
        newResponse.headers.set('Access-Control-Allow-Origin', origin || '*');
        
        if (fullConfig.cors.credentials) {
          newResponse.headers.set('Access-Control-Allow-Credentials', 'true');
        }
        
        if (req.method === 'OPTIONS') {
          // Handle preflight requests
          newResponse.headers.set('Access-Control-Allow-Methods', fullConfig.cors.methods.join(', '));
          newResponse.headers.set('Access-Control-Allow-Headers', fullConfig.cors.headers.join(', '));
          newResponse.headers.set('Access-Control-Max-Age', fullConfig.cors.maxAge.toString());
          
          return new Response(null, {
            status: 204,
            headers: newResponse.headers
          });
        }
      }
    }
    
    // Log security header application
    logAppEvent({
      requestId,
      level: 'debug',
      category: 'security',
      message: 'Security headers applied',
      metadata: {
        path: new URL(req.url).pathname,
        headersApplied: {
          csp: fullConfig.contentSecurityPolicy.enabled,
          hsts: fullConfig.hsts.enabled && req.url.startsWith('https://'),
          xss: fullConfig.xssProtection.enabled,
          frameOptions: fullConfig.frameOptions.enabled,
          cors: fullConfig.cors.enabled
        }
      }
    });
    
    return newResponse;
  };
}

// CORS origin checker
function shouldAllowOrigin(
  requestOrigin: string | null, 
  allowedOrigin: string | string[] | boolean | undefined
): boolean {
  if (allowedOrigin === true) return true;
  if (allowedOrigin === false || !allowedOrigin) return false;
  if (!requestOrigin) return false;
  
  if (typeof allowedOrigin === 'string') {
    return requestOrigin === allowedOrigin;
  }
  
  if (Array.isArray(allowedOrigin)) {
    return allowedOrigin.includes(requestOrigin);
  }
  
  return false;
}

// Merge security configurations
function mergeConfig(defaultConfig: Required<SecurityConfig>, userConfig: SecurityConfig): Required<SecurityConfig> {
  return {
    contentSecurityPolicy: { ...defaultConfig.contentSecurityPolicy, ...userConfig.contentSecurityPolicy },
    hsts: { ...defaultConfig.hsts, ...userConfig.hsts },
    xssProtection: { ...defaultConfig.xssProtection, ...userConfig.xssProtection },
    contentTypeOptions: { ...defaultConfig.contentTypeOptions, ...userConfig.contentTypeOptions },
    frameOptions: { ...defaultConfig.frameOptions, ...userConfig.frameOptions },
    referrerPolicy: { ...defaultConfig.referrerPolicy, ...userConfig.referrerPolicy },
    permissionsPolicy: { ...defaultConfig.permissionsPolicy, ...userConfig.permissionsPolicy },
    cors: { ...defaultConfig.cors, ...userConfig.cors }
  };
}

// Input sanitization functions
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: protocol (except images handled separately)
    .trim();
}

export function sanitizeHtmlStrict(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:/gi, '')
    .trim();
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9\-_.]/g, '_') // Replace invalid chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^[._-]/, '') // Remove leading dots, underscores, dashes
    .substring(0, 255); // Limit length
}

// SQL injection prevention (additional layer)
export function sanitizeSQLInput(input: string): string {
  return input
    .replace(/['";\\]/g, '') // Remove SQL special characters
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove SQL block comments start
    .replace(/\*\//g, '') // Remove SQL block comments end
    .replace(/\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b/gi, '') // Remove SQL keywords
    .trim();
}

// Path traversal prevention
export function sanitizePath(path: string): string {
  return path
    .replace(/\.\./g, '') // Remove directory traversal
    .replace(/[\\]/g, '/') // Normalize slashes
    .replace(/\/+/g, '/') // Remove multiple slashes
    .replace(/^\//, '') // Remove leading slash
    .trim();
}

// URL validation and sanitization
export function sanitizeURL(url: string): string | null {
  try {
    const parsed = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    
    // Prevent localhost/private IP access in production
    if (process.env.NODE_ENV === 'production') {
      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.')
      ) {
        return null;
      }
    }
    
    return parsed.toString();
  } catch {
    return null;
  }
}

// Email sanitization
export function sanitizeEmail(email: string): string | null {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const cleaned = email.toLowerCase().trim();
  
  if (!emailRegex.test(cleaned)) {
    return null;
  }
  
  // Prevent email header injection
  if (cleaned.includes('\n') || cleaned.includes('\r') || cleaned.includes('%0a') || cleaned.includes('%0d')) {
    return null;
  }
  
  return cleaned;
}

// Rate limiting for sensitive operations
export function withBruteForceProtection(
  handler: (req: Request, ...args: any[]) => Promise<Response>,
  options: {
    maxAttempts?: number;
    windowMs?: number;
    blockDurationMs?: number;
  } = {}
) {
  const { maxAttempts = 5, windowMs = 15 * 60 * 1000, blockDurationMs = 30 * 60 * 1000 } = options;
  const attempts = new Map<string, { count: number; resetTime: number; blocked?: boolean }>();
  
  // Clean up expired entries
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of attempts.entries()) {
      if (data.resetTime < now) {
        attempts.delete(key);
      }
    }
  }, windowMs);
  
  return async (req: Request, ...args: any[]): Promise<Response> => {
    const requestId = (req as any).requestId;
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const identifier = `brute_force:${ip}`;
    
    const now = Date.now();
    const attemptData = attempts.get(identifier);
    
    // Check if currently blocked
    if (attemptData?.blocked && attemptData.resetTime > now) {
      logAppEvent({
        requestId,
        level: 'warn',
        category: 'security',
        message: 'Brute force protection: request blocked',
        metadata: { ip, attempts: attemptData.count }
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Too many failed attempts. Please try again later.',
          retryAfter: Math.ceil((attemptData.resetTime - now) / 1000)
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Execute handler
    const response = await handler(req, ...args);
    
    // Track failed attempts (4xx/5xx status codes)
    if (response.status >= 400) {
      const current = attemptData || { count: 0, resetTime: now + windowMs, blocked: false };
      
      if (current.resetTime <= now) {
        current.count = 1;
        current.resetTime = now + windowMs;
      } else {
        current.count++;
      }
      
      // Check if should block
      if (current.count >= maxAttempts) {
        current.blocked = true;
        current.resetTime = now + blockDurationMs;
        
        logAppEvent({
          requestId,
          level: 'warn',
          category: 'security',
          message: 'Brute force protection: IP blocked',
          metadata: { ip, attempts: current.count, blockDuration: blockDurationMs }
        });
      }
      
      attempts.set(identifier, current);
    } else if (response.status < 400) {
      // Success - clear attempts
      attempts.delete(identifier);
    }
    
    return response;
  };
}

// Content validation middleware
export function withContentValidation(
  handler: (req: Request, ...args: any[]) => Promise<Response>,
  options: {
    maxBodySize?: number;
    allowedContentTypes?: string[];
    checkFileSignature?: boolean;
  } = {}
) {
  const { 
    maxBodySize = 10 * 1024 * 1024, // 10MB
    allowedContentTypes = ['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data'],
    checkFileSignature = true
  } = options;
  
  return async (req: Request, ...args: any[]): Promise<Response> => {
    const requestId = (req as any).requestId;
    const contentLength = req.headers.get('content-length');
    const contentType = req.headers.get('content-type');
    
    // Check body size
    if (contentLength && parseInt(contentLength) > maxBodySize) {
      logAppEvent({
        requestId,
        level: 'warn',
        category: 'security',
        message: 'Request body too large',
        metadata: { contentLength: parseInt(contentLength), maxBodySize }
      });
      
      return new Response(
        JSON.stringify({ error: 'Request body too large' }),
        { status: 413, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Check content type for non-GET requests
    if (req.method !== 'GET' && req.method !== 'HEAD' && contentType) {
      const isAllowed = allowedContentTypes.some(allowed => 
        contentType.toLowerCase().startsWith(allowed.toLowerCase())
      );
      
      if (!isAllowed) {
        logAppEvent({
          requestId,
          level: 'warn',
          category: 'security',
          message: 'Disallowed content type',
          metadata: { contentType, allowedTypes: allowedContentTypes }
        });
        
        return new Response(
          JSON.stringify({ error: 'Unsupported content type' }),
          { status: 415, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    return handler(req, ...args);
  };
}

// Combined security middleware
export function withComprehensiveSecurity(
  handler: (req: Request, ...args: any[]) => Promise<Response>,
  config: {
    security?: SecurityConfig;
    bruteForceProtection?: boolean;
    contentValidation?: boolean;
  } = {}
) {
  let wrappedHandler = handler;
  
  // Apply content validation
  if (config.contentValidation !== false) {
    wrappedHandler = withContentValidation(wrappedHandler);
  }
  
  // Apply brute force protection
  if (config.bruteForceProtection === true) {
    wrappedHandler = withBruteForceProtection(wrappedHandler);
  }
  
  // Apply security headers
  wrappedHandler = withSecurityHeaders(wrappedHandler, config.security);
  
  return wrappedHandler;
}