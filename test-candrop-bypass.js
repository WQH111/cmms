// 快速测试：临时移除所有验证
// 在 TreeView.tsx 中使用这个版本的 canDrop 来测试

// 替换第 150-181 行的 canDrop 函数为：

const canDrop = ({ dragIds, parentId }: { dragIds: string[]; parentId: string | null }) => {
  const dragId = dragIds[0];
  const dragNode = nodes.find(n => n.id === dragId);

  console.log('🔍 canDrop called:', {
    dragId,
    dragNode: dragNode ? `${dragNode.name} (L${dragNode.level})` : 'NOT FOUND',
    parentId,
    targetNode: parentId ? nodes.find(n => n.id === parentId)?.name : 'Root'
  });

  if (!dragNode) {
    console.log('❌ Node not found');
    return false;
  }

  // 临时：允许所有拖拽（用于测试）
  console.log('✅ Allowing drag (validation bypassed for testing)');
  return true;
};

// 如果这样还是不能拖拽，说明问题不在验证逻辑
// 而是在拖拽本身的配置或事件绑定上
