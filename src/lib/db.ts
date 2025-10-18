import { execFileSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const DB_DIR = join(ROOT, "data");
const DB_PATH = join(DB_DIR, "app.db");
const SQLITE = join(ROOT, "tools", "sqlite3.exe");

function ensureInit() {
  if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });
  const ddl = `
  PRAGMA journal_mode=WAL;
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    fullName TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    dob TEXT,
    country TEXT,
    createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS tickets (
    ticketId TEXT PRIMARY KEY,
    userEmail TEXT,
    userId TEXT,
    movieId TEXT,
    movieTitle TEXT,
    theatreId TEXT,
    theatreName TEXT,
    dateKey TEXT,
    time TEXT,
    seats TEXT,
    seatCount INTEGER NOT NULL DEFAULT 0,
    originalTotal INTEGER,
    total INTEGER,
    status TEXT NOT NULL DEFAULT 'confirmed',
    paymentMethod TEXT,
    refundAmount INTEGER DEFAULT 0,
    refundedAt TEXT,
    cancelledAt TEXT,
    cancellationReason TEXT,
    purchasedAt TEXT,
    updatedAt TEXT
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    userEmail TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    read INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    fullName TEXT NOT NULL,
    passwordHash TEXT NOT NULL,
    passwordSalt TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    bannedAt TEXT,
    bannedReason TEXT,
    lastLoginAt TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );
  CREATE TABLE IF NOT EXISTS user_roles (
    userId TEXT NOT NULL,
    roleId INTEGER NOT NULL,
    UNIQUE(userId, roleId)
  );
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );
  CREATE TABLE IF NOT EXISTS movies (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    synopsis TEXT,
    poster TEXT,
    backdrop TEXT,
    year INTEGER,
    rating REAL,
    durationMins INTEGER,
    releaseDate TEXT,
    languages TEXT,
    formats TEXT,
    published INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS movie_categories (
    movieId TEXT NOT NULL,
    categoryId INTEGER NOT NULL,
    UNIQUE(movieId, categoryId)
  );
  CREATE TABLE IF NOT EXISTS theatres (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT,
    address TEXT,
    createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS shows (
    id TEXT PRIMARY KEY,
    movieId TEXT NOT NULL,
    theatreId TEXT NOT NULL,
    dateKey TEXT NOT NULL,
    time TEXT NOT NULL,
    format TEXT,
    language TEXT,
    prices TEXT NOT NULL,
    published INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS pricing_tiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    baseMultiplier REAL NOT NULL DEFAULT 1.0,
    weekendMultiplier REAL NOT NULL DEFAULT 1.2,
    holidayMultiplier REAL NOT NULL DEFAULT 1.5,
    createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS theatre_pricing (
    theatreId TEXT NOT NULL,
    pricingTierId INTEGER NOT NULL,
    normalPrice INTEGER NOT NULL,
    executivePrice INTEGER NOT NULL,
    premiumPrice INTEGER NOT NULL,
    vipPrice INTEGER NOT NULL,
    PRIMARY KEY(theatreId, pricingTierId)
  );
  CREATE TABLE IF NOT EXISTS seat_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    theatreId TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    layout TEXT NOT NULL,
    totalSeats INTEGER NOT NULL,
    normalSeats INTEGER NOT NULL DEFAULT 0,
    executiveSeats INTEGER NOT NULL DEFAULT 0,
    premiumSeats INTEGER NOT NULL DEFAULT 0,
    vipSeats INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS theatre_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    theatreId TEXT NOT NULL,
    dayOfWeek INTEGER NOT NULL,
    availableSlots TEXT NOT NULL,
    operatingHours TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    UNIQUE(theatreId, dayOfWeek)
  );
  CREATE TABLE IF NOT EXISTS notification_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'general',
    variables TEXT DEFAULT '[]',
    isActive INTEGER NOT NULL DEFAULT 1,
    createdBy TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS notification_campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    templateId TEXT NOT NULL,
    userSegment TEXT NOT NULL,
    scheduledAt TEXT,
    sentAt TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    recipientCount INTEGER DEFAULT 0,
    sentCount INTEGER DEFAULT 0,
    createdBy TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`;
  runSQL(ddl);
}

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

// Basic functions
export function listTheatres() {
  ensureInit();
  const out = runSQL(".mode json\nSELECT * FROM theatres ORDER BY name;");
  try { return JSON.parse(out); } catch { return []; }
}

export function listShows(opts?: { movieId?: string; dateKey?: string; publishedOnly?: boolean }) {
  ensureInit();
  const where: string[] = [];
  if (opts?.movieId) where.push("movieId=" + esc(opts.movieId));
  if (opts?.dateKey) where.push("dateKey=" + esc(opts.dateKey));
  if (opts?.publishedOnly !== false) where.push("published=1");
  const sql = ".mode json\nSELECT * FROM shows " + (where.length ? "WHERE " + where.join(" AND ") : "") + " ORDER BY dateKey,time;";
  const out = runSQL(sql);
  try { return JSON.parse(out); } catch { return []; }
}

// Pricing tiers
export type PricingTierRow = { 
  id: number; 
  name: string; 
  description?: string | null; 
  baseMultiplier: number; 
  weekendMultiplier: number; 
  holidayMultiplier: number; 
  createdAt: string;
};

export function listPricingTiers(): PricingTierRow[] {
  ensureInit();
  const out = runSQL(".mode json\nSELECT * FROM pricing_tiers ORDER BY name;");
  try { return JSON.parse(out); } catch { return []; }
}

export function createPricingTier(p: Omit<PricingTierRow, 'id'>) {
  ensureInit();
  const sql = "INSERT INTO pricing_tiers (name,description,baseMultiplier,weekendMultiplier,holidayMultiplier,createdAt) VALUES (" + 
    esc(p.name) + "," + esc(p.description) + "," + p.baseMultiplier + "," + p.weekendMultiplier + "," + p.holidayMultiplier + "," + esc(p.createdAt) + ");";
  runSQL(sql);
}

export function updatePricingTier(id: number, p: Partial<Omit<PricingTierRow, 'id' | 'createdAt'>>) {
  ensureInit();
  const updates = [];
  if (p.name !== undefined) updates.push("name=" + esc(p.name));
  if (p.description !== undefined) updates.push("description=" + esc(p.description));
  if (p.baseMultiplier !== undefined) updates.push("baseMultiplier=" + p.baseMultiplier);
  if (p.weekendMultiplier !== undefined) updates.push("weekendMultiplier=" + p.weekendMultiplier);
  if (p.holidayMultiplier !== undefined) updates.push("holidayMultiplier=" + p.holidayMultiplier);
  if (updates.length > 0) {
    runSQL("UPDATE pricing_tiers SET " + updates.join(", ") + " WHERE id=" + id + ";");
  }
}

export function deletePricingTier(id: number) { 
  ensureInit(); 
  runSQL("DELETE FROM pricing_tiers WHERE id=" + id + ";"); 
}

// Theatre pricing
export type TheatrePricingRow = { 
  theatreId: string; 
  pricingTierId: number; 
  normalPrice: number; 
  executivePrice: number; 
  premiumPrice: number; 
  vipPrice: number; 
};

