// src/components/NodePanel.tsx
import { useState } from 'react';
import { useTreeStore } from '../store/treeStore';
import { NodeDialog } from './NodeDialog';
import './NodePanel.css';

export function NodePanel() {
  const { selectedNode, addNode, updateNodeData, deleteNodeById } = useTreeStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');

  const handleCreate = () => {
    setDialogMode('create');
    setDialogOpen(true);
  };

  const handleEdit = () => {
    if (!selectedNode) return;
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const handleDelete = () => {
    if (!selectedNode) return;
    if (confirm(`Are you sure you want to delete "${selectedNode.name}"?`)) {
      deleteNodeById(selectedNode.id);
    }
  };

  const handleSave = (data: { name: string; code: string; description?: string; level: number; parentId: string | null }) => {
    if (dialogMode === 'create') {
      addNode(data.parentId, data.level, data.name, data.code);
    } else if (selectedNode) {
      updateNodeData(selectedNode.id, data.name, data.code);
    }
  };

  return (
    <>
      <div className="node-panel">
        <div className="panel-header">
          <h3>Node Operations</h3>
        </div>

        <div className="panel-actions">
          <button onClick={handleCreate} className="action-btn create-btn">
            <span className="btn-icon">+</span>
            Create Node
          </button>

          <button
            onClick={handleEdit}
            disabled={!selectedNode}
            className="action-btn edit-btn"
          >
            <span className="btn-icon">✎</span>
            Edit Node
          </button>

          <button
            onClick={handleDelete}
            disabled={!selectedNode}
            className="action-btn delete-btn"
          >
            <span className="btn-icon">×</span>
            Delete Node
          </button>
        </div>

        {selectedNode && (
          <div className="selected-node-info">
            <h4>Selected Node</h4>
            <div className="info-row">
              <span className="info-label">Level:</span>
              <span className="info-value">Level {selectedNode.level}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Name:</span>
              <span className="info-value">{selectedNode.name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Code:</span>
              <span className="info-value code">{selectedNode.code}</span>
            </div>
            {selectedNode.description && (
              <div className="info-row">
                <span className="info-label">Description:</span>
                <span className="info-value">{selectedNode.description}</span>
              </div>
            )}
            {selectedNode.isNew && (
              <div className="node-badge new-badge">New</div>
            )}
            {selectedNode.isModified && (
              <div className="node-badge modified-badge">Modified</div>
            )}
          </div>
        )}
      </div>

      <NodeDialog
        isOpen={dialogOpen}
        mode={dialogMode}
        node={selectedNode || undefined}
        parentNode={dialogMode === 'create' ? selectedNode : null}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />
    </>
  );
}
