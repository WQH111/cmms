# GitHub Actions 快速开始检查清单

## ✅ 准备工作

### 1. 确认项目结构
- [ ] 项目在 `pog-cmms-staging-app` 目录下
- [ ] 有 `package.json` 文件
- [ ] 有 `src-tauri` 目录
- [ ] 本地可以成功运行 `npm run tauri build`

### 2. GitHub 仓库设置
- [ ] 已创建 GitHub 仓库
- [ ] 代码已推送到 GitHub
- [ ] 仓库是公开的（或有足够的 Actions 分钟数）

### 3. 配置文件
- [ ] `.github/workflows/build.yml` 已创建
- [ ] 配置文件已推送到 GitHub

---

## 🚀 首次使用流程

### Step 1: 推送配置文件
```bash
cd pog-cmms-staging-app
git add .github/workflows/build.yml
git commit -m "Add CI/CD workflow"
git push
```

### Step 2: 查看构建状态
1. 打开 GitHub 仓库
2. 点击 **"Actions"** 标签
3. 查看工作流运行状态

### Step 3: 等待构建完成
⏱️ 首次构建约需 10-15 分钟

### Step 4: 下载安装包
1. 点击完成的工作流
2. 滚动到底部 **"Artifacts"** 区域
3. 下载对应平台的安装包

---

## 📦 发布正式版本

### 创建版本标签
```bash
# 1. 确保所有改动已提交
git status
git add .
git commit -m "Prepare for v1.0.0 release"
git push

# 2. 创建版本标签
git tag v1.0.0

# 3. 推送标签（触发自动发布）
git push origin v1.0.0
```

### 查看 Release
1. 进入 GitHub 仓库
2. 点击 **"Releases"** 标签
3. 查看自动创建的 v1.0.0 版本
4. 下载所有平台的安装包

---

## 🔍 故障排查

### 构建失败？

**查看日志**：
```
Actions → 点击失败的工作流 → 点击红色的步骤 → 查看错误信息
```

**常见问题**：

| 错误信息 | 可能原因 | 解决方法 |
|---------|---------|---------|
| `npm ERR!` | 依赖安装失败 | 检查 `package.json` |
| `cargo build failed` | Rust 编译错误 | 检查 Rust 代码 |
| `Permission denied` | 权限问题 | 检查文件权限设置 |
| `Timeout` | 构建超时 | 优化构建配置 |

### 本地测试

在推送前本地测试：
```bash
# 测试前端构建
npm run build

# 测试 Tauri 构建
npm run tauri build
```

---

## 📊 构建时间参考

| 平台 | 首次构建 | 后续构建（有缓存） |
|------|---------|------------------|
| Windows | ~12 分钟 | ~6 分钟 |
| macOS | ~15 分钟 | ~8 分钟 |
| Linux | ~10 分钟 | ~5 分钟 |

**总计**：约 10-15 分钟可获得三个平台的安装包

---

## 💡 最佳实践

### 1. 何时触发构建？
- ✅ 推送到 main 分支（自动测试）
- ✅ 创建版本标签（正式发布）
- ✅ 手动触发（临时需要）

### 2. 版本号规范
```bash
v1.0.0  # 主版本.次版本.修订号
v1.0.1  # 修复 bug
v1.1.0  # 新功能
v2.0.0  # 重大更新
```

### 3. 节省构建时间
- 不要频繁推送到 main 分支
- 使用功能分支开发
- 只在需要发布时创建标签

### 4. 测试流程
```
本地开发 → 功能分支 → 测试 → 合并到 main → 创建标签 → 自动发布
```

---

## 🎯 下一步

- [ ] 阅读 [CICD_GUIDE.md](CICD_GUIDE.md) 了解详细原理
- [ ] 推送代码触发首次构建
- [ ] 下载并测试生成的安装包
- [ ] 创建版本标签发布正式版本

---

## 📞 需要帮助？

- 查看 [GitHub Actions 文档](https://docs.github.com/en/actions)
- 查看 [Tauri 文档](https://tauri.app/v1/guides/building/)
- 检查 Actions 日志中的错误信息
