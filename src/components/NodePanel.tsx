// src/components/NodePanel.tsx
import { useState } from 'react';
import { useTreeStore } from '../store/treeStore';
import { NodeDialog } from './NodeDialog';
import type { TreeNode } from '../types/TreeNode';
import './NodePanel.css';

interface DisplayField {
  label: string;
  value: string;
  variant?: 'default' | 'code' | 'notes';
}

const EXCEL_FIELD_CONFIG: Array<{
  key: keyof TreeNode;
  label: string;
  variant?: 'default' | 'code' | 'notes';
}> = [
  { key: 'objectId', label: 'Object ID' },
  { key: 'originalId', label: 'original id' },
  { key: 'siteCode', label: 'Site code' },
  { key: 'name', label: 'Name (Descr. Function Location)' },
  { key: 'code', label: 'Code (Function Number)', variant: 'code' },
  { key: 'description', label: 'Description ' },
  { key: 'assetCategory', label: 'Asset category' },
  { key: 'itemCategory', label: 'Item category' },
  { key: 'partNumber', label: 'Part number', variant: 'code' },
  { key: 'serialNumber', label: 'Serial number', variant: 'code' },
  { key: 'manufacturer', label: 'Manufacturer' },
  { key: 'model', label: 'Model' },
  { key: 'notes', label: 'Notes', variant: 'notes' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'barcode', label: 'Barcode', variant: 'code' },
  { key: 'composed', label: 'composed' },
  { key: 'emissionPoint', label: 'Emission Point' },
  { key: 'costCenter', label: 'Cost center' },
];

function normalizeDisplayValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  return String(value);
}

function getExcelDisplayFields(node: TreeNode): DisplayField[] {
  const fields: DisplayField[] = [];

  for (const { key, label, variant } of EXCEL_FIELD_CONFIG) {
    const value = normalizeDisplayValue(node[key]);
    if (!value) continue;

    fields.push(
      variant
        ? { label, value, variant }
        : { label, value }
    );
  }

  return fields;
}

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

  const displayFields = selectedNode ? getExcelDisplayFields(selectedNode) : [];
  const customFields = selectedNode?.customFields
    ? Object.entries(selectedNode.customFields).reduce<Array<{ label: string; value: string }>>((fields, [key, field]) => {
        const label = normalizeDisplayValue(field.label) || key;
        const value = normalizeDisplayValue(field.value);

        if (!label && !value) {
          return fields;
        }

        fields.push({ label, value: value || '-' });
        return fields;
      }, [])
    : [];

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
            <span className="btn-icon">Edit</span>
            Edit Node
          </button>

          <button
            onClick={handleDelete}
            disabled={!selectedNode}
            className="action-btn delete-btn"
          >
            <span className="btn-icon">Delete</span>
            Delete Node
          </button>
        </div>

        {selectedNode && (
          <div className="selected-node-info">
            <h4>Selected Node</h4>

            <div className="info-section">
              <div className="info-row">
                <span className="info-label">Level</span>
                <span className="info-value">Level {selectedNode.level}</span>
              </div>

              {displayFields.map((field) => (
                <div key={field.label} className="info-row">
                  <span className="info-label">{field.label}</span>
                  <span className={`info-value ${field.variant === 'code' ? 'code' : ''} ${field.variant === 'notes' ? 'notes' : ''}`.trim()}>
                    {field.value}
                  </span>
                </div>
              ))}
            </div>

            {customFields.length > 0 && (
              <div className="info-section">
                <h5 className="section-title">Custom Fields</h5>
                {customFields.map((field) => (
                  <div key={field.label} className="info-row">
                    <span className="info-label">{field.label}</span>
                    <span className="info-value">{field.value}</span>
                  </div>
                ))}
              </div>
            )}

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
