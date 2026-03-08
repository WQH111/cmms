// Query custom fields from database
const Database = require('@tauri-apps/plugin-sql');

async function queryCustomFields() {
  try {
    // Load database
    const db = await Database.load('sqlite:cmms.db');

    console.log('📊 Querying nodes with custom fields...\n');

    // Query all nodes with custom_fields data
    const result = await db.select(`
      SELECT
        id,
        name,
        code,
        level,
        custom_fields
      FROM tree_nodes
      WHERE custom_fields IS NOT NULL
        AND custom_fields != ''
        AND custom_fields != 'null'
      ORDER BY level, name
    `);

    console.log(`Found ${result.length} nodes with custom fields:\n`);

    if (result.length === 0) {
      console.log('❌ No nodes have custom fields data yet.\n');

      // Show total node count
      const totalResult = await db.select('SELECT COUNT(*) as count FROM tree_nodes');
      console.log(`Total nodes in database: ${totalResult[0].count}`);

      // Show sample nodes
      const sampleNodes = await db.select(`
        SELECT id, name, code, level
        FROM tree_nodes
        LIMIT 5
      `);

      console.log('\n📋 Sample nodes in database:');
      sampleNodes.forEach((node, idx) => {
        console.log(`${idx + 1}. [L${node.level}] ${node.name} (${node.code})`);
      });
    } else {
      result.forEach((node, idx) => {
        console.log(`${idx + 1}. [Level ${node.level}] ${node.name} (${node.code})`);
        console.log(`   ID: ${node.id}`);

        try {
          const customFields = JSON.parse(node.custom_fields);
          const fieldCount = Object.keys(customFields).length;
          console.log(`   Custom Fields (${fieldCount}):`);

          Object.entries(customFields).forEach(([key, value]) => {
            if (value && typeof value === 'object') {
              console.log(`     - ${key}: ${value.label || key} = ${value.value || 'N/A'}`);
            } else {
              console.log(`     - ${key}: ${value}`);
            }
          });
        } catch (e) {
          console.log(`   ⚠️ Invalid JSON: ${node.custom_fields}`);
        }
        console.log('');
      });
    }

    await db.close();

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

queryCustomFields();
