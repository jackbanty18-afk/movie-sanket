const { execFileSync } = require("node:child_process");
const crypto = require("node:crypto");

const SQLITE = "C:/movie-sanket/tools/sqlite3.exe";
const DB_PATH = "C:/movie-sanket/data/app.db";

// Get user data
const result = execFileSync(SQLITE, [DB_PATH, "SELECT email, passwordHash, passwordSalt FROM users WHERE email = 'sanket@gmail.com';"]);
console.log("Raw result:", result.toString());

const [email, passwordHash, passwordSalt] = result.toString().trim().split('|');

console.log("🔍 Testing login for:", email);
console.log("Password Hash:", passwordHash);
console.log("Password Salt:", passwordSalt);

// Test the password that user tried
const testPassword = "12345678";

function hashPassword(password, salt) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  const { hash } = hashPassword(password, salt);
  console.log("Generated hash:", hash);
  console.log("Expected hash:  ", expectedHash);
  console.log("Match:", hash === expectedHash);
  return hash === expectedHash;
}

console.log("\n🧪 Testing password verification:");
const isValid = verifyPassword(testPassword, passwordSalt, passwordHash);

if (isValid) {
  console.log("✅ Password verification PASSED - Login should work");
} else {
  console.log("❌ Password verification FAILED - This is the issue");
  
  // Try to fix by updating the password
  console.log("\n🔧 Fixing password...");
  const correctHash = hashPassword(testPassword, passwordSalt);
  console.log("New hash:", correctHash.hash);
  
  // Update in database
  const updateSql = `UPDATE users SET passwordHash = '${correctHash.hash}' WHERE email = 'sanket@gmail.com';`;
  console.log("Update SQL:", updateSql);
  
  try {
    execFileSync(SQLITE, [DB_PATH, updateSql]);
    console.log("✅ Password updated in database");
    
    // Verify the update worked
    const newResult = execFileSync(SQLITE, [DB_PATH, "SELECT passwordHash FROM users WHERE email = 'sanket@gmail.com';"]);
    const newHash = newResult.toString().trim();
    console.log("Updated hash in DB:", newHash);
    
    if (newHash === correctHash.hash) {
      console.log("✅ Password fix confirmed - Login should now work with '12345678'");
    }
  } catch (error) {
    console.error("❌ Failed to update password:", error.message);
  }
}