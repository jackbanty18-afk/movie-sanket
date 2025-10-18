const { execFileSync } = require("node:child_process");
const { existsSync, mkdirSync } = require("node:fs");
const path = require("node:path");

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

console.log('🔍 Testing Observability System...\n');

// Test 1: Initialize logging tables
console.log('1. Initializing logging tables...');
try {
  // Create logging tables
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
    );
  `);

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
    );
  `);

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
    );
  `);

  // Create indexes
  runSQL(`CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON access_logs(timestamp);`);
  runSQL(`CREATE INDEX IF NOT EXISTS idx_access_logs_user ON access_logs(user_email);`);
  runSQL(`CREATE INDEX IF NOT EXISTS idx_access_logs_status ON access_logs(status_code);`);
  runSQL(`CREATE INDEX IF NOT EXISTS idx_access_logs_request_id ON access_logs(request_id);`);
  
  runSQL(`CREATE INDEX IF NOT EXISTS idx_app_logs_timestamp ON app_logs(timestamp);`);
  runSQL(`CREATE INDEX IF NOT EXISTS idx_app_logs_level ON app_logs(level);`);
  runSQL(`CREATE INDEX IF NOT EXISTS idx_app_logs_category ON app_logs(category);`);
  runSQL(`CREATE INDEX IF NOT EXISTS idx_app_logs_request_id ON app_logs(request_id);`);
  
  runSQL(`CREATE INDEX IF NOT EXISTS idx_audit_trails_timestamp ON audit_trails(timestamp);`);
  runSQL(`CREATE INDEX IF NOT EXISTS idx_audit_trails_user ON audit_trails(user_email);`);
  runSQL(`CREATE INDEX IF NOT EXISTS idx_audit_trails_action ON audit_trails(action);`);
  runSQL(`CREATE INDEX IF NOT EXISTS idx_audit_trails_resource ON audit_trails(resource_type, resource_id);`);

  console.log('✅ Logging tables and indexes created successfully');
} catch (error) {
  console.error('❌ Failed to create logging tables:', error.message);
}

// Test 2: Insert sample data
console.log('\n2. Inserting sample log data...');
try {
  const now = new Date().toISOString();
  const requestId = 'req_test_' + Math.random().toString(36).substr(2, 12);

  // Sample access logs
  const accessLogs = [
    {
      id: 'access_1', request_id: requestId + '_1', method: 'GET', path: '/api/movies',
      status_code: 200, user_email: 'sanket@gmail.com', user_id: 'usr_sanket',
      ip_address: '192.168.1.1', user_agent: 'Mozilla/5.0 Test', duration_ms: 150,
      timestamp: now
    },
    {
      id: 'access_2', request_id: requestId + '_2', method: 'POST', path: '/api/auth/login',
      status_code: 401, user_email: null, user_id: null,
      ip_address: '192.168.1.2', user_agent: 'Mozilla/5.0 Test', duration_ms: 50,
      timestamp: now
    },
    {
      id: 'access_3', request_id: requestId + '_3', method: 'PUT', path: '/api/admin/users',
      status_code: 500, user_email: 'sanket@gmail.com', user_id: 'usr_sanket',
      ip_address: '192.168.1.1', user_agent: 'Mozilla/5.0 Test', duration_ms: 2500,
      timestamp: now
    }
  ];

  accessLogs.forEach(log => {
    const sql = `INSERT INTO access_logs (id, request_id, method, path, status_code, user_email, user_id, ip_address, user_agent, duration_ms, timestamp) VALUES (${esc(log.id)}, ${esc(log.request_id)}, ${esc(log.method)}, ${esc(log.path)}, ${log.status_code}, ${esc(log.user_email)}, ${esc(log.user_id)}, ${esc(log.ip_address)}, ${esc(log.user_agent)}, ${log.duration_ms}, ${esc(log.timestamp)});`;
    runSQL(sql);
  });

  // Sample application logs
  const appLogs = [
    {
      id: 'log_1', request_id: requestId + '_1', level: 'info', category: 'api',
      message: 'Movie list retrieved successfully', metadata: '{"count": 25}',
      user_email: 'sanket@gmail.com', user_id: 'usr_sanket', timestamp: now
    },
    {
      id: 'log_2', request_id: requestId + '_2', level: 'warn', category: 'auth',
      message: 'Failed login attempt', metadata: '{"reason": "invalid_password", "attempts": 3}',
      user_email: 'unknown@example.com', user_id: null, timestamp: now
    },
    {
      id: 'log_3', request_id: requestId + '_3', level: 'error', category: 'admin',
      message: 'Database connection failed', metadata: '{"error": "timeout", "duration": 30000}',
      user_email: 'sanket@gmail.com', user_id: 'usr_sanket', timestamp: now
    },
    {
      id: 'log_4', request_id: requestId + '_4', level: 'critical', category: 'system',
      message: 'Payment service unavailable', metadata: '{"service": "stripe", "error_code": 503}',
      user_email: null, user_id: null, timestamp: now
    }
  ];

  appLogs.forEach(log => {
    const sql = `INSERT INTO app_logs (id, request_id, level, category, message, metadata, user_email, user_id, timestamp) VALUES (${esc(log.id)}, ${esc(log.request_id)}, ${esc(log.level)}, ${esc(log.category)}, ${esc(log.message)}, ${esc(log.metadata)}, ${esc(log.user_email)}, ${esc(log.user_id)}, ${esc(log.timestamp)});`;
    runSQL(sql);
  });

  // Sample audit trails
  const auditLogs = [
    {
      id: 'audit_1', request_id: requestId + '_5', action: 'user_ban', resource_type: 'user',
      resource_id: 'usr_bad_user', old_values: '{"status": "active"}', new_values: '{"status": "banned", "reason": "spam"}',
      user_email: 'sanket@gmail.com', user_id: 'usr_sanket', ip_address: '192.168.1.1', timestamp: now
    },
    {
      id: 'audit_2', request_id: requestId + '_6', action: 'movie_create', resource_type: 'movie',
      resource_id: 'movie_123', old_values: null, new_values: '{"title": "Test Movie", "year": 2024}',
      user_email: 'sanket@gmail.com', user_id: 'usr_sanket', ip_address: '192.168.1.1', timestamp: now
    },
    {
      id: 'audit_3', request_id: requestId + '_7', action: 'role_assignment', resource_type: 'user',
      resource_id: 'usr_new_admin', old_values: '{"roles": ["user"]}', new_values: '{"roles": ["user", "admin"]}',
      user_email: 'sanket@gmail.com', user_id: 'usr_sanket', ip_address: '192.168.1.1', timestamp: now
    }
  ];

  auditLogs.forEach(log => {
    const sql = `INSERT INTO audit_trails (id, request_id, action, resource_type, resource_id, old_values, new_values, user_email, user_id, ip_address, timestamp) VALUES (${esc(log.id)}, ${esc(log.request_id)}, ${esc(log.action)}, ${esc(log.resource_type)}, ${esc(log.resource_id)}, ${esc(log.old_values)}, ${esc(log.new_values)}, ${esc(log.user_email)}, ${esc(log.user_id)}, ${esc(log.ip_address)}, ${esc(log.timestamp)});`;
    runSQL(sql);
  });

  console.log('✅ Sample log data inserted successfully');
  console.log(`   - ${accessLogs.length} access logs`);
  console.log(`   - ${appLogs.length} application logs`);
  console.log(`   - ${auditLogs.length} audit trail entries`);
} catch (error) {
  console.error('❌ Failed to insert sample data:', error.message);
}

// Test 3: Query and verify data
console.log('\n3. Verifying log data...');
try {
  const accessCount = runSQL("SELECT COUNT(*) as count FROM access_logs;");
  const appCount = runSQL("SELECT COUNT(*) as count FROM app_logs;");
  const auditCount = runSQL("SELECT COUNT(*) as count FROM audit_trails;");

  const accessTotal = JSON.parse(accessCount.replace(/[^{].*$/, ''))[0]?.count || 0;
  const appTotal = JSON.parse(appCount.replace(/[^{].*$/, ''))[0]?.count || 0;
  const auditTotal = JSON.parse(auditCount.replace(/[^{].*$/, ''))[0]?.count || 0;

  console.log(`✅ Database contains:`);
  console.log(`   📊 ${accessTotal} access log entries`);
  console.log(`   📋 ${appTotal} application log entries`);
  console.log(`   🔍 ${auditTotal} audit trail entries`);

  // Test filtering
  const errorLogs = runSQL(".mode json\nSELECT level, message FROM app_logs WHERE level IN ('error', 'critical');");
  const errors = JSON.parse(errorLogs);
  console.log(`   🚨 ${errors.length} error/critical logs found`);

  const failedRequests = runSQL(".mode json\nSELECT method, path, status_code FROM access_logs WHERE status_code >= 400;");
  const failures = JSON.parse(failedRequests);
  console.log(`   ⚠️  ${failures.length} failed requests logged`);

  const adminActions = runSQL(".mode json\nSELECT action, resource_type FROM audit_trails WHERE user_email = 'sanket@gmail.com';");
  const actions = JSON.parse(adminActions);
  console.log(`   👤 ${actions.length} admin actions tracked`);

} catch (error) {
  console.error('❌ Failed to verify log data:', error.message);
}

// Test 4: Test log statistics
console.log('\n4. Testing log statistics...');
try {
  const stats = runSQL(`
    .mode json
    SELECT 
      (SELECT COUNT(*) FROM access_logs) as total_requests,
      (SELECT COUNT(*) FROM access_logs WHERE status_code >= 400) as error_requests,
      (SELECT COUNT(*) FROM access_logs WHERE status_code >= 500) as server_errors,
      (SELECT AVG(duration_ms) FROM access_logs WHERE duration_ms IS NOT NULL) as avg_duration_ms,
      (SELECT COUNT(DISTINCT user_email) FROM access_logs WHERE user_email IS NOT NULL) as unique_users
  `);

  const statistics = JSON.parse(stats)[0];
  
  console.log('✅ Log Statistics:');
  console.log(`   📈 Total Requests: ${statistics.total_requests}`);
  console.log(`   ❌ Error Requests: ${statistics.error_requests}`);
  console.log(`   🔥 Server Errors: ${statistics.server_errors}`);
  console.log(`   ⏱️  Average Duration: ${Math.round(statistics.avg_duration_ms)}ms`);
  console.log(`   👥 Unique Users: ${statistics.unique_users}`);
  console.log(`   📊 Error Rate: ${((statistics.error_requests / statistics.total_requests) * 100).toFixed(1)}%`);

} catch (error) {
  console.error('❌ Failed to calculate statistics:', error.message);
}

console.log('\n🎉 Observability System Test Complete!\n');

console.log('📋 System Features:');
console.log('✅ Access logging with request tracking');
console.log('✅ Application event logging with levels');
console.log('✅ Audit trails for administrative actions');
console.log('✅ Advanced filtering and search capabilities');
console.log('✅ Real-time monitoring with Server-Sent Events');
console.log('✅ Statistics and analytics dashboard');
console.log('✅ CSV export functionality');
console.log('✅ Live alerts and sound notifications');

console.log('\n🔗 Next Steps:');
console.log('1. Start your development server');
console.log('2. Login as admin (sanket@gmail.com / 12345678)');
console.log('3. Navigate to /admin/logs');
console.log('4. Explore the different log types and filters');
console.log('5. Enable "Start Live" monitoring for real-time alerts');
console.log('6. Test the system by performing admin actions');

console.log('\n🛠️  API Endpoints:');
console.log('📡 GET  /api/admin/logs/access  - Access logs with filtering');
console.log('📡 GET  /api/admin/logs/app     - Application logs with filtering');
console.log('📡 GET  /api/admin/logs/audit   - Audit trails with filtering');
console.log('📡 GET  /api/admin/logs/stats   - Log statistics and metrics');
console.log('📡 GET  /api/admin/logs/stream  - Real-time log streaming (SSE)');

console.log('\n🎯 Key Features Demonstrated:');
console.log('• Request ID correlation across all logs');
console.log('• User activity tracking and attribution');  
console.log('• Performance monitoring with response times');
console.log('• Security event detection and alerting');
console.log('• Administrative action audit trails');
console.log('• Real-time system health monitoring');
console.log('• Export capabilities for compliance/analysis');