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
  __trackedColumns__?: Record<string, TrackedColumnValue>;
}

interface CustomFieldHeaders {
  labelHeader: string;
  valueHeader: string;
}

interface TrackedColumnValue {
  letter: string;
  header: string;
  value: unknown;
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

const REQUIRED_TRACKED_COLUMNS = ['AN', 'AO'] as const;

function getTrackedColumnHeader(worksheet: XLSX.WorkSheet, letter: string): string {
  const headerCell = worksheet[`${letter}1`];
  return normalizeCellValue(headerCell?.v) || letter;
}

function attachTrackedColumnValues(rows: ExcelRow[], worksheet: XLSX.WorkSheet): ExcelRow[] {
  return rows.map((row, index) => {
    const excelRowNumber = index + 2;
    const trackedColumns: Record<string, TrackedColumnValue> = {};

    for (const letter of REQUIRED_TRACKED_COLUMNS) {
      trackedColumns[letter] = {
        letter,
        header: getTrackedColumnHeader(worksheet, letter),
        value: worksheet[`${letter}${excelRowNumber}`]?.v,
      };
    }

    return {
      ...row,
      __trackedColumns__: trackedColumns,
    };
  });
}

function getTrackedColumnValue(row: ExcelRow, letter: string): TrackedColumnValue | null {
  return row.__trackedColumns__?.[letter] ?? null;
}

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
        const enrichedRows = attachTrackedColumnValues(jsonData, worksheet);
        console.log('✅ Excel parsed successfully, rows:', jsonData.length);
        resolve(enrichedRows);
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

  // Extract custom fields (cf1-cf50)
  // Support both exact match and partial match (with descriptions in parentheses)
  const customFields: any = {};
  const rowKeys = Object.keys(row);

  for (let i = 1; i <= 50; i++) {
    // Try exact match first
    let labelKey = `cf${i} label`;
    let valueKey = `cf${i} value`;

    // If exact match not found, try partial match (e.g., "cf1 label (description)")
    if (!(labelKey in row)) {
      labelKey = rowKeys.find(key => key.startsWith(`cf${i} label`)) || labelKey;
    }
    if (!(valueKey in row)) {
      valueKey = rowKeys.find(key => key.startsWith(`cf${i} value`)) || valueKey;
    }

    if (row[labelKey] || row[valueKey]) {
      customFields[`cf${i}`] = {
        label: row[labelKey] || '',
        value: row[valueKey] || '',
        labelHeader: labelKey,
        valueHeader: valueKey,
      };
    }
  }

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

        // Basic identification fields
        objectId: row['Object ID'] || undefined,
        originalId: row['original id'] || undefined,
        siteCode: row['Site code'] || undefined,

        // Asset management fields
        assetCategory: row['Asset category'] || undefined,
        itemCategory: row['Item category'] || undefined,
        partNumber: row['Part number'] || undefined,
        serialNumber: row['Serial number'] || undefined,
        manufacturer: row['Manufacturer'] || undefined,
        model: row['Model'] || undefined,
        notes: row['Notes'] || undefined,
        quantity: row['Quantity'] ? String(row['Quantity']) : undefined,
        barcode: row['Barcode'] || undefined,
        composed: row['composed'] || undefined,
        emissionPoint: row['Emission Point'] || undefined,
        costCenter: row['Cost center'] || undefined,

