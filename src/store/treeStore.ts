// src/store/treeStore.ts
import { create } from 'zustand';
import type { TreeNode } from '../types/TreeNode';
import * as treeService from '../services/treeService';

interface TreeState {
  nodes: TreeNode[];
  selectedNode: TreeNode | null;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  filterLevel: number | null;

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
}

export const useTreeStore = create<TreeState>((set, get) => ({
  nodes: [],
  selectedNode: null,
  loading: false,
  error: null,
  searchQuery: '',
  filterLevel: null,

  loadNodes: async () => {
    set({ loading: true, error: null });
    try {
      const nodes = await treeService.getAllNodes();
      set({ nodes, loading: false });
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
    set({ loading: true, error: null, filterLevel: level });
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
      await treeService.createNode({
        parentId,
        level,
        name,
        code,
      });
      await get().loadNodes();
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  updateNodeData: async (id, name, code) => {
    set({ loading: true, error: null });
    try {
      await treeService.updateNode(id, { name, code, isModified: true });
      await get().loadNodes();
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  deleteNodeById: async (id) => {
    set({ loading: true, error: null });
    try {
      await treeService.deleteNode(id);
      await get().loadNodes();
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  searchNodesBy: async (query) => {
    set({ loading: true, error: null });
    try {
      const nodes = await treeService.searchNodes(query);
      set({ nodes, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  moveNode: async (nodeId, newParentId) => {
    set({ loading: true, error: null });
    try {
      const node = get().nodes.find(n => n.id === nodeId);
      if (!node) throw new Error('Node not found');

      // 计算新的层级
      let newLevel = 1;
      if (newParentId) {
        const newParent = get().nodes.find(n => n.id === newParentId);
        if (newParent) {
          newLevel = newParent.level + 1;
        }
      }

      // 更新节点的 parentId 和 level
      await treeService.updateNode(nodeId, {
        isModified: true,
      });

      // 更新 parentId (需要在 treeService 中添加支持)
      await treeService.moveNodeTo(nodeId, newParentId, newLevel);

      await get().loadNodes();
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
}));
