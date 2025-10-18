import { verifyJWT } from './auth';
import { getRolesByEmail, logAppEvent, logAuditTrail } from './db';

// Define all possible permissions in the system
export const PERMISSIONS = {
  // User management
  USER_READ: 'user:read',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_BAN: 'user:ban',
  USER_ROLES: 'user:roles',
  
  // Movie management
  MOVIE_READ: 'movie:read',
  MOVIE_CREATE: 'movie:create',
  MOVIE_UPDATE: 'movie:update',
  MOVIE_DELETE: 'movie:delete',
  MOVIE_PUBLISH: 'movie:publish',
  
  // Theatre management
  THEATRE_READ: 'theatre:read',
  THEATRE_CREATE: 'theatre:create',
  THEATRE_UPDATE: 'theatre:update',
  THEATRE_DELETE: 'theatre:delete',
  
  // Show management
  SHOW_READ: 'show:read',
  SHOW_CREATE: 'show:create',
  SHOW_UPDATE: 'show:update',
  SHOW_DELETE: 'show:delete',
  SHOW_PUBLISH: 'show:publish',
  
  // Booking management
  BOOKING_READ: 'booking:read',
  BOOKING_CREATE: 'booking:create',
  BOOKING_UPDATE: 'booking:update',
  BOOKING_DELETE: 'booking:delete',
  BOOKING_REFUND: 'booking:refund',
  BOOKING_CANCEL: 'booking:cancel',
  
  // Category management
  CATEGORY_READ: 'category:read',
  CATEGORY_CREATE: 'category:create',
  CATEGORY_UPDATE: 'category:update',
  CATEGORY_DELETE: 'category:delete',
  
  // Notification management
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_CREATE: 'notification:create',
  NOTIFICATION_UPDATE: 'notification:update',
  NOTIFICATION_DELETE: 'notification:delete',
  NOTIFICATION_SEND: 'notification:send',
  
  // System administration
  SYSTEM_LOGS: 'system:logs',
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_BACKUP: 'system:backup',
  SYSTEM_MAINTENANCE: 'system:maintenance',
  
  // Financial
  FINANCE_READ: 'finance:read',
  FINANCE_REFUNDS: 'finance:refunds',
  FINANCE_REPORTS: 'finance:reports'
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Define role permissions mapping
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: [
    // Full access to everything
    ...Object.values(PERMISSIONS)
  ],
  
  manager: [
    // Movie and theatre management
    PERMISSIONS.MOVIE_READ, PERMISSIONS.MOVIE_CREATE, PERMISSIONS.MOVIE_UPDATE, PERMISSIONS.MOVIE_PUBLISH,
    PERMISSIONS.THEATRE_READ, PERMISSIONS.THEATRE_CREATE, PERMISSIONS.THEATRE_UPDATE,
    PERMISSIONS.SHOW_READ, PERMISSIONS.SHOW_CREATE, PERMISSIONS.SHOW_UPDATE, PERMISSIONS.SHOW_PUBLISH,
    PERMISSIONS.CATEGORY_READ, PERMISSIONS.CATEGORY_CREATE, PERMISSIONS.CATEGORY_UPDATE,
    
    // Booking management
    PERMISSIONS.BOOKING_READ, PERMISSIONS.BOOKING_UPDATE, PERMISSIONS.BOOKING_CANCEL, PERMISSIONS.BOOKING_REFUND,
    
    // User management (limited)
    PERMISSIONS.USER_READ,
    
    // Notifications
    PERMISSIONS.NOTIFICATION_READ, PERMISSIONS.NOTIFICATION_CREATE, PERMISSIONS.NOTIFICATION_SEND,
    
    // Finance (read only)
    PERMISSIONS.FINANCE_READ, PERMISSIONS.FINANCE_REPORTS
  ],
  
  moderator: [
    // Content moderation
    PERMISSIONS.MOVIE_READ, PERMISSIONS.MOVIE_UPDATE, PERMISSIONS.MOVIE_PUBLISH,
    PERMISSIONS.SHOW_READ, PERMISSIONS.SHOW_UPDATE,
    PERMISSIONS.CATEGORY_READ,
    
    // User management (limited)
    PERMISSIONS.USER_READ, PERMISSIONS.USER_BAN,
    
    // Booking support
    PERMISSIONS.BOOKING_READ, PERMISSIONS.BOOKING_UPDATE,
    
    // Basic notifications
    PERMISSIONS.NOTIFICATION_READ, PERMISSIONS.NOTIFICATION_CREATE
  ],
  
  support: [
    // Customer support
    PERMISSIONS.USER_READ,
    PERMISSIONS.BOOKING_READ, PERMISSIONS.BOOKING_UPDATE, PERMISSIONS.BOOKING_CANCEL,
    PERMISSIONS.MOVIE_READ,
    PERMISSIONS.THEATRE_READ,
    PERMISSIONS.SHOW_READ
  ],
  
  user: [
    // Basic user permissions
    PERMISSIONS.MOVIE_READ,
    PERMISSIONS.THEATRE_READ,
    PERMISSIONS.SHOW_READ,
    PERMISSIONS.BOOKING_CREATE
  ]
};

