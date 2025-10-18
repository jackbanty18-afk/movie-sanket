import crypto from 'crypto';
import { logAppEvent } from './db';

// CSRF token storage - in production, use Redis or session store
const csrfTokenStore = new Map<string, { token: string; expires: number; used: boolean }>();

// Clean up expired tokens
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, data] of csrfTokenStore.entries()) {
    if (data.expires < now) {
      csrfTokenStore.delete(sessionId);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

export interface CSRFConfig {
  tokenName?: string;           // Token parameter name (default: 'csrfToken')
  headerName?: string;          // Header name for token (default: 'X-CSRF-Token')
  cookieName?: string;          // Cookie name for token (default: '__csrf')
  tokenLength?: number;         // Token length in bytes (default: 32)
  maxAge?: number;             // Token max age in ms (default: 1 hour)
  sameSite?: 'strict' | 'lax' | 'none'; // Cookie sameSite setting
  secure?: boolean;            // Cookie secure setting
  httpOnly?: boolean;          // Cookie httpOnly setting
  allowedOrigins?: string[];   // Allowed origins for CSRF bypass
  skipMethods?: string[];      // Methods to skip CSRF check (default: GET, HEAD, OPTIONS)
}

export const DEFAULT_CSRF_CONFIG: Required<CSRFConfig> = {
  tokenName: 'csrfToken',
  headerName: 'X-CSRF-Token',
  cookieName: '__csrf',
  tokenLength: 32,
  maxAge: 60 * 60 * 1000, // 1 hour
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  httpOnly: false, // Need to be accessible by JavaScript for SPA
  allowedOrigins: [],
  skipMethods: ['GET', 'HEAD', 'OPTIONS']
};

export function generateCSRFToken(sessionId: string, config: CSRFConfig = {}): string {
  const fullConfig = { ...DEFAULT_CSRF_CONFIG, ...config };
  const token = crypto.randomBytes(fullConfig.tokenLength).toString('hex');
  
  csrfTokenStore.set(sessionId, {
    token,
    expires: Date.now() + fullConfig.maxAge,
    used: false
  });
  
  return token;
}

export function validateCSRFToken(
  sessionId: string, 
  providedToken: string, 
  config: CSRFConfig = {}
): { valid: boolean; reason?: string } {
  const fullConfig = { ...DEFAULT_CSRF_CONFIG, ...config };
  
  if (!providedToken) {
    return { valid: false, reason: 'CSRF token missing' };
  }
  
  const storedData = csrfTokenStore.get(sessionId);
  if (!storedData) {
    return { valid: false, reason: 'CSRF token not found' };
  }
  
  if (storedData.expires < Date.now()) {
    csrfTokenStore.delete(sessionId);
    return { valid: false, reason: 'CSRF token expired' };
  }
  
  if (storedData.used) {
    return { valid: false, reason: 'CSRF token already used' };
  }
  
  // Use timing-safe comparison
  const providedBuffer = Buffer.from(providedToken, 'hex');
  const storedBuffer = Buffer.from(storedData.token, 'hex');
  
  if (providedBuffer.length !== storedBuffer.length) {
    return { valid: false, reason: 'CSRF token invalid' };
  }
  
  if (!crypto.timingSafeEqual(providedBuffer, storedBuffer)) {
    return { valid: false, reason: 'CSRF token invalid' };
  }
  
  // Mark token as used for one-time use
  storedData.used = true;
  
  return { valid: true };
}

export function getSessionId(req: Request): string | null {
  // Try to get session ID from various sources
  
  // 1. Authorization header (JWT sub claim)
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const { verifyJWT } = require('./auth');
      const payload = verifyJWT(token);
      if (payload?.sub) {
        return `jwt:${payload.sub}`;
      }
    } catch {
      // Ignore JWT errors
    }
  }
  
  // 2. Session cookie
  const cookieHeader = req.headers.get('cookie');
  if (cookieHeader) {
    const sessionMatch = cookieHeader.match(/session=([^;]+)/);
    if (sessionMatch) {
      return `session:${sessionMatch[1]}`;
    }
  }
  
  // 3. IP + User-Agent as fallback (less secure)
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             req.headers.get('remote-addr') || 
             'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const fallbackId = crypto.createHash('sha256').update(`${ip}:${userAgent}`).digest('hex');
  
  return `fallback:${fallbackId}`;
}

export function getCSRFTokenFromRequest(req: Request, config: CSRFConfig = {}): string | null {
  const fullConfig = { ...DEFAULT_CSRF_CONFIG, ...config };
  
  // 1. Try header first
  const headerToken = req.headers.get(fullConfig.headerName);
  if (headerToken) {
    return headerToken;
  }
  
  // 2. Try form data/JSON body (for non-GET requests)
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    // This would need to be extracted from the request body
    // The caller should pass the token from the parsed body
    return null;
  }
  
  // 3. Try URL parameter (less secure, not recommended)
  const url = new URL(req.url);
  return url.searchParams.get(fullConfig.tokenName);
}