export function getTheatrePricing(theatreId: string): TheatrePricingRow[] {
  ensureInit();
  const out = runSQL(".mode json\nSELECT * FROM theatre_pricing WHERE theatreId=" + esc(theatreId) + ";");
  try { return JSON.parse(out); } catch { return []; }
}

export function upsertTheatrePricing(tp: TheatrePricingRow) {
  ensureInit();
  const sql = "INSERT INTO theatre_pricing (theatreId,pricingTierId,normalPrice,executivePrice,premiumPrice,vipPrice) VALUES (" +
    esc(tp.theatreId) + "," + tp.pricingTierId + "," + tp.normalPrice + "," + tp.executivePrice + "," + tp.premiumPrice + "," + tp.vipPrice + 
    ") ON CONFLICT(theatreId,pricingTierId) DO UPDATE SET normalPrice=excluded.normalPrice,executivePrice=excluded.executivePrice,premiumPrice=excluded.premiumPrice,vipPrice=excluded.vipPrice;";
  runSQL(sql);
}

export function deleteTheatrePricing(theatreId: string, pricingTierId: number) {
  ensureInit(); 
  runSQL("DELETE FROM theatre_pricing WHERE theatreId=" + esc(theatreId) + " AND pricingTierId=" + pricingTierId + ";");
}

// Seat templates
export type SeatTemplateRow = { 
  id: number; 
  theatreId: string; 
  name: string; 
  layout: string; 
  totalSeats: number; 
  normalSeats: number; 
  executiveSeats: number; 
  premiumSeats: number; 
  vipSeats: number; 
  createdAt: string; 
  updatedAt: string; 
};

export function getSeatTemplate(theatreId: string): SeatTemplateRow | null {
  ensureInit();
  const out = runSQL(".mode json\nSELECT * FROM seat_templates WHERE theatreId=" + esc(theatreId) + " LIMIT 1;");
  try { return JSON.parse(out)[0] ?? null; } catch { return null; }
}

export function upsertSeatTemplate(st: Omit<SeatTemplateRow, 'id'>) {
  ensureInit();
  const sql = "INSERT INTO seat_templates (theatreId,name,layout,totalSeats,normalSeats,executiveSeats,premiumSeats,vipSeats,createdAt,updatedAt) VALUES (" +
    esc(st.theatreId) + "," + esc(st.name) + "," + esc(st.layout) + "," + st.totalSeats + "," + st.normalSeats + "," + st.executiveSeats + "," + st.premiumSeats + "," + st.vipSeats + "," + esc(st.createdAt) + "," + esc(st.updatedAt) +
    ") ON CONFLICT(theatreId) DO UPDATE SET name=excluded.name,layout=excluded.layout,totalSeats=excluded.totalSeats,normalSeats=excluded.normalSeats,executiveSeats=excluded.executiveSeats,premiumSeats=excluded.premiumSeats,vipSeats=excluded.vipSeats,updatedAt=excluded.updatedAt;";
  runSQL(sql);
}

export function deleteSeatTemplate(theatreId: string) { 
  ensureInit(); 
  runSQL("DELETE FROM seat_templates WHERE theatreId=" + esc(theatreId) + ";"); 
}

// Theatre schedules
export type TheatreScheduleRow = { 
  id: number; 
  theatreId: string; 
  dayOfWeek: number; 
  availableSlots: string; 
  operatingHours: string; 
  createdAt: string; 
};

export function getTheatreSchedules(theatreId: string): TheatreScheduleRow[] {
  ensureInit();
  const out = runSQL(".mode json\nSELECT * FROM theatre_schedules WHERE theatreId=" + esc(theatreId) + " ORDER BY dayOfWeek;");
  try { return JSON.parse(out); } catch { return []; }
}

export function upsertTheatreSchedule(ts: Omit<TheatreScheduleRow, 'id'>) {
  ensureInit();
  const sql = "INSERT INTO theatre_schedules (theatreId,dayOfWeek,availableSlots,operatingHours,createdAt) VALUES (" +
    esc(ts.theatreId) + "," + ts.dayOfWeek + "," + esc(ts.availableSlots) + "," + esc(ts.operatingHours) + "," + esc(ts.createdAt) +
    ") ON CONFLICT(theatreId,dayOfWeek) DO UPDATE SET availableSlots=excluded.availableSlots,operatingHours=excluded.operatingHours;";
  runSQL(sql);
}

export function deleteTheatreSchedule(theatreId: string, dayOfWeek?: number) {
  ensureInit();
  if (dayOfWeek !== undefined) {
    runSQL("DELETE FROM theatre_schedules WHERE theatreId=" + esc(theatreId) + " AND dayOfWeek=" + dayOfWeek + ";");
  } else {
    runSQL("DELETE FROM theatre_schedules WHERE theatreId=" + esc(theatreId) + ";");
  }
}

// Additional required functions
export function getRolesByEmail(email: string): string[] {
  ensureInit();
  const out = runSQL(".mode json\nSELECT r.name FROM roles r JOIN user_roles ur ON ur.roleId = r.id JOIN users u ON u.id = ur.userId WHERE u.email=" + esc(email) + ";");
  try { return JSON.parse(out).map((r: any) => r.name); } catch { return []; }
}

export function listCategories(): { id: number; name: string }[] {
  ensureInit();
  const out = runSQL(".mode json\nSELECT id,name FROM categories ORDER BY name;");
  try { return JSON.parse(out); } catch { return []; }
}

export function createCategory(name: string) {
  ensureInit(); 
  runSQL("INSERT OR IGNORE INTO categories (name) VALUES (" + esc(name) + ");");
}

export function deleteCategory(id: number) {
  ensureInit(); 
  runSQL("DELETE FROM categories WHERE id=" + id + ";");
}

export type MovieRow = {
  id: string; title: string; synopsis?: string; poster?: string; backdrop?: string; year?: number; rating?: number; durationMins?: number; releaseDate?: string; languages?: string; formats?: string; published?: number; createdAt: string; updatedAt: string;
};

export function listMovies(): MovieRow[] {
  ensureInit();
  const out = runSQL(".mode json\nSELECT * FROM movies ORDER BY createdAt DESC;");
  try { return JSON.parse(out); } catch { return []; }
}

export function getMovie(id: string): MovieRow | null {
  ensureInit();
  const out = runSQL(".mode json\nSELECT * FROM movies WHERE id=" + esc(id) + " LIMIT 1;");
  try { return JSON.parse(out)[0] ?? null; } catch { return null; }
}

export function upsertMovie(m: MovieRow) {
  ensureInit();
  const sql = "INSERT INTO movies (id,title,synopsis,poster,backdrop,year,rating,durationMins,releaseDate,languages,formats,published,createdAt,updatedAt) VALUES (" +
    esc(m.id) + "," + esc(m.title) + "," + esc(m.synopsis) + "," + esc(m.poster) + "," + esc(m.backdrop) + "," + (m.year ?? "NULL") + "," + (m.rating ?? "NULL") + "," + (m.durationMins ?? "NULL") + "," + esc(m.releaseDate) + "," + esc(m.languages) + "," + esc(m.formats) + "," + (m.published ?? 0) + "," + esc(m.createdAt) + "," + esc(m.updatedAt) + 
    ") ON CONFLICT(id) DO UPDATE SET title=excluded.title,synopsis=excluded.synopsis,poster=excluded.poster,backdrop=excluded.backdrop,year=excluded.year,rating=excluded.rating,durationMins=excluded.durationMins,releaseDate=excluded.releaseDate,languages=excluded.languages,formats=excluded.formats,published=excluded.published,updatedAt=excluded.updatedAt;";
  runSQL(sql);
}

