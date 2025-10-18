const { execFileSync } = require("node:child_process");
const { existsSync, mkdirSync } = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = process.cwd();
const DB_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DB_DIR, "app.db");
const SQLITE = path.join(ROOT, "tools", "sqlite3.exe");

function runSQL(sql) {
  if (!existsSync(SQLITE)) throw new Error("sqlite3.exe not found in tools/");
  if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });
  return execFileSync(SQLITE, ["-batch", DB_PATH], { input: sql, encoding: "utf8" });
}

function esc(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  return "'" + String(v).replace(/'/g, "''") + "'";
}

function generateUserId() {
  return crypto.randomBytes(16).toString('hex');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

// Sample users data
const sampleUsers = [
  {
    fullName: "John Doe",
    email: "john@example.com", 
    password: "password123"
  },
  {
    fullName: "Jane Smith",
    email: "jane@example.com",
    password: "password123"
  },
  {
    fullName: "Rishi Patel",
    email: "rishi@example.com",
    password: "password123"
  },
  {
    fullName: "Sarah Johnson",
    email: "sarah@example.com", 
    password: "password123"
  },
  {
    fullName: "Mike Wilson",
    email: "mike@example.com",
    password: "password123"
  }
];

console.log('Adding sample users to database...');

const now = new Date().toISOString();

sampleUsers.forEach((user, index) => {
  const userId = generateUserId();
  const { salt, hash } = hashPassword(user.password);
  
  const status = index === 1 ? 'banned' : index === 2 ? 'suspended' : 'active';
  const bannedAt = status === 'banned' ? now : null;
  const bannedReason = status === 'banned' ? 'Testing purposes' : null;
  const lastLoginAt = index < 3 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : null;
  
  const sql = `INSERT OR REPLACE INTO users (id, email, fullName, passwordHash, passwordSalt, status, bannedAt, bannedReason, lastLoginAt, createdAt, updatedAt) 
               VALUES (${esc(userId)}, ${esc(user.email)}, ${esc(user.fullName)}, ${esc(hash)}, ${esc(salt)}, ${esc(status)}, ${esc(bannedAt)}, ${esc(bannedReason)}, ${esc(lastLoginAt)}, ${esc(now)}, ${esc(now)});`;
  
  runSQL(sql);
  console.log(`Added user: ${user.fullName} (${user.email}) - Status: ${status}`);
  
  // Add admin role to first user
  if (index === 0) {
    runSQL("INSERT OR IGNORE INTO roles (name) VALUES ('admin');");
    runSQL("INSERT OR IGNORE INTO roles (name) VALUES ('moderator');");
    const roleResult = runSQL(".mode json\nSELECT id FROM roles WHERE name='admin' LIMIT 1;");
    try {
      const roleData = JSON.parse(roleResult);
      if (roleData[0]?.id) {
        runSQL(`INSERT OR IGNORE INTO user_roles (userId, roleId) VALUES (${esc(userId)}, ${roleData[0].id});`);
        console.log(`Assigned admin role to ${user.fullName}`);
      }
    } catch (e) {
      console.error('Error assigning admin role:', e);
    }
  }
  
  // Add some sample tickets/bookings
  if (index < 3) {
    for (let i = 0; i < Math.floor(Math.random() * 5) + 1; i++) {
      const ticketId = `TICKET_${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
      const movies = ['Avengers', 'Spider-Man', 'Batman', 'Superman', 'Iron Man'];
      const theatres = ['PVR Cinemas', 'INOX', 'Cinepolis', 'Carnival'];
      const statuses = ['confirmed', 'cancelled', 'refunded', 'pending'];
      
      const movieTitle = movies[Math.floor(Math.random() * movies.length)];
      const theatreName = theatres[Math.floor(Math.random() * theatres.length)];
      const total = Math.floor(Math.random() * 500) + 200;
      const ticketStatus = statuses[Math.floor(Math.random() * statuses.length)];
      const purchasedAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const movieId = 'MOV_' + Math.floor(Math.random() * 100);
      const theatreId = 'THR_' + Math.floor(Math.random() * 10);
      const dateKey = '2024-01-' + String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
      const time = '19:' + String(Math.floor(Math.random() * 60)).padStart(2, '0');
      const seats = 'A' + (i + 1) + ', A' + (i + 2);
      
      const ticketSql = `INSERT OR REPLACE INTO tickets (ticketId, userEmail, movieId, movieTitle, theatreName, dateKey, time, seats, total, status, purchasedAt, updatedAt)
                         VALUES (${esc(ticketId)}, ${esc(user.email)}, ${esc(movieId)}, ${esc(movieTitle)}, ${esc(theatreName)}, ${esc(dateKey)}, ${esc(time)}, ${esc(seats)}, ${esc(total)}, ${esc(ticketStatus)}, ${esc(purchasedAt)}, ${esc(purchasedAt)});`;
      
      runSQL(ticketSql);
    }
  }
});

console.log('Sample users and bookings added successfully!');