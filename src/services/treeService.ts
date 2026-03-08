// src/services/treeService.ts
import { getDatabase } from './database';
import type { TreeNode, TreeNodeCreate, TreeNodeUpdate } from '../types/TreeNode';

export async function getAllNodes(): Promise<TreeNode[]> {
  const db = getDatabase();
  const result = await db.select<any[]>(`
    SELECT
      id, parent_id as parentId, level, name, code,
      description, system, sub_system as subSystem,
      sort_order as sortOrder, is_new as isNew, is_modified as isModified,
      created_at as createdAt, updated_at as updatedAt,
      object_id as objectId, original_id as originalId, site_code as siteCode,
      asset_category as assetCategory, item_category as itemCategory,
      part_number as partNumber, serial_number as serialNumber,
      manufacturer, model, notes, quantity, barcode, composed,
      emission_point as emissionPoint, cost_center as costCenter,
      custom_fields as customFields
    FROM tree_nodes
    ORDER BY sort_order, name
  `);

  // Parse custom_fields JSON
  return result.map(node => ({
    ...node,
    customFields: node.customFields ? JSON.parse(node.customFields) : undefined
  }));
}

export async function getNodesByLevel(level: number): Promise<TreeNode[]> {
  const db = getDatabase();
  const result = await db.select<TreeNode[]>(
    `SELECT
      id, parent_id as parentId, level, name, code,
      description, system, sub_system as subSystem,
      sort_order as sortOrder, is_new as isNew, is_modified as isModified,
      created_at as createdAt, updated_at as updatedAt
    FROM tree_nodes
    WHERE level = $1
    ORDER BY sort_order, name`,
    [level]
  );
  return result;
}

/**
 * Get nodes by level including all their ancestors
 * This allows proper tree structure display when filtering by level
 */
export async function getNodesByLevelWithAncestors(level: number): Promise<TreeNode[]> {
  const db = getDatabase();

  // Get all nodes up to and including the target level
  const result = await db.select<TreeNode[]>(
    `SELECT
      id, parent_id as parentId, level, name, code,
      description, system, sub_system as subSystem,
      sort_order as sortOrder, is_new as isNew, is_modified as isModified,
      created_at as createdAt, updated_at as updatedAt
    FROM tree_nodes
    WHERE level <= $1
    ORDER BY level, sort_order, name`,
    [level]
  );

  return result;
}

export async function getNodesByParent(parentId: string | null): Promise<TreeNode[]> {
  const db = getDatabase();
  const query = parentId
    ? `SELECT * FROM tree_nodes WHERE parent_id = $1 ORDER BY sort_order, name`
    : `SELECT * FROM tree_nodes WHERE parent_id IS NULL ORDER BY sort_order, name`;

  const result = await db.select<TreeNode[]>(query, parentId ? [parentId] : []);
  return result;
}

