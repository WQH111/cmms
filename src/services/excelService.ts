// src/services/excelService.ts
import * as XLSX from 'xlsx';
import type { TreeNodeCreate } from '../types/TreeNode';
import { getDatabase, initDatabase, executeWithRetry } from './database';

export interface ImportError {
  row: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ImportResult {
  success: boolean;
  imported: number;
  errors: ImportError[];
  warnings: ImportError[];
}

interface ExcelRow {
  [key: string]: any;
}

// Excel 列映射配置
const LEVEL_COLUMNS = [
  { level: 1, nameCol: 'Level 1 (Company)', codeCol: 'Level 1 (code)' },
  { level: 2, nameCol: 'Level 2 (Vessel)', codeCol: 'Level 2 (code)' },
  { level: 3, nameCol: 'Level 3 (System Category)', codeCol: 'Level 3 (code)' },
  { level: 4, nameCol: 'Level 4 (System)', codeCol: 'Level 4 (code)' },
  { level: 5, nameCol: 'Level 5 (Sub-system)', codeCol: 'Level 5 (code)' },
  { level: 6, nameCol: 'Level 6 (Equipment Unit)', codeCol: 'Level 6 (code)' },
  { level: 7, nameCol: 'Level 7 (Sub-unit)', codeCol: 'Level 7 (code)' },
  { level: 8, nameCol: 'Level 8 (Component)', codeCol: 'Level 8 (Tag)' },
  { level: 9, nameCol: 'Level 9 (Sub-Component)', codeCol: 'Level 9 (Tag)' },
  { level: 10, nameCol: 'Level 10 (Sub-Sub-Component)', codeCol: 'Level 10 (Tag)' },
];

/**
 * Read Excel file and parse to JSON
 */
export async function readExcelFile(file: File): Promise<ExcelRow[]> {
  console.log('📖 Reading Excel file:', file.name, file.size, 'bytes');

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        console.log('📄 File loaded, parsing...');
        const data = e.target?.result;

        if (!data) {
          throw new Error('No data read from file');
        }

        // Use ArrayBuffer instead of binary string for better compatibility
        const workbook = XLSX.read(data, { type: 'array' });
        console.log('📊 Workbook parsed, sheets:', workbook.SheetNames);

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON, using first row as header
        const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);
        console.log('✅ Excel parsed successfully, rows:', jsonData.length);
        resolve(jsonData);
      } catch (error) {
        console.error('❌ Failed to parse Excel:', error);
        reject(new Error(`Failed to parse Excel file: ${error}`));
      }
    };

    reader.onerror = () => {
      console.error('❌ Failed to read file');
      reject(new Error('Failed to read file'));
    };

    // Use readAsArrayBuffer instead of readAsBinaryString
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Extract tree nodes from Excel row
 */
export function extractNodesFromRow(row: ExcelRow, rowIndex: number): TreeNodeCreate[] {
  const nodes: TreeNodeCreate[] = [];
  let parentId: string | null = null;

  // Iterate through each level to extract nodes
  for (const levelConfig of LEVEL_COLUMNS) {
    const name = row[levelConfig.nameCol];
    const code = row[levelConfig.codeCol];

    // If this level has data, create node
    if (name || code) {
      const nodeId = generateNodeId(levelConfig.level, code || name);

      nodes.push({
        id: nodeId,
        parentId,
        level: levelConfig.level,
        name: String(name || ''),
        code: String(code || ''),
        description: row['Description '] || '',
        system: levelConfig.level === 3 ? String(name || '') : undefined,
        subSystem: levelConfig.level === 5 ? String(name || '') : undefined,
        sortOrder: rowIndex,
      });

      parentId = nodeId; // Next level's parent
    } else {
      // If this level has no data, stop processing deeper levels
      break;
    }
  }

  return nodes;
}

/**
 * Generate node ID (based on level and code)
 */
function generateNodeId(level: number, code: string): string {
  return `L${level}_${code}`.replace(/\s+/g, '_');
}

/**
 * Validate Excel data
 */
