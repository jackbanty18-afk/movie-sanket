import { NextRequest } from "next/server";
import { insertNotification, listNotificationsByEmail, markAllNotificationsRead, markNotificationRead } from "@/lib/db";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT = process.cwd();
const DB_DIR = join(ROOT, "data");
const DB_PATH = join(DB_DIR, "app.db");
const SQLITE = join(ROOT, "tools", "sqlite3.exe");

function runSQL(sql: string) {
  if (!existsSync(SQLITE)) throw new Error("sqlite3.exe not found in tools/");
  if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });
  return execFileSync(SQLITE, ["-batch", DB_PATH], { input: sql, encoding: "utf8" });
}

function esc(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  return "'" + String(v).replace(/'/g, "''") + "'";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const unreadOnly = searchParams.get("unreadOnly") === 'true';
  
  if (!email) return new Response(JSON.stringify({ error: "email required" }), { status: 400 });
  
  try {
    let notifications;
    if (unreadOnly) {
      const sql = ".mode json\nSELECT * FROM notifications WHERE userEmail=" + esc(email) + " AND read=0 ORDER BY createdAt DESC;";
      const out = runSQL(sql);
      notifications = JSON.parse(out);
    } else {
      notifications = listNotificationsByEmail(email);
    }
    
    // Get unread count
    const unreadSql = ".mode json\nSELECT COUNT(*) as count FROM notifications WHERE userEmail=" + esc(email) + " AND read=0;";
    const unreadOut = runSQL(unreadSql);
    const unreadCount = JSON.parse(unreadOut)[0]?.count || 0;
    
    return Response.json({ 
      notifications,
      unreadCount: Number(unreadCount)
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return Response.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body?.id || !body?.userEmail || !body?.title || !body?.message || !body?.createdAt) {
    return new Response(JSON.stringify({ error: "missing fields" }), { status: 400 });
  }
  insertNotification(body);
  return Response.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  if (body?.action === "read_all" && body?.email) {
    markAllNotificationsRead(body.email);
    return Response.json({ ok: true });
  }
  if (body?.id) {
    markNotificationRead(body.id);
    return Response.json({ ok: true });
  }
  return new Response(JSON.stringify({ error: "invalid" }), { status: 400 });
}