export function deleteMovie(id: string) {
  ensureInit();
  runSQL("DELETE FROM movie_categories WHERE movieId=" + esc(id) + ";");
  runSQL("DELETE FROM movies WHERE id=" + esc(id) + ";");
}

export function setMovieCategories(movieId: string, categoryIds: number[]) {
  ensureInit();
  runSQL("DELETE FROM movie_categories WHERE movieId=" + esc(movieId) + ";");
  for (const cid of categoryIds) {
    runSQL("INSERT OR IGNORE INTO movie_categories (movieId,categoryId) VALUES (" + esc(movieId) + ", " + cid + ");");
  }
}

export function getMovieCategoryIds(movieId: string): number[] {
  ensureInit();
  const out = runSQL(".mode json\nSELECT categoryId FROM movie_categories WHERE movieId=" + esc(movieId) + ";");
  try { return JSON.parse(out).map((x: any) => x.categoryId); } catch { return []; }
}

export type TheatreRow = { id: string; name: string; city?: string | null; address?: string | null; createdAt: string };

export function upsertTheatre(t: TheatreRow) {
  ensureInit();
  const sql = "INSERT INTO theatres (id,name,city,address,createdAt) VALUES (" + esc(t.id) + "," + esc(t.name) + "," + esc(t.city) + "," + esc(t.address) + "," + esc(t.createdAt) + ") ON CONFLICT(id) DO UPDATE SET name=excluded.name, city=excluded.city, address=excluded.address;";
  runSQL(sql);
}

export function deleteTheatre(id: string) { 
  ensureInit(); 
  runSQL("DELETE FROM theatres WHERE id=" + esc(id) + ";"); 
}

export type ShowRow = { id: string; movieId: string; theatreId: string; dateKey: string; time: string; format?: string | null; language?: string | null; prices: string; published: number; createdAt: string; updatedAt: string };

export function upsertShow(s: ShowRow) {
  ensureInit();
  const sql = "INSERT INTO shows (id,movieId,theatreId,dateKey,time,format,language,prices,published,createdAt,updatedAt) VALUES (" +
    esc(s.id) + "," + esc(s.movieId) + "," + esc(s.theatreId) + "," + esc(s.dateKey) + "," + esc(s.time) + "," + esc(s.format) + "," + esc(s.language) + "," + esc(s.prices) + "," + (s.published ? 1 : 0) + "," + esc(s.createdAt) + "," + esc(s.updatedAt) +
    ") ON CONFLICT(id) DO UPDATE SET movieId=excluded.movieId,theatreId=excluded.theatreId,dateKey=excluded.dateKey,time=excluded.time,format=excluded.format,language=excluded.language,prices=excluded.prices,published=excluded.published,updatedAt=excluded.updatedAt;";
  runSQL(sql);
}

export function deleteShow(id: string) { 
  ensureInit(); 
  runSQL("DELETE FROM shows WHERE id=" + esc(id) + ";"); 
}

// Auth functions
export function getUserByEmail(email: string) {
  ensureInit();
  const out = runSQL(".mode json\nSELECT * FROM users WHERE email=" + esc(email) + " LIMIT 1;");
  try { return JSON.parse(out)[0] ?? null; } catch { return null; }
}

export function createUser(u: { id: string; email: string; fullName: string; passwordHash: string; passwordSalt: string; createdAt: string }) {
  ensureInit();
  const sql = "INSERT INTO users (id,email,fullName,passwordHash,passwordSalt,createdAt) VALUES (" + esc(u.id) + "," + esc(u.email) + "," + esc(u.fullName) + "," + esc(u.passwordHash) + "," + esc(u.passwordSalt) + "," + esc(u.createdAt) + ");";
  runSQL(sql);
}

export function upsertProfile(p: { id: string; fullName: string; email: string; phone?: string; dob?: string; country?: string; createdAt: string }) {
  ensureInit();
  const sql = "INSERT INTO profiles (id, fullName, email, phone, dob, country, createdAt) VALUES (" + esc(p.id) + ", " + esc(p.fullName) + ", " + esc(p.email) + ", " + esc(p.phone) + ", " + esc(p.dob) + ", " + esc(p.country) + ", " + esc(p.createdAt) + ") ON CONFLICT(email) DO UPDATE SET fullName=excluded.fullName, phone=excluded.phone, dob=excluded.dob, country=excluded.country;";
  runSQL(sql);
}

export function getProfileByEmail(email: string) {
  ensureInit();
  const out = runSQL(".mode json\nSELECT * FROM profiles WHERE email=" + esc(email) + " LIMIT 1;");
  try { return JSON.parse(out)[0] ?? null; } catch { return null; }
}

export function ensureRole(name: string) {
  ensureInit();
  runSQL("INSERT OR IGNORE INTO roles (name) VALUES (" + esc(name) + ");");
}

export function assignRoleToUserId(userId: string, roleName: string) {
  ensureInit();
  runSQL("INSERT OR IGNORE INTO roles (name) VALUES (" + esc(roleName) + ");");
  const out = runSQL(".mode json\nSELECT id FROM roles WHERE name=" + esc(roleName) + " LIMIT 1;");
  const roleId = (() => { try { return (JSON.parse(out)[0]?.id as number) || 0; } catch { return 0; } })();
  if (roleId) runSQL("INSERT OR IGNORE INTO user_roles (userId, roleId) VALUES (" + esc(userId) + ", " + roleId + ");");
}

// Notifications
export function insertNotification(n: { id: string; userEmail: string; title: string; message: string; createdAt: string; read?: boolean }) {
  ensureInit();
  const sql = "INSERT OR REPLACE INTO notifications (id,userEmail,title,message,createdAt,read) VALUES (" + esc(n.id) + ", " + esc(n.userEmail) + ", " + esc(n.title) + ", " + esc(n.message) + ", " + esc(n.createdAt) + ", " + (n.read ? 1 : 0) + ");";
  runSQL(sql);
}

export function listNotificationsByEmail(email: string) {
  ensureInit();
  const out = runSQL(".mode json\nSELECT * FROM notifications WHERE userEmail=" + esc(email) + " ORDER BY createdAt DESC;");
  try { return JSON.parse(out); } catch { return []; }
}

export function markAllNotificationsRead(email: string) {
  ensureInit();
  runSQL("UPDATE notifications SET read=1 WHERE userEmail=" + esc(email) + ";");
}

export function markNotificationRead(id: string) {
  ensureInit();
  runSQL("UPDATE notifications SET read=1 WHERE id=" + esc(id) + ";");
}

