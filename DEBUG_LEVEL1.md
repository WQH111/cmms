# 查看 Level 1 数据

## 方法 1: 在浏览器 Console 中查询

打开浏览器开发者工具 (F12)，在 Console 中运行：

```javascript
// 导入数据库服务
import { getDatabase } from './services/database';

// 查询 Level 1 的所有节点
const db = getDatabase();
const level1Nodes = await db.select('SELECT * FROM tree_nodes WHERE level = 1');
console.table(level1Nodes);
```

## 方法 2: 添加临时调试代码

在 `src/services/excelService.ts` 的 `importExcelFile` 函数中添加：

```typescript
// 在去重后添加
console.log('🔍 Level 1 nodes:');
const level1 = uniqueNodes.filter(n => n.level === 1);
level1.forEach(node => {
  console.log(`  - ${node.name} (${node.code})`);
});
```

## 方法 3: 查看原始 Excel 数据

打开你的 Excel 文件，查看 `Level 1 (Company)` 和 `Level 1 (code)` 列：

1. 选中 `Level 1 (Company)` 列
2. 使用 Excel 的"删除重复项"功能
3. 或者使用数据透视表查看唯一值

## 预期结果

如果你的 Excel 文件是标准的 CMMS 数据：
- Level 1 应该只有 1-2 个节点（公司名称）
- 例如：PTLNG, FLNG 等

如果 Level 1 有 5 个不同的节点，可能是：
1. 数据包含多个公司
2. Level 1 (code) 字段有不同的值
3. Excel 数据格式不统一（有空格、大小写差异等）

## 检查数据一致性

在 Console 中运行导入后，查看日志：

```
📊 Node distribution by level:
   Level 1: 5 nodes    <- 这里显示 Level 1 有几个节点
   Level 2: 10 nodes
   Level 3: 20 nodes
   ...
```

如果 Level 1 确实有 5 个节点，说明你的 Excel 数据中有 5 个不同的顶级实体。
