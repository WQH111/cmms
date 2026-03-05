# GitHub Actions CI/CD 自动构建指南

## 📋 目录
1. [什么是 GitHub Actions](#什么是-github-actions)
2. [工作原理](#工作原理)
3. [使用步骤](#使用步骤)
4. [配置文件详解](#配置文件详解)
5. [如何获取构建产物](#如何获取构建产物)
6. [常见问题](#常见问题)

---

## 什么是 GitHub Actions

GitHub Actions 是 GitHub 提供的**免费** CI/CD 服务，可以：
- ✅ 自动在云端虚拟机上构建你的应用
- ✅ 同时在 Windows、macOS、Linux 三个平台上编译
- ✅ 无需自己准备三台不同系统的电脑
- ✅ 每次推送代码自动触发构建
- ✅ 自动发布到 GitHub Releases

**免费额度**（对于公开仓库）：
- ✅ 完全免费，无限制
- ✅ 私有仓库：每月 2000 分钟免费

---

## 工作原理

```
┌─────────────────────────────────────────────────────────────┐
│  你的操作：推送代码到 GitHub                                  │
│  git push origin main                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  GitHub Actions 自动触发                                      │
│  读取 .github/workflows/build.yml 配置文件                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┴───────────────────┐
        ↓                   ↓                   ↓
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Windows VM   │   │  macOS VM    │   │  Linux VM    │
│ (并行运行)    │   │  (并行运行)   │   │  (并行运行)   │
└──────────────┘   └──────────────┘   └──────────────┘
        ↓                   ↓                   ↓
   安装依赖            安装依赖            安装依赖
   编译 Rust          编译 Rust          编译 Rust
   构建前端            构建前端            构建前端
   打包应用            打包应用            打包应用
        ↓                   ↓                   ↓
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  .msi 文件   │   │  .dmg 文件   │   │  .deb 文件   │
│  .exe 文件   │   │  .app 文件   │   │ .AppImage    │
└──────────────┘   └──────────────┘   └──────────────┘
        └───────────────────┬───────────────────┘
                            ↓
            ┌───────────────────────────┐
            │  上传到 GitHub Artifacts  │
            │  或 GitHub Releases       │
            └───────────────────────────┘
```

---

## 使用步骤

### 第 1 步：确保项目在 GitHub 上

如果还没有推送到 GitHub：

```bash
cd pog-cmms-staging-app

# 初始化 git（如果还没有）
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit"

# 创建 GitHub 仓库后，关联远程仓库
git remote add origin https://github.com/你的用户名/pog-cmms-staging-app.git

# 推送
git push -u origin main
```

### 第 2 步：配置文件已创建

配置文件已经创建在：
```
.github/workflows/build.yml
```

### 第 3 步：推送配置文件到 GitHub

```bash
git add .github/workflows/build.yml
git commit -m "Add GitHub Actions workflow for multi-platform build"
git push
```

### 第 4 步：查看构建进度

1. 打开你的 GitHub 仓库页面
2. 点击顶部的 **"Actions"** 标签
3. 你会看到正在运行的工作流

![GitHub Actions 界面示例]
- 🟡 黄色圆圈 = 正在运行
- ✅ 绿色勾 = 构建成功
- ❌ 红色叉 = 构建失败

### 第 5 步：下载构建产物

**方法 1：从 Actions 页面下载**

1. 进入 **Actions** 标签
2. 点击最新的工作流运行
3. 滚动到底部，找到 **"Artifacts"** 区域
4. 下载：
   - `windows-installer` - Windows 安装包
   - `macos-installer` - macOS 安装包
   - `linux-installer` - Linux 安装包

**方法 2：自动发布到 Releases（推荐）**

如果你创建了版本标签：

```bash
# 创建版本标签
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions 会自动：
1. 构建三个平台的安装包
2. 创建一个 GitHub Release
3. 将所有安装包上传到 Release

然后你可以在 **Releases** 页面下载所有安装包。

---

## 配置文件详解

### 触发条件 (on)

```yaml
on:
  push:
    branches:
      - main        # 推送到 main 分支时触发
  push:
    tags:
      - 'v*'        # 创建 v 开头的标签时触发（如 v1.0.0）
  workflow_dispatch: # 允许手动触发
```

**手动触发**：
1. 进入 GitHub 仓库的 Actions 页面
2. 选择工作流
3. 点击 "Run workflow" 按钮

### 矩阵策略 (strategy.matrix)

```yaml
strategy:
  fail-fast: false  # 一个平台失败不影响其他平台继续构建
  matrix:
    platform:
      - windows-latest
      - macos-latest
      - ubuntu-22.04
```

这会创建 **3 个并行任务**，同时在三个平台上运行。

### 条件执行 (if)

```yaml
- name: Install Linux dependencies
  if: matrix.platform == 'ubuntu-22.04'  # 仅在 Linux 上运行
  run: |
    sudo apt-get install ...
```

### 缓存依赖

```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'npm'  # 缓存 node_modules，加速后续构建
```

第一次构建：~10-15 分钟
后续构建：~5-8 分钟（因为有缓存）

---

## 如何获取构建产物

### 方式 1：Artifacts（临时存储，90 天）

```
GitHub 仓库 → Actions → 选择工作流运行 → 底部 Artifacts
```

下载后解压即可获得安装包。

### 方式 2：Releases（永久存储，推荐）

**创建版本发布**：

```bash
# 1. 确保代码已提交
git add .
git commit -m "Release v1.0.0"
git push

# 2. 创建并推送标签
git tag v1.0.0
git push origin v1.0.0
```

**查看 Release**：
```
GitHub 仓库 → Releases → 最新版本
```

你会看到：
- ✅ `POG-cmms-staging-app_1.0.0_x64_en-US.msi` (Windows)
- ✅ `POG-cmms-staging-app_1.0.0_x64.dmg` (macOS)
- ✅ `POG-cmms-staging-app_1.0.0_amd64.deb` (Linux)
- ✅ `POG-cmms-staging-app_1.0.0_amd64.AppImage` (Linux)

---

## 常见问题

### Q1: 构建失败怎么办？

**查看日志**：
1. 进入 Actions 页面
2. 点击失败的工作流
3. 点击失败的步骤，查看详细错误信息

**常见错误**：

**错误 1：Rust 编译失败**
```
error: could not compile `tauri`
```
**解决**：检查 `Cargo.toml` 和 Rust 代码语法

**错误 2：前端构建失败**
```
npm ERR! code ELIFECYCLE
```
**解决**：本地运行 `npm run build` 检查错误

**错误 3：Linux 依赖缺失**
```
Package 'libwebkit2gtk-4.1-dev' has no installation candidate
```
**解决**：更新 workflow 中的依赖包名称

### Q2: 构建时间太长？

**优化方法**：
1. ✅ 使用缓存（已配置）
2. ✅ 减少不必要的依赖
3. ✅ 使用 `npm ci` 而不是 `npm install`

**典型构建时间**：
- 首次构建：10-15 分钟
- 后续构建：5-8 分钟

### Q3: 如何只构建特定平台？

修改 `build.yml`：

```yaml
# 只构建 Windows 和 macOS
matrix:
  platform:
    - windows-latest
    - macos-latest
    # - ubuntu-22.04  # 注释掉不需要的平台
```

### Q4: 私有仓库会收费吗？

**免费额度**：
- 公开仓库：✅ 完全免费
- 私有仓库：✅ 每月 2000 分钟免费

**计费方式**（私有仓库超出免费额度后）：
- Linux: $0.008/分钟
- Windows: $0.016/分钟
- macOS: $0.08/分钟

**建议**：
- 使用公开仓库（完全免费）
- 或者只在需要发布时才触发构建

### Q5: 如何添加代码签名？

**Windows 代码签名**：

```yaml
- name: Sign Windows app
  if: matrix.platform == 'windows-latest'
  run: |
    # 使用 signtool 签名
    signtool sign /f certificate.pfx /p ${{ secrets.CERT_PASSWORD }} *.msi
```

**macOS 代码签名**：

```yaml
- name: Sign macOS app
  if: matrix.platform == 'macos-latest'
  env:
    APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
    APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
  run: |
    # 导入证书并签名
    codesign --deep --force --verify --verbose --sign "Developer ID" *.app
```

需要在 GitHub 仓库设置中添加 Secrets。

### Q6: 如何测试 workflow 而不触发构建？

**方法 1：使用分支**
```bash
git checkout -b test-workflow
git push origin test-workflow
```

修改 workflow 只在 test-workflow 分支触发：
```yaml
on:
  push:
    branches:
      - test-workflow
```

**方法 2：使用 act（本地测试）**
```bash
# 安装 act
brew install act  # macOS
choco install act # Windows

# 本地运行 workflow
act -j build
```

---

## 进阶配置

### 添加构建通知

**Slack 通知**：
```yaml
- name: Notify Slack
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

**邮件通知**：
GitHub 默认会在构建失败时发送邮件。

### 添加测试步骤

```yaml
- name: Run tests
  working-directory: pog-cmms-staging-app
  run: npm test

- name: Run linter
  working-directory: pog-cmms-staging-app
  run: npm run lint
```

### 添加缓存 Rust 编译产物

```yaml
- name: Cache Rust
  uses: actions/cache@v3
  with:
    path: |
      ~/.cargo/registry
      ~/.cargo/git
      pog-cmms-staging-app/src-tauri/target
    key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}
```

---

## 总结

使用 GitHub Actions 的优势：

✅ **省时省力**：无需手动在三台电脑上构建
✅ **自动化**：推送代码即自动构建
✅ **可靠**：每次构建环境一致
✅ **免费**：公开仓库完全免费
✅ **专业**：自动发布到 Releases

**下一步**：
1. 推送代码到 GitHub
2. 查看 Actions 页面
3. 等待构建完成
4. 下载安装包测试

有问题随时查看 Actions 日志或询问！