// Tickets
export function insertTicket(t: { ticketId: string; userEmail?: string; movieId: string; movieTitle: string; theatreName: string; dateKey: string; time: string; seats: string; total: number; purchasedAt: string; }) {
  ensureInit();
  const sql = "INSERT OR REPLACE INTO tickets (ticketId,userEmail,movieId,movieTitle,theatreName,dateKey,time,seats,total,purchasedAt) VALUES (" + esc(t.ticketId) + ", " + esc(t.userEmail) + ", " + esc(t.movieId) + ", " + esc(t.movieTitle) + ", " + esc(t.theatreName) + ", " + esc(t.dateKey) + ", " + esc(t.time) + ", " + esc(t.seats) + ", " + esc(t.total) + ", " + esc(t.purchasedAt) + ");";
  runSQL(sql);
}

export function listTicketsByEmail(email: string) {
  ensureInit();
  const out = runSQL(".mode json\nSELECT * FROM tickets WHERE userEmail=" + esc(email) + " ORDER BY purchasedAt DESC;");
  try { return JSON.parse(out); } catch { return []; }
}

// Public functions
export function listPublicCategoriesWithCounts(): { id: number; name: string; count: number }[] {
  ensureInit();
  const sql = ".mode json\nSELECT c.id, c.name, COUNT(m.id) AS count FROM categories c LEFT JOIN movie_categories mc ON mc.categoryId = c.id LEFT JOIN movies m ON m.id = mc.movieId AND m.published = 1 GROUP BY c.id, c.name ORDER BY c.name;";
  const out = runSQL(sql);
  try {
    const rows = JSON.parse(out) as Array<{ id: number | string; name: string; count: number | string | null }>;
    return rows.map(r => ({ id: Number(r.id), name: String(r.name ?? ''), count: Number(r.count ?? 0) }));
  } catch { return []; }
}

export type PublicMovie = {
  id: string; title: string; year: number | null; poster: string | null; backdrop: string | null; rating: number | null; durationMins: number | null; releaseDate: string | null; languages: string[]; formats: string[]; categories: string[]; published: number; createdAt: string; updatedAt: string;
};

export function listPublicMovies(opts?: { publishedOnly?: boolean; category?: string | null; q?: string | null; limit?: number | null; sort?: string | null; dir?: 'asc' | 'desc' | null; }): PublicMovie[] {
  ensureInit();
  // Simplified version for now
  const out = runSQL(".mode json\nSELECT * FROM movies WHERE published = 1 ORDER BY createdAt DESC LIMIT 20;");
  try {
    return JSON.parse(out).map((r: any) => ({
      id: String(r.id),
      title: String(r.title ?? ''),
      year: r.year == null ? null : Number(r.year),
      poster: r.poster == null ? null : String(r.poster),
      backdrop: r.backdrop == null ? null : String(r.backdrop),
      rating: r.rating == null ? null : Number(r.rating),
      durationMins: r.durationMins == null ? null : Number(r.durationMins),
      releaseDate: r.releaseDate == null ? null : String(r.releaseDate),
      languages: String(r.languages || '').split(',').filter(Boolean),
      formats: String(r.formats || '').split(',').filter(Boolean),
      categories: [], // Simplified
      published: Number(r.published ?? 0),
      createdAt: String(r.createdAt ?? ''),
      updatedAt: String(r.updatedAt ?? ''),
    }));
  } catch { return []; }
}

export function getPublicMovie(id: string): PublicMovie | null {
  ensureInit();
  const out = runSQL(".mode json\nSELECT * FROM movies WHERE id=" + esc(id) + " LIMIT 1;");
  try {
    const r = JSON.parse(out)[0];
    if (!r) return null;
    return {
      id: String(r.id),
      title: String(r.title ?? ''),
      year: r.year == null ? null : Number(r.year),
      poster: r.poster == null ? null : String(r.poster),
      backdrop: r.backdrop == null ? null : String(r.backdrop),
      rating: r.rating == null ? null : Number(r.rating),
      durationMins: r.durationMins == null ? null : Number(r.durationMins),
      releaseDate: r.releaseDate == null ? null : String(r.releaseDate),
      languages: String(r.languages || '').split(',').filter(Boolean),
      formats: String(r.formats || '').split(',').filter(Boolean),
      categories: [], // Simplified
      published: Number(r.published ?? 0),
      createdAt: String(r.createdAt ?? ''),
      updatedAt: String(r.updatedAt ?? ''),
    };
  } catch { return null; }
}

// ===== User Management =====
export type UserManagementRow = {
  id: string;
  email: string;
  fullName: string;
  status: 'active' | 'banned' | 'suspended';
  bannedAt?: string | null;
  bannedReason?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  roles: string[];
  totalBookings: number;
  totalSpent: number;
};

export function listAllUsers(): UserManagementRow[] {
  ensureInit();
  const sql = ".mode json\nSELECT u.*, GROUP_CONCAT(r.name, ',') as roles_csv, COUNT(DISTINCT t.ticketId) as totalBookings, COALESCE(SUM(t.total), 0) as totalSpent FROM users u LEFT JOIN user_roles ur ON ur.userId = u.id LEFT JOIN roles r ON r.id = ur.roleId LEFT JOIN tickets t ON t.userEmail = u.email GROUP BY u.id ORDER BY u.createdAt DESC;";
  const out = runSQL(sql);
  try {
    return JSON.parse(out).map((r: any) => ({
      id: String(r.id),
      email: String(r.email),
      fullName: String(r.fullName),
      status: String(r.status || 'active'),
      bannedAt: r.bannedAt || null,
      bannedReason: r.bannedReason || null,
      lastLoginAt: r.lastLoginAt || null,
      createdAt: String(r.createdAt),
      updatedAt: String(r.updatedAt || r.createdAt),
      roles: String(r.roles_csv || '').split(',').filter(Boolean),
      totalBookings: Number(r.totalBookings || 0),
      totalSpent: Number(r.totalSpent || 0)
    }));
  } catch { return []; }
}

export function getUserWithStats(userId: string): UserManagementRow | null {
  ensureInit();
  const sql = ".mode json\nSELECT u.*, GROUP_CONCAT(r.name, ',') as roles_csv, COUNT(DISTINCT t.ticketId) as totalBookings, COALESCE(SUM(t.total), 0) as totalSpent FROM users u LEFT JOIN user_roles ur ON ur.userId = u.id LEFT JOIN roles r ON r.id = ur.roleId LEFT JOIN tickets t ON t.userEmail = u.email WHERE u.id = " + esc(userId) + " GROUP BY u.id;";
  const out = runSQL(sql);
  try {
    const r = JSON.parse(out)[0];
    if (!r) return null;
    return {
      id: String(r.id),
      email: String(r.email),
      fullName: String(r.fullName),
      status: (r.status || 'active') as 'active' | 'banned' | 'suspended',
      bannedAt: r.bannedAt || null,
      bannedReason: r.bannedReason || null,
      lastLoginAt: r.lastLoginAt || null,
      createdAt: String(r.createdAt),
      updatedAt: String(r.updatedAt || r.createdAt),
      roles: String(r.roles_csv || '').split(',').filter(Boolean),
      totalBookings: Number(r.totalBookings || 0),
      totalSpent: Number(r.totalSpent || 0)
    };
  } catch { return null; }
}