export function validateExcelData(rows: ExcelRow[]): ImportError[] {
  const errors: ImportError[] = [];

  if (rows.length === 0) {
    errors.push({
      row: 0,
      field: 'file',
      message: 'Excel file is empty',
      severity: 'error',
    });
    return errors;
  }

  // Validate headers - check if required columns exist in any row
  const firstRow = rows[0];
  const requiredColumns = ['Level 1 (Company)'];

  for (const col of requiredColumns) {
    if (!(col in firstRow)) {
      errors.push({
        row: 0,
        field: col,
        message: `Missing required column: ${col}. Please check your Excel template.`,
        severity: 'error',
      });
    }
  }

  // If basic validation failed, return early
  if (errors.length > 0) {
    return errors;
  }

  // Validate each row
  rows.forEach((row, index) => {
    const rowNum = index + 2; // Excel row number (starts from 2, row 1 is header)

    // Check if at least one level has data
    const hasData = LEVEL_COLUMNS.some(
      (config) => row[config.nameCol] || row[config.codeCol]
    );

    if (!hasData) {
      errors.push({
        row: rowNum,
        field: 'all',
        message: 'This row has no level data',
        severity: 'warning',
      });
    }

    // Check level continuity (cannot skip levels)
    let lastLevel = 0;
    for (const config of LEVEL_COLUMNS) {
      const hasLevelData = row[config.nameCol] || row[config.codeCol];

      if (hasLevelData) {
        if (config.level > lastLevel + 1) {
          errors.push({
            row: rowNum,
            field: config.nameCol,
            message: `Level discontinuity: Level ${config.level} appears after Level ${lastLevel}`,
            severity: 'error',
          });
        }
        lastLevel = config.level;
      }
    }
  });

  return errors;
}

/**
 * Detect duplicate nodes
 */
export async function detectDuplicates(nodes: TreeNodeCreate[]): Promise<ImportError[]> {
  const errors: ImportError[] = [];
  const db = getDatabase();

  console.log('🔍 Checking', nodes.length, 'nodes for duplicates...');

  // Batch query instead of checking one by one
  const codes = nodes.filter(n => n.code).map(n => n.code);

  if (codes.length === 0) {
    console.log('⚠️ No codes to check for duplicates');
    return errors;
  }

  try {
    // SQLite has a limit of ~999 variables per query
    // Split into batches to avoid "too many SQL variables" error
    const BATCH_SIZE = 500;
    const existingSet = new Set<string>();

    console.log('🔎 Running duplicate check query in batches...');

    for (let i = 0; i < codes.length; i += BATCH_SIZE) {
      const batch = codes.slice(i, i + BATCH_SIZE);
      const placeholders = batch.map((_, idx) => `$${idx + 1}`).join(',');
      const query = `SELECT code, level FROM tree_nodes WHERE code IN (${placeholders})`;

      const existing = await db.select<Array<{ code: string; level: number }>>(
        query,
        batch
      );

      existing.forEach(e => existingSet.add(`${e.code}_${e.level}`));
    }

    console.log('Found', existingSet.size, 'existing nodes in database');

    // Check each node against the set
    for (const node of nodes) {
      if (node.code) {
        const key = `${node.code}_${node.level}`;
        if (existingSet.has(key)) {
          errors.push({
            row: node.sortOrder || 0,
            field: 'code',
            message: `Node already exists: ${node.name} (${node.code})`,
            severity: 'warning',
          });
        }
      }
    }

    console.log('✅ Duplicate check complete:', errors.length, 'duplicates found');
  } catch (error) {
    console.error('❌ Duplicate check failed:', error);
    // Don't fail the import, just log the error
  }

  return errors;
}

/**
 * Import nodes to database with small batch transactions
 * Uses multiple small transactions instead of one large transaction to reduce lock contention
 */
