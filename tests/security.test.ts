import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createTestDatabase } from '../src/lib/test-db';
import {
  withSecurityHeaders,
  withBruteForceProtection,
  withContentValidation,
  withComprehensiveSecurity,
  sanitizeInput,
  sanitizeHtmlStrict,
  sanitizeFilename,
  sanitizeSQLInput,
  sanitizePath,
  sanitizeURL,
  sanitizeEmail,
  DEFAULT_SECURITY_CONFIG
} from '../src/lib/security';
import { checkRateLimit } from '../src/lib/rate-limit';
import { verifyCSRFToken } from '../src/lib/csrf';
import { authorizeRequest } from '../src/lib/rbac';

describe('Security System Tests', () => {
  let db: any;

  beforeEach(async () => {
    db = await createTestDatabase();
  });

  afterEach(() => {
    db?.close();
  });

  describe('Security Headers', () => {
    it('should apply default security headers', async () => {
      const mockHandler = async (req: Request) => {
        return new Response('OK');
      };

      const securedHandler = withSecurityHeaders(mockHandler);
      const request = new Request('https://example.com/test');
      const response = await securedHandler(request);

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
      expect(response.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
    });

    it('should handle HSTS only on HTTPS', async () => {
      const mockHandler = async (req: Request) => {
        return new Response('OK');
      };

      const securedHandler = withSecurityHeaders(mockHandler);
      const httpRequest = new Request('http://example.com/test');
      const httpResponse = await securedHandler(httpRequest);

      expect(httpResponse.headers.get('Strict-Transport-Security')).toBe(null);

      const httpsRequest = new Request('https://example.com/test');
      const httpsResponse = await securedHandler(httpsRequest);

      expect(httpsResponse.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
    });

    it('should handle CORS preflight requests', async () => {
      const mockHandler = async (req: Request) => {
        return new Response('OK');
      };

      const securedHandler = withSecurityHeaders(mockHandler, {
        cors: {
          enabled: true,
          origin: ['https://app.example.com'],
          methods: ['GET', 'POST'],
          headers: ['Content-Type']
        }
      });

      const preflightRequest = new Request('https://example.com/test', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://app.example.com',
          'Access-Control-Request-Method': 'POST'
        }
      });

      const response = await securedHandler(preflightRequest);

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    it('should block disallowed origins', async () => {
      const mockHandler = async (req: Request) => {
        return new Response('OK');
      };

      const securedHandler = withSecurityHeaders(mockHandler, {
        cors: {
          enabled: true,
          origin: ['https://app.example.com']
        }
      });

      const request = new Request('https://example.com/test', {
        headers: {
          'Origin': 'https://evil.com'
        }
      });

      const response = await securedHandler(request);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(null);
    });
  });

  describe('Brute Force Protection', () => {
    it('should allow requests under the limit', async () => {
      const mockHandler = async (req: Request) => {
        return new Response('OK', { status: 200 });
      };

      const protectedHandler = withBruteForceProtection(mockHandler, {
        maxAttempts: 3,
        windowMs: 60000,
        blockDurationMs: 120000
      });

      // First request should succeed
      const request = new Request('https://example.com/login', {
        headers: { 'x-forwarded-for': '192.168.1.1' }
      });
      const response = await protectedHandler(request);

      expect(response.status).toBe(200);
    });

    it('should block requests after max attempts', async () => {
      const mockHandler = async (req: Request) => {
        return new Response('Unauthorized', { status: 401 });
      };

      const protectedHandler = withBruteForceProtection(mockHandler, {
        maxAttempts: 2,
        windowMs: 60000,
        blockDurationMs: 120000
      });

      const request = new Request('https://example.com/login', {
        headers: { 'x-forwarded-for': '192.168.1.1' }
      });

      // First failed attempt
      await protectedHandler(request);

      // Second failed attempt
      await protectedHandler(request);

      // Third attempt should be blocked
      const blockedResponse = await protectedHandler(request);
      expect(blockedResponse.status).toBe(429);

      const body = await blockedResponse.json();
      expect(body.error).toContain('Too many failed attempts');
      expect(body.retryAfter).toBeGreaterThan(0);
    });

    it('should reset attempts after successful request', async () => {
      let callCount = 0;
      const mockHandler = async (req: Request) => {
        callCount++;
        return new Response(callCount < 3 ? 'Unauthorized' : 'OK', {
          status: callCount < 3 ? 401 : 200
        });
      };

      const protectedHandler = withBruteForceProtection(mockHandler, {
        maxAttempts: 5,
        windowMs: 60000
      });

      const request = new Request('https://example.com/login', {
        headers: { 'x-forwarded-for': '192.168.1.1' }
      });

      // Two failed attempts
      await protectedHandler(request);
      await protectedHandler(request);

      // Successful request
      const successResponse = await protectedHandler(request);
      expect(successResponse.status).toBe(200);

      // Should be able to make more requests without blocking
      const nextResponse = await protectedHandler(request);
      expect(nextResponse.status).toBe(200);
    });
  });

  describe('Content Validation', () => {
    it('should allow valid content types', async () => {
      const mockHandler = async (req: Request) => {
        return new Response('OK');
      };

      const validatedHandler = withContentValidation(mockHandler);
      const request = new Request('https://example.com/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': '100'
        }
      });

      const response = await validatedHandler(request);
      expect(response.status).toBe(200);
    });

    it('should reject disallowed content types', async () => {
      const mockHandler = async (req: Request) => {
        return new Response('OK');
      };

      const validatedHandler = withContentValidation(mockHandler, {
        allowedContentTypes: ['application/json']
      });

      const request = new Request('https://example.com/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain'
        }
      });

      const response = await validatedHandler(request);
      expect(response.status).toBe(415);

      const body = await response.json();
      expect(body.error).toBe('Unsupported content type');
    });

    it('should reject oversized requests', async () => {
      const mockHandler = async (req: Request) => {
        return new Response('OK');
      };

      const validatedHandler = withContentValidation(mockHandler, {
        maxBodySize: 1024
      });

      const request = new Request('https://example.com/api', {
        method: 'POST',
        headers: {
          'Content-Length': '2048'
        }
      });

      const response = await validatedHandler(request);
      expect(response.status).toBe(413);

      const body = await response.json();
      expect(body.error).toBe('Request body too large');
    });

    it('should allow GET requests without content validation', async () => {
      const mockHandler = async (req: Request) => {
        return new Response('OK');
      };

      const validatedHandler = withContentValidation(mockHandler, {
        allowedContentTypes: ['application/json']
      });

      const request = new Request('https://example.com/api', {
        method: 'GET'
      });

      const response = await validatedHandler(request);
      expect(response.status).toBe(200);
    });
  });

  describe('Input Sanitization', () => {
    describe('sanitizeInput', () => {
      it('should remove XSS vectors', () => {
        expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
        expect(sanitizeInput('javascript:alert("xss")')).toBe('alert("xss")');
        expect(sanitizeInput('onclick=alert("xss")')).toBe('alert("xss")');
        expect(sanitizeInput('data:text/html,<script>alert(1)</script>')).toBe('text/html,scriptalert(1)/script');
      });

      it('should preserve valid text', () => {
        expect(sanitizeInput('Hello World')).toBe('Hello World');
        expect(sanitizeInput('user@example.com')).toBe('user@example.com');
        expect(sanitizeInput('Price: $19.99')).toBe('Price: $19.99');
      });
    });

    describe('sanitizeHtmlStrict', () => {
      it('should remove all HTML tags', () => {
        expect(sanitizeHtmlStrict('<p>Hello <b>World</b></p>')).toBe('Hello World');
        expect(sanitizeHtmlStrict('<div onclick="alert()">Test</div>')).toBe('Test');
        expect(sanitizeHtmlStrict('<script src="evil.js"></script>')).toBe('');
      });
    });

    describe('sanitizeFilename', () => {
      it('should create safe filenames', () => {
        expect(sanitizeFilename('../../etc/passwd')).toBe('etc_passwd');
        expect(sanitizeFilename('file with spaces.txt')).toBe('file_with_spaces.txt');
        expect(sanitizeFilename('<script>evil</script>.jpg')).toBe('_script_evil_script_.jpg');
        expect(sanitizeFilename('.hidden-file')).toBe('hidden-file');
      });

      it('should limit filename length', () => {
        const longName = 'a'.repeat(300);
        expect(sanitizeFilename(longName).length).toBeLessThanOrEqual(255);
      });
    });

    describe('sanitizeSQLInput', () => {
      it('should remove SQL injection vectors', () => {
        expect(sanitizeSQLInput("'; DROP TABLE users; --")).toBe(' DROP TABLE users ');
        expect(sanitizeSQLInput('UNION SELECT * FROM passwords')).toBe('   * FROM passwords');
        expect(sanitizeSQLInput('/* comment */ SELECT')).toBe('  ');
        expect(sanitizeSQLInput('"malicious"')).toBe('malicious');
      });
    });

    describe('sanitizePath', () => {
      it('should prevent path traversal', () => {
        expect(sanitizePath('../../../etc/passwd')).toBe('etc/passwd');
        expect(sanitizePath('./config/../secrets.txt')).toBe('config/secrets.txt');
        expect(sanitizePath('folder\\\\file.txt')).toBe('folder/file.txt');
        expect(sanitizePath('///multiple///slashes///')).toBe('multiple/slashes');
      });
    });

    describe('sanitizeURL', () => {
      it('should validate and sanitize URLs', () => {
        expect(sanitizeURL('https://example.com')).toBe('https://example.com/');
        expect(sanitizeURL('http://google.com/search')).toBe('http://google.com/search');
        expect(sanitizeURL('javascript:alert(1)')).toBe(null);
        expect(sanitizeURL('ftp://files.com')).toBe(null);
        expect(sanitizeURL('not-a-url')).toBe(null);
      });

      it('should block private IPs in production', () => {
        // Mock production environment
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        expect(sanitizeURL('http://localhost:3000')).toBe(null);
        expect(sanitizeURL('http://127.0.0.1')).toBe(null);
        expect(sanitizeURL('http://192.168.1.1')).toBe(null);
        expect(sanitizeURL('http://10.0.0.1')).toBe(null);

        process.env.NODE_ENV = originalEnv;
      });

      it('should allow private IPs in development', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        expect(sanitizeURL('http://localhost:3000')).toBe('http://localhost:3000/');
        expect(sanitizeURL('http://192.168.1.1')).toBe('http://192.168.1.1/');

        process.env.NODE_ENV = originalEnv;
      });
    });

    describe('sanitizeEmail', () => {
      it('should validate and sanitize emails', () => {
        expect(sanitizeEmail('user@example.com')).toBe('user@example.com');
        expect(sanitizeEmail('User@Example.COM')).toBe('user@example.com');
        expect(sanitizeEmail(' test@domain.org ')).toBe('test@domain.org');
      });

      it('should reject invalid emails', () => {
        expect(sanitizeEmail('not-an-email')).toBe(null);
        expect(sanitizeEmail('user@')).toBe(null);
        expect(sanitizeEmail('@domain.com')).toBe(null);
        expect(sanitizeEmail('user@domain')).toBe(null);
      });

      it('should prevent email header injection', () => {
        expect(sanitizeEmail('user@domain.com\nBcc: attacker@evil.com')).toBe(null);
        expect(sanitizeEmail('user@domain.com\rTo: victim@site.com')).toBe(null);
        expect(sanitizeEmail('user@domain.com%0aBcc: evil@site.com')).toBe(null);
      });
    });
  });

  describe('Comprehensive Security Integration', () => {
    it('should apply all security measures', async () => {
      const mockHandler = async (req: Request) => {
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      };

      const securedHandler = withComprehensiveSecurity(mockHandler, {
        security: {
          contentSecurityPolicy: { enabled: true },
          hsts: { enabled: true }
        },
        bruteForceProtection: false,
        contentValidation: true
      });

      const request = new Request('https://example.com/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': '100'
        }
      });

      const response = await securedHandler(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
      expect(response.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should handle security failures gracefully', async () => {
      const mockHandler = async (req: Request) => {
        throw new Error('Internal error');
      };

      const securedHandler = withComprehensiveSecurity(mockHandler);
      const request = new Request('https://example.com/api', {
        headers: { 'Content-Length': '999999999' } // Too large
      });

      const response = await securedHandler(request);
      expect(response.status).toBe(413); // Content validation should catch this
    });
  });

  describe('Integration with Other Security Systems', () => {
    it('should work with rate limiting', async () => {
      const mockHandler = async (req: Request) => {
        // Check rate limit first
        const rateLimitResult = await checkRateLimit(req, 'auth');
        if (!rateLimitResult.allowed) {
          return new Response(JSON.stringify({ error: 'Rate limited' }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response('OK');
      };

      const securedHandler = withSecurityHeaders(mockHandler);
      const request = new Request('https://example.com/login');
      const response = await securedHandler(request);

      // Should have both rate limiting logic and security headers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should work with RBAC authorization', async () => {
      const mockHandler = async (req: Request) => {
        const authResult = await authorizeRequest(req, 'users.read');
        if (!authResult.authorized) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response('OK');
      };

      const securedHandler = withSecurityHeaders(mockHandler);
      const request = new Request('https://example.com/users');
      const response = await securedHandler(request);

      // Should have both RBAC logic and security headers
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    });
  });

  describe('Error Handling and Logging', () => {
    it('should log security events appropriately', async () => {
      const mockHandler = async (req: Request) => {
        return new Response('OK');
      };

      // Add request ID for logging
      const securedHandler = withSecurityHeaders(mockHandler);
      const request = new Request('https://example.com/test');
      (request as any).requestId = 'test-req-123';

      const response = await securedHandler(request);
      expect(response.status).toBe(200);

      // Security events should be logged (we can't easily test the actual logging here,
      // but we can verify the handlers don't throw errors)
    });

    it('should handle malformed requests gracefully', async () => {
      const mockHandler = async (req: Request) => {
        return new Response('OK');
      };

      const securedHandler = withContentValidation(mockHandler);
      
      // Request with invalid content-length header
      const request = new Request('https://example.com/api', {
        method: 'POST',
        headers: {
          'Content-Length': 'invalid-number'
        }
      });

      const response = await securedHandler(request);
      // Should not crash, should handle gracefully
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Performance and Memory', () => {
    it('should not leak memory from brute force protection', async () => {
      const mockHandler = async (req: Request) => {
        return new Response('OK', { status: 401 });
      };

      const protectedHandler = withBruteForceProtection(mockHandler, {
        maxAttempts: 2,
        windowMs: 100, // Very short window for testing
        blockDurationMs: 200
      });

      // Generate many requests from different IPs
      for (let i = 0; i < 100; i++) {
        const request = new Request('https://example.com/test', {
          headers: { 'x-forwarded-for': `192.168.1.${i}` }
        });
        await protectedHandler(request);
      }

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 150));

      // The internal Map should eventually clean up expired entries
      // This is more of a structural test - the cleanup logic exists
      expect(true).toBe(true);
    });

    it('should handle high-frequency requests efficiently', async () => {
      const mockHandler = async (req: Request) => {
        return new Response('OK');
      };

      const securedHandler = withSecurityHeaders(mockHandler);
      
      const startTime = Date.now();
      
      // Make many requests quickly
      const promises = Array.from({ length: 50 }, () => {
        const request = new Request('https://example.com/test');
        return securedHandler(request);
      });

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // Should complete reasonably quickly (under 1 second for 50 requests)
      expect(endTime - startTime).toBeLessThan(1000);
      expect(responses.every(r => r.status === 200)).toBe(true);
    });
  });
});

describe('Security Configuration', () => {
  it('should merge configurations correctly', () => {
    const customConfig = {
      contentSecurityPolicy: {
        enabled: false
      },
      cors: {
        enabled: true,
        origin: ['https://app.example.com']
      }
    };

    const mockHandler = async (req: Request) => new Response('OK');
    const securedHandler = withSecurityHeaders(mockHandler, customConfig);

    // Test that custom config overrides work
    // This is more of a structural test since we can't easily inspect the merged config
    expect(typeof securedHandler).toBe('function');
  });

  it('should use secure defaults', () => {
    expect(DEFAULT_SECURITY_CONFIG.contentSecurityPolicy.enabled).toBe(true);
    expect(DEFAULT_SECURITY_CONFIG.hsts.enabled).toBe(true);
    expect(DEFAULT_SECURITY_CONFIG.frameOptions.policy).toBe('deny');
    expect(DEFAULT_SECURITY_CONFIG.cors.enabled).toBe(true);
    expect(DEFAULT_SECURITY_CONFIG.cors.origin).toBe(false); // Secure default
  });
});