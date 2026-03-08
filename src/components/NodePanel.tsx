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

            {/* Basic Info */}
            <div className="info-section">
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
            </div>

            {/* Identification Fields */}
            {(selectedNode.objectId || selectedNode.originalId || selectedNode.siteCode) && (
              <div className="info-section">
                <h5 className="section-title">Identification</h5>
                {selectedNode.objectId && (
                  <div className="info-row">
                    <span className="info-label">Object ID:</span>
                    <span className="info-value">{selectedNode.objectId}</span>
                  </div>
                )}
                {selectedNode.originalId && (
                  <div className="info-row">
                    <span className="info-label">Original ID:</span>
                    <span className="info-value">{selectedNode.originalId}</span>
                  </div>
                )}
                {selectedNode.siteCode && (
                  <div className="info-row">
                    <span className="info-label">Site Code:</span>
                    <span className="info-value">{selectedNode.siteCode}</span>
                  </div>
                )}
              </div>
            )}

            {/* Asset Management Fields */}
            {(selectedNode.assetCategory || selectedNode.itemCategory || selectedNode.partNumber ||
              selectedNode.serialNumber || selectedNode.manufacturer || selectedNode.model) && (
              <div className="info-section">
                <h5 className="section-title">Asset Information</h5>
                {selectedNode.assetCategory && (
                  <div className="info-row">
                    <span className="info-label">Asset Category:</span>
                    <span className="info-value">{selectedNode.assetCategory}</span>
                  </div>
                )}
                {selectedNode.itemCategory && (
                  <div className="info-row">
                    <span className="info-label">Item Category:</span>
                    <span className="info-value">{selectedNode.itemCategory}</span>
                  </div>
                )}
                {selectedNode.partNumber && (
                  <div className="info-row">
                    <span className="info-label">Part Number:</span>
                    <span className="info-value code">{selectedNode.partNumber}</span>
                  </div>
                )}
                {selectedNode.serialNumber && (
                  <div className="info-row">
                    <span className="info-label">Serial Number:</span>
                    <span className="info-value code">{selectedNode.serialNumber}</span>
                  </div>
                )}
                {selectedNode.manufacturer && (
                  <div className="info-row">
                    <span className="info-label">Manufacturer:</span>
                    <span className="info-value">{selectedNode.manufacturer}</span>
                  </div>
                )}
                {selectedNode.model && (
                  <div className="info-row">
                    <span className="info-label">Model:</span>
                    <span className="info-value">{selectedNode.model}</span>
                  </div>
                )}
              </div>
            )}

            {/* Additional Fields */}
            {(selectedNode.quantity || selectedNode.barcode || selectedNode.composed ||
              selectedNode.emissionPoint || selectedNode.costCenter) && (
              <div className="info-section">
                <h5 className="section-title">Additional Information</h5>
                {selectedNode.quantity && (
                  <div className="info-row">
                    <span className="info-label">Quantity:</span>
                    <span className="info-value">{selectedNode.quantity}</span>
                  </div>
                )}
                {selectedNode.barcode && (
                  <div className="info-row">
                    <span className="info-label">Barcode:</span>
                    <span className="info-value code">{selectedNode.barcode}</span>
                  </div>
                )}
                {selectedNode.composed && (
                  <div className="info-row">
                    <span className="info-label">Composed:</span>
                    <span className="info-value">{selectedNode.composed}</span>
                  </div>
                )}
                {selectedNode.emissionPoint && (
                  <div className="info-row">
                    <span className="info-label">Emission Point:</span>
                    <span className="info-value">{selectedNode.emissionPoint}</span>
                  </div>
                )}
                {selectedNode.costCenter && (
                  <div className="info-row">
                    <span className="info-label">Cost Center:</span>
                    <span className="info-value">{selectedNode.costCenter}</span>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {selectedNode.notes && (
              <div className="info-section">
                <h5 className="section-title">Notes</h5>
                <div className="info-row">
                  <span className="info-value notes">{selectedNode.notes}</span>
                </div>
              </div>
            )}

            {/* Custom Fields */}
            {selectedNode.customFields && Object.keys(selectedNode.customFields).length > 0 && (
              <div className="info-section">
                <h5 className="section-title">Custom Fields</h5>
                {Object.entries(selectedNode.customFields).map(([key, field]: [string, any]) => (
                  field.label || field.value ? (
                    <div key={key} className="info-row">
                      <span className="info-label">{field.label || key}:</span>
                      <span className="info-value">{field.value}</span>
                    </div>
                  ) : null
                ))}
              </div>
            )}

            {/* Badges */}
            <div className="badges-container">
              {selectedNode.isNew && (
                <div className="node-badge new-badge">New</div>
              )}
              {selectedNode.isModified && (
                <div className="node-badge modified-badge">Modified</div>
              )}
            </div>
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