export async function importNodes(nodes: TreeNodeCreate[]): Promise<ImportResult> {
  const db = getDatabase();
  const errors: ImportError[] = [];
  let imported = 0;
  let skipped = 0;

  console.log('💾 Starting database import for', nodes.length, 'nodes...');

  try {
    // Get existing nodes to skip duplicates
    const codes = nodes.filter(n => n.code).map(n => n.code);
    const existingSet = new Set<string>();

    if (codes.length > 0) {
      console.log('🔍 Checking existing nodes...');

      // SQLite has a limit of ~999 variables per query
      // Split into batches to avoid "too many SQL variables" error
      const BATCH_SIZE = 500;

      for (let i = 0; i < codes.length; i += BATCH_SIZE) {
        const batch = codes.slice(i, i + BATCH_SIZE);
        const placeholders = batch.map((_, idx) => `$${idx + 1}`).join(',');

        const existing = await executeWithRetry(() =>
          db.select<Array<{ code: string; level: number }>>(
            `SELECT code, level FROM tree_nodes WHERE code IN (${placeholders})`,
            batch
          )
        );

        existing.forEach(e => existingSet.add(`${e.code}_${e.level}`));
      }

      console.log('Found', existingSet.size, 'existing nodes to skip');
    }

    // Filter out duplicates before transaction
    const nodesToImport = nodes.filter(node => {
      if (node.code && existingSet.has(`${node.code}_${node.level}`)) {
        skipped++;
        return false;
      }
      return true;
    });

    console.log('📝 Will import', nodesToImport.length, 'nodes, skip', skipped, 'duplicates');

    if (nodesToImport.length === 0) {
      console.log('⏭️ No new nodes to import');
      return {
        success: true,
        imported: 0,
        errors: [],
        warnings: [],
      };
    }

    const now = new Date().toISOString();
    const nodeMap = new Map<string, string>(); // Temp ID -> Real UUID mapping

    // NO TRANSACTIONS - Each INSERT is completely independent
    // This eliminates all lock contention issues
    console.log('📝 Importing nodes without transactions for maximum compatibility...');

    for (let i = 0; i < nodesToImport.length; i++) {
      const node = nodesToImport[i];

      try {
        const realId = crypto.randomUUID();
        const realParentId = node.parentId ? nodeMap.get(node.parentId) || null : null;

        // Each INSERT is completely independent with aggressive retry
        await executeWithRetry(async () => {
          await db.execute(
            `INSERT INTO tree_nodes
            (id, parent_id, level, name, code, description, system, sub_system, sort_order, is_new, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, $10, $11)`,
            [
              realId,
              realParentId,
              node.level,
              node.name,
              node.code,
              node.description || null,
              node.system || null,
              node.subSystem || null,
              node.sortOrder || 0,
              now,
              now,
            ]
          );
        }, 10, 100); // 10 retries, 100ms initial delay

        nodeMap.set(node.id!, realId);
        imported++;

        // Progress logging
        if ((i + 1) % 20 === 0 || i === nodesToImport.length - 1) {
          console.log(`📝 Progress: ${i + 1}/${nodesToImport.length} nodes imported`);
        }
      } catch (error) {
        console.error(`❌ Failed to import node [${i + 1}]:`, node.name, error);
        errors.push({
          row: node.sortOrder || 0,
          field: 'all',
          message: `Import failed: ${error}`,
          severity: 'error',
        });
      }
    }

    console.log(`🎉 Import complete: ${imported} imported, ${skipped} skipped, ${errors.length} errors`);

    return {
      success: errors.length === 0,
      imported,
      errors: errors.filter((e) => e.severity === 'error'),
      warnings: errors.filter((e) => e.severity === 'warning'),
    };
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw new Error(`Import failed: ${error}`);
  }
}

/**
 * Complete import workflow
 */
export async function importExcelFile(file: File): Promise<ImportResult> {
  console.log('🚀 Starting import workflow for:', file.name);

  try {
    // 0. Ensure database is initialized
    console.log('📦 Initializing database...');
    await initDatabase();

    // 1. Read Excel file
    console.log('📖 Reading Excel file...');
    const rows = await readExcelFile(file);
    console.log('✅ Read', rows.length, 'rows from Excel');

    // 2. Validate data
    console.log('🔍 Validating data...');
    const validationErrors = validateExcelData(rows);
    console.log('Validation errors:', validationErrors.length);

    if (validationErrors.some((e) => e.severity === 'error')) {
      console.log('❌ Validation failed with errors');
      return {
        success: false,
        imported: 0,
        errors: validationErrors.filter((e) => e.severity === 'error'),
        warnings: validationErrors.filter((e) => e.severity === 'warning'),
      };
    }

    // 3. Extract nodes
    console.log('🔨 Extracting nodes from rows...');
    const allNodes: TreeNodeCreate[] = [];
    rows.forEach((row, index) => {
      const nodes = extractNodesFromRow(row, index);
      allNodes.push(...nodes);
    });
    console.log('✅ Extracted', allNodes.length, 'nodes');

    // 4. Deduplicate (within same batch)
    console.log('🔄 Deduplicating nodes...');
    const uniqueNodes = deduplicateNodes(allNodes);
    console.log('✅ After deduplication:', uniqueNodes.length, 'unique nodes');

    // Debug: Show node distribution by level
    const levelCounts = new Map<number, number>();
    uniqueNodes.forEach(node => {
      levelCounts.set(node.level, (levelCounts.get(node.level) || 0) + 1);
    });
    console.log('📊 Node distribution by level:');
    for (let i = 1; i <= 10; i++) {
      const count = levelCounts.get(i) || 0;
      if (count > 0) {
        console.log(`   Level ${i}: ${count} nodes`);
      }
    }

    // Debug: Show Level 1 nodes details
    const level1Nodes = uniqueNodes.filter(n => n.level === 1);
    console.log('🔍 Level 1 nodes details:');
    level1Nodes.forEach((node, idx) => {
      console.log(`   [${idx + 1}] Name: "${node.name}", Code: "${node.code}", ID: ${node.id}`);
    });

    // 5. Import to database (will skip existing nodes automatically)
    console.log('💾 Importing to database...');
    const result = await importNodes(uniqueNodes);
    console.log('✅ Import complete:', result.imported, 'nodes imported');

    return result;
  } catch (error) {
    console.error('❌ Import workflow failed:', error);
    throw error;
  }
}

