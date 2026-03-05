// src/components/NodeDialog.tsx
import { useState, useEffect } from 'react';
import type { TreeNode } from '../types/TreeNode';
import './NodeDialog.css';

interface NodeDialogProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  node?: TreeNode;
  parentNode?: TreeNode | null;
  onClose: () => void;
  onSave: (data: { name: string; code: string; description?: string; level: number; parentId: string | null }) => void;
}

export function NodeDialog({ isOpen, mode, node, parentNode, onClose, onSave }: NodeDialogProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState(1);

  useEffect(() => {
    if (mode === 'edit' && node) {
      setName(node.name);
      setCode(node.code);
      setDescription(node.description || '');
      setLevel(node.level);
    } else if (mode === 'create') {
      setName('');
      setCode('');
      setDescription('');
      setLevel(parentNode ? parentNode.level + 1 : 1);
    }
  }, [mode, node, parentNode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      alert('Name and Code are required');
      return;
    }

    onSave({
      name: name.trim(),
      code: code.trim(),
      description: description.trim() || undefined,
      level,
      parentId: parentNode?.id || null,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>{mode === 'create' ? 'Create New Node' : 'Edit Node'}</h2>
          <button className="dialog-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="dialog-form">
          <div className="form-group">
            <label htmlFor="level">Level</label>
            <input
              id="level"
              type="number"
              min="1"
              max="16"
              value={level}
              onChange={(e) => setLevel(parseInt(e.target.value))}
              disabled={mode === 'edit'}
              className="form-input"
            />
          </div>

          {parentNode && (
            <div className="form-group">
              <label>Parent Node</label>
              <div className="parent-info">
                <span className="parent-level">L{parentNode.level}</span>
                <span className="parent-name">{parentNode.name}</span>
                <span className="parent-code">{parentNode.code}</span>
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter node name"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="code">Code *</label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter node code"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description (optional)"
              className="form-textarea"
              rows={3}
            />
          </div>

          <div className="dialog-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {mode === 'create' ? 'Create' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
