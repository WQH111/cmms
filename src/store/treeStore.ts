// src/store/treeStore.ts
import { create } from 'zustand';
import type { TreeNode } from '../types/TreeNode';
import * as treeService from '../services/treeService';
import { clearAllData } from '../services/database';

const MAX_UNDO_HISTORY = 20;

interface UndoEntry {
  label: string;
  snapshot: TreeNode[];
  selectedNodeId: string | null;
}

interface TreeState {
  nodes: TreeNode[];
  selectedNode: TreeNode | null;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  filterLevel: number | null;
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;

  // Actions
  loadNodes: () => Promise<void>;
  selectNode: (node: TreeNode | null) => void;
  setSearchQuery: (query: string) => void;
  setFilterLevel: (level: number | null) => void;
  filterNodesByLevel: (level: number | null) => Promise<void>;
  addNode: (parentId: string | null, level: number, name: string, code: string) => Promise<void>;
  updateNodeData: (id: string, name: string, code: string) => Promise<void>;
  deleteNodeById: (id: string) => Promise<void>;
  searchNodesBy: (query: string) => Promise<void>;
  moveNode: (nodeId: string, newParentId: string | null) => Promise<void>;
  clearAllNodes: () => Promise<number>;
  undoLastAction: () => Promise<void>;
  redoLastAction: () => Promise<void>;
}

function cloneNodes(nodes: TreeNode[]): TreeNode[] {
  return nodes.map(({ children: _children, ...node }) => ({
    ...node,
    customFields: node.customFields ? JSON.parse(JSON.stringify(node.customFields)) : undefined,
  }));
}

