import { pgQuery } from "./pg";

// ========== AUTH / USERS / PROFILES ==========
export async function getUserByEmail(email: string) {
  const rows = await pgQuery<any>("SELECT * FROM users WHERE email = $1 LIMIT 1", [email]);
  return rows[0] || null;
}

export async function createUser(u: { id: string; email: string; fullName: string; passwordHash: string; passwordSalt: string; createdAt: string }) {
  await pgQuery(
    `INSERT INTO users (id,email,"fullName","passwordHash","passwordSalt",status,"createdAt","updatedAt")
     VALUES ($1,$2,$3,$4,$5,'active',$6,$6)
     ON CONFLICT (id) DO NOTHING`,
    [u.id, u.email, u.fullName, u.passwordHash, u.passwordSalt, u.createdAt]
  );
}

export async function upsertProfile(p: { id: string; fullName: string; email: string; phone?: string; dob?: string; country?: string; createdAt: string }) {
  await pgQuery(
    `INSERT INTO profiles (id,"fullName",email,phone,dob,country,"createdAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (email) DO UPDATE SET "fullName"=EXCLUDED."fullName", phone=EXCLUDED.phone, dob=EXCLUDED.dob, country=EXCLUDED.country`,
    [p.id, p.fullName, p.email, p.phone || null, p.dob || null, p.country || null, p.createdAt]
  );
}

