// src/services/backupService.ts
import { getDatabase, initDatabase, executeWithRetry } from './database';

export interface Backup {
  id: string;
  timestamp: string;
  description: string;
  nodeCount: number;
}

/**
 * Create database backup (snapshot)
 */
export async function createBackup(description: string = 'Pre-import backup'): Promise<string> {
  console.log('💾 Creating backup:', description);

  try {
    await initDatabase(); // Ensure database is initialized
    const db = getDatabase();
    const backupId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    console.log('📦 Backup ID:', backupId);

    // Create backup table (if not exists) with retry
    console.log('🔧 Creating backup table...');
    await executeWithRetry(() =>
      db.execute(`
        CREATE TABLE IF NOT EXISTS backups (
          id TEXT PRIMARY KEY,
          timestamp TEXT NOT NULL,
          description TEXT,
          node_count INTEGER
        )
      `)
    );

    // Get current node count with retry
    console.log('🔢 Counting nodes...');
    const nodeCount = await executeWithRetry(() =>
      db.select<Array<{ count: number }>>(
        'SELECT COUNT(*) as count FROM tree_nodes'
      )
    );
    const count = nodeCount[0]?.count || 0;
    console.log('📊 Current node count:', count);

    // Create backup snapshot table with retry
    const tableName = `backup_nodes_${backupId.replace(/-/g, '_')}`;
    console.log('📸 Creating snapshot table:', tableName);
    await executeWithRetry(() =>
      db.execute(`
        CREATE TABLE ${tableName} AS
        SELECT * FROM tree_nodes
      `)
    );

    // Record backup info with retry
    console.log('📝 Recording backup info...');
    await executeWithRetry(() =>
      db.execute(
        'INSERT INTO backups (id, timestamp, description, node_count) VALUES ($1, $2, $3, $4)',
        [backupId, timestamp, description, count]
      )
    );

    console.log('✅ Backup created successfully');
    return backupId;
  } catch (error) {
    console.error('❌ Failed to create backup:', error);
    throw new Error(`Failed to create backup: ${error}`);
  }
}

/**
 * Restore backup
 */
export async function restoreBackup(backupId: string): Promise<void> {
  const db = getDatabase();

  try {
    const tableName = `backup_nodes_${backupId.replace(/-/g, '_')}`;

    // Check if backup table exists
    const tables = await db.select<Array<{ name: string }>>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=$1`,
      [tableName]
    );

    if (!tables || tables.length === 0) {
      throw new Error('Backup does not exist');
    }

    // Clear current data
    await db.execute('DELETE FROM tree_nodes');

    // Restore backup data
    await db.execute(`INSERT INTO tree_nodes SELECT * FROM ${tableName}`);
  } catch (error) {
    throw new Error(`Failed to restore backup: ${error}`);
  }
}

/**
 * Get all backups
 */
export async function getAllBackups(): Promise<Backup[]> {
  const db = getDatabase();

  try {
    // Ensure backup table exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS backups (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        description TEXT,
        node_count INTEGER
      )
    `);

    const backups = await db.select<Backup[]>(`
      SELECT id, timestamp, description, node_count as nodeCount
      FROM backups
      ORDER BY timestamp DESC
    `);

    return backups;
  } catch (error) {
    console.error('Failed to get backup list:', error);
    return [];
  }
}

/**
 * Delete backup
 */
export async function deleteBackup(backupId: string): Promise<void> {
  const db = getDatabase();

  try {
    const tableName = `backup_nodes_${backupId.replace(/-/g, '_')}`;

    // Delete backup table
    await db.execute(`DROP TABLE IF EXISTS ${tableName}`);

    // Delete backup record
    await db.execute('DELETE FROM backups WHERE id = $1', [backupId]);
  } catch (error) {
    throw new Error(`Failed to delete backup: ${error}`);
  }
}
