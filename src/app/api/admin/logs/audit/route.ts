import { NextRequest } from 'next/server';
import { getAuditTrails } from '@/lib/db';
import { withRequestLogging } from '@/lib/logger';
import { verifyJWT } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function auditLogsHandler(req: NextRequest) {
  const logger = (req as any).logger;
  
  // Check authentication and admin role
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  
  const token = authHeader.slice(7);
  const payload = verifyJWT(token);
  if (!payload || !Array.isArray(payload.roles) || !payload.roles.includes('admin')) {
    return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403 });
  }
  
  const url = new URL(req.url);
  const filters = {
    startDate: url.searchParams.get('startDate') || undefined,
    endDate: url.searchParams.get('endDate') || undefined,
    userEmail: url.searchParams.get('userEmail') || undefined,
    action: url.searchParams.get('action') || undefined,
    resourceType: url.searchParams.get('resourceType') || undefined,
    resourceId: url.searchParams.get('resourceId') || undefined,
    requestId: url.searchParams.get('requestId') || undefined,
    limit: Math.min(parseInt(url.searchParams.get('limit') || '100'), 1000),
    offset: parseInt(url.searchParams.get('offset') || '0')
  };
  
  try {
    const logs = getAuditTrails(filters);
    
    logger.info('admin', 'Audit trails retrieved', { 
      filters,
      resultCount: logs.length,
      adminUser: payload.email 
    });
    
    return Response.json({ 
      logs,
      filters,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        hasMore: logs.length === filters.limit
      }
    });
  } catch (error) {
    logger.error('admin', 'Failed to retrieve audit trails', { error: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: 'Failed to retrieve logs' }), { status: 500 });
  }
}

export const GET = withRequestLogging(auditLogsHandler, 'admin-logs');