export async function ensureRole(name: string) {
  await pgQuery(`INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [name]);
}

export async function assignRoleToUserId(userId: string, roleName: string) {
  await ensureRole(roleName);
  const role = (await pgQuery<any>(`SELECT id FROM roles WHERE name=$1 LIMIT 1`, [roleName]))[0];
  if (!role?.id) return;
  await pgQuery(`INSERT INTO user_roles ("userId","roleId") VALUES ($1,$2) ON CONFLICT ("userId","roleId") DO NOTHING`, [userId, role.id]);
}

export async function getRolesByEmail(email: string): Promise<string[]> {
  const rows = await pgQuery<any>(
    `SELECT r.name FROM roles r JOIN user_roles ur ON ur."roleId"=r.id JOIN users u ON u.id=ur."userId" WHERE u.email=$1`,
    [email]
  );
  return rows.map((r: any) => r.name);
}

export async function getProfileByEmail(email: string) {
  const rows = await pgQuery<any>(`SELECT * FROM profiles WHERE email=$1 LIMIT 1`, [email]);
  return rows[0] || null;
}

// Tickets
export async function listTicketsByEmail(email: string) {
  return pgQuery<any>(`SELECT * FROM tickets WHERE "userEmail"=$1 ORDER BY "purchasedAt" DESC`, [email]);
}

export async function listAllBookings(opts?: { status?: string; userId?: string; userEmail?: string; limit?: number; offset?: number }) {
  const where: string[] = []; const params: any[] = []; let i = 1;
  if (opts?.status) { where.push(`t.status=$${i++}`); params.push(opts.status); }
  if (opts?.userEmail) { where.push(`t."userEmail"=$${i++}`); params.push(opts.userEmail); }
  if (opts?.userId) {
    const u = (await pgQuery<any>(`SELECT email FROM users WHERE id=$1 LIMIT 1`, [opts.userId]))[0];
    if (u?.email) { where.push(`t."userEmail"=$${i++}`); params.push(u.email); }
  }
  const limit = Math.min(Number(opts?.limit || 50), 200);
  const offset = Number(opts?.offset || 0);
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await pgQuery<any>(`SELECT t.*, u."fullName" as "userName", u.id as "userId" FROM tickets t LEFT JOIN users u ON u.email = t."userEmail" ${whereClause} ORDER BY t."purchasedAt" DESC LIMIT ${limit} OFFSET ${offset}`, params);
  const count = await pgQuery<any>(`SELECT COUNT(*)::int as total FROM tickets t ${whereClause}`, params);
  return { bookings: rows.map((r:any)=>({
    ticketId: String(r.ticketId), userEmail: r.userEmail || undefined, userId: r.userId || undefined, userName: r.userName || r.userEmail || undefined,
    movieId: String(r.movieId || ''), movieTitle: String(r.movieTitle), theatreId: undefined, theatreName: String(r.theatreName), dateKey: String(r.dateKey), time: String(r.time),
    seats: String(r.seats), seatCount: Number(r.seatCount || 0), originalTotal: r.originalTotal ? Number(r.originalTotal) : undefined, total: Number(r.total),
    status: String(r.status || 'confirmed'), paymentMethod: r.paymentMethod || undefined, refundAmount: r.refundAmount ? Number(r.refundAmount) : undefined,
    refundedAt: r.refundedAt || undefined, cancelledAt: r.cancelledAt || undefined, cancellationReason: r.cancellationReason || undefined,
    purchasedAt: String(r.purchasedAt), updatedAt: r.updatedAt || undefined
  })), total: Number(count[0]?.total || 0) };
}

export async function getBooking(ticketId: string) {
  const rows = await pgQuery<any>(`SELECT t.*, u."fullName" as "userName" FROM tickets t LEFT JOIN users u ON u.id = t."userId" WHERE t."ticketId"=$1 LIMIT 1`, [ticketId]);
  const r = rows[0];
  if (!r) return null;
  return {
    ticketId: String(r.ticketId), userEmail: r.userEmail || undefined, userId: r.userId || undefined, userName: r.userName || undefined,
    movieId: String(r.movieId), movieTitle: String(r.movieTitle), theatreId: r.theatreId || undefined, theatreName: String(r.theatreName), dateKey: String(r.dateKey), time: String(r.time),
    seats: String(r.seats), seatCount: Number(r.seatCount || 0), originalTotal: r.originalTotal ? Number(r.originalTotal) : undefined, total: Number(r.total),
    status: (r.status || 'confirmed'), paymentMethod: r.paymentMethod || undefined, refundAmount: r.refundAmount ? Number(r.refundAmount) : undefined,
    refundedAt: r.refundedAt || undefined, cancelledAt: r.cancelledAt || undefined, cancellationReason: r.cancellationReason || undefined,
    purchasedAt: String(r.purchasedAt), updatedAt: r.updatedAt || undefined
  };
}

export async function updateBookingStatus(ticketId: string, status: 'confirmed' | 'cancelled' | 'refunded' | 'pending', reason?: string) {
  const now = new Date().toISOString();
  const sets: string[] = ['status=$2', '"updatedAt"=$3']; const params: any[] = [ticketId, status, now];
  if (status === 'cancelled') { sets.push('"cancelledAt"=$4'); params.push(now); if (reason) { sets.push('"cancellationReason"=$5'); params.push(reason); } }
  if (status === 'refunded') { if (params.length===3){ sets.push('"refundedAt"=$4'); params.push(now); } else { sets.push('"refundedAt"=$' + (params.length+1)); params.push(now);} if (reason) { sets.push('"cancellationReason"=$' + (params.length+1)); params.push(reason); } }
  const sql = `UPDATE tickets SET ${sets.join(', ')} WHERE "ticketId"=$1`;
  await pgQuery(sql, params);
}

export async function processRefund(ticketId: string, refundAmount: number, reason?: string) {
  const now = new Date().toISOString();
  const sets = ['status=\'refunded\'', `"refundAmount"=${refundAmount}`, '"refundedAt"=$2', '"updatedAt"=$2'];
  const params: any[] = [ticketId, now];
  if (reason) { sets.push('"cancellationReason"=$3'); params.push(reason); }
  await pgQuery(`UPDATE tickets SET ${sets.join(', ')} WHERE "ticketId"=$1`, params);
}

export async function updateBookingSeats(ticketId: string, seats: string, seatCount?: number) {
  const now = new Date().toISOString();
  const sets = ['seats=$2', '"updatedAt"=$3']; const params: any[] = [ticketId, seats, now];
  if (seatCount) { sets.push('"seatCount"=$4'); params.push(seatCount); }
  await pgQuery(`UPDATE tickets SET ${sets.join(', ')} WHERE "ticketId"=$1`, params);
}

export async function getBookingsByUser(userId: string) {
  const u = (await pgQuery<any>(`SELECT email FROM users WHERE id=$1 LIMIT 1`, [userId]))[0];
  if (!u?.email) return [];
  const rows = await pgQuery<any>(`SELECT t.*, u."fullName" as "userName", u.id as "userId" FROM tickets t LEFT JOIN users u ON u.email = t."userEmail" WHERE t."userEmail"=$1 ORDER BY t."purchasedAt" DESC`, [u.email]);
  return rows.map((r:any)=>({
    ticketId: String(r.ticketId), userEmail: r.userEmail || undefined, userId: r.userId || undefined, userName: r.userName || r.userEmail || undefined,
    movieId: String(r.movieId || ''), movieTitle: String(r.movieTitle), theatreId: undefined, theatreName: String(r.theatreName), dateKey: String(r.dateKey), time: String(r.time),
    seats: String(r.seats), seatCount: 0, originalTotal: undefined, total: Number(r.total), status: String(r.status || 'confirmed'), paymentMethod: undefined,
    refundAmount: r.refundAmount ? Number(r.refundAmount) : undefined, refundedAt: r.refundedAt || undefined, cancelledAt: undefined, cancellationReason: r.cancellationReason || undefined,
    purchasedAt: String(r.purchasedAt), updatedAt: r.updatedAt || undefined
  }));
}

export async function insertTicket(t: { ticketId: string; userEmail?: string; movieId: string; movieTitle: string; theatreName: string; dateKey: string; time: string; seats: string; total: number; purchasedAt: string; }) {
  await pgQuery(
    `INSERT INTO tickets ("ticketId","userEmail","movieId","movieTitle","theatreName","dateKey",time,seats,total,status,"purchasedAt","updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'confirmed',$10,$10)
     ON CONFLICT ("ticketId") DO UPDATE SET "userEmail"=EXCLUDED."userEmail","movieId"=EXCLUDED."movieId","movieTitle"=EXCLUDED."movieTitle","theatreName"=EXCLUDED."theatreName","dateKey"=EXCLUDED."dateKey",time=EXCLUDED.time,seats=EXCLUDED.seats,total=EXCLUDED.total,"updatedAt"=EXCLUDED."updatedAt"`,
    [t.ticketId, t.userEmail || null, t.movieId, t.movieTitle, t.theatreName, t.dateKey, t.time, t.seats, t.total, t.purchasedAt]
  );
}

// Admin Users
export async function listAllUsers() {
  const sql = `
    SELECT u.*, COALESCE(string_agg(DISTINCT r.name, ',' ORDER BY r.name) FILTER (WHERE r.name IS NOT NULL),'') AS roles_csv,
           COUNT(DISTINCT t."ticketId")::int AS "totalBookings",
           COALESCE(SUM(t.total),0)::int AS "totalSpent"
    FROM users u
    LEFT JOIN user_roles ur ON ur."userId"=u.id
    LEFT JOIN roles r ON r.id=ur."roleId"
    LEFT JOIN tickets t ON t."userEmail"=u.email
    GROUP BY u.id
    ORDER BY u."createdAt" DESC`;
  const rows = await pgQuery<any>(sql);
  return rows.map((r: any) => ({
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
    totalSpent: Number(r.totalSpent || 0),
  }));
}

export async function getUserWithStats(userId: string) {
  const sql = `
    SELECT u.*, COALESCE(string_agg(DISTINCT r.name, ',' ORDER BY r.name) FILTER (WHERE r.name IS NOT NULL),'') AS roles_csv,
           COUNT(DISTINCT t."ticketId")::int AS "totalBookings",
           COALESCE(SUM(t.total),0)::int AS "totalSpent"
    FROM users u
    LEFT JOIN user_roles ur ON ur."userId"=u.id
    LEFT JOIN roles r ON r.id=ur."roleId"
    LEFT JOIN tickets t ON t."userEmail"=u.email
    WHERE u.id=$1
    GROUP BY u.id`;
  const rows = await pgQuery<any>(sql, [userId]);
  const r = rows[0];
  if (!r) return null;
  return {
    id: String(r.id),
    email: String(r.email),
    fullName: String(r.fullName),
    status: (r.status || 'active'),
    bannedAt: r.bannedAt || null,
    bannedReason: r.bannedReason || null,
    lastLoginAt: r.lastLoginAt || null,
    createdAt: String(r.createdAt),
    updatedAt: String(r.updatedAt || r.createdAt),
    roles: String(r.roles_csv || '').split(',').filter(Boolean),
    totalBookings: Number(r.totalBookings || 0),
    totalSpent: Number(r.totalSpent || 0)
  };
}

export async function banUser(userId: string, reason: string) {
  await pgQuery(`UPDATE users SET status='banned', "bannedAt"=now(), "bannedReason"=$2, "updatedAt"=now() WHERE id=$1`, [userId, reason]);
}
export async function unbanUser(userId: string) {
  await pgQuery(`UPDATE users SET status='active', "bannedAt"=NULL, "bannedReason"=NULL, "updatedAt"=now() WHERE id=$1`, [userId]);
}
export async function updateUserStatus(userId: string, status: 'active'|'banned'|'suspended') {
  await pgQuery(`UPDATE users SET status=$2, "updatedAt"=now() WHERE id=$1`, [userId, status]);
}

// ========== PUBLIC MOVIES ==========
export type PublicMovie = {
  id: string;
  title: string;
  year: number | null;
  poster: string | null;
  backdrop: string | null;
  rating: number | null;
  durationMins: number | null;
  releaseDate: string | null;
  languages: string[];
  formats: string[];
  categories: string[];
  published: number;
  createdAt: string;
  updatedAt: string;
};

export async function listPublicCategoriesWithCounts(): Promise<{ id: number; name: string; count: number }[]> {
  const sql = `
    SELECT c.id::int, c.name::text,
           COUNT(m.id)::int AS count
    FROM categories c
    LEFT JOIN movie_categories mc ON mc."categoryId" = c.id
    LEFT JOIN movies m ON m.id = mc."movieId" AND m.published = 1
    GROUP BY c.id, c.name
    ORDER BY c.name
  `;
  const rows = await pgQuery<any>(sql);
  return rows.map(r => ({ id: Number(r.id), name: String(r.name), count: Number(r.count || 0) }));
}

export async function listPublicMovies(opts?: { publishedOnly?: boolean; category?: string | null; q?: string | null; limit?: number | null; sort?: string | null; dir?: 'asc' | 'desc' | null; }): Promise<PublicMovie[]> {
  const where: string[] = [];
  const params: any[] = [];
  let i = 1;
  if (opts?.publishedOnly !== false) { where.push(`published = 1`); }
  if (opts?.category) {
    where.push(`id IN (SELECT mc."movieId" FROM movie_categories mc JOIN categories c ON c.id = mc."categoryId" WHERE c.name = $${i++})`);
    params.push(opts.category);
  }
  if (opts?.q) {
    where.push(`(title ILIKE $${i} OR synopsis ILIKE $${i})`);
    params.push(`%${opts.q}%`);
    i++;
  }
  const limit = Math.min(Number(opts?.limit || 20), 100);
  const orderBy = `createdAt ${opts?.dir?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}`;
  const sql = `
    SELECT id, title, synopsis, poster, backdrop, year, rating, "durationMins", "releaseDate", languages, formats, published, "createdAt", "updatedAt"
    FROM movies
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY ${orderBy}
    LIMIT ${limit}
  `;
  const rows = await pgQuery<any>(sql, params);
  return rows.map(toPublicMovie);
}

export async function getPublicMovie(id: string): Promise<PublicMovie | null> {
  const sql = `SELECT * FROM movies WHERE id = $1 LIMIT 1`;
  const rows = await pgQuery<any>(sql, [id]);
  const r = rows[0];
  return r ? toPublicMovie(r) : null;
}

function toPublicMovie(r: any): PublicMovie {
  const langs = (r.languages ? String(r.languages) : '').split(',').filter(Boolean);
  const formats = (r.formats ? String(r.formats) : '').split(',').filter(Boolean);
  return {
    id: String(r.id),
    title: String(r.title ?? ''),
    year: r.year == null ? null : Number(r.year),
    poster: r.poster == null ? null : String(r.poster),
    backdrop: r.backdrop == null ? null : String(r.backdrop),
    rating: r.rating == null ? null : Number(r.rating),
    durationMins: r.durationMins == null ? (r["durationMins"] == null ? null : Number(r["durationMins"])) : Number(r.durationMins),
    releaseDate: r.releaseDate == null ? (r["releaseDate"] == null ? null : String(r["releaseDate"])) : String(r.releaseDate),
    languages: langs,
    formats: formats,
    categories: [],
    published: Number(r.published ?? 0),
    createdAt: String(r.createdAt ?? r["createdAt"] ?? ''),
    updatedAt: String(r.updatedAt ?? r["updatedAt"] ?? ''),
  };
}

// Movies/admin
export async function listMovies() {
  return pgQuery<any>(`SELECT * FROM movies ORDER BY "createdAt" DESC`);
}

export async function getMovie(id: string) {
  const rows = await pgQuery<any>(`SELECT * FROM movies WHERE id=$1 LIMIT 1`, [id]);
  return rows[0] || null;
}

export async function listCategories(): Promise<{ id: number; name: string }[]> {
  const rows = await pgQuery<any>(`SELECT id,name FROM categories ORDER BY name`);
  return rows.map((r:any)=>({ id: Number(r.id), name: String(r.name)}));
}

export async function createCategory(name: string) {
  await pgQuery(`INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [name]);
}

export async function deleteCategory(id: number) {
  await pgQuery(`DELETE FROM categories WHERE id=$1`, [id]);
}

export async function getMovieCategoryIds(movieId: string): Promise<number[]> {
  const rows = await pgQuery<any>(`SELECT "categoryId" FROM movie_categories WHERE "movieId"=$1`, [movieId]);
  return rows.map((r:any)=> Number(r.categoryId));
}

export async function setMovieCategories(movieId: string, categoryIds: number[]) {
  await pgQuery(`DELETE FROM movie_categories WHERE "movieId"=$1`, [movieId]);
  for (const cid of categoryIds) {
    await pgQuery(`INSERT INTO movie_categories ("movieId","categoryId") VALUES ($1,$2) ON CONFLICT ("movieId","categoryId") DO NOTHING`, [movieId, cid]);
  }
}

export async function upsertMovie(m: any) {
  await pgQuery(
    `INSERT INTO movies (id,title,synopsis,poster,backdrop,year,rating,"durationMins","releaseDate",languages,formats,published,"createdAt","updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,synopsis=EXCLUDED.synopsis,poster=EXCLUDED.poster,backdrop=EXCLUDED.backdrop,year=EXCLUDED.year,rating=EXCLUDED.rating,"durationMins"=EXCLUDED."durationMins","releaseDate"=EXCLUDED."releaseDate",languages=EXCLUDED.languages,formats=EXCLUDED.formats,published=EXCLUDED.published,"updatedAt"=EXCLUDED."updatedAt"`,
    [m.id, m.title, m.synopsis ?? null, m.poster ?? null, m.backdrop ?? null, m.year ?? null, m.rating ?? null, m.durationMins ?? null, m.releaseDate ?? null, m.languages ?? null, m.formats ?? null, m.published ?? 0, m.createdAt, m.updatedAt]
  );
}

export async function deleteMovie(id: string) {
  await pgQuery(`DELETE FROM movie_categories WHERE "movieId"=$1`, [id]);
  await pgQuery(`DELETE FROM movies WHERE id=$1`, [id]);
}

// Shows & theatres
export async function listShows(opts?: { movieId?: string; dateKey?: string; publishedOnly?: boolean }) {
  const conds: string[] = [];
  const params: any[] = [];
  let i = 1;
  if (opts?.movieId) { conds.push(`"movieId"=$${i++}`); params.push(opts.movieId); }
  if (opts?.dateKey) { conds.push(`"dateKey"=$${i++}`); params.push(opts.dateKey); }
  if (opts?.publishedOnly !== false) { conds.push(`published=1`); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
return pgQuery<any>(`SELECT * FROM shows ${where} ORDER BY "dateKey", time`, params);
}

export async function upsertShow(s: { id: string; movieId: string; theatreId: string; dateKey: string; time: string; format?: string | null; language?: string | null; prices: string; published: number; createdAt: string; updatedAt: string; }) {
  await pgQuery(
    `INSERT INTO shows (id,"movieId","theatreId","dateKey",time,format,language,prices,published,"createdAt","updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (id) DO UPDATE SET "movieId"=EXCLUDED."movieId","theatreId"=EXCLUDED."theatreId","dateKey"=EXCLUDED."dateKey",time=EXCLUDED.time,format=EXCLUDED.format,language=EXCLUDED.language,prices=EXCLUDED.prices,published=EXCLUDED.published,"updatedAt"=EXCLUDED."updatedAt"`,
    [s.id, s.movieId, s.theatreId, s.dateKey, s.time, s.format ?? null, s.language ?? null, s.prices, s.published ? 1 : 0, s.createdAt, s.updatedAt]
  );
}

export async function deleteShow(id: string) {
  await pgQuery(`DELETE FROM shows WHERE id=$1`, [id]);
}

export async function listTheatres() {
  return pgQuery<any>(`SELECT * FROM theatres ORDER BY name`);
}

export async function upsertTheatre(t: { id: string; name: string; city?: string | null; address?: string | null; createdAt: string; }) {
  await pgQuery(
    `INSERT INTO theatres (id,name,city,address,"createdAt") VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, city=EXCLUDED.city, address=EXCLUDED.address`,
    [t.id, t.name, t.city ?? null, t.address ?? null, t.createdAt]
  );
}

export async function deleteTheatre(id: string) {
  await pgQuery(`DELETE FROM theatres WHERE id=$1`, [id]);
}

export async function getTheatrePricing(theatreId: string) {
  return pgQuery<any>(`SELECT * FROM theatre_pricing WHERE "theatreId"=$1`, [theatreId]);
}

export async function listPricingTiers() {
  return pgQuery<any>(`SELECT * FROM pricing_tiers ORDER BY name`);
}

export async function createPricingTier(p: { name: string; description?: string | null; baseMultiplier: number; weekendMultiplier: number; holidayMultiplier: number; createdAt: string; }) {
  await pgQuery(
    `INSERT INTO pricing_tiers (name,description,"baseMultiplier","weekendMultiplier","holidayMultiplier","createdAt")
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (name) DO NOTHING`,
    [p.name, p.description ?? null, p.baseMultiplier, p.weekendMultiplier, p.holidayMultiplier, p.createdAt]
  );
}

export async function updatePricingTier(id: number, p: Partial<{ name: string; description?: string | null; baseMultiplier: number; weekendMultiplier: number; holidayMultiplier: number; }>) {
  const sets: string[] = []; const vals: any[] = []; let i = 1;
  if (p.name !== undefined) { sets.push(`name=$${i++}`); vals.push(p.name); }
  if (p.description !== undefined) { sets.push(`description=$${i++}`); vals.push(p.description); }
  if (p.baseMultiplier !== undefined) { sets.push(`"baseMultiplier"=$${i++}`); vals.push(p.baseMultiplier); }
  if (p.weekendMultiplier !== undefined) { sets.push(`"weekendMultiplier"=$${i++}`); vals.push(p.weekendMultiplier); }
  if (p.holidayMultiplier !== undefined) { sets.push(`"holidayMultiplier"=$${i++}`); vals.push(p.holidayMultiplier); }
  if (!sets.length) return;
  vals.push(id);
  await pgQuery(`UPDATE pricing_tiers SET ${sets.join(', ')} WHERE id=$${sets.length+1}`, vals);
}

export async function deletePricingTier(id: number) {
  await pgQuery(`DELETE FROM pricing_tiers WHERE id=$1`, [id]);
}

export async function getSeatTemplate(theatreId: string) {
  const rows = await pgQuery<any>(`SELECT * FROM seat_templates WHERE "theatreId"=$1 LIMIT 1`, [theatreId]);
  return rows[0] || null;
}

export async function upsertSeatTemplate(st: { theatreId: string; name: string; layout: string; totalSeats: number; normalSeats: number; executiveSeats: number; premiumSeats: number; vipSeats: number; createdAt: string; updatedAt: string; }) {
  await pgQuery(
    `INSERT INTO seat_templates ("theatreId",name,layout,"totalSeats","normalSeats","executiveSeats","premiumSeats","vipSeats","createdAt","updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT ("theatreId") DO UPDATE SET name=EXCLUDED.name, layout=EXCLUDED.layout, "totalSeats"=EXCLUDED."totalSeats", "normalSeats"=EXCLUDED."normalSeats", "executiveSeats"=EXCLUDED."executiveSeats", "premiumSeats"=EXCLUDED."premiumSeats", "vipSeats"=EXCLUDED."vipSeats", "updatedAt"=EXCLUDED."updatedAt"`,
    [st.theatreId, st.name, st.layout, st.totalSeats, st.normalSeats, st.executiveSeats, st.premiumSeats, st.vipSeats, st.createdAt, st.updatedAt]
  );
}

export async function deleteSeatTemplate(theatreId: string) {
  await pgQuery(`DELETE FROM seat_templates WHERE "theatreId"=$1`, [theatreId]);
}

export async function getTheatreSchedules(theatreId: string) {
  return pgQuery<any>(`SELECT * FROM theatre_schedules WHERE "theatreId"=$1 ORDER BY "dayOfWeek"`, [theatreId]);
}

export async function upsertTheatreSchedule(ts: { theatreId: string; dayOfWeek: number; availableSlots: string; operatingHours: string; createdAt: string; }) {
  await pgQuery(
    `INSERT INTO theatre_schedules ("theatreId","dayOfWeek","availableSlots","operatingHours","createdAt")
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT ("theatreId","dayOfWeek") DO UPDATE SET "availableSlots"=EXCLUDED."availableSlots","operatingHours"=EXCLUDED."operatingHours"`,
    [ts.theatreId, ts.dayOfWeek, ts.availableSlots, ts.operatingHours, ts.createdAt]
  );
}

export async function deleteTheatreSchedule(theatreId: string, dayOfWeek?: number) {
  if (dayOfWeek !== undefined) {
    await pgQuery(`DELETE FROM theatre_schedules WHERE "theatreId"=$1 AND "dayOfWeek"=$2`, [theatreId, dayOfWeek]);
  } else {
    await pgQuery(`DELETE FROM theatre_schedules WHERE "theatreId"=$1`, [theatreId]);
  }
}

export async function upsertTheatrePricing(tp: { theatreId: string; pricingTierId: number; normalPrice: number; executivePrice: number; premiumPrice: number; vipPrice: number; }) {
  await pgQuery(
    `INSERT INTO theatre_pricing ("theatreId","pricingTierId","normalPrice","executivePrice","premiumPrice","vipPrice")
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT ("theatreId","pricingTierId") DO UPDATE SET "normalPrice"=EXCLUDED."normalPrice","executivePrice"=EXCLUDED."executivePrice","premiumPrice"=EXCLUDED."premiumPrice","vipPrice"=EXCLUDED."vipPrice"`,
    [tp.theatreId, tp.pricingTierId, tp.normalPrice, tp.executivePrice, tp.premiumPrice, tp.vipPrice]
  );
}

export async function deleteTheatrePricing(theatreId: string, pricingTierId: number) {
  await pgQuery(`DELETE FROM theatre_pricing WHERE "theatreId"=$1 AND "pricingTierId"=$2`, [theatreId, pricingTierId]);
}

// Logging & audit (PG implementations)
export async function getAccessLogs(filters: { startDate?: string; endDate?: string; userEmail?: string; method?: string; path?: string; statusCode?: number; requestId?: string; limit?: number; offset?: number; } = {}) {
  const conds: string[] = [];
  const params: any[] = [];
  let i = 1;
  if (filters.startDate) { conds.push(`timestamp >= $${i++}`); params.push(filters.startDate); }
  if (filters.endDate) { conds.push(`timestamp <= $${i++}`); params.push(filters.endDate); }
  if (filters.userEmail) { conds.push(`user_email ILIKE $${i++}`); params.push(`%${filters.userEmail}%`); }
  if (filters.method) { conds.push(`method = $${i++}`); params.push(filters.method); }
  if (filters.path) { conds.push(`path ILIKE $${i++}`); params.push(`%${filters.path}%`); }
  if (filters.statusCode) { conds.push(`status_code = $${i++}`); params.push(filters.statusCode); }
  if (filters.requestId) { conds.push(`request_id = $${i++}`); params.push(filters.requestId); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const limit = Math.min(Number(filters.limit || 100), 1000);
  const offset = Number(filters.offset || 0);
  const sql = `SELECT * FROM access_logs ${where} ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}`;
  return pgQuery<any>(sql, params);
}

export async function getAppLogs(filters: { startDate?: string; endDate?: string; level?: string; category?: string; userEmail?: string; requestId?: string; search?: string; limit?: number; offset?: number; } = {}) {
  const conds: string[] = [];
  const params: any[] = [];
  let i = 1;
  if (filters.startDate) { conds.push(`timestamp >= $${i++}`); params.push(filters.startDate); }
  if (filters.endDate) { conds.push(`timestamp <= $${i++}`); params.push(filters.endDate); }
  if (filters.level) { conds.push(`level = $${i++}`); params.push(filters.level); }
  if (filters.category) { conds.push(`category = $${i++}`); params.push(filters.category); }
  if (filters.userEmail) { conds.push(`user_email ILIKE $${i++}`); params.push(`%${filters.userEmail}%`); }
  if (filters.requestId) { conds.push(`request_id = $${i++}`); params.push(filters.requestId); }
  if (filters.search) { conds.push(`(message ILIKE $${i} OR metadata ILIKE $${i})`); params.push(`%${filters.search}%`); i++; }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const limit = Math.min(Number(filters.limit || 100), 1000);
  const offset = Number(filters.offset || 0);
  const sql = `SELECT * FROM app_logs ${where} ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}`;
  return pgQuery<any>(sql, params);
}

export async function getAuditTrails(filters: { startDate?: string; endDate?: string; userEmail?: string; action?: string; resourceType?: string; resourceId?: string; requestId?: string; limit?: number; offset?: number; } = {}) {
  const conds: string[] = [];
  const params: any[] = [];
  let i = 1;
  if (filters.startDate) { conds.push(`timestamp >= $${i++}`); params.push(filters.startDate); }
  if (filters.endDate) { conds.push(`timestamp <= $${i++}`); params.push(filters.endDate); }
  if (filters.userEmail) { conds.push(`user_email ILIKE $${i++}`); params.push(`%${filters.userEmail}%`); }
  if (filters.action) { conds.push(`action = $${i++}`); params.push(filters.action); }
  if (filters.resourceType) { conds.push(`resource_type = $${i++}`); params.push(filters.resourceType); }
  if (filters.resourceId) { conds.push(`resource_id = $${i++}`); params.push(filters.resourceId); }
  if (filters.requestId) { conds.push(`request_id = $${i++}`); params.push(filters.requestId); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const limit = Math.min(Number(filters.limit || 100), 1000);
  const offset = Number(filters.offset || 0);
  const sql = `SELECT * FROM audit_trails ${where} ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}`;
  return pgQuery<any>(sql, params);
}

export async function getLogStatistics(days: number = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const start = startDate.toISOString();

  const accessStatsSql = `
    SELECT
      COUNT(*)::int as total_requests,
      COUNT(CASE WHEN status_code >= 400 THEN 1 END)::int as error_requests,
      COUNT(CASE WHEN status_code >= 500 THEN 1 END)::int as server_errors,
      AVG(duration_ms)::float as avg_duration_ms,
      COUNT(DISTINCT user_email)::int as unique_users
    FROM access_logs
    WHERE timestamp >= $1
  `;
  const accessStats = (await pgQuery<any>(accessStatsSql, [start]))[0] || {};

  const appLogStats = await pgQuery<any>(
    `SELECT level, COUNT(*)::int as count FROM app_logs WHERE timestamp >= $1 GROUP BY level`,
    [start]
  );

  const auditStats = await pgQuery<any>(
    `SELECT action, COUNT(*)::int as count FROM audit_trails WHERE timestamp >= $1 GROUP BY action`,
    [start]
  );

  return {
    accessLogs: accessStats,
    appLogs: appLogStats,
    auditTrails: auditStats,
    period: `${days} days`,
  };
}
