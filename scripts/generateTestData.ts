// scripts/generateTestData.ts
import Database from '@tauri-apps/plugin-sql';

interface TestNode {
  id: string;
  parentId: string | null;
  level: number;
  name: string;
  code: string;
  description: string;
  system?: string;
  subSystem?: string;
}

async function generateTestData() {
  console.log('Initializing database...');
  const db = await Database.load('sqlite:cmms.db');

  console.log('Clearing existing data...');
  await db.execute('DELETE FROM tree_nodes');

  const nodes: TestNode[] = [];
  const now = new Date().toISOString();

  // Level 1: Company
  const company = {
    id: crypto.randomUUID(),
    parentId: null,
    level: 1,
    name: 'PTLNG',
    code: 'PTLNG-001',
    description: 'Peak Ocean Company',
  };
  nodes.push(company);

  // Level 2: Vessels (3 vessels)
  const vessels = [
    { name: 'FLNG', code: 'FLNG-001', description: 'Floating LNG Vessel' },
    { name: 'FPSO', code: 'FPSO-001', description: 'Floating Production Storage Offloading' },
    { name: 'FSO', code: 'FSO-001', description: 'Floating Storage Offloading' },
  ];

  const vesselNodes = vessels.map(v => ({
    id: crypto.randomUUID(),
    parentId: company.id,
    level: 2,
    name: v.name,
    code: v.code,
    description: v.description,
  }));
  nodes.push(...vesselNodes);

  // Level 3: System Categories (per vessel)
  const systemCategories = [
    { name: 'GENERAL', code: 'GEN', description: 'General Systems' },
    { name: 'ELECTRICAL', code: 'ELEC', description: 'Electrical Systems' },
    { name: 'MECHANICAL', code: 'MECH', description: 'Mechanical Systems' },
    { name: 'INSTRUMENTATION', code: 'INST', description: 'Instrumentation & Control' },
    { name: 'SAFETY', code: 'SAFE', description: 'Safety Systems' },
  ];

  vesselNodes.forEach(vessel => {
    systemCategories.forEach((cat, idx) => {
      const catNode = {
        id: crypto.randomUUID(),
        parentId: vessel.id,
        level: 3,
        name: cat.name,
        code: `${vessel.code}-${cat.code}`,
        description: cat.description,
        system: cat.name,
      };
      nodes.push(catNode);

      // Level 4: Systems (2-3 per category)
      const systemCount = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < systemCount; i++) {
        const sysNode = {
          id: crypto.randomUUID(),
          parentId: catNode.id,
          level: 4,
          name: `${cat.name} System ${i + 1}`,
          code: `${catNode.code}-SYS${String(i + 1).padStart(2, '0')}`,
          description: `${cat.name} System ${i + 1} Description`,
          system: cat.name,
        };
        nodes.push(sysNode);

        // Level 5: Sub-systems (2-4 per system)
        const subSystemCount = 2 + Math.floor(Math.random() * 3);
        for (let j = 0; j < subSystemCount; j++) {
          const subSysNode = {
            id: crypto.randomUUID(),
            parentId: sysNode.id,
            level: 5,
            name: `Sub-system ${j + 1}`,
            code: `${sysNode.code}-SS${String(j + 1).padStart(2, '0')}`,
            description: `Sub-system ${j + 1} for ${sysNode.name}`,
            system: cat.name,
            subSystem: `Sub-system ${j + 1}`,
          };
          nodes.push(subSysNode);
        }
      }
    });
  });

  console.log(`Generated ${nodes.length} test nodes`);
  console.log('Inserting nodes into database...');

  for (const node of nodes) {
    await db.execute(
      `INSERT INTO tree_nodes
      (id, parent_id, level, name, code, description, system, sub_system, sort_order, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        node.id,
        node.parentId,
        node.level,
        node.name,
        node.code,
        node.description,
        node.system || null,
        node.subSystem || null,
        0,
        now,
        now,
      ]
    );
  }

  console.log('Test data generation complete!');
  console.log(`Total nodes: ${nodes.length}`);
  console.log('Level breakdown:');
  for (let i = 1; i <= 5; i++) {
    const count = nodes.filter(n => n.level === i).length;
    console.log(`  Level ${i}: ${count} nodes`);
  }
}

generateTestData().catch(console.error);