export function banUser(userId: string, reason: string, bannedBy?: string) {
  ensureInit();
  const now = new Date().toISOString();
  runSQL("UPDATE users SET status='banned', bannedAt=" + esc(now) + ", bannedReason=" + esc(reason) + ", updatedAt=" + esc(now) + " WHERE id=" + esc(userId) + ";");
}

export function unbanUser(userId: string) {
  ensureInit();
  const now = new Date().toISOString();
  runSQL("UPDATE users SET status='active', bannedAt=NULL, bannedReason=NULL, updatedAt=" + esc(now) + " WHERE id=" + esc(userId) + ";");
}

export function updateUserStatus(userId: string, status: 'active' | 'banned' | 'suspended') {
  ensureInit();
  const now = new Date().toISOString();
  runSQL("UPDATE users SET status=" + esc(status) + ", updatedAt=" + esc(now) + " WHERE id=" + esc(userId) + ";");
}

export function updateUserLastLogin(userId: string) {
  ensureInit();
  const now = new Date().toISOString();
  runSQL("UPDATE users SET lastLoginAt=" + esc(now) + ", updatedAt=" + esc(now) + " WHERE id=" + esc(userId) + ";");
}

// ===== Booking Management =====
export type BookingRow = {
  ticketId: string;
  userEmail?: string;
  userId?: string;
  userName?: string;
  movieId: string;
  movieTitle: string;
  theatreId?: string;
  theatreName: string;
  dateKey: string;
  time: string;
  seats: string;
  seatCount: number;
  originalTotal?: number;
  total: number;
  status: 'confirmed' | 'cancelled' | 'refunded' | 'pending';
  paymentMethod?: string;
  refundAmount?: number;
  refundedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  purchasedAt: string;
  updatedAt?: string;
};

export function listAllBookings(opts?: { status?: string; userId?: string; userEmail?: string; limit?: number; offset?: number }): { bookings: BookingRow[], total: number } {
  ensureInit();
  const where = [];
  if (opts?.status) where.push("t.status=" + esc(opts.status));
  if (opts?.userEmail) where.push("t.userEmail=" + esc(opts.userEmail));
  if (opts?.userId) {
    // Convert userId to email for lookup
    const userResult = runSQL(".mode json\nSELECT email FROM users WHERE id=" + esc(opts.userId) + " LIMIT 1;");
    try {
      const userData = JSON.parse(userResult)[0];
      if (userData?.email) where.push("t.userEmail=" + esc(userData.email));
    } catch { /* ignore */ }
  }
  
  const limit = Math.min(Number(opts?.limit || 50), 200);
  const offset = Number(opts?.offset || 0);
  
  const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";
  
  const sql = ".mode json\nSELECT t.*, u.fullName as userName, u.id as userId FROM tickets t LEFT JOIN users u ON u.email = t.userEmail " + whereClause + " ORDER BY t.purchasedAt DESC LIMIT " + limit + " OFFSET " + offset + ";";
  const countSql = ".mode json\nSELECT COUNT(*) as total FROM tickets t " + whereClause + ";";
  
  const out = runSQL(sql);
  const countOut = runSQL(countSql);
  
  try {
    const bookings = JSON.parse(out).map((r: any) => ({
      ticketId: String(r.ticketId),
      userEmail: r.userEmail || undefined,
      userId: r.userId || undefined,
      userName: r.userName || r.userEmail || undefined,
      movieId: String(r.movieId || ''),
      movieTitle: String(r.movieTitle),
      theatreId: undefined,
      theatreName: String(r.theatreName),
      dateKey: String(r.dateKey),
      time: String(r.time),
      seats: String(r.seats),
      seatCount: 0,
      originalTotal: undefined,
      total: Number(r.total),
      status: String(r.status || 'confirmed'),
      paymentMethod: undefined,
      refundAmount: r.refundAmount ? Number(r.refundAmount) : undefined,
      refundedAt: r.refundAt || undefined,
      cancelledAt: undefined,
      cancellationReason: r.cancellationReason || undefined,
      purchasedAt: String(r.purchasedAt),
      updatedAt: r.updatedAt || undefined
    }));
    
    const total = Number(JSON.parse(countOut)[0]?.total || 0);
    
    return { bookings, total };
  } catch { 
    return { bookings: [], total: 0 }; 
  }
}

export function getBooking(ticketId: string): BookingRow | null {
  ensureInit();
  const sql = ".mode json\nSELECT t.*, u.fullName as userName FROM tickets t LEFT JOIN users u ON u.id = t.userId WHERE t.ticketId=" + esc(ticketId) + " LIMIT 1;";
  const out = runSQL(sql);
  try {
    const r = JSON.parse(out)[0];
    if (!r) return null;
    return {
      ticketId: String(r.ticketId),
      userEmail: r.userEmail || undefined,
      userId: r.userId || undefined,
      userName: r.userName || undefined,
      movieId: String(r.movieId),
      movieTitle: String(r.movieTitle),
      theatreId: r.theatreId || undefined,
      theatreName: String(r.theatreName),
      dateKey: String(r.dateKey),
      time: String(r.time),
      seats: String(r.seats),
      seatCount: Number(r.seatCount || 0),
      originalTotal: r.originalTotal ? Number(r.originalTotal) : undefined,
      total: Number(r.total),
      status: (r.status || 'confirmed') as 'confirmed' | 'cancelled' | 'refunded' | 'pending',
      paymentMethod: r.paymentMethod || undefined,
      refundAmount: r.refundAmount ? Number(r.refundAmount) : undefined,
      refundedAt: r.refundedAt || undefined,
      cancelledAt: r.cancelledAt || undefined,
      cancellationReason: r.cancellationReason || undefined,
      purchasedAt: String(r.purchasedAt),
      updatedAt: r.updatedAt || undefined
    };
  } catch { return null; }
}

export function updateBookingStatus(ticketId: string, status: 'confirmed' | 'cancelled' | 'refunded' | 'pending', reason?: string) {
  ensureInit();
  const now = new Date().toISOString();
  let sql = "UPDATE tickets SET status=" + esc(status) + ", updatedAt=" + esc(now);
  
  if (status === 'cancelled') {
    sql += ", cancelledAt=" + esc(now);
    if (reason) sql += ", cancellationReason=" + esc(reason);
  } else if (status === 'refunded') {
    sql += ", refundedAt=" + esc(now);
    if (reason) sql += ", cancellationReason=" + esc(reason);
  }
  
  sql += " WHERE ticketId=" + esc(ticketId) + ";";
  runSQL(sql);
}

export function processRefund(ticketId: string, refundAmount: number, reason?: string) {
  ensureInit();
  const now = new Date().toISOString();
  runSQL("UPDATE tickets SET status='refunded', refundAmount=" + refundAmount + ", refundedAt=" + esc(now) + ", updatedAt=" + esc(now) + (reason ? ", cancellationReason=" + esc(reason) : "") + " WHERE ticketId=" + esc(ticketId) + ";");
}

export function updateBookingSeats(ticketId: string, seats: string, seatCount?: number) {
  ensureInit();
  const now = new Date().toISOString();
  runSQL("UPDATE tickets SET seats=" + esc(seats) + (seatCount ? ", seatCount=" + seatCount : "") + ", updatedAt=" + esc(now) + " WHERE ticketId=" + esc(ticketId) + ";");
}

