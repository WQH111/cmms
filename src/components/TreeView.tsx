// src/components/TreeView.tsx
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Tree, NodeRendererProps } from 'react-arborist';
import { useTreeStore } from '../store/treeStore';
import type { TreeNode } from '../types/TreeNode';
import './TreeView.css';

// ─── Pointer Drag State (Module Level) ───
let draggedNodeId: string | null = null;
let draggedNodeData: TreeNode | null = null;
let ghostEl: HTMLElement | null = null;
let currentDropTargetId: string | null = null;
let initialX = 0;
let initialY = 0;

// Shared function to update drop target styling
function updateGlobalDropTarget(targetId: string | null, nodes: TreeNode[]) {
  // Clear all previous highlights
  document.querySelectorAll('.tree-node').forEach(el => {
    el.classList.remove('drop-valid', 'drop-invalid');
  });

  if (!targetId || !draggedNodeData) return;

  // Find the new element
  const targetEl = document.querySelector(`[data-node-id="${targetId}"]`);
  if (!targetEl) return;

  // Determine if valid (container uses '__root__' special ID)
  let isValid = false;
  if (targetId === '__root__') {
    isValid = validateMove(draggedNodeData, null, 1, nodes).valid;
  } else {
    const targetNode = nodes.find(n => n.id === targetId);
    if (targetNode) {
      isValid = validateMove(draggedNodeData, targetId, targetNode.level + 1, nodes).valid;
    }
  }

  targetEl.classList.add(isValid ? 'drop-valid' : 'drop-invalid');
}

function buildTree(nodes: TreeNode[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();
  const rootNodes: TreeNode[] = [];

  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node, children: [] });
  });

  nodes.forEach(node => {
    const treeNode = nodeMap.get(node.id)!;
    if (node.parentId) {
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(treeNode);
      }
    } else {
      rootNodes.push(treeNode);
    }
  });

  return rootNodes;
}

