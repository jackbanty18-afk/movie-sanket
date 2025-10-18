import { NextRequest } from "next/server";
import { createUser, getUserByEmail, upsertProfile } from "@/lib/db";
import { hashPassword, signJWT } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { fullName, email, password, phone, dob, country } = body || {};
  if (!fullName || !email || !password)
    return new Response(JSON.stringify({ error: "missing fields" }), { status: 400 });

  const exists = getUserByEmail(email);
  if (exists) return new Response(JSON.stringify({ error: "email already registered" }), { status: 409 });

  const id = `usr_${Math.random().toString(36).slice(2, 10)}`;
  const createdAt = new Date().toISOString();
  const { salt, hash } = hashPassword(password);
  createUser({ id, email, fullName, passwordHash: hash, passwordSalt: salt, createdAt });
  // also store profile info
  upsertProfile({ id, fullName, email, phone, dob, country, createdAt });
  // assign default role
  const { assignRoleToUserId } = await import("@/lib/db");
  assignRoleToUserId(id, "user");

  const token = signJWT({ sub: id, email, roles: ["user"] });
  return Response.json({ user: { id, fullName, email, roles: ["user"] }, token });
}
