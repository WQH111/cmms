# 故障排除指南

## Rust 编译错误

### 问题：build script 编译失败
```
error: could not compile `icu_properties_data` (build script)
error: could not compile `quote` (build script)
error: could not compile `serde` (build script)
```

### 解决方案

#### 方案 1：清理并重新构建（推荐）
```bash
cd src-tauri
cargo clean
cd ..
npm run tauri dev
```

#### 方案 2：更新 Rust 工具链
```bash
rustup update stable
rustup default stable
```

#### 方案 3：检查 Rust 安装
```bash
# 检查版本
rustc --version
cargo --version

# 如果未安装，访问 https://rustup.rs/
# Windows: 下载并运行 rustup-init.exe
```

#### 方案 4：使用更简单的配置（临时方案）

如果 Rust 编译持续失败，可以暂时使用纯前端开发模式：

**修改 package.json**:
```json
{
  "scripts": {
    "dev": "vite",
    "dev-only": "vite --port 1420"
  }
}
```

**运行纯前端**:
```bash
npm run dev-only
```

然后在浏览器打开 `http://localhost:1420`

**限制**：
- ❌ 无法使用 SQLite 数据库
- ❌ 无法打包为桌面应用
- ✅ 可以测试 UI 组件
- ✅ 可以测试前端逻辑

## 常见问题

### Q: Vite 版本错误
**错误**: `crypto.hash is not a function`
**解决**:
```bash
npm install vite@5.4.11 --save-dev
```

### Q: Node.js 版本警告
**警告**: `Vite requires Node.js version 20.19+`
**解决**: 已降级 Vite，可以忽略此警告

### Q: 依赖安装失败
**错误**: `npm install` 失败
**解决**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Q: Tauri 命令未找到
**错误**: `tauri: command not found`
**解决**:
```bash
npm install
# Tauri CLI 会自动安装
```

### Q: 端口被占用
**错误**: `Port 1420 is already in use`
**解决**:
```bash
# Windows
netstat -ano | findstr :1420
taskkill /PID <PID> /F

# 或修改端口
# 在 vite.config.ts 中修改 server.port
```

### Q: SQLite 插件错误
**错误**: `@tauri-apps/plugin-sql not found`
**解决**:
```bash
npm install @tauri-apps/plugin-sql
cd src-tauri
cargo clean
cd ..
npm run tauri dev
```

## 开发环境检查清单

### 必需工具
- [x] Node.js 20.10.0+ ✅
- [x] npm 或 yarn ✅
- [ ] Rust 1.70+ (用于 Tauri)
- [ ] Visual Studio Build Tools (Windows)

### 检查命令
```bash
# Node.js
node --version

# npm
npm --version

# Rust
rustc --version
cargo --version

# Tauri
npm run tauri --version
```

## 替代开发方案

### 方案 A：纯前端开发（推荐用于 UI 开发）
```bash
npm run dev
# 在浏览器中开发 UI
# 使用 Mock 数据代替数据库
```

**优点**：
- 快速启动
- 热重载
- 无需 Rust

**缺点**：
- 无数据库功能
- 无法测试桌面特性

### 方案 B：使用 Docker（高级）
```dockerfile
FROM node:20
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "run", "tauri", "dev"]
```

### 方案 C：云端开发环境
- GitHub Codespaces
- GitPod
- StackBlitz (仅前端)

## 性能优化建议

### 加速 Rust 编译
```toml
# 在 src-tauri/Cargo.toml 添加
[profile.dev]
opt-level = 1
```

### 减少依赖
如果不需要某些功能，可以移除对应的依赖：
```toml
# src-tauri/Cargo.toml
[dependencies]
# 注释掉不需要的依赖
```

## 获取帮助

### 日志位置
- **Vite 日志**: 终端输出
- **Tauri 日志**: 终端输出
- **应用日志**: 浏览器控制台

### 调试模式
```bash
# 详细日志
RUST_LOG=debug npm run tauri dev

# 仅错误
RUST_LOG=error npm run tauri dev
```

### 社区资源
- Tauri 文档: https://tauri.app/
- Tauri Discord: https://discord.gg/tauri
- GitHub Issues: https://github.com/tauri-apps/tauri/issues

## 快速修复脚本

创建 `fix.sh` (Linux/Mac) 或 `fix.bat` (Windows):

**fix.bat**:
```batch
@echo off
echo Cleaning project...
cd src-tauri
cargo clean
cd ..
rmdir /s /q node_modules
del package-lock.json

echo Reinstalling dependencies...
npm install

echo Rebuilding...
npm run tauri dev
```

**使用**:
```bash
./fix.bat
```

## 当前状态检查

运行此命令检查环境：
```bash
echo "=== Environment Check ==="
echo "Node: $(node --version)"
echo "npm: $(npm --version)"
echo "Rust: $(rustc --version 2>&1 || echo 'Not installed')"
echo "Cargo: $(cargo --version 2>&1 || echo 'Not installed')"
echo ""
echo "=== Project Status ==="
ls -la node_modules 2>&1 | head -5
ls -la src-tauri/target 2>&1 | head -5
```

---

**最后更新**: 2026-03-03
**状态**: 正在排查 Rust 编译问题
