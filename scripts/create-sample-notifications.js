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

console.log('Creating sample notification templates...');

const now = new Date().toISOString();

const templates = [
  {
    id: 'template_welcome',
    name: 'Welcome Message',
    subject: 'Welcome to MD Talkies, {{userName}}!',
    content: 'Hello {{userName}},\n\nWelcome to MD Talkies! We\'re excited to have you join our community of movie enthusiasts.\n\nEnjoy browsing our latest movies and booking your favorite shows. Don\'t forget to check out our special offers and upcoming releases.\n\nHappy watching!\n\nThe MD Talkies Team',
    type: 'general',
    variables: '["userName"]'
  },
  {
    id: 'template_booking_confirmation',
    name: 'Booking Confirmation',
    subject: 'Your booking for {{movieTitle}} is confirmed!',
    content: 'Hi {{userName}},\n\nGreat news! Your booking has been confirmed.\n\nMovie: {{movieTitle}}\nTheatre: {{theatreName}}\nDate & Time: {{showDateTime}}\nSeats: {{seats}}\nTotal Amount: ₹{{totalAmount}}\n\nPlease arrive 15 minutes before the show starts. Have a wonderful movie experience!\n\nBest regards,\nMD Talkies',
    type: 'booking',
    variables: '["userName", "movieTitle", "theatreName", "showDateTime", "seats", "totalAmount"]'
  },
  {
    id: 'template_new_release',
    name: 'New Movie Release',
    subject: '🎬 New Release Alert: {{movieTitle}} now showing!',
    content: 'Hey {{userName}},\n\nExciting news! A fantastic new movie has just arrived at MD Talkies.\n\n🍿 {{movieTitle}}\n⭐ Rating: {{rating}}/10\n🎭 Genre: {{genre}}\n⏰ Duration: {{duration}} minutes\n\nBook your tickets now and be among the first to experience this amazing film. Special premiere pricing available for the first week!\n\nBook now: {{bookingLink}}\n\nSee you at the movies!\nMD Talkies',
    type: 'promotional',
    variables: '["userName", "movieTitle", "rating", "genre", "duration", "bookingLink"]'
  },
  {
    id: 'template_special_offer',
    name: 'Special Offer',
    subject: '🎫 Special Offer: {{offerTitle}}',
    content: 'Hello {{userName}},\n\nWe have an exclusive offer just for you!\n\n🎉 {{offerTitle}}\n💰 {{offerDescription}}\n📅 Valid until: {{expiryDate}}\n\nDon\'t miss out on this limited-time deal. Use code {{promoCode}} when booking your next movie.\n\nTerms and conditions apply. Happy movie watching!\n\nMD Talkies Team',
    type: 'promotional',
    variables: '["userName", "offerTitle", "offerDescription", "expiryDate", "promoCode"]'
  },
  {
    id: 'template_system_maintenance',
    name: 'System Maintenance',
    subject: 'Scheduled Maintenance Notice',
    content: 'Dear {{userName}},\n\nWe will be performing scheduled system maintenance to improve your experience.\n\nMaintenance Window:\nStart: {{maintenanceStart}}\nEnd: {{maintenanceEnd}}\n\nDuring this time, our booking system may be temporarily unavailable. We apologize for any inconvenience.\n\nFor urgent assistance, please contact our support team.\n\nThank you for your understanding.\n\nMD Talkies Technical Team',
    type: 'system',
    variables: '["userName", "maintenanceStart", "maintenanceEnd"]'
  }
];

// Insert templates
templates.forEach(template => {
  const sql = `INSERT OR REPLACE INTO notification_templates (id, name, subject, content, type, variables, isActive, createdBy, createdAt, updatedAt)
               VALUES (${esc(template.id)}, ${esc(template.name)}, ${esc(template.subject)}, ${esc(template.content)}, 
                       ${esc(template.type)}, ${esc(template.variables)}, 1, 'system', ${esc(now)}, ${esc(now)});`;
  
  runSQL(sql);
  console.log(`✅ Created template: ${template.name}`);
});

// Send a welcome notification to all users
console.log('\nSending welcome notifications to all users...');

try {
  // Get all active users
  const usersResult = runSQL(".mode json\nSELECT id, email, fullName FROM users WHERE status='active' LIMIT 10;");
  const users = JSON.parse(usersResult);
  
  let sentCount = 0;
  
  users.forEach(user => {
    try {
      const notificationId = 'notif_' + crypto.randomBytes(8).toString('hex');
      const subject = `Welcome to MD Talkies, ${user.fullName}!`;
      const content = `Hello ${user.fullName},

Welcome to MD Talkies! We're excited to have you join our community of movie enthusiasts.

Enjoy browsing our latest movies and booking your favorite shows. Don't forget to check out our special offers and upcoming releases.

Happy watching!

The MD Talkies Team`;

      const notificationSql = `INSERT OR REPLACE INTO notifications (id, userEmail, title, message, createdAt, read)
                              VALUES (${esc(notificationId)}, ${esc(user.email)}, ${esc(subject)}, ${esc(content)}, ${esc(now)}, 0);`;
      
      runSQL(notificationSql);
      sentCount++;
      console.log(`📧 Sent welcome notification to ${user.fullName} (${user.email})`);
    } catch (error) {
      console.error(`❌ Failed to send notification to ${user.email}:`, error.message);
    }
  });
  
  console.log(`\n✅ Successfully sent ${sentCount} welcome notifications!`);
  
} catch (error) {
  console.error('❌ Error sending notifications:', error.message);
}

console.log('\n🎉 Sample notification templates and welcome campaign created successfully!');
console.log('\nYou can now:');
console.log('1. Visit /admin/notifications to manage templates and campaigns');
console.log('2. Check the notification bell icon in the navbar to see notifications');
console.log('3. Test sending notifications to different user segments');