export function checkOrigin(req: Request, allowedOrigins: string[] = []): boolean {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  
  // If no origin and no referer, reject (likely not a browser request)
  if (!origin && !referer) {
    return false;
  }
  
  // Check origin first
  if (origin) {
    if (allowedOrigins.length > 0) {
      return allowedOrigins.includes(origin);
    }
    
    // For same-origin requests, origin should match the host
    const url = new URL(req.url);
    return origin === url.origin;
  }
  
  // Check referer as fallback
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (allowedOrigins.length > 0) {
        return allowedOrigins.includes(refererUrl.origin);
      }
      
      const requestUrl = new URL(req.url);
      return refererUrl.origin === requestUrl.origin;
    } catch {
      return false;
    }
  }
  
  return false;
}

export function withCSRFProtection(
  handler: (req: Request, ...args: any[]) => Promise<Response>,
  config: CSRFConfig = {}
) {
  const fullConfig = { ...DEFAULT_CSRF_CONFIG, ...config };
  
  return async (req: Request, ...args: any[]): Promise<Response> => {
    const requestId = (req as any).requestId;
    const method = req.method.toUpperCase();
    
    // Skip CSRF check for safe methods
    if (fullConfig.skipMethods.includes(method)) {
      return handler(req, ...args);
    }
    
    // Get session ID
    const sessionId = getSessionId(req);
    if (!sessionId) {
      logAppEvent({
        requestId,
        level: 'warn',
        category: 'security',
        message: 'CSRF check failed: No session ID',
        metadata: { path: new URL(req.url).pathname, method }
      });
      
      return new Response(
        JSON.stringify({ error: 'Session required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Check origin for additional protection
    if (!checkOrigin(req, fullConfig.allowedOrigins)) {
      logAppEvent({
        requestId,
        level: 'warn',
        category: 'security',
        message: 'CSRF check failed: Invalid origin',
        metadata: { 
          path: new URL(req.url).pathname, 
          method,
          origin: req.headers.get('origin'),
          referer: req.headers.get('referer')
        }
      });
      
      return new Response(
        JSON.stringify({ error: 'Invalid origin' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Get CSRF token from request
    let csrfToken = getCSRFTokenFromRequest(req, fullConfig);
    
    // If not in headers, try to get from body
    if (!csrfToken && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      try {
        const body = await req.json();
        csrfToken = body[fullConfig.tokenName];
        // Re-create request with original body for handler
        req = new Request(req.url, {
          method: req.method,
          headers: req.headers,
          body: JSON.stringify(body)
        });
        (req as any).requestId = requestId;
      } catch {
        // Ignore JSON parsing errors
      }
    }
    
    // Validate CSRF token
    const validation = validateCSRFToken(sessionId, csrfToken || '', fullConfig);
    
    if (!validation.valid) {
      logAppEvent({
        requestId,
        level: 'warn',
        category: 'security',
        message: `CSRF check failed: ${validation.reason}`,
        metadata: { 
          path: new URL(req.url).pathname, 
          method,
          sessionId: sessionId.substring(0, 20) + '...'
        }
      });
      
      return new Response(
        JSON.stringify({ error: 'CSRF token validation failed' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // CSRF check passed, execute handler
    return handler(req, ...args);
  };
}

// Generate and set CSRF token in response
export function setCSRFToken(response: Response, sessionId: string, config: CSRFConfig = {}): Response {
  const fullConfig = { ...DEFAULT_CSRF_CONFIG, ...config };
  const token = generateCSRFToken(sessionId, fullConfig);
  
  // Set cookie
  const cookieValue = `${fullConfig.cookieName}=${token}; Max-Age=${Math.floor(fullConfig.maxAge / 1000)}; SameSite=${fullConfig.sameSite}${fullConfig.secure ? '; Secure' : ''}${fullConfig.httpOnly ? '; HttpOnly' : ''}; Path=/`;
  
  response.headers.set('Set-Cookie', cookieValue);
  
  // Also set in header for easy access
  response.headers.set(fullConfig.headerName, token);
  
  return response;
}

// Admin-specific CSRF protection with stricter settings
export function withAdminCSRFProtection(
  handler: (req: Request, ...args: any[]) => Promise<Response>
) {
  return withCSRFProtection(handler, {
    maxAge: 30 * 60 * 1000, // 30 minutes for admin actions
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
}

// API endpoint to get CSRF token
export async function generateCSRFTokenHandler(req: Request): Promise<Response> {
  const sessionId = getSessionId(req);
  
  if (!sessionId) {
    return new Response(
      JSON.stringify({ error: 'Session required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  const token = generateCSRFToken(sessionId);
  const response = new Response(
    JSON.stringify({ csrfToken: token }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  return setCSRFToken(response, sessionId);
}

// Clear CSRF token (for logout, etc.)
export function clearCSRFToken(sessionId: string): boolean {
  return csrfTokenStore.delete(sessionId);
}

// Get CSRF statistics
export function getCSRFStats(): {
  totalTokens: number;
  expiredTokens: number;
  usedTokens: number;
} {
  const now = Date.now();
  let expired = 0;
  let used = 0;
  
  for (const data of csrfTokenStore.values()) {
    if (data.expires < now) {
      expired++;
    } else if (data.used) {
      used++;
    }
  }
  
  return {
    totalTokens: csrfTokenStore.size,
    expiredTokens: expired,
    usedTokens: used
  };
}
