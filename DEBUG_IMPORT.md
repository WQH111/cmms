# Excel 导入调试指南

## 问题诊断

如果导入 Excel 时卡住，请按以下步骤排查：

### 1. 打开浏览器开发者工具

**快捷键**: `F12` 或 `Ctrl+Shift+I`

查看 **Console** 标签页，应该能看到详细的日志输出：

```
🎬 Starting import process...
💾 Creating backup...
📦 Backup ID: xxx-xxx-xxx
🔧 Creating backup table...
🔢 Counting nodes...
📊 Current node count: 0
📸 Creating snapshot table: backup_nodes_xxx
📝 Recording backup info...
✅ Backup created successfully
📥 Starting Excel import...
🚀 Starting import workflow for: your-file.xlsx
📦 Initializing database...
📖 Reading Excel file...
📄 File loaded, parsing...
📊 Workbook parsed, sheets: ['Sheet1']
✅ Excel parsed successfully, rows: 352
...
```

### 2. 常见卡住原因

#### 原因 1: Excel 文件格式问题
- **症状**: 卡在 "📖 Reading Excel file..." 或 "📄 File loaded, parsing..."
- **解决**:
  - 确保文件是 `.xlsx` 格式（不是 `.xls` 或 `.csv`）
  - 尝试用 Excel 重新保存文件
  - 检查文件是否损坏

#### 原因 2: 数据库未初始化
- **症状**: 卡在 "📦 Initializing database..."
- **解决**:
  - 检查 Tauri 是否正常运行
  - 查看是否有数据库权限问题
  - 尝试重启应用

#### 原因 3: 备份创建失败
- **症状**: 卡在 "💾 Creating backup..." 或 "📸 Creating snapshot table"
- **解决**:
  - 检查磁盘空间是否充足
  - 查看数据库文件是否被锁定
  - 尝试清理旧的备份表

#### 原因 4: 重复检测卡住
- **症状**: 卡在 "🔍 Checking for duplicates in database..."
- **解决**:
  - 如果数据库中已有大量数据，这一步可能较慢
  - 可以临时禁用重复检测（见下方代码修改）

### 3. 临时禁用重复检测（加速导入）

如果重复检测太慢，可以临时注释掉：

**文件**: `src/services/excelService.ts`

```typescript
// 5. Detect duplicates in database
console.log('🔍 Checking for duplicates in database...');
// const duplicateErrors = await detectDuplicates(uniqueNodes);
const duplicateErrors: ImportError[] = []; // 临时跳过重复检测
console.log('Found', duplicateErrors.length, 'duplicate warnings');
```

### 4. 检查 Excel 文件格式

确保 Excel 文件包含以下列（至少要有 Level 1）：

**必需列**:
- `Level 1 (Company)`
- `Level 1 (code)`

**可选列**:
- `Level 2 (Vessel)`, `Level 2 (code)`
- `Level 3 (System Category)`, `Level 3 (code)`
- `Level 4 (System)`, `Level 4 (code)`
- `Level 5 (Sub-system)`, `Level 5 (code)`
- ... 直到 Level 10

**示例数据**:

| Level 1 (Company) | Level 1 (code) | Level 2 (Vessel) | Level 2 (code) |
|-------------------|----------------|------------------|----------------|
| PTLNG             | PTLNG-001      | FLNG             | FL01           |
| PTLNG             | PTLNG-001      | FLNG             | FL01           |

### 5. 创建测试 Excel 文件

如果你的 Excel 文件太大，可以创建一个小的测试文件：

1. 打开 Excel
2. 创建以下列：
   - `Level 1 (Company)`
   - `Level 1 (code)`
   - `Level 2 (Vessel)`
   - `Level 2 (code)`
3. 添加 2-3 行测试数据
4. 保存为 `.xlsx` 格式
5. 尝试导入

### 6. 查看网络请求

在开发者工具的 **Network** 标签页中：
- 应该没有任何网络请求（因为是本地操作）
- 如果有卡住的请求，说明可能有配置问题

### 7. 查看错误信息

在 Console 中查找红色的错误信息：
- `❌` 开头的日志表示错误
- 记录完整的错误堆栈信息

### 8. 重启应用

如果以上都不行：

```bash
# 停止应用 (Ctrl+C)
# 清理缓存
cd cmms-staging-app
rm -rf node_modules/.vite

# 重新启动
npm run tauri dev
```

## 性能优化建议

### 大文件导入优化

如果 Excel 文件很大（>1000 行），可以：

1. **分批导入**: 将大文件拆分成多个小文件
2. **禁用重复检测**: 如上所述临时禁用
3. **增加超时时间**: 在 Tauri 配置中增加超时限制

### 数据库索引

确保数据库有正确的索引（已自动创建）：
- `idx_parent_id`
- `idx_level`
- `idx_code`

## 联系支持

如果问题仍未解决，请提供：
1. 浏览器 Console 的完整日志
2. Excel 文件的前几行数据（截图）
3. 应用版本和操作系统信息
