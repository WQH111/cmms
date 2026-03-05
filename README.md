# POG CMMS Staging Software

Peak Ocean CMMS Hierarchy Tree Data Management System - Offline Desktop Application

## ⚠️ Important: How to Run

This is a **Tauri desktop application**. You MUST use:

```bash
npm run tauri dev
```

**DO NOT use** `npm run dev` (browser only - Tauri APIs won't work)

See [HOW_TO_RUN.md](HOW_TO_RUN.md) for detailed instructions.

## Tech Stack

- **Desktop**: Tauri v2
- **Frontend**: React 19 + TypeScript + Vite
- **State Management**: Zustand
- **Database**: SQLite (local file)
- **Tree UI**: react-arborist (virtualized rendering)
- **Excel**: SheetJS (xlsx)

## Getting Started

### Prerequisites

- Node.js 18+
- Rust (for Tauri)
- Windows: Visual Studio Build Tools + WebView2
- macOS: Xcode Command Line Tools

### Installation

```bash
cd pog-cmms-staging-app
npm install
```

### Development Mode

**⚠️ IMPORTANT: Use Tauri command, not Vite!**

```bash
# ✅ Correct - Runs Tauri desktop app
npm run tauri dev

# ❌ Wrong - Only runs in browser (Tauri APIs won't work)
npm run dev
```

### Build Application

```bash
npm run tauri build
```

## Core Features

### Implemented ✅
- [x] Project scaffolding
- [x] SQLite database configuration
- [x] Tree structure data model (Level 1-16)
- [x] Tree view with virtualization
- [x] Search and filtering
- [x] Node CRUD operations
- [x] Excel import functionality
- [x] Automatic backup
- [x] Data validation

### To Be Implemented 🚧
- [ ] Drag and drop
- [ ] Undo/Redo
- [ ] Excel export
- [ ] Print/PDF export
- [ ] Performance optimization

## Troubleshooting

### Error: "Cannot read properties of undefined (reading 'invoke')"

**Cause**: Running in browser instead of Tauri

**Solution**: Use `npm run tauri dev` instead of `npm run dev`

### First run takes a long time

**Cause**: Rust compilation

**Solution**: Wait 5-10 minutes (first time only)

## Documentation

- [HOW_TO_RUN.md](HOW_TO_RUN.md) - Running instructions
- [IMPORT_GUIDE.md](IMPORT_GUIDE.md) - Import guide
- [DATABASE_INIT_FIX.md](DATABASE_INIT_FIX.md) - Database fix

## Recommended IDE

- VS Code + Tauri Extension + rust-analyzer
