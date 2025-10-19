import { logAppEvent, logAccessRequest, logAuditTrail } from './db-router';
import { verifyJWT } from './auth';
import crypto from 'crypto';

// Initialize logging tables (skip on serverless/prod with Postgres)
(() => {
  const disable = !!process.env.DATABASE_URL || process.env.DISABLE_SQLITE === '1' || process.env.VERCEL === '1';
  if (!disable) {
    import('./db').then(m => { try { (m as any).ensureLoggingTables?.(); } catch {} }).catch(() => {});
  }
})();

// Request ID generator
export function generateRequestId(): string {
  return 'req_' + crypto.randomBytes(12).toString('hex');
}

// Get user info from request headers
export function extractUserInfo(headers: Headers): { userEmail?: string; userId?: string; } {
  try {
    const authHeader = headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return {};
    
    const token = authHeader.slice(7);
    const payload = verifyJWT(token);
    
    return {
      userEmail: payload?.email as string,
      userId: payload?.sub as string
    };
  } catch {
    return {};
  }
}

// Get client IP from request
export function getClientIP(request: Request): string {
  // Try various headers for client IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP;
  
  const remoteAddr = request.headers.get('remote-addr');
  if (remoteAddr) return remoteAddr;
  
  return 'unknown';
}

// Logger class for structured logging
export class Logger {
  private requestId?: string;
  private userEmail?: string;
  private userId?: string;
  
  constructor(requestId?: string, userEmail?: string, userId?: string) {
    this.requestId = requestId;
    this.userEmail = userEmail;
    this.userId = userId;
  }
  
  static create(requestId?: string, userEmail?: string, userId?: string) {
    return new Logger(requestId, userEmail, userId);
  }
  
  debug(category: string, message: string, metadata?: any) {
    return logAppEvent({
      requestId: this.requestId,
      level: 'debug',
      category,
      message,
      metadata,
      userEmail: this.userEmail,
      userId: this.userId
    });
  }
  
  info(category: string, message: string, metadata?: any) {
    return logAppEvent({
      requestId: this.requestId,
      level: 'info',
      category,
      message,
      metadata,
      userEmail: this.userEmail,
      userId: this.userId
    });
  }
  
  warn(category: string, message: string, metadata?: any) {
    return logAppEvent({
      requestId: this.requestId,
      level: 'warn',
      category,
      message,
      metadata,
      userEmail: this.userEmail,
      userId: this.userId
    });
  }
  
  error(category: string, message: string, metadata?: any) {
    return logAppEvent({
      requestId: this.requestId,
      level: 'error',
      category,
      message,
      metadata,
      userEmail: this.userEmail,
      userId: this.userId
    });
  }
  
  critical(category: string, message: string, metadata?: any) {
    return logAppEvent({
      requestId: this.requestId,
      level: 'critical',
      category,
      message,
      metadata,
      userEmail: this.userEmail,
      userId: this.userId
    });
  }
  
  audit(action: string, resourceType: string, resourceId?: string, oldValues?: any, newValues?: any) {
    if (!this.userEmail || !this.userId) {
      throw new Error('User info required for audit logging');
    }
    
    return logAuditTrail({
      requestId: this.requestId,
      action,
      resourceType,
      resourceId,
      oldValues,
      newValues,
      userEmail: this.userEmail,
      userId: this.userId
    });
  }
}

