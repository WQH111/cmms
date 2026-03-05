// 测试拖拽验证逻辑
// 运行: node test-drag-logic.js

// 模拟节点数据
const nodes = [
  { id: '1', parentId: null, level: 1, name: 'PTLNG', code: 'PT001' },
  { id: '2', parentId: '1', level: 2, name: 'FLNG', code: 'FL001' },
  { id: '3', parentId: '2', level: 3, name: 'SubNode', code: 'SN001' },
  { id: '4', parentId: null, level: 1, name: 'Other', code: 'OT001' },
];

// 检查是否是后代
function isDescendant(nodeId, targetId, allNodes) {
  const target = allNodes.find(n => n.id === targetId);
  if (!target) return false;

  if (target.parentId === nodeId) return true;
  if (!target.parentId) return false;

  return isDescendant(nodeId, target.parentId, allNodes);
}

// 获取最大子节点深度
function getMaxChildDepth(nodeId, allNodes) {
  const children = allNodes.filter(n => n.parentId === nodeId);

  if (children.length === 0) {
    return 0;
  }

  let maxDepth = 0;
  for (const child of children) {
    const childDepth = getMaxChildDepth(child.id, allNodes);
    maxDepth = Math.max(maxDepth, childDepth + 1);
  }

  return maxDepth;
}

// 验证移动
function validateMove(node, newParentId, newLevel, allNodes) {
  const MAX_LEVEL = 16;

  // 1. 不能移动到自己
  if (node.id === newParentId) {
    return {
      valid: false,
      reason: 'Cannot move a node to itself'
    };
  }

  // 2. 不能移动到自己的子节点
  if (newParentId && isDescendant(node.id, newParentId, allNodes)) {
    return {
      valid: false,
      reason: 'Cannot move a node to its own descendant (would create a cycle)'
    };
  }

  // 3. 检查层级限制
  if (newLevel > MAX_LEVEL) {
    return {
      valid: false,
      reason: `Maximum level is ${MAX_LEVEL}, target level would be ${newLevel}`
    };
  }

  // 4. 检查子节点深度
  const maxChildDepth = getMaxChildDepth(node.id, allNodes);
  if (newLevel + maxChildDepth > MAX_LEVEL) {
    return {
      valid: false,
      reason: `Moving this node would cause its children to exceed level ${MAX_LEVEL} (max depth: ${maxChildDepth})`
    };
  }

  // 5. 检查是否有变化
  if (node.parentId === newParentId) {
    return {
      valid: false,
      reason: 'Node is already at this location'
    };
  }

  return { valid: true };
}

// 测试场景
console.log('=== 拖拽验证测试 ===\n');

// 场景 1: 把 PTLNG (L1) 拖到 FLNG (L2) 下面
console.log('场景 1: PTLNG (L1) → FLNG (L2) 下面');
const node1 = nodes.find(n => n.id === '1');
const result1 = validateMove(node1, '2', 3, nodes);
console.log('结果:', result1);
console.log('原因: FLNG 是 PTLNG 的子节点，会造成循环引用\n');

// 场景 2: 把 FLNG (L2) 拖到 Other (L1) 下面
console.log('场景 2: FLNG (L2) → Other (L1) 下面');
const node2 = nodes.find(n => n.id === '2');
const result2 = validateMove(node2, '4', 2, nodes);
console.log('结果:', result2);
console.log('说明: 这是有效的移动\n');

// 场景 3: 把 SubNode (L3) 拖到根节点
console.log('场景 3: SubNode (L3) → 根节点');
const node3 = nodes.find(n => n.id === '3');
const result3 = validateMove(node3, null, 1, nodes);
console.log('结果:', result3);
console.log('说明: 这是有效的移动\n');

// 场景 4: 把 PTLNG 拖到 SubNode 下面
console.log('场景 4: PTLNG (L1) → SubNode (L3) 下面');
const result4 = validateMove(node1, '3', 4, nodes);
console.log('结果:', result4);
console.log('原因: SubNode 是 PTLNG 的后代（孙子节点）\n');

// 场景 5: 把 Other 拖到 PTLNG 下面
console.log('场景 5: Other (L1) → PTLNG (L1) 下面');
const node4 = nodes.find(n => n.id === '4');
const result5 = validateMove(node4, '1', 2, nodes);
console.log('结果:', result5);
console.log('说明: 这是有效的移动\n');

console.log('=== 总结 ===');
console.log('✅ 可以拖拽: 同级节点之间、向上移动、移到无关节点');
console.log('❌ 不能拖拽: 父节点到子节点、节点到自己、超过层级限制');