export const useTreeStore = create<TreeState>((set, get) => {
  const getStackState = (undoStack: UndoEntry[], redoStack: UndoEntry[]) => ({
    undoStack,
    redoStack,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undoCount: undoStack.length,
    redoCount: redoStack.length,
  });

  const pushUndoEntry = (state: TreeState, entry: UndoEntry) => {
    const undoStack = [...state.undoStack, entry].slice(-MAX_UNDO_HISTORY);
    const redoStack: UndoEntry[] = [];
    return getStackState(undoStack, redoStack);
  };

  const refreshDefaultView = async (): Promise<TreeNode[]> => {
    const nodes = await treeService.getAllNodes();
    set({ nodes, loading: false });
    return nodes;
  };

  return {
    nodes: [],
    selectedNode: null,
    loading: false,
    error: null,
    searchQuery: '',
    filterLevel: null,
    undoStack: [],
    redoStack: [],
    canUndo: false,
    canRedo: false,
    undoCount: 0,
    redoCount: 0,

    loadNodes: async () => {
      set({ loading: true, error: null, searchQuery: '' });
      try {
        await refreshDefaultView();
      } catch (error) {
        set({ error: (error as Error).message, loading: false });
      }
    },

    selectNode: (node) => {
      set({ selectedNode: node });
    },

    setSearchQuery: (query) => {
      set({ searchQuery: query });
    },

    setFilterLevel: (level) => {
      set({ filterLevel: level });
    },

    filterNodesByLevel: async (level) => {
      set({ loading: true, error: null, filterLevel: level, searchQuery: '' });
      try {
        const nodes = level
          ? await treeService.getNodesByLevelWithAncestors(level)
          : await treeService.getAllNodes();
        set({ nodes, loading: false });
      } catch (error) {
        set({ error: (error as Error).message, loading: false });
      }
    },

    addNode: async (parentId, level, name, code) => {
      set({ loading: true, error: null });
      try {
        const snapshot = cloneNodes(await treeService.getAllNodes());
        const createdId = await treeService.createNode({
          parentId,
          level,
          name,
          code,
        });

        const nodes = await refreshDefaultView();
        const createdNode = nodes.find((node) => node.id === createdId) || null;

        set((state) => ({
          selectedNode: createdNode,
          searchQuery: '',
          filterLevel: null,
          ...pushUndoEntry(state, {
            label: 'Create node',
            snapshot,
            selectedNodeId: state.selectedNode?.id ?? null,
          }),
        }));
      } catch (error) {
        set({ error: (error as Error).message, loading: false });
      }
    },

    updateNodeData: async (id, name, code) => {
      set({ loading: true, error: null });
      try {
        const snapshot = cloneNodes(await treeService.getAllNodes());
        await treeService.updateNode(id, { name, code, isModified: true });

        const nodes = await refreshDefaultView();
        const updatedNode = nodes.find((node) => node.id === id) || null;

        set((state) => ({
          selectedNode: updatedNode,
          searchQuery: '',
          filterLevel: null,
          ...pushUndoEntry(state, {
            label: 'Edit node',
            snapshot,
            selectedNodeId: state.selectedNode?.id ?? null,
          }),
        }));
      } catch (error) {
        set({ error: (error as Error).message, loading: false });
      }
    },

    deleteNodeById: async (id) => {
      set({ loading: true, error: null });
      try {
        const snapshot = cloneNodes(await treeService.getAllNodes());
        await treeService.deleteNode(id);

        await refreshDefaultView();
        set((state) => ({
          selectedNode: null,
          searchQuery: '',
          filterLevel: null,
          ...pushUndoEntry(state, {
            label: 'Delete node',
            snapshot,
            selectedNodeId: state.selectedNode?.id ?? null,
          }),
        }));
      } catch (error) {
        set({ error: (error as Error).message, loading: false });
      }
    },

    searchNodesBy: async (query) => {
      const trimmedQuery = query.trim();

      if (!trimmedQuery) {
        set({ searchQuery: '', loading: true, error: null });
        try {
          await refreshDefaultView();
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
        }
        return;
      }

      set({ searchQuery: trimmedQuery, loading: true, error: null });
      try {
        const nodes = await treeService.searchNodes(trimmedQuery);
        set({ nodes, loading: false });
      } catch (error) {
        set({ error: (error as Error).message, loading: false });
      }
    },

    moveNode: async (nodeId, newParentId) => {
      set({ loading: true, error: null });
      try {
        const node = get().nodes.find((item) => item.id === nodeId);
        if (!node) throw new Error('Node not found');

        const snapshot = cloneNodes(await treeService.getAllNodes());

        let newLevel = 1;
        if (newParentId) {
          const newParent = get().nodes.find((item) => item.id === newParentId);
          if (newParent) {
            newLevel = newParent.level + 1;
          }
        }

        await treeService.updateNode(nodeId, {
          isModified: true,
        });

        await treeService.moveNodeTo(nodeId, newParentId, newLevel);

        const nodes = await refreshDefaultView();
        const movedNode = nodes.find((item) => item.id === nodeId) || null;

        set((state) => ({
          selectedNode: movedNode,
          searchQuery: '',
          filterLevel: null,
          ...pushUndoEntry(state, {
            label: 'Move node',
            snapshot,
            selectedNodeId: state.selectedNode?.id ?? null,
          }),
        }));
      } catch (error) {
        set({ error: (error as Error).message, loading: false });
      }
    },

    clearAllNodes: async () => {
      set({ loading: true, error: null });
      try {
        const snapshot = cloneNodes(await treeService.getAllNodes());
        const count = await clearAllData();

        set((state) => ({
          nodes: [],
          selectedNode: null,
          searchQuery: '',
          filterLevel: null,
          loading: false,
          ...pushUndoEntry(state, {
            label: 'Clear all data',
            snapshot,
            selectedNodeId: state.selectedNode?.id ?? null,
          }),
        }));

        return count;
      } catch (error) {
        set({ error: (error as Error).message, loading: false });
        throw error;
      }
    },

    undoLastAction: async () => {
      const lastEntry = get().undoStack[get().undoStack.length - 1];
      if (!lastEntry) return;

      set({ loading: true, error: null });
      try {
        const currentNodes = cloneNodes(await treeService.getAllNodes());
        const currentSelectedNodeId = get().selectedNode?.id ?? null;
        await treeService.replaceAllNodes(cloneNodes(lastEntry.snapshot));

        const nodes = await refreshDefaultView();
        const restoredSelectedNode = lastEntry.selectedNodeId
          ? nodes.find((node) => node.id === lastEntry.selectedNodeId) || null
          : null;

        set((state) => {
          const undoStack = state.undoStack.slice(0, -1);
          const redoStack = [
            ...state.redoStack,
            {
              label: lastEntry.label,
              snapshot: currentNodes,
              selectedNodeId: currentSelectedNodeId,
            },
          ].slice(-MAX_UNDO_HISTORY);

          return {
            selectedNode: restoredSelectedNode,
            searchQuery: '',
            filterLevel: null,
            ...getStackState(undoStack, redoStack),
          };
        });
      } catch (error) {
        set({ error: (error as Error).message, loading: false });
        throw error;
      }
    },

    redoLastAction: async () => {
      const lastEntry = get().redoStack[get().redoStack.length - 1];
      if (!lastEntry) return;

      set({ loading: true, error: null });
      try {
        const currentNodes = cloneNodes(await treeService.getAllNodes());
        const currentSelectedNodeId = get().selectedNode?.id ?? null;
        await treeService.replaceAllNodes(cloneNodes(lastEntry.snapshot));

        const nodes = await refreshDefaultView();
        const restoredSelectedNode = lastEntry.selectedNodeId
          ? nodes.find((node) => node.id === lastEntry.selectedNodeId) || null
          : null;

        set((state) => {
          const redoStack = state.redoStack.slice(0, -1);
          const undoStack = [
            ...state.undoStack,
            {
              label: lastEntry.label,
              snapshot: currentNodes,
              selectedNodeId: currentSelectedNodeId,
            },
          ].slice(-MAX_UNDO_HISTORY);

          return {
            selectedNode: restoredSelectedNode,
            searchQuery: '',
            filterLevel: null,
            ...getStackState(undoStack, redoStack),
          };
        });
      } catch (error) {
        set({ error: (error as Error).message, loading: false });
        throw error;
      }
    },
  };
});
