# 拖拽功能测试步骤

## 🔍 诊断步骤

### 1. 重启应用并打开控制台

```bash
cd "e:\Cherry-Studio\demo10\cmms-staging-app"
npm run tauri dev
```

然后按 `F12` 打开开发者工具，切换到 Console 标签。

### 2. 测试拖拽手柄点击

1. 找到任意节点前面的 `⋮⋮` 符号
2. 点击它
3. **查看控制台**，应该看到：
   ```
   🖱️ Drag handle clicked: [节点名称]
   ```

**如果看不到这个日志**：
- 说明拖拽手柄没有响应
- 可能是 CSS 问题或者元素被遮挡

### 3. 测试拖拽开始

1. 按住 `⋮⋮` 符号
2. 开始拖动
3. **查看控制台**，应该看到：
   ```
   🚀 Drag started: {...}
   ```

**如果看不到这个日志**：
- 说明拖拽没有被触发
- 可能是 react-arborist 配置问题

### 4. 测试拖拽验证

1. 继续拖动节点到另一个节点上
2. **查看控制台**，应该看到：
   ```
   🔍 canDrop check: {
     dragNode: "...",
     targetParent: "...",
     newLevel: X,
     valid: true/false,
     reason: "..."
   }
   ```

**如果 valid: false**：
- 查看 `reason` 字段了解原因
- 参考下面的"有效拖拽场景"

### 5. 测试拖拽完成

1. 松开鼠标
2. **查看控制台**，应该看到：
   ```
   🏁 Drag ended: {...}
   ✅ Valid move: {...}
   ```

## ✅ 有效的拖拽场景

### 场景 1: 同级节点重新排序
```
L1 - Node A
L1 - Node B
```
✅ 可以把 Node A 拖到 Node B 的位置

### 场景 2: 移动到其他分支
```
L1 - Branch A
  └─ L2 - Node X
L1 - Branch B
  └─ L2 - Node Y
```
✅ 可以把 Node X 拖到 Branch B 下面

### 场景 3: 提升层级
```
L1 - Parent
  └─ L2 - Child
      └─ L3 - GrandChild
```
✅ 可以把 GrandChild 拖到空白区域（变成 L1）
✅ 可以把 GrandChild 拖到 Parent 下面（变成 L2）

## ❌ 无效的拖拽场景

### 场景 1: 父节点到子节点
```
L1 - Parent
  └─ L2 - Child
```
❌ 不能把 Parent 拖到 Child 下面
**原因**: 会造成循环引用

### 场景 2: 超过层级限制
```
L15 - Node A
  └─ L16 - Node B
```
❌ 不能把 Node A 拖到 L2 下面（Node B 会变成 L17）
**原因**: 超过 16 层限制

## 🐛 常见问题排查

### 问题 1: 点击拖拽手柄没反应

**可能原因**:
1. 拖拽手柄被其他元素遮挡
2. CSS 样式问题
3. 事件被阻止

**解决方法**:
```css
/* 检查 TreeView.css 中的 .drag-handle */
.drag-handle {
  cursor: grab;
  pointer-events: auto; /* 确保可以接收事件 */
  z-index: 10; /* 确保在最上层 */
}
```

### 问题 2: 拖拽开始但立即停止

**可能原因**:
1. `disableDrag` 或 `disableDrop` 被设置为 true
2. `canDrop` 函数总是返回 false

**解决方法**:
检查 TreeView.tsx 第 312-313 行：
```typescript
disableDrag={false}  // 应该是 false
disableDrop={false}  // 应该是 false
```

### 问题 3: 所有拖拽都显示禁用标志

**可能原因**:
1. 验证规则太严格
2. 数据结构有问题

**临时解决方法**（仅用于测试）:
```typescript
// TreeView.tsx 第 150 行
const canDrop = () => {
  console.log('⚠️ Validation bypassed for testing');
  return true; // 临时允许所有拖拽
};
```

⚠️ **警告**: 这会允许无效的拖拽，可能导致数据问题！仅用于测试。

### 问题 4: 拖拽后数据没更新

**可能原因**:
1. 数据库更新失败
2. 状态管理问题

**检查方法**:
查看控制台是否有错误信息，特别是：
- SQLite 错误
- "Node not found" 错误
- 网络错误

## 📊 完整的日志流程

正常的拖拽应该产生以下日志：

```
1. 🖱️ Drag handle clicked: Node A
2. 🚀 Drag started: {...}
3. 🔍 canDrop check: { valid: true, ... }
4. 🏁 Drag ended: {...}
5. 💾 Saved open state: X nodes
6. ✅ Valid move: { node: "Node A", from: "Level 2", to: "Level 3", ... }
7. 🔄 Restore result: { restored: X, skipped: Y, failed: 0 }
```

如果缺少任何一步，说明在那个环节出了问题。

## 🆘 如果还是不行

请提供以下信息：

1. **控制台完整日志**（截图或复制文本）
2. **你的操作步骤**：
   - 点击了哪个节点的拖拽手柄？
   - 想拖到哪里？
3. **节点信息**：
   - 源节点的名称和层级
   - 目标节点的名称和层级
   - 它们的父子关系

这样我可以更准确地诊断问题。
