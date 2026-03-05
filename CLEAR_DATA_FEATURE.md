# 清空数据库功能

## 功能说明

新增了一个"Clear All Data"按钮，用于清空数据库中的所有节点数据。

## 位置

工具栏右侧，"Import Excel"按钮旁边

## 使用方法

1. 点击 **🗑️ Clear All Data** 按钮
2. 系统会弹出确认对话框：
   ```
   ⚠️ Warning: This will delete ALL data from the database!

   Are you sure you want to continue?
   ```
3. 点击"确定"执行清空操作
4. 清空完成后会显示成功消息：
   ```
   ✅ Successfully cleared 352 nodes from database
   ```

## 功能特性

### 安全确认
- 双重确认机制，防止误操作
- 清晰的警告提示

### 状态反馈
- 按钮显示当前状态（Clearing...）
- 操作期间按钮禁用
- 完成后显示清空的节点数量

### 自动刷新
- 清空后自动刷新树形视图
- 显示空白状态

## 使用场景

### 1. 测试导入功能
```
清空数据 → 导入 Excel → 验证结果 → 清空数据 → 重新导入
```

### 2. 重置数据库
当数据混乱或需要从头开始时

### 3. 开发调试
快速清理测试数据

## 技术实现

### 数据库操作
```typescript
// src/services/database.ts
export async function clearAllData(): Promise<number> {
  const database = getDatabase();

  // 获取删除前的数量
  const result = await database.select<Array<{ count: number }>>(
    'SELECT COUNT(*) as count FROM tree_nodes'
  );
  const count = result[0]?.count || 0;

  // 删除所有节点
  await database.execute('DELETE FROM tree_nodes');

  return count;
}
```

### UI 组件
```typescript
// src/components/Toolbar.tsx
const handleClearData = async () => {
  const confirmed = window.confirm(
    '⚠️ Warning: This will delete ALL data from the database!\n\n' +
    'Are you sure you want to continue?'
  );

  if (!confirmed) return;

  setClearing(true);
  try {
    const count = await clearAllData();
    alert(`✅ Successfully cleared ${count} nodes from database`);
    loadNodes(); // 刷新视图
  } catch (error) {
    alert(`❌ Failed to clear database: ${error}`);
  } finally {
    setClearing(false);
  }
};
```

## 样式

### 危险按钮样式
- 红色背景 (#f44336)
- 悬停效果：深红色 + 阴影
- 禁用状态：浅红色 + 半透明

```css
.btn-danger {
  background-color: #f44336;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #d32f2f;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(244, 67, 54, 0.4);
}
```

## 注意事项

### ⚠️ 数据不可恢复
- 清空操作会永久删除所有数据
- 建议在清空前先导出备份

### 💡 备份建议
如果需要保留数据：
1. 使用导入功能时会自动创建备份
2. 可以手动复制数据库文件 `cmms.db`

### 🔒 权限控制
当前版本没有权限控制，所有用户都可以清空数据。
如果需要限制，可以添加：
- 密码确认
- 管理员权限检查
- 操作日志记录

## 未来改进

### 1. 选择性清空
- 按层级清空（只清空 Level 5）
- 按日期清空（清空最近导入的）
- 按标记清空（只清空 isNew 的节点）

### 2. 软删除
- 标记为已删除而不是物理删除
- 可以恢复已删除的数据

### 3. 批量操作
- 清空 + 导入一键完成
- 清空 + 恢复备份

### 4. 操作日志
- 记录谁在什么时候清空了数据
- 显示清空历史

## 测试建议

### 功能测试
- [ ] 点击按钮显示确认对话框
- [ ] 取消操作不清空数据
- [ ] 确认操作成功清空数据
- [ ] 清空后树形视图为空
- [ ] 显示正确的清空数量

### UI 测试
- [ ] 按钮样式正确（红色）
- [ ] 悬停效果正常
- [ ] 禁用状态显示正确
- [ ] 加载状态显示"Clearing..."

### 错误处理
- [ ] 数据库错误时显示错误消息
- [ ] 操作失败后按钮恢复正常

## 相关文件

- `src/services/database.ts` - 清空数据库函数
- `src/components/Toolbar.tsx` - UI 组件和事件处理
- `src/components/Toolbar.css` - 按钮样式

---

**版本**: v0.1.0
**更新日期**: 2026-03-03
**状态**: ✅ 已完成
