import { NextRequest } from 'next/server';
import { getAppLogs } from '@/lib/db';
import { withRequestLogging } from '@/lib/logger';
import { verifyJWT } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function appLogsHandler(req: NextRequest) {
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
    level: url.searchParams.get('level') || undefined,
    category: url.searchParams.get('category') || undefined,
    userEmail: url.searchParams.get('userEmail') || undefined,
    requestId: url.searchParams.get('requestId') || undefined,
    search: url.searchParams.get('search') || undefined,
    limit: Math.min(parseInt(url.searchParams.get('limit') || '100'), 1000),
    offset: parseInt(url.searchParams.get('offset') || '0')
  };
  
  try {
    const logs = getAppLogs(filters);
    
    logger.info('admin', 'Application logs retrieved', { 
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
    logger.error('admin', 'Failed to retrieve application logs', { error: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: 'Failed to retrieve logs' }), { status: 500 });
  }
}

export const GET = withRequestLogging(appLogsHandler, 'admin-logs');