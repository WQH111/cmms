# Tauri Import Error - Complete Troubleshooting Guide

## Current Error
```
✗ Import Failed
Successfully imported: 0 nodes
Errors (1)
Row 0 - file: Import failed: TypeError: Cannot read properties of undefined (reading 'invoke')
```

## Diagnostic Steps

### Step 1: Verify You're Running in Tauri

When you start the app with `npm run tauri dev`, check the console output:

**Expected Output:**
```
✅ Tauri connection successful
✅ Database initialized
```

**If you see this instead:**
```
⚠️ NOT running in Tauri! Use "npm run tauri dev" instead of "npm run dev"
```

**Solution**: You're running in browser mode. Stop and restart with:
```bash
# Stop current process (Ctrl+C)
npm run tauri dev
```

### Step 2: Check Browser Console

Open DevTools (F12 or Right-click → Inspect) and check the Console tab:

**Look for:**
- ✅ "Tauri connection successful"
- ✅ "Database initialized"
- ❌ Any errors about "invoke" or "__TAURI__"

### Step 3: Verify Tauri Window

**Correct**: You should see a **desktop window** (not a browser tab)
- Window title: "CMMS Staging Software"
- Size: 1200x800
- Has native window controls (minimize, maximize, close)

**Incorrect**: If you see a browser tab with URL `localhost:1420`
- This means you're NOT in Tauri mode
- Close browser and use `npm run tauri dev`

### Step 4: Check Terminal Output

When running `npm run tauri dev`, you should see:

```
> npm run dev

> cmms-staging-app@0.1.0 dev
> vite

  VITE v5.4.11  ready in XXX ms

  ➜  Local:   http://localhost:1420/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help

    Compiling tauri-plugin-sql v2.3.2
    Compiling cmms-staging-app v0.1.0
    Finished `dev` profile [unoptimized + debuginfo] target(s) in X.XXs
```

**If Rust compilation fails**, you'll see errors. Common issues:
- Missing Rust toolchain
- Missing system dependencies
- Permission issues

## Common Scenarios

### Scenario A: Running in Browser (Wrong)

**Symptoms:**
- Browser tab at `localhost:1420`
- Error: "Cannot read properties of undefined"
- Alert: "This app must be run with npm run tauri dev"

**Solution:**
```bash
# Close browser
# In terminal, press Ctrl+C to stop
npm run tauri dev
```

### Scenario B: Tauri Window Opens But Import Fails

**Symptoms:**
- Desktop window opens correctly
- Tree view works
- Import fails with "invoke" error

**Possible Causes:**
1. SQL plugin permissions not loaded
2. Database initialization failed
3. Tauri API not properly initialized

**Solutions:**

**1. Clean rebuild:**
```bash
# Stop Tauri (Ctrl+C)
cd src-tauri
cargo clean
cd ..
npm run tauri dev
```

**2. Check permissions file:**
```bash
cat src-tauri/capabilities/default.json
```

Should contain:
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

**3. Verify plugin configuration:**
```bash
cat src-tauri/tauri.conf.json | grep -A 5 plugins
```

Should show:
```json
"plugins": {
  "sql": {
    "preload": ["sqlite:cmms.db"]
  }
}
```

### Scenario C: First Time Running Tauri

**Symptoms:**
- Very long compilation time (5-10 minutes)
- Many "Compiling..." messages

**This is NORMAL for first run!**
- Rust is compiling all dependencies
- Subsequent runs will be much faster
- Just wait patiently

## Verification Checklist

Run through this checklist:

- [ ] Running `npm run tauri dev` (not `npm run dev`)
- [ ] Desktop window opens (not browser tab)
- [ ] Console shows "✅ Tauri connection successful"
- [ ] Console shows "✅ Database initialized"
- [ ] No errors in browser DevTools console
- [ ] `src-tauri/capabilities/default.json` has SQL permissions
- [ ] `src-tauri/tauri.conf.json` has plugins section
- [ ] Rust compilation completed successfully

## Still Not Working?

### Debug Mode

Add this to your import handler to see detailed errors:

```typescript
try {
  const result = await importExcelFile(file);
  console.log('Import result:', result);
} catch (error) {
  console.error('Import error details:', {
    message: error.message,
    stack: error.stack,
    error: error
  });
}
```

### Check Tauri Logs

**Windows:**
```
%APPDATA%\com.mr麒鸿.cmms-staging-app\logs\
```

**macOS:**
```
~/Library/Logs/com.mr麒鸿.cmms-staging-app/
```

**Linux:**
```
~/.local/share/com.mr麒鸿.cmms-staging-app/logs/
```

### Test Database Directly

Create a test file `src/test-db.ts`:

```typescript
import Database from '@tauri-apps/plugin-sql';

async function testDB() {
  try {
    const db = await Database.load('sqlite:test.db');
    console.log('✅ Database loaded');

    await db.execute('CREATE TABLE IF NOT EXISTS test (id INTEGER)');
    console.log('✅ Table created');

    await db.execute('INSERT INTO test VALUES (1)');
    console.log('✅ Insert successful');

    const result = await db.select('SELECT * FROM test');
    console.log('✅ Select successful:', result);
  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

testDB();
```

## Getting Help

If none of the above works, provide:

1. **Terminal output** from `npm run tauri dev`
2. **Browser console** output (F12 → Console tab)
3. **Operating system** (Windows/macOS/Linux)
4. **Node version**: `node --version`
5. **Rust version**: `rustc --version`
6. **Tauri CLI version**: `npm list @tauri-apps/cli`

## Quick Fix Summary

**Most common solution (90% of cases):**

```bash
# 1. Stop everything (Ctrl+C)
# 2. Make sure you're in the right directory
cd "e:/Cherry Studio/demo10/cmms-staging-app"

# 3. Run Tauri (NOT npm run dev!)
npm run tauri dev

# 4. Wait for desktop window to open
# 5. Check console for "✅ Tauri connection successful"
# 6. Try import again
```

---

**Last Updated**: 2026-03-03
**Status**: Troubleshooting Guide
