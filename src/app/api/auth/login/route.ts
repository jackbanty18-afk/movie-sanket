import { NextRequest } from "next/server";
import { getUserByEmail } from "@/lib/db";
import { verifyPassword, signJWT } from "@/lib/auth";
import { withRequestLogging, AuditLogger, getClientIP } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loginHandler(req: NextRequest) {
  const body = await req.json();
  const { email, password } = body || {};
  
  const logger = (req as any).logger;
  const ipAddress = getClientIP(req);
  const auditLogger = AuditLogger.create(logger, ipAddress);
  
  if (!email || !password) {
    auditLogger.logLogin(email || 'unknown', false, 'Missing email or password');
    return new Response(JSON.stringify({ error: "missing fields" }), { status: 400 });
  }

  const user = getUserByEmail(email);
  if (!user) {
    auditLogger.logLogin(email, false, 'User not found');
    return new Response(JSON.stringify({ error: "invalid credentials" }), { status: 401 });
  }
  
  const ok = verifyPassword(password, user.passwordSalt, user.passwordHash);
  if (!ok) {
    auditLogger.logLogin(email, false, 'Invalid password');
    return new Response(JSON.stringify({ error: "invalid credentials" }), { status: 401 });
  }

  const { getRolesByEmail, assignRoleToUserId, ensureRole } = await import("@/lib/db");
  // auto-assign admin if matches env var on first login
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (adminEmail && adminEmail === user.email.toLowerCase()) {
    ensureRole("admin");
    assignRoleToUserId(user.id, "admin");
  }
  const roles = getRolesByEmail(user.email);

  // Log successful login
  auditLogger.logLogin(email, true);
  logger.info('auth', `User ${email} logged in successfully`, { userId: user.id, roles });

  const token = signJWT({ sub: user.id, email: user.email, roles });
  return Response.json({ user: { id: user.id, fullName: user.fullName, email: user.email, roles }, token });
}

export const POST = withRequestLogging(loginHandler, 'auth');