// Request logging middleware wrapper
export function withRequestLogging<T extends any[], R>(
  handler: (request: Request, ...args: T) => Promise<Response>,
  category: string = 'api'
) {
  return async (request: Request, ...args: T): Promise<Response> => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    const method = request.method;
    const path = new URL(request.url).pathname;
    const userAgent = request.headers.get('user-agent') || undefined;
    const ipAddress = getClientIP(request);
    const { userEmail, userId } = extractUserInfo(request.headers);
    
    // Create logger instance
    const logger = Logger.create(requestId, userEmail, userId);
    
    // Add request ID to request for downstream use
    (request as any).requestId = requestId;
    (request as any).logger = logger;
    
    let response: Response;
    let statusCode: number;
    let error: any = null;
    
    try {
      // Log request start
      logger.debug(category, `${method} ${path} - Request started`, {
        method,
        path,
        userAgent,
        ipAddress,
        userEmail
      });
      
      // Execute handler
      response = await handler(request, ...args);
      statusCode = response.status;
      
      // Log successful completion
      if (statusCode >= 400) {
        logger.warn(category, `${method} ${path} - Request completed with error status ${statusCode}`);
      } else {
        logger.info(category, `${method} ${path} - Request completed successfully`);
      }
      
    } catch (err) {
      error = err;
      statusCode = 500;
      
      // Log error
      logger.error(category, `${method} ${path} - Request failed`, {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      });
      
      // Create error response
      response = Response.json(
        { error: 'Internal server error', requestId },
        { status: 500 }
      );
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Log access request
    try {
      const requestSize = parseInt(request.headers.get('content-length') || '0');
      const responseSize = response.headers.get('content-length') 
        ? parseInt(response.headers.get('content-length')!) 
        : undefined;
      
      logAccessRequest({
        requestId,
        method,
        path,
        statusCode,
        userEmail,
        userId,
        ipAddress,
        userAgent,
        durationMs: duration,
        requestSize: requestSize || undefined,
        responseSize,
        timestamp: new Date(startTime).toISOString()
      });
    } catch (logError) {
      console.error('Failed to log access request:', logError);
    }
    
    // Add request ID to response headers
    response.headers.set('X-Request-ID', requestId);
    
    return response;
  };
}

// Audit logging helpers
export class AuditLogger {
  constructor(
    private logger: Logger,
    private ipAddress?: string
  ) {}
  
  static create(logger: Logger, ipAddress?: string) {
    return new AuditLogger(logger, ipAddress);
  }
  
  logUserAction(action: string, resourceType: string, resourceId?: string, oldValues?: any, newValues?: any) {
    try {
      return this.logger.audit(action, resourceType, resourceId, oldValues, newValues);
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }
  
  logLogin(userEmail: string, success: boolean, reason?: string) {
    this.logger.info('auth', `Login ${success ? 'successful' : 'failed'} for ${userEmail}`, {
      success,
      reason,
      ipAddress: this.ipAddress
    });
  }
  
  logLogout(userEmail: string) {
    this.logger.info('auth', `Logout for ${userEmail}`, {
      ipAddress: this.ipAddress
    });
  }
  
  logUserCreation(userData: any) {
    this.logUserAction('create', 'user', userData.id, null, {
      email: userData.email,
      fullName: userData.fullName
    });
  }
  
  logUserUpdate(userId: string, oldData: any, newData: any) {
    this.logUserAction('update', 'user', userId, oldData, newData);
  }
  
  logUserStatusChange(userId: string, oldStatus: string, newStatus: string, reason?: string) {
    this.logUserAction('status_change', 'user', userId, 
      { status: oldStatus }, 
      { status: newStatus, reason }
    );
  }
  
  logMovieAction(action: string, movieId: string, oldData?: any, newData?: any) {
    this.logUserAction(action, 'movie', movieId, oldData, newData);
  }
  
  logBookingAction(action: string, ticketId: string, oldData?: any, newData?: any) {
    this.logUserAction(action, 'booking', ticketId, oldData, newData);
  }
  
  logNotificationAction(action: string, notificationId?: string, metadata?: any) {
    this.logUserAction(action, 'notification', notificationId, null, metadata);
  }
  
  logAdminAction(action: string, resourceType: string, resourceId?: string, details?: any) {
    this.logUserAction(action, resourceType, resourceId, null, details);
  }
}

// Global logger instance for non-request contexts
export const globalLogger = Logger.create();

// Convenience functions
export function logInfo(category: string, message: string, metadata?: any) {
  return globalLogger.info(category, message, metadata);
}

export function logError(category: string, message: string, metadata?: any) {
  return globalLogger.error(category, message, metadata);
}

export function logWarn(category: string, message: string, metadata?: any) {
  return globalLogger.warn(category, message, metadata);
}

export function logDebug(category: string, message: string, metadata?: any) {
  return globalLogger.debug(category, message, metadata);
}

export function logCritical(category: string, message: string, metadata?: any) {
  return globalLogger.critical(category, message, metadata);
}