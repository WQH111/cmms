# 拖拽功能调试指南

## 🐛 问题：拖拽时出现禁用标志

### 已修复的问题

1. ✅ **层级限制已修正**: 从 10 层改为 16 层
2. ✅ **添加了详细的调试日志**: 现在会在控制台显示拖拽验证信息

### 如何调试

#### 1. 打开开发者工具
在 Tauri 应用中按 `F12` 或 `Ctrl+Shift+I` 打开开发者工具

#### 2. 查看控制台日志
尝试拖拽节点时，会看到类似这样的日志：

```
🔍 canDrop check: {
  dragNode: "PTLNG (L1)",
  targetParent: "FLNG",
  newLevel: 3,
  valid: false,
  reason: "Cannot move a node to its own descendant (would create a cycle)"
}
```

### 常见拖拽失败原因

#### ❌ 原因 1: 循环引用
**错误信息**: "Cannot move a node to its own descendant (would create a cycle)"

**说明**: 不能把父节点拖到它的子节点下面

**示例**:
```
L1 - PTLNG (父)
  └─ L2 - FLNG (子)
```
❌ 不能把 PTLNG 拖到 FLNG 下面（会造成循环）

#### ❌ 原因 2: 拖到自己
**错误信息**: "Cannot move a node to itself"

**说明**: 不能把节点拖到自己身上

#### ❌ 原因 3: 层级超限
**错误信息**: "Maximum level is 16, target level would be 17"

**说明**: 拖拽后的层级会超过 16 层限制

#### ❌ 原因 4: 子节点会超限
**错误信息**: "Moving this node would cause its children to exceed level 16"

**说明**: 这个节点有很深的子树，移动后子节点会超过 16 层

**示例**:
```
L10 - Node A
  └─ L11 - Node B
      └─ L12 - Node C
```
如果把 Node A 拖到 L6 下面，Node C 会变成 L8，但如果拖到 L14 下面，Node C 会变成 L17（超限）

#### ❌ 原因 5: 位置没变化
**错误信息**: "Node is already at this location"

**说明**: 拖拽到了原来的位置

### 有效的拖拽操作

#### ✅ 同级移动
```
L1 - Node A
L1 - Node B
```
可以把 Node A 拖到 Node B 的位置（重新排序）

#### ✅ 向下移动（不造成循环）
```
L1 - Node A
L1 - Node B
  └─ L2 - Node C
```
可以把 Node A 拖到 Node C 下面（变成 L3）

#### ✅ 向上移动
```
L1 - Node A
  └─ L2 - Node B
      └─ L3 - Node C
```
可以把 Node C 拖到 Node A 下面（从 L3 变成 L2）

#### ✅ 移到根节点
可以把任何节点拖到空白区域，变成 L1 根节点

### 测试步骤

1. **重启应用**
   ```bash
   cd cmms-staging-app
   npm run tauri dev
   ```

2. **打开开发者工具** (F12)

3. **切换到 Console 标签**

4. **尝试拖拽节点**

5. **查看日志输出**
   - 如果 `valid: true` - 应该可以拖拽
   - 如果 `valid: false` - 查看 `reason` 了解原因

### 如果还是不能拖拽

请提供以下信息：

1. **控制台日志截图**
2. **你想拖拽的节点**:
   - 源节点名称和层级
   - 目标节点名称和层级
3. **节点的父子关系**

### 可能的其他问题

#### 问题: 拖拽手柄不响应
**检查**: 确保鼠标点击的是 `⋮⋮` 拖拽手柄，而不是节点的其他部分

#### 问题: 拖拽后数据没更新
**检查**: 查看控制台是否有数据库错误

#### 问题: 拖拽后树结构错乱
**检查**: 可能是数据库中的 parent_id 或 level 字段不一致

### 紧急修复

如果拖拽功能完全不工作，可以临时禁用验证：

```typescript
// TreeView.tsx 第 150 行
const canDrop = () => {
  return true; // 临时允许所有拖拽
};
```

⚠️ 注意：这会允许无效的拖拽操作，可能导致数据问题！

### 联系支持

如果问题持续存在，请提供：
1. 完整的控制台日志
2. 数据库内容（可以导出为 Excel）
3. 具体的操作步骤
