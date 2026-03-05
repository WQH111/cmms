// 最小化拖拽测试
// 如果 idAccessor 还是不行，尝试这个配置

// 在 TreeView.tsx 中，Tree 组件应该有这些属性：

<Tree
  ref={treeRef}
  data={treeData}
  idAccessor={(node) => node.id}  // ← 关键！告诉 react-arborist 如何获取 ID
  openByDefault={false}
  width="100%"
  height={containerHeight}
  indent={24}
  rowHeight={36}

  // 拖拽相关
  onMove={handleMove}              // ← 拖拽完成时调用
  canDrop={canDrop}                // ← 验证是否可以放置
  disableDrag={false}              // ← 必须是 false
  disableDrop={false}              // ← 必须是 false

  // 调试事件（可选）
  onDragStart={(args) => {
    console.warn('🚀 DRAG STARTED!', args);
  }}
  onDragEnd={(args) => {
    console.warn('🏁 DRAG ENDED!', args);
  }}
>
  {Node}
</Tree>

// 如果还是不工作，可能的原因：
// 1. DndProvider 没有正确包裹应用
// 2. HTML5Backend 没有正确导入
// 3. react-arborist 版本问题
// 4. 节点数据结构问题

// 检查清单：
// ✓ DndProvider 在 App.tsx 中
// ✓ HTML5Backend 已导入
// ✓ react-arborist@3.4.3
// ✓ dragHandle ref 绑定到节点容器
// ✓ idAccessor 已添加
// ? 节点数据是否有 id 字段？

// 下一步调试：
// 1. 检查 treeData 结构
// 2. 验证每个节点都有唯一的 id
// 3. 确认 buildTree 函数正确构建了树结构