export function getBookingsByUser(userId: string): BookingRow[] {
  ensureInit();
  // Get user email first
  const userResult = runSQL(".mode json\nSELECT email FROM users WHERE id=" + esc(userId) + " LIMIT 1;");
  try {
    const userData = JSON.parse(userResult)[0];
    if (!userData?.email) return [];
    
    const sql = ".mode json\nSELECT t.*, u.fullName as userName, u.id as userId FROM tickets t LEFT JOIN users u ON u.email = t.userEmail WHERE t.userEmail=" + esc(userData.email) + " ORDER BY t.purchasedAt DESC;";
    const out = runSQL(sql);
    
    return JSON.parse(out).map((r: any) => ({
      ticketId: String(r.ticketId),
      userEmail: r.userEmail || undefined,
      userId: r.userId || undefined,
      userName: r.userName || r.userEmail || undefined,
      movieId: String(r.movieId || ''),
      movieTitle: String(r.movieTitle),
      theatreId: undefined,
      theatreName: String(r.theatreName),
      dateKey: String(r.dateKey),
      time: String(r.time),
      seats: String(r.seats),
      seatCount: 0,
      originalTotal: undefined,
      total: Number(r.total),
      status: (r.status || 'confirmed') as 'confirmed' | 'cancelled' | 'refunded' | 'pending',
      paymentMethod: undefined,
      refundAmount: r.refundAmount ? Number(r.refundAmount) : undefined,
      refundedAt: r.refundAt || undefined,
      cancelledAt: undefined,
      cancellationReason: r.cancellationReason || undefined,
      purchasedAt: String(r.purchasedAt),
      updatedAt: r.updatedAt || undefined
    }));
  } catch { return []; }
}

// ===== Notification System =====
export type NotificationTemplate = {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: 'general' | 'booking' | 'promotional' | 'system';
  variables: string[];
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type NotificationCampaign = {
  id: string;
  name: string;
  templateId: string;
  userSegment: 'all' | 'active' | 'recent_bookers' | 'high_spenders' | 'inactive' | 'custom';
  scheduledAt?: string;
  sentAt?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  recipientCount: number;
  sentCount: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
};

export function listNotificationTemplates(): NotificationTemplate[] {
  ensureInit();
  const sql = ".mode json\nSELECT * FROM notification_templates ORDER BY createdAt DESC;";
  const out = runSQL(sql);
  try {
    return JSON.parse(out).map((r: any) => ({
      id: String(r.id),
      name: String(r.name),
      subject: String(r.subject),
      content: String(r.content),
      type: String(r.type || 'general') as NotificationTemplate['type'],
      variables: JSON.parse(r.variables || '[]'),
      isActive: Boolean(r.isActive),
      createdBy: r.createdBy || undefined,
      createdAt: String(r.createdAt),
      updatedAt: String(r.updatedAt)
    }));
  } catch { return []; }
}

export function getNotificationTemplate(id: string): NotificationTemplate | null {
  ensureInit();
  const sql = ".mode json\nSELECT * FROM notification_templates WHERE id=" + esc(id) + " LIMIT 1;";
  const out = runSQL(sql);
  try {
    const r = JSON.parse(out)[0];
    if (!r) return null;
    return {
      id: String(r.id),
      name: String(r.name),
      subject: String(r.subject),
      content: String(r.content),
      type: String(r.type || 'general') as NotificationTemplate['type'],
      variables: JSON.parse(r.variables || '[]'),
      isActive: Boolean(r.isActive),
      createdBy: r.createdBy || undefined,
      createdAt: String(r.createdAt),
      updatedAt: String(r.updatedAt)
    };
  } catch { return null; }
}

export function upsertNotificationTemplate(template: Omit<NotificationTemplate, 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string }) {
  ensureInit();
  const now = new Date().toISOString();
  const sql = "INSERT INTO notification_templates (id,name,subject,content,type,variables,isActive,createdBy,createdAt,updatedAt) VALUES (" +
    esc(template.id) + "," + esc(template.name) + "," + esc(template.subject) + "," + esc(template.content) + "," + 
    esc(template.type) + "," + esc(JSON.stringify(template.variables)) + "," + (template.isActive ? 1 : 0) + "," + 
    esc(template.createdBy) + "," + esc(template.createdAt || now) + "," + esc(template.updatedAt || now) +
    ") ON CONFLICT(id) DO UPDATE SET name=excluded.name,subject=excluded.subject,content=excluded.content,type=excluded.type,variables=excluded.variables,isActive=excluded.isActive,updatedAt=excluded.updatedAt;";
  runSQL(sql);
}

export function deleteNotificationTemplate(id: string) {
  ensureInit();
  runSQL("DELETE FROM notification_templates WHERE id=" + esc(id) + ";");
}

export function listNotificationCampaigns(): NotificationCampaign[] {
  ensureInit();
  const sql = ".mode json\nSELECT * FROM notification_campaigns ORDER BY createdAt DESC;";
  const out = runSQL(sql);
  try {
    return JSON.parse(out).map((r: any) => ({
      id: String(r.id),
      name: String(r.name),
      templateId: String(r.templateId),
      userSegment: String(r.userSegment) as NotificationCampaign['userSegment'],
      scheduledAt: r.scheduledAt || undefined,
      sentAt: r.sentAt || undefined,
      status: String(r.status || 'draft') as NotificationCampaign['status'],
      recipientCount: Number(r.recipientCount || 0),
      sentCount: Number(r.sentCount || 0),
      createdBy: r.createdBy || undefined,
      createdAt: String(r.createdAt),
      updatedAt: String(r.updatedAt)
    }));
  } catch { return []; }
}

export function upsertNotificationCampaign(campaign: Omit<NotificationCampaign, 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string }) {
  ensureInit();
  const now = new Date().toISOString();
  const sql = "INSERT INTO notification_campaigns (id,name,templateId,userSegment,scheduledAt,sentAt,status,recipientCount,sentCount,createdBy,createdAt,updatedAt) VALUES (" +
    esc(campaign.id) + "," + esc(campaign.name) + "," + esc(campaign.templateId) + "," + esc(campaign.userSegment) + "," +
    esc(campaign.scheduledAt) + "," + esc(campaign.sentAt) + "," + esc(campaign.status) + "," + campaign.recipientCount + "," +
    campaign.sentCount + "," + esc(campaign.createdBy) + "," + esc(campaign.createdAt || now) + "," + esc(campaign.updatedAt || now) +
    ") ON CONFLICT(id) DO UPDATE SET name=excluded.name,templateId=excluded.templateId,userSegment=excluded.userSegment,scheduledAt=excluded.scheduledAt,sentAt=excluded.sentAt,status=excluded.status,recipientCount=excluded.recipientCount,sentCount=excluded.sentCount,updatedAt=excluded.updatedAt;";
  runSQL(sql);
}

