# 树形视图展开状态保持问题修复

## 问题描述

当修改节点后，其他之前收缩的节点会变成展开状态，导致用户的视图状态丢失。

## 根本原因

### 1. `openByDefault={true}` 导致默认全部展开

```typescript
<Tree
  openByDefault={true}  // ❌ 每次数据更新都会默认展开所有节点
  ...
/>
```

**问题**：
- 当数据重新加载时，所有节点默认展开
- 即使有恢复状态的逻辑，也会先展开再恢复，造成闪烁

### 2. 只保存可见节点的状态

```typescript
// ❌ 之前的代码
treeRef.current.visibleNodes?.forEach((node: any) => {
  currentOpenState[node.id] = node.isOpen;
});
```

**问题**：
- `visibleNodes` 只包含当前可见的节点
- 收缩的父节点下的子节点不在 `visibleNodes` 中
- 导致这些节点的状态丢失

### 3. 时序问题

```typescript
// 数据变化 → 保存状态 → 重新渲染 → 恢复状态
```

**问题**：
- 保存和恢复之间有时间差
- 在这期间，树已经用默认状态渲染了

## 解决方案

### 修改 1: 改为默认不展开

**文件**: `src/components/TreeView.tsx`

```typescript
<Tree
  openByDefault={false}  // ✅ 默认不展开，由恢复逻辑控制
  ...
/>
```

**效果**：
- 新加载的树默认收缩
- 完全由状态恢复逻辑控制展开状态

### 修改 2: 递归收集所有节点状态

```typescript
// ✅ 新的代码
const collectState = (node: any) => {
  if (node && node.id) {
    currentOpenState[node.id] = node.isOpen || false;
  }
  if (node && node.children) {
    node.children.forEach((child: any) => collectState(child));
  }
};

// 从根节点开始递归收集
if (treeRef.current.root && treeRef.current.root.children) {
  treeRef.current.root.children.forEach((node: any) => collectState(node));
}
```

**效果**：
- 收集所有节点的状态，包括不可见的
- 完整保存整棵树的展开/收缩状态

### 修改 3: 移除 `initialOpenState`

```typescript
// ❌ 之前
<Tree
  initialOpenState={openState}  // 只在初始化时生效
  ...
/>

// ✅ 现在
<Tree
  // 不使用 initialOpenState，完全由 useEffect 控制
  ...
/>
```

**原因**：
- `initialOpenState` 只在组件首次挂载时生效
- 后续数据变化不会使用这个属性
- 改用 `useEffect` 在每次数据变化后恢复状态

## 工作流程

### 修改节点时的流程

```
1. 用户修改节点
   ↓
2. updateNodeData() 调用
   ↓
3. 数据变化触发 useEffect
   ↓
4. saveOpenState() 保存当前所有节点的展开状态
   ↓
5. loadNodes() 重新加载数据
   ↓
6. nodes 状态更新
   ↓
7. treeData 重新计算（buildTree）
   ↓
8. Tree 组件重新渲染（默认全部收缩）
   ↓
9. useEffect 检测到 treeData 变化
   ↓
10. 延迟 100ms 后恢复展开状态
    ↓
11. 遍历 openState，调用 node.open() 或 node.close()
    ↓
12. 树恢复到修改前的展开状态
```

## 关键代码变更

### 变更 1: 保存状态函数

```typescript
// 之前：只保存可见节点
treeRef.current.visibleNodes?.forEach((node: any) => {
  currentOpenState[node.id] = node.isOpen;
});

// 现在：递归保存所有节点
const collectState = (node: any) => {
  if (node && node.id) {
    currentOpenState[node.id] = node.isOpen || false;
  }
  if (node && node.children) {
    node.children.forEach((child: any) => collectState(child));
  }
};
```

### 变更 2: Tree 组件配置

```typescript
// 之前
<Tree
  openByDefault={true}
  initialOpenState={openState}
  ...
/>

// 现在
<Tree
  openByDefault={false}
  ...
/>
```

### 变更 3: 恢复状态逻辑

```typescript
// 添加依赖：openState
useEffect(() => {
  if (treeRef.current && Object.keys(openState).length > 0 && treeData.length > 0) {
    const timer = setTimeout(() => {
      // 恢复逻辑
    }, 100);
    return () => clearTimeout(timer);
  }
}, [treeData, openState]); // ✅ 添加 openState 依赖
```

## 测试步骤

### 1. 展开一些节点

```
Level 1: Company
  ├─ Level 2: Vessel A (展开)
  │   ├─ Level 3: System 1 (展开)
  │   │   └─ Level 4: Component A
  │   └─ Level 3: System 2 (收缩)
  └─ Level 2: Vessel B (收缩)
```

### 2. 修改一个节点

- 选择 "Component A"
- 修改名称或代码
- 保存

### 3. 验证状态保持

**预期结果**：
- Vessel A 仍然展开
- System 1 仍然展开
- System 2 仍然收缩
- Vessel B 仍然收缩

**控制台日志**：
```
💾 Saved open state: 150 nodes
🔄 Restored open state: 3 nodes, 0 failed
```

## 可能的问题

### 问题 1: 状态恢复有延迟

**现象**：修改后，树先全部收缩，然后再展开

**原因**：100ms 的延迟

**解决**：可以减少延迟，但太短可能导致恢复失败
```typescript
setTimeout(() => {
  // 恢复逻辑
}, 50); // 减少到 50ms
```

### 问题 2: 某些节点状态丢失

**现象**：部分节点的展开状态没有恢复

**原因**：节点 ID 可能变化了

**检查**：
```typescript
console.log('Saved state:', openState);
console.log('Current nodes:', treeData);
```

### 问题 3: 性能问题

**现象**：大量节点时恢复很慢

**优化**：
```typescript
// 批量操作
const nodesToOpen = [];
const nodesToClose = [];

Object.entries(openState).forEach(([nodeId, isOpen]) => {
  const node = treeRef.current.get(nodeId);
  if (node) {
    if (isOpen && !node.isOpen) nodesToOpen.push(node);
    else if (!isOpen && node.isOpen) nodesToClose.push(node);
  }
});

// 批量执行
nodesToOpen.forEach(node => node.open());
nodesToClose.forEach(node => node.close());
```

## 总结

**核心改进**：
1. ✅ 默认不展开（`openByDefault={false}`）
2. ✅ 递归保存所有节点状态
3. ✅ 移除 `initialOpenState`，使用 `useEffect` 控制
4. ✅ 添加 `openState` 到依赖数组

**效果**：
- 修改节点后，树的展开状态完全保持
- 用户体验更好，不会丢失视图状态
- 代码更可靠，覆盖所有节点

---

**修复日期**: 2026-03-03
**状态**: ✅ 已修复
**测试**: 需要用户验证