export async function createNode(node: TreeNodeCreate): Promise<string> {
  const db = getDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO tree_nodes
    (id, parent_id, level, name, code, description, system, sub_system, sort_order, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      id,
      node.parentId,
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

  return id;
}

export async function updateNode(id: string, updates: TreeNodeUpdate): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.code !== undefined) {
    fields.push(`code = $${paramIndex++}`);
    values.push(updates.code);
  }
  if (updates.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }
  if (updates.system !== undefined) {
    fields.push(`system = $${paramIndex++}`);
    values.push(updates.system);
  }
  if (updates.subSystem !== undefined) {
    fields.push(`sub_system = $${paramIndex++}`);
    values.push(updates.subSystem);
  }
  if (updates.sortOrder !== undefined) {
    fields.push(`sort_order = $${paramIndex++}`);
    values.push(updates.sortOrder);
  }
  if (updates.isModified !== undefined) {
    fields.push(`is_modified = $${paramIndex++}`);
    values.push(updates.isModified ? 1 : 0);
  }

  // Asset management fields
  if (updates.objectId !== undefined) {
    fields.push(`object_id = $${paramIndex++}`);
    values.push(updates.objectId);
  }
  if (updates.originalId !== undefined) {
    fields.push(`original_id = $${paramIndex++}`);
    values.push(updates.originalId);
  }
  if (updates.siteCode !== undefined) {
    fields.push(`site_code = $${paramIndex++}`);
    values.push(updates.siteCode);
  }
  if (updates.assetCategory !== undefined) {
    fields.push(`asset_category = $${paramIndex++}`);
    values.push(updates.assetCategory);
  }
  if (updates.itemCategory !== undefined) {
    fields.push(`item_category = $${paramIndex++}`);
    values.push(updates.itemCategory);
  }
  if (updates.partNumber !== undefined) {
    fields.push(`part_number = $${paramIndex++}`);
    values.push(updates.partNumber);
  }
  if (updates.serialNumber !== undefined) {
    fields.push(`serial_number = $${paramIndex++}`);
    values.push(updates.serialNumber);
  }
  if (updates.manufacturer !== undefined) {
    fields.push(`manufacturer = $${paramIndex++}`);
    values.push(updates.manufacturer);
  }
  if (updates.model !== undefined) {
    fields.push(`model = $${paramIndex++}`);
    values.push(updates.model);
  }
  if (updates.notes !== undefined) {
    fields.push(`notes = $${paramIndex++}`);
    values.push(updates.notes);
  }
  if (updates.quantity !== undefined) {
    fields.push(`quantity = $${paramIndex++}`);
    values.push(updates.quantity);
  }
  if (updates.barcode !== undefined) {
    fields.push(`barcode = $${paramIndex++}`);
    values.push(updates.barcode);
  }
  if (updates.composed !== undefined) {
    fields.push(`composed = $${paramIndex++}`);
    values.push(updates.composed);
  }
  if (updates.emissionPoint !== undefined) {
    fields.push(`emission_point = $${paramIndex++}`);
    values.push(updates.emissionPoint);
  }
  if (updates.costCenter !== undefined) {
    fields.push(`cost_center = $${paramIndex++}`);
    values.push(updates.costCenter);
  }
  if (updates.customFields !== undefined) {
    fields.push(`custom_fields = $${paramIndex++}`);
    values.push(JSON.stringify(updates.customFields));
  }

  fields.push(`updated_at = $${paramIndex++}`);
  values.push(now);

  values.push(id);

  await db.execute(
    `UPDATE tree_nodes SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
    values
  );
}

export async function deleteNode(id: string): Promise<void> {
  const db = getDatabase();
  await db.execute('DELETE FROM tree_nodes WHERE id = $1', [id]);
}

export async function searchNodes(query: string): Promise<TreeNode[]> {
  const db = getDatabase();
  const searchPattern = `%${query}%`;
  const result = await db.select<TreeNode[]>(
    `SELECT
      id, parent_id as parentId, level, name, code,
      description, system, sub_system as subSystem,
      sort_order as sortOrder, is_new as isNew, is_modified as isModified,
      created_at as createdAt, updated_at as updatedAt
    FROM tree_nodes
    WHERE name LIKE $1 OR code LIKE $1 OR description LIKE $1
    ORDER BY level, sort_order, name`,
    [searchPattern]
  );
  return result;
}

export async function moveNodeTo(
  nodeId: string,
  newParentId: string | null,
  newLevel: number
): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();

  await db.execute(
    `UPDATE tree_nodes
    SET parent_id = $1, level = $2, is_modified = 1, updated_at = $3
    WHERE id = $4`,
    [newParentId, newLevel, now, nodeId]
  );

  // 递归更新所有子节点的层级
  await updateChildrenLevels(nodeId, newLevel);
}

async function updateChildrenLevels(parentId: string, parentLevel: number): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();

  // 获取所有子节点
  const children = await db.select<TreeNode[]>(
    'SELECT id FROM tree_nodes WHERE parent_id = $1',
    [parentId]
  );

  // 更新每个子节点的层级
  for (const child of children) {
    const newLevel = parentLevel + 1;
    await db.execute(
      `UPDATE tree_nodes SET level = $1, updated_at = $2 WHERE id = $3`,
      [newLevel, now, child.id]
    );

    // 递归更新子节点的子节点
    await updateChildrenLevels(child.id, newLevel);
  }
}