export interface UserContext {
  userId: string;
  email: string;
  roles: string[];
  permissions: Permission[];
  isAuthenticated: boolean;
}

export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
  requiredPermissions?: Permission[];
  userPermissions?: Permission[];
}

// Extract user context from request
export function getUserContext(req: Request): UserContext {
  const defaultContext: UserContext = {
    userId: '',
    email: '',
    roles: [],
    permissions: [],
    isAuthenticated: false
  };

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return defaultContext;
    }

    const token = authHeader.slice(7);
    const payload = verifyJWT(token);
    
    if (!payload?.sub || !payload?.email) {
      return defaultContext;
    }

    // Get user roles from database
    const roles = getRolesByEmail(payload.email) || [];
    
    // Calculate permissions based on roles
    const permissions = new Set<Permission>();
    for (const role of roles) {
      const rolePermissions = ROLE_PERMISSIONS[role] || [];
      rolePermissions.forEach(permission => permissions.add(permission));
    }

    return {
      userId: payload.sub as string,
      email: payload.email as string,
      roles,
      permissions: Array.from(permissions),
      isAuthenticated: true
    };
  } catch (error) {
    return defaultContext;
  }
}

// Check if user has specific permissions
export function hasPermission(userContext: UserContext, ...requiredPermissions: Permission[]): boolean {
  if (!userContext.isAuthenticated) return false;
  if (requiredPermissions.length === 0) return true;
  
  return requiredPermissions.every(permission => 
    userContext.permissions.includes(permission)
  );
}

// Check if user has any of the specified permissions
export function hasAnyPermission(userContext: UserContext, ...requiredPermissions: Permission[]): boolean {
  if (!userContext.isAuthenticated) return false;
  if (requiredPermissions.length === 0) return true;
  
  return requiredPermissions.some(permission => 
    userContext.permissions.includes(permission)
  );
}

// Check if user has specific role
export function hasRole(userContext: UserContext, ...requiredRoles: string[]): boolean {
  if (!userContext.isAuthenticated) return false;
  if (requiredRoles.length === 0) return true;
  
  return requiredRoles.some(role => 
    userContext.roles.includes(role)
  );
}

// Resource ownership check
export function canAccessResource(
  userContext: UserContext, 
  resourceOwnerId?: string, 
  requiredPermissions: Permission[] = []
): boolean {
  if (!userContext.isAuthenticated) return false;
  
  // Admins can access everything
  if (hasRole(userContext, 'admin')) return true;
  
  // Check if user owns the resource
  const ownsResource = resourceOwnerId === userContext.userId;
  
  // If user owns resource and has basic permissions, allow
  if (ownsResource && hasPermission(userContext, ...requiredPermissions)) {
    return true;
  }
  
  // Check for elevated permissions (for accessing others' resources)
  const elevatedPermissions = requiredPermissions.map(p => 
    p.replace(':read', ':read_all')
     .replace(':update', ':update_all')
     .replace(':delete', ':delete_all')
  ) as Permission[];
  
  return hasAnyPermission(userContext, ...elevatedPermissions);
}

