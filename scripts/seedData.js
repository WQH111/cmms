// scripts/seedData.js
// Simple test data generator that can be run with: node scripts/seedData.js

const testData = {
  nodes: []
};

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateTestData() {
  const nodes = [];
  const now = new Date().toISOString();

  // Level 1: Company
  const company = {
    id: generateId(),
    parentId: null,
    level: 1,
    name: 'PTLNG',
    code: 'PTLNG-001',
    description: 'Peak Ocean Company',
    createdAt: now,
    updatedAt: now,
  };
  nodes.push(company);

  // Level 2: Vessels
  const vessels = [
    { name: 'FLNG', code: 'FLNG-001', description: 'Floating LNG Vessel' },
    { name: 'FPSO', code: 'FPSO-001', description: 'Floating Production Storage Offloading' },
    { name: 'FSO', code: 'FSO-001', description: 'Floating Storage Offloading' },
  ];

  vessels.forEach(v => {
    const vesselNode = {
      id: generateId(),
      parentId: company.id,
      level: 2,
      name: v.name,
      code: v.code,
      description: v.description,
      createdAt: now,
      updatedAt: now,
    };
    nodes.push(vesselNode);

    // Level 3: System Categories
    const categories = [
      { name: 'GENERAL', code: 'GEN', description: 'General Systems' },
      { name: 'ELECTRICAL', code: 'ELEC', description: 'Electrical Systems' },
      { name: 'MECHANICAL', code: 'MECH', description: 'Mechanical Systems' },
      { name: 'INSTRUMENTATION', code: 'INST', description: 'Instrumentation & Control' },
      { name: 'SAFETY', code: 'SAFE', description: 'Safety Systems' },
    ];

    categories.forEach(cat => {
      const catNode = {
        id: generateId(),
        parentId: vesselNode.id,
        level: 3,
        name: cat.name,
        code: `${v.code}-${cat.code}`,
        description: cat.description,
        system: cat.name,
        createdAt: now,
        updatedAt: now,
      };
      nodes.push(catNode);

      // Level 4: Systems
      const systemCount = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < systemCount; i++) {
        const sysNode = {
          id: generateId(),
          parentId: catNode.id,
          level: 4,
          name: `${cat.name} System ${i + 1}`,
          code: `${catNode.code}-SYS${String(i + 1).padStart(2, '0')}`,
          description: `${cat.name} System ${i + 1} Description`,
          system: cat.name,
          createdAt: now,
          updatedAt: now,
        };
        nodes.push(sysNode);

        // Level 5: Sub-systems
        const subSystemCount = 2 + Math.floor(Math.random() * 3);
        for (let j = 0; j < subSystemCount; j++) {
          const subSysNode = {
            id: generateId(),
            parentId: sysNode.id,
            level: 5,
            name: `Sub-system ${j + 1}`,
            code: `${sysNode.code}-SS${String(j + 1).padStart(2, '0')}`,
            description: `Sub-system ${j + 1} for ${sysNode.name}`,
            system: cat.name,
            subSystem: `Sub-system ${j + 1}`,
            createdAt: now,
            updatedAt: now,
          };
          nodes.push(subSysNode);
        }
      }
    });
  });

  return nodes;
}

const nodes = generateTestData();

console.log('Test Data Generated!');
console.log(`Total nodes: ${nodes.length}`);
console.log('\nLevel breakdown:');
for (let i = 1; i <= 5; i++) {
  const count = nodes.filter(n => n.level === i).length;
  console.log(`  Level ${i}: ${count} nodes`);
}

console.log('\nSample nodes:');
nodes.slice(0, 5).forEach(node => {
  console.log(`  L${node.level}: ${node.name} (${node.code})`);
});

console.log('\nTo use this data:');
console.log('1. Copy the generated SQL statements');
console.log('2. Run them in your SQLite database');
console.log('\nSQL INSERT statements:\n');

nodes.forEach(node => {
  const sql = `INSERT INTO tree_nodes (id, parent_id, level, name, code, description, system, sub_system, sort_order, is_new, is_modified, created_at, updated_at) VALUES ('${node.id}', ${node.parentId ? `'${node.parentId}'` : 'NULL'}, ${node.level}, '${node.name}', '${node.code}', '${node.description || ''}', ${node.system ? `'${node.system}'` : 'NULL'}, ${node.subSystem ? `'${node.subSystem}'` : 'NULL'}, 0, 0, 0, '${node.createdAt}', '${node.updatedAt}');`;
  console.log(sql);
});
