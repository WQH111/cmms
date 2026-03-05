// 临时调试脚本 - 查询数据库状态
// 在浏览器 Console 中运行

import { getDatabase } from './services/database.js';

async function debugDatabase() {
  try {
    const db = getDatabase();

    console.log('=== 数据库调试信息 ===\n');

    // 1. 总节点数
    const totalCount = await db.select('SELECT COUNT(*) as count FROM tree_nodes');
    console.log('📊 总节点数:', totalCount[0]?.count || 0);

    // 2. 按层级统计
    console.log('\n📊 各层级节点数量:');
    for (let level = 1; level <= 10; level++) {
      const result = await db.select(
        'SELECT COUNT(*) as count FROM tree_nodes WHERE level = $1',
        [level]
      );
      const count = result[0]?.count || 0;
      if (count > 0) {
        console.log(`   Level ${level}: ${count} 个节点`);
      }
    }

    // 3. Level 1 详细信息
    console.log('\n🔍 Level 1 节点详情:');
    const level1 = await db.select(
      'SELECT id, name, code, parent_id, created_at FROM tree_nodes WHERE level = 1 ORDER BY name'
    );
    level1.forEach((node, idx) => {
      console.log(`   [${idx + 1}] Name: "${node.name}", Code: "${node.code}", ID: ${node.id}`);
    });

    // 4. Level 2 详细信息
    console.log('\n🔍 Level 2 节点详情:');
    const level2 = await db.select(
      'SELECT id, name, code, parent_id FROM tree_nodes WHERE level = 2 ORDER BY name LIMIT 10'
    );
    if (level2.length > 0) {
      level2.forEach((node, idx) => {
        console.log(`   [${idx + 1}] Name: "${node.name}", Code: "${node.code}", Parent: ${node.parent_id}`);
      });
    } else {
      console.log('   ❌ 没有 Level 2 节点！');
    }

    // 5. 检查父子关系
    console.log('\n🔗 父子关系检查:');
    const orphans = await db.select(
      `SELECT level, COUNT(*) as count
       FROM tree_nodes
       WHERE level > 1 AND (parent_id IS NULL OR parent_id = '')
       GROUP BY level`
    );
    if (orphans.length > 0) {
      console.log('   ⚠️ 发现孤儿节点（没有父节点）:');
      orphans.forEach(o => {
        console.log(`      Level ${o.level}: ${o.count} 个节点`);
      });
    } else {
      console.log('   ✅ 所有节点都有正确的父节点');
    }

    // 6. 检查最近导入的节点
    console.log('\n📅 最近导入的节点 (is_new = 1):');
    const newNodes = await db.select(
      'SELECT level, COUNT(*) as count FROM tree_nodes WHERE is_new = 1 GROUP BY level ORDER BY level'
    );
    if (newNodes.length > 0) {
      newNodes.forEach(n => {
        console.log(`   Level ${n.level}: ${n.count} 个新节点`);
      });
    } else {
      console.log('   没有标记为新导入的节点');
    }

    // 7. 示例数据
    console.log('\n📝 前 5 个节点示例:');
    const samples = await db.select(
      'SELECT level, name, code, parent_id FROM tree_nodes ORDER BY level, name LIMIT 5'
    );
    console.table(samples);

  } catch (error) {
    console.error('❌ 查询失败:', error);
  }
}

// 运行调试
debugDatabase();
