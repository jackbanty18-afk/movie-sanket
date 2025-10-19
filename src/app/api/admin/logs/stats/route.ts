import { NextRequest } from 'next/server';
import { getLogStatistics } from '@/lib/db-router';
import { withRequestLogging } from '@/lib/logger';
import { verifyJWT } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function logStatsHandler(req: NextRequest) {
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
  const days = parseInt(url.searchParams.get('days') || '7');
  
  try {
    const stats = await (getLogStatistics as any)(days);
    
    logger.info('admin', 'Log statistics retrieved', { 
      days,
      adminUser: payload.email 
    });
    
    return Response.json({
      statistics: stats,
      generatedAt: new Date().toISOString(),
      requestId: (req as any).requestId
    });
  } catch (error) {
    logger.error('admin', 'Failed to retrieve log statistics', { error: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: 'Failed to retrieve statistics' }), { status: 500 });
  }
}

export const GET = withRequestLogging(logStatsHandler, 'admin-logs');