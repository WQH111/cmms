// Check if WAL mode is enabled
const Database = require('@tauri-apps/plugin-sql');

async function checkWAL() {
  try {
    const db = await Database.load('sqlite:cmms.db');

    // Check journal mode
    const result = await db.select('PRAGMA journal_mode');
    console.log('Current journal mode:', result);

    // Check busy timeout
    const timeout = await db.select('PRAGMA busy_timeout');
    console.log('Current busy timeout:', timeout);

    // Check synchronous mode
    const sync = await db.select('PRAGMA synchronous');
    console.log('Current synchronous mode:', sync);

  } catch (error) {
    console.error('Error:', error);
  }
}

checkWAL();