        // Custom fields
        customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
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

function getDefaultCustomFieldHeaders(index: number): CustomFieldHeaders {
  return {
    labelHeader: `cf${index} label`,
    valueHeader: `cf${index} value`,
  };
}

function normalizeCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function buildHierarchyConflictKey(row: ExcelRow): string {
  const pathParts = LEVEL_COLUMNS.map((config) => {
    const name = normalizeCellValue(row[config.nameCol]);
    const code = normalizeCellValue(row[config.codeCol]);
    return `${config.level}:${name}|${code}`;
  });

  const functionLocationName = normalizeCellValue(row['Name (Descr. Function Location)']);
  const deepestLevelTag =
    normalizeCellValue(row['Level 10 (Tag)']) ||
    normalizeCellValue(row['Level 9 (Tag)']) ||
    normalizeCellValue(row['Level 8 (Tag)']) ||
    normalizeCellValue(row['Level 7 (code)']) ||
    normalizeCellValue(row['Level 6 (code)']) ||
    normalizeCellValue(row['Level 5 (code)']);

  return [...pathParts, `name:${functionLocationName}`, `tag:${deepestLevelTag}`].join('||');
}

function getDeepestHierarchyTag(row: ExcelRow): string {
  return (
    normalizeCellValue(row['Level 10 (Tag)']) ||
    normalizeCellValue(row['Level 9 (Tag)']) ||
    normalizeCellValue(row['Level 8 (Tag)']) ||
    normalizeCellValue(row['Level 7 (code)']) ||
    normalizeCellValue(row['Level 6 (code)']) ||
    normalizeCellValue(row['Level 5 (code)'])
  );
}

function parseFunctionNumberPattern(functionNumber: string): { prefix: string; suffix: string } | null {
  const match = functionNumber.match(/^(.*?)([A-Za-z]*\d+)$/);
  if (!match) {
    return null;
  }

  return {
    prefix: match[1],
    suffix: match[2],
  };
}

function collectCustomFieldHeaders(
  nodes: Array<{ custom_fields: string | null }>
): Map<number, CustomFieldHeaders> {
  const headerMap = new Map<number, CustomFieldHeaders>();

  for (let i = 1; i <= 50; i++) {
    headerMap.set(i, getDefaultCustomFieldHeaders(i));
  }

  for (const node of nodes) {
    if (!node.custom_fields) continue;

    try {
      const customFields = JSON.parse(node.custom_fields);

      for (let i = 1; i <= 50; i++) {
        const currentHeaders = headerMap.get(i) || getDefaultCustomFieldHeaders(i);
        const customField = customFields[`cf${i}`];
        if (!customField) continue;

        headerMap.set(i, {
          labelHeader: customField.labelHeader || currentHeaders.labelHeader,
          valueHeader: customField.valueHeader || currentHeaders.valueHeader,
        });
      }
    } catch (error) {
      console.error('Failed to parse custom field headers:', error);
    }
  }

  return headerMap;
}

/**
 * Validate Excel data
 */
export function validateExcelData(rows: ExcelRow[]): ImportError[] {
  const errors: ImportError[] = [];
  const functionNumberConflicts = new Map<
    string,
    {
      rows: number[];
      functionNumbers: Set<string>;
      deepestTag: string;
    }
  >();

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

    if (hasData) {
      for (const letter of REQUIRED_TRACKED_COLUMNS) {
        const trackedColumn = getTrackedColumnValue(row, letter);
        if (!trackedColumn) continue;

        if (!normalizeCellValue(trackedColumn.value)) {
          errors.push({
            row: rowNum,
            field: letter,
            message: `Column ${letter} (${trackedColumn.header}) is empty. Import will continue, but this row should be reviewed.`,
            severity: 'warning',
          });
        }
      }
    }

    const functionNumber = normalizeCellValue(row['Code (Function Number)']);
    if (functionNumber) {
      const conflictKey = buildHierarchyConflictKey(row);
      const deepestTag = getDeepestHierarchyTag(row);
      const existingConflict = functionNumberConflicts.get(conflictKey);

      if (existingConflict) {
        existingConflict.rows.push(rowNum);
        existingConflict.functionNumbers.add(functionNumber);
      } else {
        functionNumberConflicts.set(conflictKey, {
          rows: [rowNum],
          functionNumbers: new Set([functionNumber]),
          deepestTag,
        });
      }
    }

    // Check level continuity (cannot skip levels)
    let lastLevel = 0;
    for (const config of LEVEL_COLUMNS) {
      const nameValue = row[config.nameCol];
      const codeValue = row[config.codeCol];
      const hasLevelData = nameValue || codeValue;

      if (hasLevelData) {
        if (config.level > lastLevel + 1) {
          errors.push({
            row: rowNum,
            field: config.nameCol,
            message: `Level discontinuity: Level ${config.level} appears after Level ${lastLevel}`,
            severity: 'error',
          });
        }

        if (config.level > 1 && nameValue && !codeValue) {
          errors.push({
            row: rowNum,
            field: config.codeCol,
            message: `Level ${config.level} has a name but is missing code. Import will continue, but this row should be reviewed.`,
            severity: 'warning',
          });
        }

        lastLevel = config.level;
      }
    }
  });

  for (const conflict of functionNumberConflicts.values()) {
    if (conflict.rows.length < 2 || conflict.functionNumbers.size < 2) {
      continue;
    }

    const sortedRows = [...conflict.rows].sort((a, b) => a - b);
    const sortedFunctionNumbers = Array.from(conflict.functionNumbers).sort();
    const parsedPatterns = sortedFunctionNumbers.map(parseFunctionNumberPattern);
    const hasPattern = parsedPatterns.every((pattern) => pattern !== null);
    const sharedPrefix = hasPattern
      ? new Set(parsedPatterns.map((pattern) => pattern!.prefix)).size === 1
      : false;
    const suffixesAreDifferent = hasPattern
      ? new Set(parsedPatterns.map((pattern) => pattern!.suffix)).size > 1
      : false;

    if (sharedPrefix && suffixesAreDifferent) {
      errors.push({
        row: sortedRows[0],
        field: 'Code (Function Number)',
        message:
          `Rows ${sortedRows.join(', ')} share the same hierarchy path and deepest tag ` +
          `"${conflict.deepestTag || 'N/A'}", but Code (Function Number) changes by suffix: ` +
          `${sortedFunctionNumbers.join(', ')}. This looks like duplicated source rows where only ` +
          'the function-number tail was edited. Import will continue, but this source data should be reviewed.',
        severity: 'warning',
      });
      continue;
    }

    errors.push({
      row: sortedRows[0],
      field: 'Code (Function Number)',
      message:
        `Rows ${sortedRows.join(', ')} appear to describe the same hierarchy node, ` +
        `but Code (Function Number) is inconsistent: ${sortedFunctionNumbers.join(', ')}. ` +
        'Import will continue, but this source data should be reviewed.',
      severity: 'warning',
    });
  }

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
    // Build a comprehensive check that includes nodes with empty codes
    const existingSet = new Set<string>();

    console.log('🔍 Checking existing nodes...');

    // Check all nodes by level and name/code combination
    // We need to check both nodes with codes and nodes without codes
    const nodesToCheck = nodes.map(n => ({
      level: n.level,
      code: n.code || '',
      name: n.name || ''
    }));

    // Group by level for efficient querying
    const levelGroups = new Map<number, typeof nodesToCheck>();
    for (const node of nodesToCheck) {
      if (!levelGroups.has(node.level)) {
        levelGroups.set(node.level, []);
      }
      levelGroups.get(node.level)!.push(node);
    }

    // Query each level separately
    for (const [level] of levelGroups) {
      // Get all existing nodes at this level
      const existing = await executeWithRetry(() =>
        db.select<Array<{ code: string; name: string; level: number }>>(
          `SELECT code, name, level FROM tree_nodes WHERE level = $1`,
          [level]
        )
      );

      // Build a set of existing node keys
      for (const existingNode of existing) {
        const existingCode = existingNode.code || '';
        const existingName = existingNode.name || '';

        // Match by code if both have code, otherwise match by name
        if (existingCode) {
          existingSet.add(`${existingCode}_${existingNode.level}`);
        } else {
          existingSet.add(`${existingName}_${existingNode.level}`);
        }
      }
    }

    console.log('Found', existingSet.size, 'existing nodes to skip');

    // Filter out duplicates before transaction
    const nodesToImport = nodes.filter(node => {
      const nodeCode = node.code || '';
      const nodeName = node.name || '';

      // Check by code if available, otherwise by name
      const key = nodeCode ? `${nodeCode}_${node.level}` : `${nodeName}_${node.level}`;

      if (existingSet.has(key)) {
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

    // Build a map of existing nodes in database (for parent lookup)
    console.log('🔍 Building existing node map for parent resolution...');
    const allExistingNodes = await db.select<Array<{ id: string; level: number; code: string; name: string }>>(
      'SELECT id, level, code, name FROM tree_nodes'
    );

    for (const existingNode of allExistingNodes) {
      const tempId = generateNodeId(existingNode.level, existingNode.code || existingNode.name);
      nodeMap.set(tempId, existingNode.id);
    }
    console.log(`✅ Mapped ${nodeMap.size} existing nodes`);

    // NO TRANSACTIONS - Each INSERT is completely independent
    // This eliminates all lock contention issues
    console.log('📝 Importing nodes without transactions for maximum compatibility...');

    for (let i = 0; i < nodesToImport.length; i++) {
      const node = nodesToImport[i];

      try {
        const realId = crypto.randomUUID();
        // Look up parent in both existing nodes and newly created nodes
        const realParentId = node.parentId ? (nodeMap.get(node.parentId) || null) : null;

        // Each INSERT is completely independent with aggressive retry
        await executeWithRetry(async () => {
          await db.execute(
            `INSERT INTO tree_nodes
            (id, parent_id, level, name, code, description, system, sub_system, sort_order, is_new,
             object_id, original_id, site_code,
             asset_category, item_category, part_number, serial_number, manufacturer, model,
             notes, quantity, barcode, composed, emission_point, cost_center, custom_fields,
             created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)`,
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
              node.objectId || null,
              node.originalId || null,
              node.siteCode || null,
              node.assetCategory || null,
              node.itemCategory || null,
              node.partNumber || null,
              node.serialNumber || null,
              node.manufacturer || null,
              node.model || null,
              node.notes || null,
              node.quantity || null,
              node.barcode || null,
              node.composed || null,
              node.emissionPoint || null,
              node.costCenter || null,
              node.customFields ? JSON.stringify(node.customFields) : null,
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
    const validationWarnings = validationErrors.filter((e) => e.severity === 'warning');
    console.log('Validation issues:', validationErrors.length);

    if (validationErrors.some((e) => e.severity === 'error')) {
      console.log('❌ Validation failed with errors');
      return {
        success: false,
        imported: 0,
        errors: validationErrors.filter((e) => e.severity === 'error'),
        warnings: validationWarnings,
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

    return {
      ...result,
      warnings: [...validationWarnings, ...result.warnings],
    };
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
      object_id: string | null;
      original_id: string | null;
      site_code: string | null;
      asset_category: string | null;
      item_category: string | null;
      part_number: string | null;
      serial_number: string | null;
      manufacturer: string | null;
      model: string | null;
      notes: string | null;
      quantity: string | null;
      barcode: string | null;
      composed: string | null;
      emission_point: string | null;
      cost_center: string | null;
      custom_fields: string | null;
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
    const customFieldHeaders = collectCustomFieldHeaders(nodes);

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

      // Add description and other fields from the deepest node
      row['Description '] = node.description || '';
      row['Name (Descr. Function Location)'] = node.name || '';
      row['Code (Function Number)'] = node.code || '';
      row['Object ID'] = node.object_id || '';
      row['original id'] = node.original_id || '';
      row['Site code'] = node.site_code || '';
      row['Asset category'] = node.asset_category || '';
      row['Item category'] = node.item_category || '';
      row['Part number'] = node.part_number || '';
      row['Serial number'] = node.serial_number || '';
      row['Manufacturer'] = node.manufacturer || '';
      row['Model'] = node.model || '';
      row['Notes'] = node.notes || '';
      row['Quantity'] = node.quantity || '';
      row['Barcode'] = node.barcode || '';
      row['composed'] = node.composed || '';
      row['Emission Point'] = node.emission_point || '';
      row['Cost center'] = node.cost_center || '';

      // Add custom fields (cf1-cf50)
      if (node.custom_fields) {
        try {
          const customFields = JSON.parse(node.custom_fields);
          for (let i = 1; i <= 50; i++) {
            const cfKey = `cf${i}`;
            if (customFields[cfKey]) {
              const headers = customFieldHeaders.get(i) || getDefaultCustomFieldHeaders(i);
              row[headers.labelHeader] = customFields[cfKey].label || '';
              row[headers.valueHeader] = customFields[cfKey].value || '';
            }
          }
        } catch (e) {
          console.error('Failed to parse custom fields:', e);
        }
      }

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

    // Build header array with all fields
    const headers = [
      'Object ID',
      'original id',
      'Site code',
      ...LEVEL_COLUMNS.flatMap(c => [c.nameCol, c.codeCol]),
      'Name (Descr. Function Location)',
      'Code (Function Number)',
      'Description ',
      'Asset category',
      'Item category',
      'Part number',
      'Serial number',
      'Manufacturer',
      'Model',
      'Notes',
      'Quantity',
      'Barcode',
      'composed',
      'Emission Point',
      'Cost center',
    ];

    // Add custom field headers (cf1-cf50)
    for (let i = 1; i <= 50; i++) {
      const customHeaders = customFieldHeaders.get(i) || getDefaultCustomFieldHeaders(i);
      headers.push(customHeaders.labelHeader);
      headers.push(customHeaders.valueHeader);
    }

    const worksheet = XLSX.utils.json_to_sheet(excelRows, { header: headers });

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
