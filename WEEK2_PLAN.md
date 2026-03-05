# Week 2 开发计划

## 目标概述
完成拖拽、撤销/重做、批量操作和数据验证功能，为 Week 3 的 Excel 导入导出做准备。

## 开发任务清单

### 第 1 天：拖拽功能 🎯

#### 任务 1.1：基础拖拽实现
- [ ] 配置 react-arborist 拖拽选项
- [ ] 实现节点拖拽移动
- [ ] 更新 parentId 和层级
- [ ] 拖拽时的视觉反馈

#### 任务 1.2：拖拽验证
- [ ] 层级规则验证（不能拖到无效层级）
- [ ] 防止拖拽到自己的子节点
- [ ] 循环引用检测
- [ ] 拖拽失败提示

**预计时间**: 4-6 小时

---

### 第 2 天：Undo/Redo 功能 ⏮️⏭️

#### 任务 2.1：命令模式实现
- [ ] 创建 Command 接口
- [ ] 实现命令栈（undo/redo stack）
- [ ] 创建具体命令类
  - CreateNodeCommand
  - UpdateNodeCommand
  - DeleteNodeCommand
  - MoveNodeCommand

#### 任务 2.2：UI 集成
- [ ] 添加 Undo/Redo 按钮
- [ ] 快捷键支持（Ctrl+Z / Ctrl+Y）
- [ ] 显示可撤销操作数量
- [ ] 操作历史列表（可选）

**预计时间**: 4-6 小时

---

### 第 3 天：批量操作 📦

#### 任务 3.1：多选功能
- [ ] 实现节点多选（Ctrl+Click）
- [ ] 全选/取消全选
- [ ] 选中状态显示
- [ ] 选中节点计数

#### 任务 3.2：批量操作
- [ ] 批量删除
- [ ] 批量移动
- [ ] 批量导出
- [ ] 操作确认对话框

**预计时间**: 3-4 小时

---

### 第 4 天：数据验证 ✅

#### 任务 4.1：验证规则
- [ ] 层级范围验证（1-16）
- [ ] 代码唯一性检查
- [ ] 必填字段验证
- [ ] 特殊字符处理

#### 任务 4.2：验证 UI
- [ ] 实时验证反馈
- [ ] 错误提示样式
- [ ] 验证错误列表
- [ ] 批量验证报告

**预计时间**: 3-4 小时

---

### 第 5 天：性能优化 ⚡

#### 任务 5.1：大数据测试
- [ ] 生成 10,000 节点测试数据
- [ ] 生成 50,000 节点测试数据
- [ ] 性能基准测试
- [ ] 识别性能瓶颈

#### 任务 5.2：优化实现
- [ ] 优化树渲染性能
- [ ] 优化搜索算法
- [ ] 数据库查询优化
- [ ] 内存使用优化

**预计时间**: 4-5 小时

---

## 技术实现细节

### 1. 拖拽功能架构

```typescript
// src/hooks/useDragDrop.ts
interface DragDropConfig {
  onMove: (nodeId: string, newParentId: string | null) => Promise<void>;
  canDrop: (nodeId: string, targetId: string) => boolean;
  onDragStart: (nodeId: string) => void;
  onDragEnd: () => void;
}
```

### 2. 命令模式架构

```typescript
// src/commands/Command.ts
interface Command {
  execute(): Promise<void>;
  undo(): Promise<void>;
  description: string;
}

// src/commands/CommandManager.ts
class CommandManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];

  async execute(command: Command): Promise<void>;
  async undo(): Promise<void>;
  async redo(): Promise<void>;
}
```

### 3. 批量操作架构

```typescript
// src/services/batchService.ts
interface BatchOperation {
  type: 'delete' | 'move' | 'export';
  nodeIds: string[];
  targetId?: string;
}

async function executeBatch(operation: BatchOperation): Promise<void>;
```

### 4. 验证规则架构

```typescript
// src/validators/nodeValidator.ts
interface ValidationRule {
  validate(node: TreeNode): ValidationResult;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}
```

---

## 测试计划

### 单元测试
- [ ] 命令模式测试
- [ ] 验证规则测试
- [ ] 批量操作测试
- [ ] 拖拽逻辑测试

### 集成测试
- [ ] 拖拽 + Undo 测试
- [ ] 批量操作 + 验证测试
- [ ] 数据库事务测试

### 性能测试
- [ ] 10,000 节点加载时间
- [ ] 50,000 节点加载时间
- [ ] 搜索响应时间
- [ ] 拖拽响应时间

---

## 交付物

### 代码
- [ ] 拖拽功能完整实现
- [ ] Undo/Redo 系统
- [ ] 批量操作功能
- [ ] 数据验证系统
- [ ] 性能优化代码

### 文档
- [ ] 功能使用说明
- [ ] API 文档
- [ ] 性能测试报告
- [ ] Week 2 开发总结

### 测试
- [ ] 单元测试覆盖率 > 70%
- [ ] 所有功能测试通过
- [ ] 性能基准达标

---

## 风险和挑战

### 技术风险
1. **拖拽性能**: 大量节点时拖拽可能卡顿
   - 缓解：使用虚拟化，限制拖拽范围

2. **Undo/Redo 内存**: 命令栈可能占用大量内存
   - 缓解：限制栈大小，压缩历史记录

3. **批量操作事务**: 大批量操作可能失败
   - 缓解：分批处理，添加进度条

### 时间风险
1. **功能复杂度**: 某些功能可能比预期复杂
   - 缓解：优先实现核心功能，次要功能可延后

2. **测试时间**: 充分测试需要时间
   - 缓解：并行开发和测试

---

## 成功标准

### 功能完整性
- ✅ 所有计划功能实现
- ✅ 功能正常工作无重大 bug
- ✅ 用户体验流畅

### 性能指标
- ✅ 10,000 节点加载 < 2 秒
- ✅ 搜索响应 < 500ms
- ✅ 拖拽响应 < 100ms
- ✅ Undo/Redo 响应 < 200ms

### 代码质量
- ✅ TypeScript 无错误
- ✅ 代码格式统一
- ✅ 关键功能有测试
- ✅ 代码可维护性好

---

## 每日站会检查点

### 每日回顾
- 今天完成了什么？
- 遇到了什么问题？
- 明天计划做什么？
- 需要什么帮助？

### 每日目标
- 至少完成 1 个主要任务
- 提交代码到版本控制
- 更新任务进度
- 记录遇到的问题

---

## Week 2 结束时的状态

### 应该完成
- ✅ 拖拽功能完整可用
- ✅ Undo/Redo 系统工作正常
- ✅ 批量操作功能实现
- ✅ 数据验证系统完善
- ✅ 性能优化完成

### 为 Week 3 准备
- ✅ 代码结构清晰
- ✅ 测试覆盖充分
- ✅ 文档完整
- ✅ 性能达标

---

**开始日期**: 2026-03-04
**结束日期**: 2026-03-08
**总预计时间**: 18-25 小时
**状态**: 准备开始