/**
 * Deduplicate nodes (within same batch)
 */
function deduplicateNodes(nodes: TreeNodeCreate[]): TreeNodeCreate[] {
  const seen = new Set<string>();
  const unique: TreeNodeCreate[] = [];

  for (const node of nodes) {
    // Use both code and name for deduplication
    // Normalize empty values to ensure consistent comparison
    const normalizedCode = (node.code || '').trim();
    const normalizedName = (node.name || '').trim();

    // If code exists, use code; otherwise use name
    const identifier = normalizedCode || normalizedName;
    const key = `${node.level}_${identifier}`;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(node);
    } else {
      console.log(`🔄 Deduplicating: Level ${node.level}, Name: "${node.name}", Code: "${node.code}"`);
    }
  }

  return unique;
}

/**
 * Export tree nodes to Excel file
 */
export async function exportToExcel(): Promise<void> {
  console.log('📤 Starting export to Excel...');

  try {
    const db = getDatabase();

    // 1. Load all nodes from database
    console.log('📖 Loading nodes from database...');
    const nodes = await db.select<Array<{
      id: string;
      parent_id: string | null;
      level: number;
      name: string;
      code: string;
      description: string | null;
      system: string | null;
      sub_system: string | null;
      sort_order: number;
    }>>('SELECT * FROM tree_nodes ORDER BY sort_order, level, name');

    console.log('✅ Loaded', nodes.length, 'nodes');

    if (nodes.length === 0) {
      alert('⚠️ No data to export');
      return;
    }

    // 2. Build tree structure
    console.log('🌳 Building tree structure...');
    // nodeMap removed - traverseNode uses nodes.filter() directly
    const rootNodes = nodes.filter(n => !n.parent_id);

    // 3. Convert to Excel rows (flatten tree to rows)
    console.log('📝 Converting to Excel format...');
    const excelRows: any[] = [];

    function traverseNode(node: typeof nodes[0], ancestors: typeof nodes = []) {
      const currentPath = [...ancestors, node];

      // Create a row with all levels
      const row: any = {};

      // Fill in the levels based on the path
      currentPath.forEach((n) => {
        const levelConfig = LEVEL_COLUMNS.find(c => c.level === n.level);
        if (levelConfig) {
          row[levelConfig.nameCol] = n.name;
          row[levelConfig.codeCol] = n.code;
        }
      });

      // Add description from the deepest node
      row['Description '] = node.description || '';

      excelRows.push(row);

      // Recursively process children
      const children = nodes.filter(n => n.parent_id === node.id);
      children.forEach(child => traverseNode(child, currentPath));
    }

    // Start from root nodes
    rootNodes.forEach(root => traverseNode(root, []));

    console.log('✅ Created', excelRows.length, 'Excel rows');

    // 4. Create workbook
    console.log('📊 Creating Excel workbook...');
    const worksheet = XLSX.utils.json_to_sheet(excelRows, {
      header: [
        ...LEVEL_COLUMNS.flatMap(c => [c.nameCol, c.codeCol]),
        'Description '
      ]
    });

    // Set column widths
    const colWidths = [
      ...LEVEL_COLUMNS.flatMap(() => [{ wch: 30 }, { wch: 15 }]),
      { wch: 50 }
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tree Data');

    // 5. Generate default filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const defaultFilename = `CMMS_Export_${timestamp}.xlsx`;

    // 6. Use Tauri dialog to let user choose save location
    console.log('💾 Opening save dialog...');
    const { save } = await import('@tauri-apps/plugin-dialog');

    const filePath = await save({
      defaultPath: defaultFilename,
      filters: [{
        name: 'Excel Files',
        extensions: ['xlsx']
      }]
    });

    if (!filePath) {
      console.log('❌ User cancelled save dialog');
      return;
    }

    console.log('📝 User selected path:', filePath);

    // 7. Write file using Tauri's file system
    const { writeFile } = await import('@tauri-apps/plugin-fs');

    // Generate Excel file as array buffer
    const excelBuffer = XLSX.write(workbook, {
      type: 'array',
      bookType: 'xlsx'
    });

    // Write to selected path
    await writeFile(filePath, new Uint8Array(excelBuffer));

    console.log('✅ Export completed successfully');
    alert(`✅ Successfully exported ${nodes.length} nodes to:\n${filePath}`);
  } catch (error) {
    console.error('❌ Export failed:', error);
    alert(`❌ Export failed: ${error}`);
    throw error;
  }
}
