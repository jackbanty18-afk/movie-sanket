import { NextRequest } from 'next/server';
import { getAppLogs, getAccessLogs, getAuditTrails } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Check admin authorization
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const payload = verifyJWT(token);
  if (!payload || !Array.isArray(payload.roles) || !payload.roles.includes('admin')) {
    return new Response('Admin access required', { status: 403 });
  }

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const data = `data: ${JSON.stringify({ 
        type: 'connected', 
        message: 'Log stream connected',
        timestamp: new Date().toISOString(),
        adminUser: payload.email
      })}\\n\\n`;
      controller.enqueue(new TextEncoder().encode(data));

      // Set up periodic log polling
      const interval = setInterval(() => {
        try {
          // Get recent logs (last 5 minutes)
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
          
          // Get critical errors
          const criticalErrors = getAppLogs({
            startDate: fiveMinutesAgo,
            level: 'critical',
            limit: 10
          });
          
          // Get recent errors
          const errors = getAppLogs({
            startDate: fiveMinutesAgo,
            level: 'error',
            limit: 20
          });
          
          // Get failed requests (5xx errors)
          const failedRequests = getAccessLogs({
            startDate: fiveMinutesAgo,
            statusCode: 500,
            limit: 20
          });
          
          // Get recent audit activities (last minute for real-time feel)
          const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
          const recentAudits = getAuditTrails({
            startDate: oneMinuteAgo,
            limit: 10
          });

          // Send critical alerts
          if (criticalErrors.length > 0) {
            const alertData = `data: ${JSON.stringify({
              type: 'alert',
              level: 'critical',
              message: `${criticalErrors.length} critical error(s) detected`,
              data: criticalErrors,
              timestamp: new Date().toISOString()
            })}\\n\\n`;
            controller.enqueue(new TextEncoder().encode(alertData));
          }

          // Send error summary
          if (errors.length > 0) {
            const errorData = `data: ${JSON.stringify({
              type: 'errors',
              message: `${errors.length} error(s) in the last 5 minutes`,
              data: errors.slice(0, 5), // Only send first 5 for brevity
              timestamp: new Date().toISOString()
            })}\\n\\n`;
            controller.enqueue(new TextEncoder().encode(errorData));
          }

          // Send failed request alerts
          if (failedRequests.length > 0) {
            const requestData = `data: ${JSON.stringify({
              type: 'failed_requests',
              message: `${failedRequests.length} server error(s) in the last 5 minutes`,
              data: failedRequests.slice(0, 5),
              timestamp: new Date().toISOString()
            })}\\n\\n`;
            controller.enqueue(new TextEncoder().encode(requestData));
          }

          // Send recent audit activities
          if (recentAudits.length > 0) {
            const auditData = `data: ${JSON.stringify({
              type: 'audit_activity',
              message: `Recent admin activities`,
              data: recentAudits,
              timestamp: new Date().toISOString()
            })}\\n\\n`;
            controller.enqueue(new TextEncoder().encode(auditData));
          }

          // Send heartbeat
          const heartbeat = `data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
            stats: {
              criticalErrors: criticalErrors.length,
              errors: errors.length,
              failedRequests: failedRequests.length,
              recentAudits: recentAudits.length
            }
          })}\\n\\n`;
          controller.enqueue(new TextEncoder().encode(heartbeat));

        } catch (error) {
          const errorData = `data: ${JSON.stringify({
            type: 'stream_error',
            message: 'Error fetching log data',
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
          })}\\n\\n`;
          controller.enqueue(new TextEncoder().encode(errorData));
        }
      }, 10000); // Poll every 10 seconds

      // Clean up on close
      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}