import { useEffect, useState } from 'react';
import { Toolbar } from './components/Toolbar';
import { TreeView } from './components/TreeView';
import { NodePanel } from './components/NodePanel';
import { HierarchyPrintPreview } from './components/HierarchyPrintPreview';
import { initDatabase } from './services/database';
import './App.css';

function App() {
  const [showPrintPreview, setShowPrintPreview] = useState(false);

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
      <Toolbar onOpenPrintPreview={() => setShowPrintPreview(true)} />
      <main className="main-content">
        <TreeView />
        <NodePanel />
      </main>
      <HierarchyPrintPreview
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
      />
    </div>
  );
}

export default App;
