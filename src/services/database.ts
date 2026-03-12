// src/services/database.ts
import Database from '@tauri-apps/plugin-sql';
import { normalizeCustomFieldsJson } from '../utils/ahLevel';

let db: Database | null = null;

/**
 * Execute database operation with retry on lock errors
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5, // Increased default retries
  delayMs: number = 50 // Reduced initial delay
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      const errorStr = error?.toString() || '';
      const isLockError = errorStr.includes('database is locked') ||
                          errorStr.includes('code: 5') ||
                          errorStr.includes('SQLITE_BUSY');

      if (isLockError && attempt < maxRetries - 1) {
        const waitTime = delayMs * Math.pow(2, attempt); // Exponential backoff
        console.warn(`⚠️ Database locked, retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}


export async function initDatabase(): Promise<Database> {
  if (db) return db;

  try {
    // Load SQLite database
    db = await Database.load('sqlite:cmms.db');

    // Enable WAL mode for better concurrency
    console.log('🔧 Enabling WAL mode...');
    await db.execute('PRAGMA journal_mode=WAL');

    // Set busy timeout to 10 seconds (10000ms)
    await db.execute('PRAGMA busy_timeout=10000');

    // Optimize for better performance
    await db.execute('PRAGMA synchronous=NORMAL');
    await db.execute('PRAGMA cache_size=10000');

    console.log('✅ Database optimizations applied');

    // Create tree_nodes table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS tree_nodes (
        id TEXT PRIMARY KEY,
        parent_id TEXT,
        level INTEGER NOT NULL CHECK(level >= 1 AND level <= 16),
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        description TEXT,
        system TEXT,
        sub_system TEXT,
        sort_order INTEGER DEFAULT 0,
        is_new INTEGER DEFAULT 0,
        is_modified INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,

        -- Basic identification fields
        object_id TEXT,
        original_id TEXT,
        site_code TEXT,

        -- Asset management fields
        asset_category TEXT,
        item_category TEXT,
        part_number TEXT,
        serial_number TEXT,
        manufacturer TEXT,
        model TEXT,
        notes TEXT,
        quantity TEXT,
        barcode TEXT,
        composed TEXT,
        emission_point TEXT,
        cost_center TEXT,

        -- Custom fields (cf1-cf29) stored as JSON
        custom_fields TEXT,

        FOREIGN KEY (parent_id) REFERENCES tree_nodes(id) ON DELETE CASCADE
      )
    `);

    // Run migrations to add new columns to existing tables
    await runMigrations(db);
    await normalizeExistingAhLevels(db);

    // Create indexes
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_parent_id ON tree_nodes(parent_id)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_level ON tree_nodes(level)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_code ON tree_nodes(code)
    `);

    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw new Error(`Database initialization failed: ${error}`);
  }
}

/**
 * Run database migrations to add new columns
 */
async function runMigrations(database: Database): Promise<void> {
  console.log('🔄 Running database migrations...');

  // List of new columns to add
  const newColumns = [
    'object_id TEXT',
    'original_id TEXT',
    'site_code TEXT',
    'asset_category TEXT',
    'item_category TEXT',
    'part_number TEXT',
    'serial_number TEXT',
    'manufacturer TEXT',
    'model TEXT',
    'notes TEXT',
    'quantity TEXT',
    'barcode TEXT',
    'composed TEXT',
    'emission_point TEXT',
    'cost_center TEXT',
    'custom_fields TEXT',
  ];

  for (const column of newColumns) {
    const columnName = column.split(' ')[0];
    try {
      // Try to add the column (will fail if it already exists)
      await database.execute(`ALTER TABLE tree_nodes ADD COLUMN ${column}`);
      console.log(`✅ Added column: ${columnName}`);
    } catch (error: any) {
      // Column already exists, ignore the error
      if (error.toString().includes('duplicate column name')) {
        console.log(`⏭️ Column already exists: ${columnName}`);
      } else {
        console.warn(`⚠️ Could not add column ${columnName}:`, error);
      }
    }
  }

  console.log('✅ Migrations completed');
}

async function normalizeExistingAhLevels(database: Database): Promise<void> {
  const nodes = await database.select<Array<{
    id: string;
    level: number;
    custom_fields: string | null;
  }>>('SELECT id, level, custom_fields FROM tree_nodes');

  for (const node of nodes) {
    const normalizedCustomFields = normalizeCustomFieldsJson(node.custom_fields, node.level);
    await database.execute(
      'UPDATE tree_nodes SET custom_fields = $1 WHERE id = $2',
      [normalizedCustomFields, node.id]
    );
  }
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Clear all data from tree_nodes table
 */
export async function clearAllData(): Promise<number> {
  const database = getDatabase();

  try {
    // Get count before deletion
    const result = await database.select<Array<{ count: number }>>(
      'SELECT COUNT(*) as count FROM tree_nodes'
    );
    const count = result[0]?.count || 0;

    // Delete all nodes
    await database.execute('DELETE FROM tree_nodes');

    console.log(`🗑️ Cleared ${count} nodes from database`);
    return count;
  } catch (error) {
    console.error('❌ Failed to clear database:', error);
    throw new Error(`Failed to clear database: ${error}`);
  }
}