export function getUsersBySegment(segment: NotificationCampaign['userSegment']): { email: string; fullName: string; id: string }[] {
  ensureInit();
  let sql = "";
  
  switch (segment) {
    case 'all':
      sql = ".mode json\nSELECT id, email, fullName FROM users WHERE status='active';";
      break;
    case 'active':
      sql = ".mode json\nSELECT id, email, fullName FROM users WHERE status='active' AND lastLoginAt > date('now', '-30 days');";
      break;
    case 'recent_bookers':
      sql = ".mode json\nSELECT DISTINCT u.id, u.email, u.fullName FROM users u JOIN tickets t ON t.userEmail = u.email WHERE u.status='active' AND t.purchasedAt > date('now', '-30 days');";
      break;
    case 'high_spenders':
      sql = ".mode json\nSELECT u.id, u.email, u.fullName, SUM(t.total) as totalSpent FROM users u JOIN tickets t ON t.userEmail = u.email WHERE u.status='active' GROUP BY u.id, u.email, u.fullName HAVING totalSpent >= 1000;";
      break;
    case 'inactive':
      sql = ".mode json\nSELECT id, email, fullName FROM users WHERE status='active' AND (lastLoginAt IS NULL OR lastLoginAt < date('now', '-90 days'));";
      break;
    default:
      sql = ".mode json\nSELECT id, email, fullName FROM users WHERE status='active';";
  }
  
  const out = runSQL(sql);
  try {
    return JSON.parse(out).map((r: any) => ({
      id: String(r.id),
      email: String(r.email),
      fullName: String(r.fullName)
    }));
  } catch { return []; }
}

export function sendNotificationToUsers(templateId: string, users: { email: string; fullName: string; id: string }[], variables?: Record<string, string>) {
  ensureInit();
  const template = getNotificationTemplate(templateId);
  if (!template) return 0;
  
  let sentCount = 0;
  const now = new Date().toISOString();
  const notificationId = () => 'notif_' + Math.random().toString(36).substr(2, 9);
  
  for (const user of users) {
    try {
      // Replace template variables
      let subject = template.subject;
      let content = template.content;
      
      // Replace standard variables
      subject = subject.replace(/\{\{userName\}\}/g, user.fullName);
      content = content.replace(/\{\{userName\}\}/g, user.fullName);
      
      // Replace custom variables
      if (variables) {
        for (const [key, value] of Object.entries(variables)) {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          subject = subject.replace(regex, value);
          content = content.replace(regex, value);
        }
      }
      
      insertNotification({
        id: notificationId(),
        userEmail: user.email,
        title: subject,
        message: content,
        createdAt: now,
        read: false
      });
      
      sentCount++;
    } catch (error) {
      console.error('Failed to send notification to', user.email, error);
    }
  }
  
  return sentCount;
}

// ===== LOGGING & AUDIT SYSTEM =====