// ─── Node component (Pointer Events) ───
function Node({ node, style }: NodeRendererProps<TreeNode>) {
  const { selectNode, selectedNode } = useTreeStore();
  const isSelected = selectedNode?.id === node.data.id;
  const hasChildren = node.data.children && node.data.children.length > 0;

  // Local dragging state for visual rendering
  const [isDragging, setIsDragging] = useState(false);

  // ── Mouse / Pointer Down: Start Drag Prep ──
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return; // Left click only
    e.stopPropagation();

    // Prevent text selection while dragging
    e.preventDefault();

    const handleEl = e.currentTarget as HTMLElement;
    const nodeEl = handleEl.closest('.tree-node') as HTMLElement;
    if (!nodeEl) return;

    draggedNodeId = node.data.id;
    draggedNodeData = node.data;
    initialX = e.clientX;
    initialY = e.clientY;

    // Create ghost element but don't show yet (waiting for meaningful movement)
    ghostEl = nodeEl.cloneNode(true) as HTMLElement;
    ghostEl.style.position = 'fixed';
    ghostEl.style.pointerEvents = 'none'; // CRITICAL: ghost must not steal pointer events
    ghostEl.style.zIndex = '9999';
    ghostEl.style.opacity = '0'; // Hidden initially
    ghostEl.style.width = `${nodeEl.offsetWidth}px`;
    ghostEl.classList.add('dragging-ghost');

    // Clean up ghost styles for clean look
    ghostEl.style.left = '0';
    ghostEl.style.top = '0';
    ghostEl.style.transform = `translate(${e.clientX + 10}px, ${e.clientY + 10}px)`;

    document.body.appendChild(ghostEl);

    // Attach global listeners
    document.addEventListener('pointermove', handleGlobalPointerMove);
    document.addEventListener('pointerup', handleGlobalPointerUp);
  };

  const handleGlobalPointerMove = (e: PointerEvent) => {
    if (!draggedNodeId || !ghostEl) return;

    // Wait for a small threshold (e.g., 5px) to actually start dragging physics
    if (Math.abs(e.clientX - initialX) > 5 || Math.abs(e.clientY - initialY) > 5) {
      ghostEl.style.opacity = '0.9';
      setIsDragging(true); // Triggers re-render for local Node
    }

    // Move ghost
    ghostEl.style.transform = `translate(${e.clientX + 15}px, ${e.clientY + 15}px)`;

    // Find what we are hovering over (since ghost has pointer-events: none)
    const elementsBelow = document.elementsFromPoint(e.clientX, e.clientY);
    const targetNodeEl = elementsBelow.find(el => el.classList.contains('tree-node'));

    let newTargetId: string | null = null;

    if (targetNodeEl) {
      newTargetId = targetNodeEl.getAttribute('data-node-id');
      // Don't target self
      if (newTargetId === draggedNodeId) newTargetId = null;
    } else {
      // Check if we are hovering over the empty container area
      const containerEl = elementsBelow.find(el => el.classList.contains('tree-container'));
      if (containerEl) {
        newTargetId = '__root__'; // Special signal for root drop
      }
    }

    if (newTargetId !== currentDropTargetId) {
      currentDropTargetId = newTargetId;
      updateGlobalDropTarget(currentDropTargetId, useTreeStore.getState().nodes);
    }
  };

  const handleGlobalPointerUp = () => {
    document.removeEventListener('pointermove', handleGlobalPointerMove);
    document.removeEventListener('pointerup', handleGlobalPointerUp);

    if (ghostEl && ghostEl.parentNode) {
      ghostEl.parentNode.removeChild(ghostEl);
    }
    ghostEl = null;

    if (draggedNodeId && currentDropTargetId) {
      // Execute drop
      const storesNodes = useTreeStore.getState().nodes;
      const sourceData = draggedNodeData;
      const sourceId = draggedNodeId;
      const targetId = currentDropTargetId === '__root__' ? null : currentDropTargetId;

      if (sourceData && sourceId) {
        let newLevel = 1;
        if (targetId) {
          const targetNode = storesNodes.find(n => n.id === targetId);
          if (targetNode) newLevel = targetNode.level + 1;
        }

        const validation = validateMove(sourceData, targetId, newLevel, storesNodes);

        if (validation.valid) {
          console.log('✅ Custom Drop:', sourceData.name, '→', targetId || 'Root', `(L${newLevel})`);
          useTreeStore.getState().moveNode(sourceId, targetId);
        } else {
          console.warn('❌ Invalid Custom Move:', validation.reason);
          alert(`❌ Cannot move: ${validation.reason}`);
        }
      }
    }

    // Cleanup
    updateGlobalDropTarget(null, []); // Clear highlights
    draggedNodeId = null;
    draggedNodeData = null;
    currentDropTargetId = null;
    setIsDragging(false); // Triggers re-render to remove local dragging styles
  };

  // Node Component Render
  return (
    <div
      style={style}
      data-node-id={node.data.id}
      className={[
        'tree-node',
        isSelected && 'selected',
        node.data.isNew && 'new',
        node.data.isModified && 'modified',
        isDragging && 'dragging',
      ].filter(Boolean).join(' ')}
      onClick={() => selectNode(node.data)}
    >
      <span
        className="drag-handle"
        title="Drag to move"
        onPointerDown={handlePointerDown}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <circle cx="3.5" cy="2" r="1.2" />
          <circle cx="8.5" cy="2" r="1.2" />
          <circle cx="3.5" cy="6" r="1.2" />
          <circle cx="8.5" cy="6" r="1.2" />
          <circle cx="3.5" cy="10" r="1.2" />
          <circle cx="8.5" cy="10" r="1.2" />
        </svg>
      </span>
      {hasChildren ? (
        <span
          className={`node-toggle ${node.isOpen ? 'open' : ''}`}
          onClick={(evt) => {
            evt.stopPropagation();
            node.toggle();
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M3 1.5L7.5 5L3 8.5" strokeWidth="1" />
          </svg>
        </span>
      ) : (
        <span className="node-toggle-spacer" />
      )}
      <span className={`node-level level-${Math.min(node.data.level, 6)}`}>
        L{node.data.level}
      </span>
      <span className="node-name">{node.data.name}</span>
      {node.data.code && (
        <span className="node-code">{node.data.code}</span>
      )}
    </div>
  );
}

// ─── TreeView ───
export function TreeView() {
  const { nodes, loadNodes, loading } = useTreeStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<any>(null);
  const [containerHeight, setContainerHeight] = useState(600);
  const openStateRef = useRef<Record<string, boolean>>({});
  const prevLoadingRef = useRef(loading);

  const saveOpenState = useCallback(() => {
    if (treeRef.current) {
      const currentOpenState: Record<string, boolean> = {};
      try {
        const collectState = (node: any) => {
          if (node?.data?.id) {
            const isOpen = node.isOpen || false;
            currentOpenState[node.data.id] = isOpen;
          }
          node?.children?.forEach((child: any) => collectState(child));
        };
        treeRef.current.root?.children?.forEach((node: any) => collectState(node));
        openStateRef.current = currentOpenState;
      } catch (error) {
        console.warn('Failed to save open state:', error);
      }
    }
  }, []);

  useEffect(() => { loadNodes(); }, [loadNodes]);

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  useEffect(() => {
    if (!prevLoadingRef.current && loading) saveOpenState();
    prevLoadingRef.current = loading;
  }, [loading, saveOpenState]);

  useEffect(() => {
    if (treeRef.current && nodes.length > 0) saveOpenState();
  }, [nodes, saveOpenState]);

  const treeData = useMemo(() => buildTree(nodes), [nodes]);

  useEffect(() => {
    if (treeRef.current && treeData.length > 0) {
      requestAnimationFrame(() => {
        const openState = openStateRef.current;
        if (Object.keys(openState).length > 0) {
          try {
            const findNodeByDataId = (dataId: string, node: any): any => {
              if (node?.data?.id === dataId) return node;
              if (node?.children) {
                for (const child of node.children) {
                  const found = findNodeByDataId(dataId, child);
                  if (found) return found;
                }
              }
              return null;
            };

            Object.entries(openState).forEach(([dataId, isOpen]) => {
              try {
                let foundNode = null;
                if (treeRef.current?.root?.children) {
                  for (const rootNode of treeRef.current.root.children) {
                    foundNode = findNodeByDataId(dataId, rootNode);
                    if (foundNode) break;
                  }
                }
                if (foundNode) {
                  if (isOpen && !foundNode.isOpen) foundNode.open();
                  else if (!isOpen && foundNode.isOpen) foundNode.close();
                }
              } catch (_err) { /* skip */ }
            });
          } catch (error) {
            console.warn('Failed to restore open state:', error);
          }
        }
      });
    }
  }, [treeData]);

  return (
    <div
      ref={containerRef}
      className="tree-container"
    >
      {loading && (
        <div className="tree-loading-overlay">
          <div className="tree-loading">
            <span className="loading-spinner" />
            Loading...
          </div>
        </div>
      )}
      <Tree
        ref={treeRef}
        data={treeData}
        idAccessor={(node) => node.id}
        childrenAccessor={(node) => node.children ?? null}
        disableDrag={true}
        disableDrop={true}
        openByDefault={false}
        width="100%"
        height={containerHeight}
        indent={24}
        rowHeight={38}
        renderRow={({ attrs, innerRef, children }) => (
          <div {...attrs} ref={innerRef}>
            {children}
          </div>
        )}
      >
        {Node}
      </Tree>
    </div>
  );
}

// ─── Validation ───
interface MoveValidation {
  valid: boolean;
  reason?: string;
}

function validateMove(
  node: TreeNode,
  newParentId: string | null,
  newLevel: number,
  allNodes: TreeNode[]
): MoveValidation {
  if (node.id === newParentId) {
    return { valid: false, reason: 'Cannot move a node to itself' };
  }

  if (newParentId && isDescendant(node.id, newParentId, allNodes)) {
    return { valid: false, reason: 'Cannot move a node to its own descendant (would create a cycle)' };
  }

  const MAX_LEVEL = 16;
  if (newLevel > MAX_LEVEL) {
    return { valid: false, reason: `Maximum level is ${MAX_LEVEL}, target level would be ${newLevel}` };
  }

  const maxChildDepth = getMaxChildDepth(node.id, allNodes);
  if (newLevel + maxChildDepth > MAX_LEVEL) {
    return { valid: false, reason: `Moving this node would cause its children to exceed level ${MAX_LEVEL}` };
  }

  if (node.parentId === newParentId) {
    return { valid: false, reason: 'Node is already at this location' };
  }

  return { valid: true };
}

function getMaxChildDepth(nodeId: string, allNodes: TreeNode[]): number {
  const children = allNodes.filter(n => n.parentId === nodeId);
  if (children.length === 0) return 0;
  let maxDepth = 0;
  for (const child of children) {
    maxDepth = Math.max(maxDepth, getMaxChildDepth(child.id, allNodes) + 1);
  }
  return maxDepth;
}

function isDescendant(nodeId: string, targetId: string, allNodes: TreeNode[]): boolean {
  const target = allNodes.find(n => n.id === targetId);
  if (!target) return false;
  if (target.parentId === nodeId) return true;
  if (!target.parentId) return false;
  return isDescendant(nodeId, target.parentId, allNodes);
}
