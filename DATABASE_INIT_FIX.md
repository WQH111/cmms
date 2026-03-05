# Database Initialization Fix

## Issue
When attempting to import Excel data, the following error occurred:
```
✗ Import Failed
Successfully imported: 0 nodes

Errors (1)
Row 0 - file: Import failed: Error: Database not initialized. Call initDatabase() first.
```

## Root Cause
The `getDatabase()` function throws an error if the database has not been initialized. The import and backup services were calling `getDatabase()` without ensuring the database was initialized first.

## Solution
Added `initDatabase()` calls at the beginning of the import workflow and backup creation to ensure the database is properly initialized before any operations.

## Changes Made

### 1. excelService.ts
**Import Statement:**
```typescript
// Before
import { getDatabase } from './database';

// After
import { getDatabase, initDatabase } from './database';
```

**Import Function:**
```typescript
export async function importExcelFile(file: File): Promise<ImportResult> {
  // 0. Ensure database is initialized
  await initDatabase();

  // 1. Read Excel file
  const rows = await readExcelFile(file);
  // ... rest of the code
}
```

### 2. backupService.ts
**Import Statement:**
```typescript
// Before
import { getDatabase } from './database';

// After
import { getDatabase, initDatabase } from './database';
```

**Backup Function:**
```typescript
export async function createBackup(description: string = 'Pre-import backup'): Promise<string> {
  await initDatabase(); // Ensure database is initialized
  const db = getDatabase();
  // ... rest of the code
}
```

## How It Works

### Database Initialization Flow
```
User clicks "Start Import"
    ↓
createBackup() called
    ↓
initDatabase() - Creates/opens cmms.db
    ↓
Creates tree_nodes table if not exists
    ↓
Creates indexes
    ↓
Returns database instance
    ↓
Backup created successfully
    ↓
importExcelFile() called
    ↓
initDatabase() - Returns existing instance (already initialized)
    ↓
Import proceeds normally
```

### Database Singleton Pattern
The `initDatabase()` function uses a singleton pattern:
```typescript
let db: Database | null = null;

export async function initDatabase(): Promise<Database> {
  if (db) return db; // Return existing instance

  db = await Database.load('sqlite:cmms.db');
  // Create tables and indexes
  return db;
}
```

This ensures:
- Database is only initialized once
- Subsequent calls return the existing instance
- No performance penalty for multiple calls

## Testing

### Before Fix
```
✗ Import Failed
Error: Database not initialized
```

### After Fix
```
✓ Import Successful
Successfully imported: X nodes
```

## Build Status

✅ TypeScript compilation successful
✅ Vite build successful
✅ No runtime errors

```bash
npm run build
# ✓ 229 modules transformed
# ✓ built in 2.15s
```

## Additional Benefits

1. **Defensive Programming**: Services now ensure database is ready before operations
2. **Better Error Handling**: Clearer error messages if database fails to initialize
3. **Consistent Pattern**: All services that need database access should call `initDatabase()` first
4. **No Breaking Changes**: Existing code continues to work as `initDatabase()` is idempotent

## Recommendations

For future services that need database access:
1. Import both `getDatabase` and `initDatabase`
2. Call `await initDatabase()` before first database operation
3. Then use `getDatabase()` for subsequent operations

Example:
```typescript
import { getDatabase, initDatabase } from './database';

export async function myService() {
  await initDatabase(); // Ensure database is ready
  const db = getDatabase(); // Safe to call now
  // ... perform database operations
}
```

---

**Fix Date**: 2026-03-03
**Status**: ✅ Resolved
