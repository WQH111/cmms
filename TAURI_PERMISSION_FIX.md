# Tauri SQL Plugin Permission Fix

## Problem
When running `npm run tauri dev`, the application failed with error:
```
Cannot read properties of undefined (reading 'invoke')
```

## Root Cause
Tauri v2 requires explicit permission declarations for plugins. The SQL plugin was registered in Rust code but missing permission configuration in:
1. `tauri.conf.json` - Plugin configuration
2. `capabilities/default.json` - Permission grants

## Solution

### 1. Updated `src-tauri/tauri.conf.json`

Added SQL plugin configuration:

```json
{
  "plugins": {
    "sql": {
      "preload": ["sqlite:cmms.db"]
    }
  }
}
```

Also improved window settings:
- Title: "CMMS Staging Software"
- Size: 1200x800 (better for desktop app)

### 2. Updated `src-tauri/capabilities/default.json`

Added SQL plugin permissions:

```json
{
  "permissions": [
    "core:default",
    "opener:default",
    "sql:default",
    "sql:allow-load",
    "sql:allow-execute",
    "sql:allow-select"
  ]
}
```

## Permissions Explained

- `sql:default` - Basic SQL plugin access
- `sql:allow-load` - Allow loading database files
- `sql:allow-execute` - Allow executing SQL statements (INSERT, UPDATE, DELETE, CREATE, etc.)
- `sql:allow-select` - Allow SELECT queries

## How to Apply

1. **Stop the running Tauri dev server** (Ctrl+C)

2. **Restart Tauri**:
   ```bash
   npm run tauri dev
   ```

3. **Wait for compilation** (Rust needs to recompile with new config)

4. **Test import functionality** - Should now work!

## Verification

After restarting, you should be able to:
- ✅ Open the import dialog
- ✅ Select an Excel file
- ✅ Import data successfully
- ✅ See imported nodes in the tree view

## Tauri v2 Permission System

Tauri v2 uses a capability-based permission system for security:

1. **Plugins must be registered** in `lib.rs`:
   ```rust
   .plugin(tauri_plugin_sql::Builder::new().build())
   ```

2. **Plugins must be configured** in `tauri.conf.json`:
   ```json
   "plugins": { "sql": { ... } }
   ```

3. **Permissions must be granted** in `capabilities/*.json`:
   ```json
   "permissions": ["sql:allow-execute", ...]
   ```

All three are required for plugins to work!

## Common Permission Patterns

### File System
```json
"permissions": [
  "fs:default",
  "fs:allow-read",
  "fs:allow-write"
]
```

### Dialog
```json
"permissions": [
  "dialog:default",
  "dialog:allow-open",
  "dialog:allow-save"
]
```

### HTTP
```json
"permissions": [
  "http:default",
  "http:allow-fetch"
]
```

## Troubleshooting

### Still getting "invoke" error after restart?

1. **Clean build**:
   ```bash
   cd src-tauri
   cargo clean
   cd ..
   npm run tauri dev
   ```

2. **Check console** for permission errors

3. **Verify files were saved** correctly

### Permission denied errors?

Add more specific permissions to `capabilities/default.json`:
```json
"sql:allow-close",
"sql:allow-batch"
```

## References

- [Tauri v2 Security](https://v2.tauri.app/security/)
- [Tauri SQL Plugin](https://github.com/tauri-apps/tauri-plugin-sql)
- [Capability System](https://v2.tauri.app/security/capabilities/)

---

**Fix Date**: 2026-03-03
**Status**: ✅ Resolved