// Authorization middleware
export function withAuthorization(
  handler: (req: Request, userContext: UserContext, ...args: any[]) => Promise<Response>,
  requiredPermissions: Permission[] = []
) {
  return async (req: Request, ...args: any[]): Promise<Response> => {
    const requestId = (req as any).requestId;
    const userContext = getUserContext(req);
    
    // Check authentication
    if (!userContext.isAuthenticated) {
      logAppEvent({
        requestId,
        level: 'warn',
        category: 'security',
        message: 'Unauthorized access attempt - no authentication',
        metadata: { path: new URL(req.url).pathname, method: req.method }
      });
      
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Check permissions
    if (requiredPermissions.length > 0 && !hasPermission(userContext, ...requiredPermissions)) {
      logAppEvent({
        requestId,
        level: 'warn',
        category: 'security',
        message: 'Authorization failed - insufficient permissions',
        metadata: { 
          path: new URL(req.url).pathname,
          method: req.method,
          userId: userContext.userId,
          userEmail: userContext.email,
          userRoles: userContext.roles,
          requiredPermissions,
          userPermissions: userContext.permissions
        },
        userEmail: userContext.email,
        userId: userContext.userId
      });
      
      // Log audit trail for failed authorization
      logAuditTrail({
        requestId,
        action: 'authorization_failed',
        resourceType: 'api_endpoint',
        resourceId: new URL(req.url).pathname,
        userEmail: userContext.email,
        userId: userContext.userId,
        oldValues: { requiredPermissions },
        newValues: { userPermissions: userContext.permissions, result: 'denied' }
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient permissions',
          requiredPermissions,
          userPermissions: userContext.permissions
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Log successful authorization for sensitive actions
    if (requiredPermissions.some(p => p.includes('delete') || p.includes('ban') || p.includes('system'))) {
      logAppEvent({
        requestId,
        level: 'info',
        category: 'security',
        message: 'Sensitive action authorized',
        metadata: { 
          path: new URL(req.url).pathname,
          method: req.method,
          userId: userContext.userId,
          userEmail: userContext.email,
          requiredPermissions
        },
        userEmail: userContext.email,
        userId: userContext.userId
      });
    }
    
    return handler(req, userContext, ...args);
  };
}

// Role-based authorization (simpler version)
export function withRoleAuthorization(
  handler: (req: Request, userContext: UserContext, ...args: any[]) => Promise<Response>,
  requiredRoles: string[] = []
) {
  return async (req: Request, ...args: any[]): Promise<Response> => {
    const userContext = getUserContext(req);
    
    if (!userContext.isAuthenticated) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (requiredRoles.length > 0 && !hasRole(userContext, ...requiredRoles)) {
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient role privileges',
          requiredRoles,
          userRoles: userContext.roles
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return handler(req, userContext, ...args);
  };
}

// Admin authorization (convenience function)
export function withAdminAuthorization(
  handler: (req: Request, userContext: UserContext, ...args: any[]) => Promise<Response>
) {
  return withRoleAuthorization(handler, ['admin']);
}

// Resource ownership authorization
export function withResourceAuthorization(
  handler: (req: Request, userContext: UserContext, ...args: any[]) => Promise<Response>,
  resourceOwnerExtractor: (req: Request, ...args: any[]) => Promise<string | undefined>,
  requiredPermissions: Permission[] = []
) {
  return async (req: Request, ...args: any[]): Promise<Response> => {
    const userContext = getUserContext(req);
    
    if (!userContext.isAuthenticated) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const resourceOwnerId = await resourceOwnerExtractor(req, ...args);
    
    if (!canAccessResource(userContext, resourceOwnerId, requiredPermissions)) {
      return new Response(
        JSON.stringify({ error: 'Access denied to this resource' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return handler(req, userContext, ...args);
  };
}

// Check multiple authorization conditions
export function checkAuthorization(
  userContext: UserContext,
  conditions: {
    permissions?: Permission[];
    roles?: string[];
    resourceOwnerId?: string;
    customCheck?: (userContext: UserContext) => boolean;
  }
): AuthorizationResult {
  if (!userContext.isAuthenticated) {
    return { authorized: false, reason: 'Not authenticated' };
  }
  
  // Check permissions
  if (conditions.permissions && !hasPermission(userContext, ...conditions.permissions)) {
    return {
      authorized: false,
      reason: 'Insufficient permissions',
      requiredPermissions: conditions.permissions,
      userPermissions: userContext.permissions
    };
  }
  
  // Check roles
  if (conditions.roles && !hasRole(userContext, ...conditions.roles)) {
    return {
      authorized: false,
      reason: 'Insufficient role privileges'
    };
  }
  
  // Check resource ownership
  if (conditions.resourceOwnerId && !canAccessResource(userContext, conditions.resourceOwnerId, conditions.permissions)) {
    return {
      authorized: false,
      reason: 'Cannot access this resource'
    };
  }
  
  // Custom check
  if (conditions.customCheck && !conditions.customCheck(userContext)) {
    return {
      authorized: false,
      reason: 'Custom authorization check failed'
    };
  }
  
  return { authorized: true };
}

// Get permission hierarchy (for UI display)
export function getPermissionHierarchy(): Record<string, Permission[]> {
  const hierarchy: Record<string, Permission[]> = {};
  
  for (const permission of Object.values(PERMISSIONS)) {
    const [resource] = permission.split(':');
    if (!hierarchy[resource]) {
      hierarchy[resource] = [];
    }
    hierarchy[resource].push(permission);
  }
  
  return hierarchy;
}

// Get user's effective permissions (for debugging/UI)
export function getUserPermissionDetails(userContext: UserContext) {
  const rolePermissions: Record<string, Permission[]> = {};
  
  for (const role of userContext.roles) {
    rolePermissions[role] = ROLE_PERMISSIONS[role] || [];
  }
  
  return {
    roles: userContext.roles,
    rolePermissions,
    effectivePermissions: userContext.permissions,
    isAdmin: hasRole(userContext, 'admin')
  };
}

// Audit permission changes
export function auditPermissionChange(
  userContext: UserContext,
  targetUserId: string,
  oldRoles: string[],
  newRoles: string[],
  requestId?: string
) {
  logAuditTrail({
    requestId,
    action: 'permission_change',
    resourceType: 'user_permissions',
    resourceId: targetUserId,
    oldValues: { roles: oldRoles },
    newValues: { roles: newRoles },
    userEmail: userContext.email,
    userId: userContext.userId
  });
  
  logAppEvent({
    requestId,
    level: 'info',
    category: 'security',
    message: `Permission change: user roles updated`,
    metadata: {
      targetUserId,
      oldRoles,
      newRoles,
      changedBy: userContext.email
    },
    userEmail: userContext.email,
    userId: userContext.userId
  });
}