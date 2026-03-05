# How to Run the CMMS Application

## ⚠️ Important: Tauri vs Browser

This is a **Tauri desktop application**, not a web application. It must be run using Tauri commands, not regular Vite commands.

### ❌ Wrong Way (Browser Only - Will Fail)
```bash
npm run dev
# This only runs Vite dev server in browser
# Tauri APIs (like SQL database) will NOT work
# You will see errors like: "Cannot read properties of undefined (reading 'invoke')"
```

### ✅ Correct Way (Tauri Desktop App)
```bash
npm run tauri dev
# This runs the full Tauri desktop application
# All Tauri APIs work correctly
# SQLite database works
# Import/Export features work
```

## Running the Application

### Development Mode

1. **Open Terminal** in the project directory:
   ```bash
   cd "e:/Cherry Studio/demo10/cmms-staging-app"
   ```

2. **Run Tauri Development Mode**:
   ```bash
   npm run tauri dev
   ```

3. **Wait for the app to launch**:
   - Rust backend will compile (first time takes longer)
   - Desktop window will open automatically
   - Hot reload is enabled for frontend changes

### Production Build

1. **Build the application**:
   ```bash
   npm run tauri build
   ```

2. **Find the installer**:
   - Windows: `src-tauri/target/release/bundle/msi/`
   - macOS: `src-tauri/target/release/bundle/dmg/`

## Why Tauri is Required

### Tauri-Only Features
The following features ONLY work in Tauri desktop environment:

1. **SQLite Database** (`@tauri-apps/plugin-sql`)
   - Local database storage
   - All CRUD operations
   - Import/Export data

2. **File System Access**
   - Reading Excel files
   - Writing backups
   - File dialogs

3. **Native APIs**
   - Window management
   - System notifications
   - Native menus

### Browser Limitations
Running in browser (`npm run dev`) will cause these errors:

```
❌ Cannot read properties of undefined (reading 'invoke')
❌ Database not initialized
❌ Tauri API not available
```

## Troubleshooting

### Error: "Cannot read properties of undefined (reading 'invoke')"

**Cause**: Running in browser instead of Tauri

**Solution**:
```bash
# Stop the browser dev server (Ctrl+C)
# Run Tauri instead
npm run tauri dev
```

### Error: "Database not initialized"

**Cause**: Tauri APIs not available (running in browser)

**Solution**: Use `npm run tauri dev`

### First Run Takes Long Time

**Cause**: Rust backend needs to compile

**Solution**: Wait patiently (5-10 minutes first time)
- Subsequent runs are much faster
- Rust compilation is cached

### Port Already in Use

**Cause**: Another instance is running

**Solution**:
```bash
# Kill the process using the port
# Windows
netstat -ano | findstr :1420
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:1420 | xargs kill -9
```

## Development Workflow

### Recommended Setup

1. **Terminal 1**: Run Tauri dev server
   ```bash
   npm run tauri dev
   ```

2. **Terminal 2**: Available for other commands
   ```bash
   # Run tests
   npm test

   # Check types
   npm run build

   # Format code
   npm run format
   ```

### Hot Reload

- **Frontend changes** (React/TypeScript): Auto-reload ✅
- **Backend changes** (Rust): Requires restart ⚠️

### Debugging

1. **Open DevTools**: Right-click → Inspect Element
2. **Console logs**: Available in DevTools
3. **Rust logs**: Visible in terminal

## Quick Reference

| Command | Purpose | Environment |
|---------|---------|-------------|
| `npm run dev` | ❌ Browser only (limited) | Web browser |
| `npm run tauri dev` | ✅ Full desktop app | Tauri window |
| `npm run build` | Compile TypeScript | Build only |
| `npm run tauri build` | Create installer | Production |

## System Requirements

### Windows
- Windows 10/11
- Visual Studio Build Tools
- WebView2 Runtime

### macOS
- macOS 10.15+
- Xcode Command Line Tools

### Linux
- GTK 3
- WebKitGTK
- Various system libraries

## Next Steps

1. ✅ Run `npm run tauri dev`
2. ✅ Wait for desktop window to open
3. ✅ Test import functionality
4. ✅ All Tauri APIs should work

---

**Remember**: Always use `npm run tauri dev` for development, not `npm run dev`!
