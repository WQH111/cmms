# 快速开始指南

## 功能开发进度

### ✅ 已完成
1. **项目脚手架** - Tauri v2 + React + TypeScript
2. **SQLite 数据库** - 完整的数据库配置和表结构
3. **数据模型** - TreeNode 接口和双字段结构
4. **状态管理** - Zustand store
5. **树形展示** - react-arborist 虚拟化渲染
6. **工具栏** - 搜索和筛选功能
7. **节点 CRUD UI** - 新增/编辑/删除对话框
8. **节点操作面板** - 选中节点信息展示
9. **测试数据生成** - 自动生成测试数据脚本

### 🚧 待实现
- 拖拽移动节点
- Undo/Redo 功能
- Excel 导入/导出
- 打印/PDF 导出
- 性能优化

## 运行应用

### 1. 安装依赖
```bash
cd cmms-staging-app
npm install
```

### 2. 生成测试数据（可选）
```bash
node scripts/seedData.js > test_data.sql
```
这会生成 SQL 插入语句，可以在应用运行后手动插入。

### 3. 启动开发服务器
```bash
npm run tauri dev
```

首次运行会自动创建 SQLite 数据库。

## 使用指南

### 创建节点
1. 点击 "Create Node" 按钮
2. 填写节点信息（Name 和 Code 必填）
3. 如果选中了父节点，新节点会作为其子节点创建
4. 点击 "Create" 保存

### 编辑节点
1. 在树中选择一个节点
2. 点击 "Edit Node" 按钮
3. 修改节点信息
4. 点击 "Save" 保存

### 删除节点
1. 在树中选择一个节点
2. 点击 "Delete Node" 按钮
3. 确认删除操作

### 搜索节点
1. 在工具栏搜索框输入关键词
2. 按 Enter 或点击 "Search" 按钮
3. 搜索会匹配节点的 Name、Code 和 Description

### 筛选层级
1. 在工具栏选择 "Filter by Level" 下拉框
2. 选择要查看的层级（1-16）
3. 选择 "All Levels" 显示所有节点

## 项目结构

```
cmms-staging-app/
├── src/
│   ├── components/
│   │   ├── TreeView.tsx          # 树形展示组件
│   │   ├── Toolbar.tsx           # 工具栏
│   │   ├── NodePanel.tsx         # 节点操作面板
│   │   └── NodeDialog.tsx        # 节点编辑对话框
│   ├── services/
│   │   ├── database.ts           # 数据库初始化
│   │   └── treeService.ts        # CRUD 操作
│   ├── store/
│   │   └── treeStore.ts          # 状态管理
│   ├── types/
│   │   └── TreeNode.ts           # 类型定义
│   └── App.tsx
├── scripts/
│   └── seedData.js               # 测试数据生成
└── src-tauri/
    └── src/lib.rs                # Tauri 配置
```

## 数据库位置

SQLite 数据库文件会自动创建在：
- **Windows**: `%AppData%/com.cmms-staging-app.dev/cmms.db`
- **macOS**: `~/Library/Application Support/com.cmms-staging-app.dev/cmms.db`

## 开发技巧

### 查看数据库
使用 SQLite 客户端工具（如 DB Browser for SQLite）打开数据库文件查看数据。

### 重置数据库
删除数据库文件，重启应用会自动创建新的空数据库。

### 调试
- 打开浏览器开发者工具：右键 → Inspect Element
- 查看 Console 日志
- 使用 React DevTools 查看组件状态

## 下一步开发

### Week 1 剩余任务
- [ ] 实现拖拽移动功能
- [ ] 添加层级验证规则
- [ ] 优化 UI 响应速度

### Week 2 计划
- [ ] Undo/Redo 命令栈
- [ ] 批量操作功能
- [ ] 节点复制/粘贴

### Week 3 计划
- [ ] Excel 导入功能
- [ ] Excel 导出功能
- [ ] 数据验证

### Week 4 计划
- [ ] 打印功能
- [ ] PDF 导出
- [ ] 性能优化
- [ ] 打包发布

## 常见问题

### Q: 应用启动失败？
A: 确保已安装所有依赖：`npm install`

### Q: 数据库错误？
A: 删除数据库文件重新创建，或检查 SQLite 插件是否正确安装

### Q: 树形结构不显示？
A: 检查数据库中是否有数据，使用测试数据生成脚本添加数据

### Q: 搜索不工作？
A: 确保输入了搜索关键词，搜索会匹配 Name、Code 和 Description 字段

## 技术支持

遇到问题请查看：
1. 浏览器控制台错误信息
2. Tauri 后端日志
3. 数据库文件是否存在
4. 网络连接（虽然是离线应用，但开发时需要）

---

**当前版本**: v0.1.0
**最后更新**: 2026-03-03
