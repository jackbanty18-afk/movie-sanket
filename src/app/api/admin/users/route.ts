import { NextRequest } from "next/server";
import { listAllUsers, getUserWithStats, banUser, unbanUser, updateUserStatus, assignRoleToUserId, getRolesByEmail } from "@/lib/db-router";
import { withRequestLogging, AuditLogger, getClientIP } from "@/lib/logger";
import { verifyJWT } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getUsersHandler(req: NextRequest) {
  const logger = (req as any).logger;
  
  // Check admin authorization
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const token = authHeader.slice(7);
  const payload = verifyJWT(token);
  if (!payload || !Array.isArray(payload.roles) || !payload.roles.includes('admin')) {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }
  
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    
    if (userId) {
      // Get specific user with stats
      const user = await (getUserWithStats as any)(userId);
      if (!user) {
        return Response.json({ error: "User not found" }, { status: 404 });
      }
      
      logger.info('admin', `Admin ${payload.email} viewed user details for ${userId}`);
      return Response.json({ user });
    } else {
      // List all users
      const users = await (listAllUsers as any)();
      
      logger.info('admin', `Admin ${payload.email} listed all users`, { userCount: users.length });
      return Response.json({ users });
    }
  } catch (error) {
    logger.error('admin', 'Failed to fetch users', { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

async function updateUserHandler(req: NextRequest) {
  const logger = (req as any).logger;
  const ipAddress = getClientIP(req);
  
  // Check admin authorization
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const token = authHeader.slice(7);
  const payload = verifyJWT(token);
  if (!payload || !Array.isArray(payload.roles) || !payload.roles.includes('admin')) {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }
  
  const auditLogger = AuditLogger.create(logger, ipAddress);
  
  try {
    const body = await req.json();
    const { userId, action, reason, role } = body;
    
    if (!userId || !action) {
      return Response.json({ error: "User ID and action are required" }, { status: 400 });
    }

    // Get user before changes for audit log
    const userBefore = await (getUserWithStats as any)(userId);
    if (!userBefore) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    switch (action) {
      case 'ban':
        if (!reason) {
          return Response.json({ error: "Ban reason is required" }, { status: 400 });
        }
        await (banUser as any)(userId, reason);
        auditLogger.logUserStatusChange(userId, userBefore.status, 'banned', reason);
        logger.info('admin', `Admin ${payload.email} banned user ${userBefore.email}`, { reason });
        break;
        
      case 'unban':
        await (unbanUser as any)(userId);
        auditLogger.logUserStatusChange(userId, userBefore.status, 'active', 'Unbanned by admin');
        logger.info('admin', `Admin ${payload.email} unbanned user ${userBefore.email}`);
        break;
        
      case 'suspend':
        await (updateUserStatus as any)(userId, 'suspended');
        auditLogger.logUserStatusChange(userId, userBefore.status, 'suspended', reason);
        logger.info('admin', `Admin ${payload.email} suspended user ${userBefore.email}`);
        break;
        
      case 'activate':
        await (updateUserStatus as any)(userId, 'active');
        auditLogger.logUserStatusChange(userId, userBefore.status, 'active', 'Activated by admin');
        logger.info('admin', `Admin ${payload.email} activated user ${userBefore.email}`);
        break;
        
      case 'assignRole':
        if (!role) {
          return Response.json({ error: "Role is required" }, { status: 400 });
        }
        const oldRoles = await (getRolesByEmail as any)(userBefore.email);
        await (assignRoleToUserId as any)(userId, role);
        const newRoles = await (getRolesByEmail as any)(userBefore.email);
        auditLogger.logUserAction('role_assignment', 'user', userId, 
          { roles: oldRoles }, 
          { roles: newRoles, assignedRole: role }
        );
        logger.info('admin', `Admin ${payload.email} assigned role ${role} to user ${userBefore.email}`);
        break;
        
      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (error) {
    logger.error('admin', 'Failed to update user', { 
      error: error instanceof Error ? error.message : String(error),
      adminUser: payload.email
    });
    return Response.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export const GET = withRequestLogging(getUsersHandler, 'admin-users');
export const PUT = withRequestLogging(updateUserHandler, 'admin-users');
