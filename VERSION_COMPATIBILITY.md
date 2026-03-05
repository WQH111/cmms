# 版本兼容性说明

## Node.js 版本问题

### 问题描述
Vite 7.x 要求 Node.js 20.19+ 或 22.12+，但当前系统使用 Node.js 20.10.0。

### 解决方案

#### ✅ 方案 1：降级 Vite（已应用）
```bash
npm install vite@5.4.11 --save-dev
```

**优点**：
- 无需升级 Node.js
- 快速解决问题
- Vite 5 功能完全够用

**当前配置**：
- Node.js: 20.10.0
- Vite: 5.4.11
- 状态: ✅ 兼容

#### 方案 2：升级 Node.js（可选）
如果想使用最新的 Vite 7，可以升级 Node.js：

**Windows**:
1. 访问 https://nodejs.org/
2. 下载 LTS 版本（22.x）
3. 安装并重启终端

**使用 nvm（推荐）**:
```bash
# 安装 nvm-windows
# 下载: https://github.com/coreybutler/nvm-windows/releases

# 安装 Node.js 22
nvm install 22
nvm use 22

# 验证版本
node --version
```

## 依赖版本

### 当前配置
```json
{
  "vite": "^5.4.11",
  "react": "^18.3.1",
  "@tauri-apps/api": "^2.x",
  "@tauri-apps/plugin-sql": "^2.x",
  "react-arborist": "latest",
  "zustand": "latest",
  "xlsx": "latest"
}
```

### 推荐版本组合

#### 稳定配置（当前）
- Node.js: 20.10.0+
- Vite: 5.4.x
- React: 18.3.x
- Tauri: 2.x

#### 最新配置
- Node.js: 22.12.0+
- Vite: 7.x
- React: 18.3.x
- Tauri: 2.x

## 运行应用

### 开发模式
```bash
npm run tauri dev
```

### 构建生产版本
```bash
npm run tauri build
```

### 检查版本
```bash
node --version
npm --version
```

## 常见问题

### Q: 为什么降级 Vite？
A: 为了兼容当前的 Node.js 版本，避免升级 Node.js 可能带来的其他问题。

### Q: Vite 5 和 Vite 7 有什么区别？
A: 对于本项目，Vite 5 的功能完全够用。Vite 7 主要是性能优化和新特性，不影响核心功能。

### Q: 需要升级 Node.js 吗？
A: 不是必须的。当前配置可以正常工作。如果想使用最新特性，可以考虑升级。

### Q: 如何验证配置正确？
A: 运行 `npm run tauri dev`，如果应用正常启动，说明配置正确。

## 故障排除

### 错误：crypto.hash is not a function
**原因**: Vite 7 使用了 Node.js 20.19+ 的新 API
**解决**: 降级到 Vite 5.4.11

### 错误：Unsupported engine
**原因**: package.json 中的 engines 字段限制
**解决**: 修改或删除 engines 字段

### 错误：Module not found
**原因**: 依赖未安装
**解决**: 运行 `npm install`

## 更新日志

### 2026-03-03
- ✅ 降级 Vite 从 7.3.1 到 5.4.11
- ✅ 解决 Node.js 版本兼容性问题
- ✅ 应用可以正常运行

---

**当前状态**: ✅ 已解决，应用可以正常运行
**推荐配置**: Node.js 20.10.0 + Vite 5.4.11
