import { execFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const SQLITE = path.join(ROOT, "tools", "sqlite3.exe");
const DB_PATH = path.join(ROOT, "data", "app.db");

// Migration interface
export interface Migration {
  id: string;
  version: string;
  description: string;
  up: string[];      // SQL statements to apply
  down: string[];    // SQL statements to rollback
  checksum?: string; // For integrity verification
}

// Migration status
export interface MigrationStatus {
  id: string;
  version: string;
  description: string;
  appliedAt: string;
  checksum: string;
  success: boolean;
}

// Migration system class
export class MigrationSystem {
  private runSQL(sql: string): string {
    if (!existsSync(SQLITE)) {
      throw new Error("sqlite3.exe not found in tools/");
    }
    
    try {
      return execFileSync(SQLITE, ["-batch", DB_PATH], {
        input: sql,
        encoding: "utf8"
      });
    } catch (error: any) {
      throw new Error(`SQL execution failed: ${error.message}`);
    }
  }

  private esc(value: any): string {
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "number") return String(value);
    return "'" + String(value).replace(/'/g, "''") + "'";
  }

  // Initialize migration system
  public initializeMigrations(): void {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        version TEXT NOT NULL,
        description TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now')),
        checksum TEXT NOT NULL,
        success INTEGER NOT NULL DEFAULT 1,
        rollback_sql TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(version)
      );
    `;
    
    this.runSQL(createTableSQL);
    
    // Create migration log table for detailed tracking
    const createLogSQL = `
      CREATE TABLE IF NOT EXISTS migration_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        migration_id TEXT NOT NULL,
        operation TEXT NOT NULL, -- 'up', 'down', 'verify'
        sql_statement TEXT NOT NULL,
        success INTEGER NOT NULL,
        error_message TEXT,
        execution_time_ms INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (migration_id) REFERENCES schema_migrations(id)
      );
    `;
    
    this.runSQL(createLogSQL);
  }

  // Generate checksum for migration
  private generateChecksum(migration: Migration): string {
    const content = JSON.stringify({
      id: migration.id,
      version: migration.version,
      up: migration.up,
      down: migration.down
    });
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  // Get applied migrations
  public getAppliedMigrations(): MigrationStatus[] {
    const sql = `
      SELECT id, version, description, applied_at, checksum, success
      FROM schema_migrations
      ORDER BY version
    `;
    
    try {
      const result = this.runSQL('.mode json\n' + sql);
      return JSON.parse(result || '[]');
    } catch {
      return [];
    }
  }

  // Get pending migrations
  public getPendingMigrations(allMigrations: Migration[]): Migration[] {
    const applied = new Set(this.getAppliedMigrations().map(m => m.id));
    return allMigrations.filter(m => !applied.has(m.id));
  }

  // Verify migration integrity
  public verifyMigration(migration: Migration): { valid: boolean; reason?: string } {
    const applied = this.getAppliedMigrations().find(m => m.id === migration.id);
    
    if (!applied) {
      return { valid: true }; // Not applied yet, so valid
    }
    
    const expectedChecksum = this.generateChecksum(migration);
    if (applied.checksum !== expectedChecksum) {
      return {
        valid: false,
        reason: `Checksum mismatch: expected ${expectedChecksum}, got ${applied.checksum}`
      };
    }
    
    return { valid: true };
  }

  // Apply a single migration
  public applyMigration(migration: Migration): { success: boolean; error?: string } {
    const startTime = Date.now();
    
    try {
      // Verify migration hasn't been applied
      const applied = this.getAppliedMigrations().find(m => m.id === migration.id);
      if (applied) {
        return { success: false, error: 'Migration already applied' };
      }
      
      // Generate checksum
      const checksum = this.generateChecksum(migration);
      
      // Start transaction
      this.runSQL('BEGIN TRANSACTION;');
      
      try {
        // Execute UP statements
        for (const [index, statement] of migration.up.entries()) {
          const statementStart = Date.now();
          
          try {
            this.runSQL(statement);
            
            // Log successful statement
            this.logMigrationStatement(
              migration.id,
              'up',
              statement,
              true,
              null,
              Date.now() - statementStart
            );
          } catch (error: any) {
            // Log failed statement
            this.logMigrationStatement(
              migration.id,
              'up',
              statement,
              false,
              error.message,
              Date.now() - statementStart
            );
            throw error;
          }
        }
        
        // Record successful migration
        const recordSQL = `
          INSERT INTO schema_migrations (id, version, description, checksum, rollback_sql)
          VALUES (${this.esc(migration.id)}, ${this.esc(migration.version)}, 
                  ${this.esc(migration.description)}, ${this.esc(checksum)},
                  ${this.esc(JSON.stringify(migration.down))})
        `;
        
        this.runSQL(recordSQL);
        this.runSQL('COMMIT;');
        
        return { success: true };
        
      } catch (error: any) {
        this.runSQL('ROLLBACK;');
        
        // Record failed migration
        try {
          const recordSQL = `
            INSERT INTO schema_migrations (id, version, description, checksum, success)
            VALUES (${this.esc(migration.id)}, ${this.esc(migration.version)}, 
                    ${this.esc(migration.description)}, ${this.esc(checksum)}, 0)
          `;
          this.runSQL(recordSQL);
        } catch {
          // Ignore logging errors
        }
        
        return { success: false, error: error.message };
      }
      
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Rollback a migration
  public rollbackMigration(migrationId: string): { success: boolean; error?: string } {
    try {
      const applied = this.getAppliedMigrations().find(m => m.id === migrationId);
      if (!applied) {
        return { success: false, error: 'Migration not found or not applied' };
      }
      
      if (!applied.success) {
        return { success: false, error: 'Cannot rollback failed migration' };
      }
      
      // Get rollback SQL
      const getRollbackSQL = `
        SELECT rollback_sql FROM schema_migrations WHERE id = ${this.esc(migrationId)}
      `;
      
      const result = this.runSQL('.mode json\n' + getRollbackSQL);
      const rollbackData = JSON.parse(result)[0];
      
      if (!rollbackData?.rollback_sql) {
        return { success: false, error: 'No rollback SQL available' };
      }
      
      const rollbackStatements: string[] = JSON.parse(rollbackData.rollback_sql);
      
      // Start transaction
      this.runSQL('BEGIN TRANSACTION;');
      
      try {
        // Execute DOWN statements
        for (const statement of rollbackStatements) {
          const statementStart = Date.now();
          
          try {
            this.runSQL(statement);
            
            this.logMigrationStatement(
              migrationId,
              'down',
              statement,
              true,
              null,
              Date.now() - statementStart
            );
          } catch (error: any) {
            this.logMigrationStatement(
              migrationId,
              'down',
              statement,
              false,
              error.message,
              Date.now() - statementStart
            );
            throw error;
          }
        }
        
        // Remove migration record
        const deleteSQL = `DELETE FROM schema_migrations WHERE id = ${this.esc(migrationId)}`;
        this.runSQL(deleteSQL);
        
        this.runSQL('COMMIT;');
        return { success: true };
        
      } catch (error: any) {
        this.runSQL('ROLLBACK;');
        return { success: false, error: error.message };
      }
      
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Log migration statement execution
  private logMigrationStatement(
    migrationId: string,
    operation: string,
    statement: string,
    success: boolean,
    errorMessage: string | null,
    executionTime: number
  ): void {
    try {
      const logSQL = `
        INSERT INTO migration_logs (migration_id, operation, sql_statement, success, error_message, execution_time_ms)
        VALUES (${this.esc(migrationId)}, ${this.esc(operation)}, ${this.esc(statement)}, 
                ${success ? 1 : 0}, ${this.esc(errorMessage)}, ${executionTime})
      `;
      this.runSQL(logSQL);
    } catch {
      // Ignore logging errors
    }
  }

  // Apply all pending migrations
  public applyAllPending(migrations: Migration[]): {
    success: boolean;
    applied: string[];
    failed: string[];
    errors: Record<string, string>;
  } {
    const pending = this.getPendingMigrations(migrations);
    const applied: string[] = [];
    const failed: string[] = [];
    const errors: Record<string, string> = {};
    
    for (const migration of pending) {
      const result = this.applyMigration(migration);
      
      if (result.success) {
        applied.push(migration.id);
      } else {
        failed.push(migration.id);
        errors[migration.id] = result.error || 'Unknown error';
        // Stop on first failure
        break;
      }
    }
    
    return {
      success: failed.length === 0,
      applied,
      failed,
      errors
    };
  }

  // Get migration history
  public getMigrationHistory(): Array<{
    migration: MigrationStatus;
    logs: Array<{
      operation: string;
      sql_statement: string;
      success: boolean;
      error_message: string | null;
      execution_time_ms: number;
      created_at: string;
    }>;
  }> {
    const migrations = this.getAppliedMigrations();
    const history: any[] = [];
    
    for (const migration of migrations) {
      const logsSQL = `
        SELECT operation, sql_statement, success, error_message, execution_time_ms, created_at
        FROM migration_logs
        WHERE migration_id = ${this.esc(migration.id)}
        ORDER BY created_at
      `;
      
      try {
        const logsResult = this.runSQL('.mode json\n' + logsSQL);
        const logs = JSON.parse(logsResult || '[]');
        
        history.push({
          migration,
          logs
        });
      } catch {
        history.push({
          migration,
          logs: []
        });
      }
    }
    
    return history;
  }

  // Create backup before migration
  public createBackup(): { success: boolean; backupPath?: string; error?: string } {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(ROOT, 'data', 'backups');
      const backupPath = path.join(backupDir, `app-${timestamp}.db`);
      
      // Ensure backup directory exists
      const fs = require('node:fs');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      // Create backup using SQLite backup command
      const backupSQL = `.backup ${backupPath}`;
      this.runSQL(backupSQL);
      
      return { success: true, backupPath };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Predefined migrations for the application
export const MIGRATIONS: Migration[] = [
  {
    id: 'create_logging_tables',
    version: '1.0.0',
    description: 'Create logging and audit tables',
    up: [
      `CREATE TABLE IF NOT EXISTS access_logs (
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
      )`,
      
      `CREATE TABLE IF NOT EXISTS app_logs (
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
      )`,
      
      `CREATE TABLE IF NOT EXISTS audit_trails (
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
      )`,
      
      // Indexes
      `CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON access_logs(timestamp)`,
      `CREATE INDEX IF NOT EXISTS idx_access_logs_user ON access_logs(user_email)`,
      `CREATE INDEX IF NOT EXISTS idx_access_logs_status ON access_logs(status_code)`,
      `CREATE INDEX IF NOT EXISTS idx_access_logs_request_id ON access_logs(request_id)`,
      
      `CREATE INDEX IF NOT EXISTS idx_app_logs_timestamp ON app_logs(timestamp)`,
      `CREATE INDEX IF NOT EXISTS idx_app_logs_level ON app_logs(level)`,
      `CREATE INDEX IF NOT EXISTS idx_app_logs_category ON app_logs(category)`,
      `CREATE INDEX IF NOT EXISTS idx_app_logs_request_id ON app_logs(request_id)`,
      
      `CREATE INDEX IF NOT EXISTS idx_audit_trails_timestamp ON audit_trails(timestamp)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_trails_user ON audit_trails(user_email)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_trails_action ON audit_trails(action)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_trails_resource ON audit_trails(resource_type, resource_id)`
    ],
    down: [
      `DROP INDEX IF EXISTS idx_audit_trails_resource`,
      `DROP INDEX IF EXISTS idx_audit_trails_action`,
      `DROP INDEX IF EXISTS idx_audit_trails_user`,
      `DROP INDEX IF EXISTS idx_audit_trails_timestamp`,
      `DROP INDEX IF EXISTS idx_app_logs_request_id`,
      `DROP INDEX IF EXISTS idx_app_logs_category`,
      `DROP INDEX IF EXISTS idx_app_logs_level`,
      `DROP INDEX IF EXISTS idx_app_logs_timestamp`,
      `DROP INDEX IF EXISTS idx_access_logs_request_id`,
      `DROP INDEX IF EXISTS idx_access_logs_status`,
      `DROP INDEX IF EXISTS idx_access_logs_user`,
      `DROP INDEX IF EXISTS idx_access_logs_timestamp`,
      `DROP TABLE IF EXISTS audit_trails`,
      `DROP TABLE IF EXISTS app_logs`,
      `DROP TABLE IF EXISTS access_logs`
    ]
  },
  
  {
    id: 'add_user_status_tracking',
    version: '1.1.0',
    description: 'Add user status and activity tracking',
    up: [
      `ALTER TABLE users ADD COLUMN last_login_at TEXT`,
      `ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN last_active_at TEXT`,
      `CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)`,
      `CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at)`
    ],
    down: [
      `DROP INDEX IF EXISTS idx_users_last_login`,
      `DROP INDEX IF EXISTS idx_users_status`,
      // Note: SQLite doesn't support DROP COLUMN, so we'd need to recreate the table
      // For safety, we'll leave the columns but document they're unused
      `-- Note: Cannot drop columns in SQLite. Columns last_login_at, login_count, last_active_at are now unused`
    ]
  },
  
  {
    id: 'add_notification_system',
    version: '1.2.0',
    description: 'Add notification templates and campaigns',
    up: [
      `CREATE TABLE IF NOT EXISTS notification_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('general', 'booking', 'promotional', 'system')),
        variables TEXT, -- JSON array of variable names
        isActive INTEGER NOT NULL DEFAULT 1,
        createdBy TEXT,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      
      `CREATE TABLE IF NOT EXISTS notification_campaigns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        templateId TEXT NOT NULL,
        userSegment TEXT NOT NULL CHECK (userSegment IN ('all', 'active', 'recent_bookers', 'high_spenders', 'inactive', 'custom')),
        scheduledAt TEXT,
        sentAt TEXT,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
        recipientCount INTEGER DEFAULT 0,
        sentCount INTEGER DEFAULT 0,
        createdBy TEXT,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (templateId) REFERENCES notification_templates(id)
      )`,
      
      `CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type)`,
      `CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(isActive)`,
      `CREATE INDEX IF NOT EXISTS idx_notification_campaigns_status ON notification_campaigns(status)`,
      `CREATE INDEX IF NOT EXISTS idx_notification_campaigns_scheduled ON notification_campaigns(scheduledAt)`
    ],
    down: [
      `DROP INDEX IF EXISTS idx_notification_campaigns_scheduled`,
      `DROP INDEX IF EXISTS idx_notification_campaigns_status`,
      `DROP INDEX IF EXISTS idx_notification_templates_active`,
      `DROP INDEX IF EXISTS idx_notification_templates_type`,
      `DROP TABLE IF EXISTS notification_campaigns`,
      `DROP TABLE IF EXISTS notification_templates`
    ]
  }
];

// Migration runner
export function runMigrations(): {
  success: boolean;
  applied: string[];
  failed: string[];
  errors: Record<string, string>;
} {
  const migrationSystem = new MigrationSystem();
  
  // Initialize migration system
  migrationSystem.initializeMigrations();
  
  // Apply all pending migrations
  return migrationSystem.applyAllPending(MIGRATIONS);
}

// Get migration status
export function getMigrationStatus(): {
  applied: MigrationStatus[];
  pending: Migration[];
  total: number;
  history: any[];
} {
  const migrationSystem = new MigrationSystem();
  migrationSystem.initializeMigrations();
  
  const applied = migrationSystem.getAppliedMigrations();
  const pending = migrationSystem.getPendingMigrations(MIGRATIONS);
  const history = migrationSystem.getMigrationHistory();
  
  return {
    applied,
    pending,
    total: MIGRATIONS.length,
    history
  };
}