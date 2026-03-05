import { useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { TreeView } from './components/TreeView';
import { NodePanel } from './components/NodePanel';
import { initDatabase } from './services/database';
import './App.css';

function App() {
  useEffect(() => {
    // Test console output
    console.log('🎯🎯🎯 APP STARTED - Console is working!');
    console.warn('⚠️⚠️⚠️ This is a warning test');
    console.error('❌❌❌ This is an error test');

    // Initialize database
    initDatabase()
      .then(() => console.log('✅ Database initialized'))
      .catch(err => console.error('❌ Database init failed:', err));
  }, []);

  return (
    <div className="app">
      <Toolbar />
      <main className="main-content">
        <TreeView />
        <NodePanel />
      </main>
    </div>
  );
}

export default App;