export function ensureLoggingTables() {
  ensureInit();
  
  // Access logs table for HTTP requests
  runSQL(`
    CREATE TABLE IF NOT EXISTS access_logs (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL UNIQUE,
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      status_code INTEGER,
      user_email TEXT,
      user_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      duration_ms INTEGER,
      request_size INTEGER,
      response_size INTEGER,
      timestamp TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Application logs table for system events
  runSQL(`
    CREATE TABLE IF NOT EXISTS app_logs (
      id TEXT PRIMARY KEY,
      request_id TEXT,
      level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'critical')),
      category TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata TEXT,
      user_email TEXT,
      user_id TEXT,
      timestamp TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Audit trail table for tracking changes
  runSQL(`
    CREATE TABLE IF NOT EXISTS audit_trails (
      id TEXT PRIMARY KEY,
      request_id TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      old_values TEXT,
      new_values TEXT,
      user_email TEXT NOT NULL,
      user_id TEXT NOT NULL,
      ip_address TEXT,
      timestamp TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Create indexes for performance
  runSQL(`CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON access_logs(timestamp)`);
  runSQL(`CREATE INDEX IF NOT EXISTS idx_access_logs_user ON access_logs(user_email)`);
  runSQL(`CREATE INDEX IF NOT EXISTS idx_access_logs_status ON access_logs(status_code)`);
  runSQL(`CREATE INDEX IF NOT EXISTS idx_access_logs_request_id ON access_logs(request_id)`);
  
  runSQL(`CREATE INDEX IF NOT EXISTS idx_app_logs_timestamp ON app_logs(timestamp)`);
  runSQL(`CREATE INDEX IF NOT EXISTS idx_app_logs_level ON app_logs(level)`);
  runSQL(`CREATE INDEX IF NOT EXISTS idx_app_logs_category ON app_logs(category)`);
  runSQL(`CREATE INDEX IF NOT EXISTS idx_app_logs_request_id ON app_logs(request_id)`);
  
  runSQL(`CREATE INDEX IF NOT EXISTS idx_audit_trails_timestamp ON audit_trails(timestamp)`);
  runSQL(`CREATE INDEX IF NOT EXISTS idx_audit_trails_user ON audit_trails(user_email)`);
  runSQL(`CREATE INDEX IF NOT EXISTS idx_audit_trails_action ON audit_trails(action)`);
  runSQL(`CREATE INDEX IF NOT EXISTS idx_audit_trails_resource ON audit_trails(resource_type, resource_id)`);
}

// Log access request
export function logAccessRequest(data: {
  requestId: string;
  method: string;
  path: string;
  statusCode?: number;
  userEmail?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  durationMs?: number;
  requestSize?: number;
  responseSize?: number;
  timestamp: string;
}) {
  ensureInit();
  const id = 'access_' + Math.random().toString(36).substr(2, 12);
  const sql = `
    INSERT INTO access_logs (
      id, request_id, method, path, status_code, user_email, user_id, 
      ip_address, user_agent, duration_ms, request_size, response_size, timestamp
    ) VALUES (${esc(id)}, ${esc(data.requestId)}, ${esc(data.method)}, ${esc(data.path)}, 
             ${data.statusCode || 'NULL'}, ${esc(data.userEmail)}, ${esc(data.userId)}, 
             ${esc(data.ipAddress)}, ${esc(data.userAgent)}, ${data.durationMs || 'NULL'}, 
             ${data.requestSize || 'NULL'}, ${data.responseSize || 'NULL'}, ${esc(data.timestamp)})
  `;
  
  runSQL(sql);
  return id;
}

// Log application event
export function logAppEvent(data: {
  requestId?: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  category: string;
  message: string;
  metadata?: any;
  userEmail?: string;
  userId?: string;
  timestamp?: string;
}) {
  ensureInit();
  const id = 'log_' + Math.random().toString(36).substr(2, 12);
  const timestamp = data.timestamp || new Date().toISOString();
  const metadata = data.metadata ? JSON.stringify(data.metadata) : null;
  
  const sql = `
    INSERT INTO app_logs (id, request_id, level, category, message, metadata, user_email, user_id, timestamp)
    VALUES (${esc(id)}, ${esc(data.requestId)}, ${esc(data.level)}, ${esc(data.category)}, 
            ${esc(data.message)}, ${esc(metadata)}, ${esc(data.userEmail)}, ${esc(data.userId)}, ${esc(timestamp)})
  `;
  
  runSQL(sql);
  return id;
}

// Log audit trail for changes
export function logAuditTrail(data: {
  requestId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  userEmail: string;
  userId: string;
  ipAddress?: string;
  timestamp?: string;
}) {
  ensureInit();
  const id = 'audit_' + Math.random().toString(36).substr(2, 12);
  const timestamp = data.timestamp || new Date().toISOString();
  const oldValues = data.oldValues ? JSON.stringify(data.oldValues) : null;
  const newValues = data.newValues ? JSON.stringify(data.newValues) : null;
  
  const sql = `
    INSERT INTO audit_trails (
      id, request_id, action, resource_type, resource_id, old_values, new_values,
      user_email, user_id, ip_address, timestamp
    ) VALUES (${esc(id)}, ${esc(data.requestId)}, ${esc(data.action)}, ${esc(data.resourceType)}, 
             ${esc(data.resourceId)}, ${esc(oldValues)}, ${esc(newValues)}, ${esc(data.userEmail)}, 
             ${esc(data.userId)}, ${esc(data.ipAddress)}, ${esc(timestamp)})
  `;
  
  runSQL(sql);
  return id;
}

// Get access logs with filtering
export function getAccessLogs(filters: {
  startDate?: string;
  endDate?: string;
  userEmail?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  requestId?: string;
  limit?: number;
  offset?: number;
} = {}) {
  ensureInit();
  let sql = `SELECT * FROM access_logs WHERE 1=1`;
  const conditions: string[] = [];
  
  if (filters.startDate) {
    conditions.push(`timestamp >= ${esc(filters.startDate)}`);
  }
  if (filters.endDate) {
    conditions.push(`timestamp <= ${esc(filters.endDate)}`);
  }
  if (filters.userEmail) {
    conditions.push(`user_email LIKE ${esc('%' + filters.userEmail + '%')}`);
  }
  if (filters.method) {
    conditions.push(`method = ${esc(filters.method)}`);
  }
  if (filters.path) {
    conditions.push(`path LIKE ${esc('%' + filters.path + '%')}`);
  }
  if (filters.statusCode) {
    conditions.push(`status_code = ${filters.statusCode}`);
  }
  if (filters.requestId) {
    conditions.push(`request_id = ${esc(filters.requestId)}`);
  }
  
  if (conditions.length > 0) {
    sql += ` AND ` + conditions.join(' AND ');
  }
  
  sql += ` ORDER BY timestamp DESC`;
  
  if (filters.limit) {
    sql += ` LIMIT ${filters.limit}`;
    if (filters.offset) {
      sql += ` OFFSET ${filters.offset}`;
    }
  }
  
  const out = runSQL('.mode json\n' + sql);
  try {
    return JSON.parse(out);
  } catch {
    return [];
  }
}

// Get application logs with filtering
export function getAppLogs(filters: {
  startDate?: string;
  endDate?: string;
  level?: string;
  category?: string;
  userEmail?: string;
  requestId?: string;
  search?: string;
  limit?: number;
  offset?: number;
} = {}) {
  ensureInit();
  let sql = `SELECT * FROM app_logs WHERE 1=1`;
  const conditions: string[] = [];
  
  if (filters.startDate) {
    conditions.push(`timestamp >= ${esc(filters.startDate)}`);
  }
  if (filters.endDate) {
    conditions.push(`timestamp <= ${esc(filters.endDate)}`);
  }
  if (filters.level) {
    conditions.push(`level = ${esc(filters.level)}`);
  }
  if (filters.category) {
    conditions.push(`category = ${esc(filters.category)}`);
  }
  if (filters.userEmail) {
    conditions.push(`user_email LIKE ${esc('%' + filters.userEmail + '%')}`);
  }
  if (filters.requestId) {
    conditions.push(`request_id = ${esc(filters.requestId)}`);
  }
  if (filters.search) {
    conditions.push(`(message LIKE ${esc('%' + filters.search + '%')} OR metadata LIKE ${esc('%' + filters.search + '%')})`);
  }
  
  if (conditions.length > 0) {
    sql += ` AND ` + conditions.join(' AND ');
  }
  
  sql += ` ORDER BY timestamp DESC`;
  
  if (filters.limit) {
    sql += ` LIMIT ${filters.limit}`;
    if (filters.offset) {
      sql += ` OFFSET ${filters.offset}`;
    }
  }
  
  const out = runSQL('.mode json\n' + sql);
  try {
    return JSON.parse(out);
  } catch {
    return [];
  }
}

// Get audit trails with filtering
export function getAuditTrails(filters: {
  startDate?: string;
  endDate?: string;
  userEmail?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  requestId?: string;
  limit?: number;
  offset?: number;
} = {}) {
  ensureInit();
  let sql = `SELECT * FROM audit_trails WHERE 1=1`;
  const conditions: string[] = [];
  
  if (filters.startDate) {
    conditions.push(`timestamp >= ${esc(filters.startDate)}`);
  }
  if (filters.endDate) {
    conditions.push(`timestamp <= ${esc(filters.endDate)}`);
  }
  if (filters.userEmail) {
    conditions.push(`user_email LIKE ${esc('%' + filters.userEmail + '%')}`);
  }
  if (filters.action) {
    conditions.push(`action = ${esc(filters.action)}`);
  }
  if (filters.resourceType) {
    conditions.push(`resource_type = ${esc(filters.resourceType)}`);
  }
  if (filters.resourceId) {
    conditions.push(`resource_id = ${esc(filters.resourceId)}`);
  }
  if (filters.requestId) {
    conditions.push(`request_id = ${esc(filters.requestId)}`);
  }
  
  if (conditions.length > 0) {
    sql += ` AND ` + conditions.join(' AND ');
  }
  
  sql += ` ORDER BY timestamp DESC`;
  
  if (filters.limit) {
    sql += ` LIMIT ${filters.limit}`;
    if (filters.offset) {
      sql += ` OFFSET ${filters.offset}`;
    }
  }
  
  const out = runSQL('.mode json\n' + sql);
  try {
    return JSON.parse(out);
  } catch {
    return [];
  }
}

// Get log statistics
export function getLogStatistics(days: number = 7) {
  ensureInit();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString();
  
  const accessStats = (() => {
    try {
      const out = runSQL(`.mode json\nSELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_requests,
        COUNT(CASE WHEN status_code >= 500 THEN 1 END) as server_errors,
        AVG(duration_ms) as avg_duration_ms,
        COUNT(DISTINCT user_email) as unique_users
      FROM access_logs 
      WHERE timestamp >= ${esc(startDateStr)}`);
      return JSON.parse(out)[0] || {};
    } catch { return {}; }
  })();
  
  const appLogStats = (() => {
    try {
      const out = runSQL(`.mode json\nSELECT level, COUNT(*) as count 
      FROM app_logs 
      WHERE timestamp >= ${esc(startDateStr)}
      GROUP BY level`);
      return JSON.parse(out);
    } catch { return []; }
  })();
  
  const auditStats = (() => {
    try {
      const out = runSQL(`.mode json\nSELECT action, COUNT(*) as count 
      FROM audit_trails 
      WHERE timestamp >= ${esc(startDateStr)}
      GROUP BY action`);
      return JSON.parse(out);
    } catch { return []; }
  })();
  
  return {
    accessLogs: accessStats,
    appLogs: appLogStats,
    auditTrails: auditStats,
    period: `${days} days`
  };
}
