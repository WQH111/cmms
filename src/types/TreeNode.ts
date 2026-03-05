// src/types/TreeNode.ts
export interface TreeNode {
  id: string;
  parentId: string | null;
  level: number; // 1-16
  name: string;
  code: string;
  description?: string;
  system?: string;
  subSystem?: string;
  sortOrder?: number;
  isNew?: boolean;
  isModified?: boolean;
  createdAt: string;
  updatedAt: string;
  children?: TreeNode[];
}

export interface TreeNodeCreate {
  id?: string; // 可选，用于导入时的临时 ID
  parentId: string | null;
  level: number;
  name: string;
  code: string;
  description?: string;
  system?: string;
  subSystem?: string;
  sortOrder?: number;
}

export interface TreeNodeUpdate {
  name?: string;
  code?: string;
  description?: string;
  system?: string;
  subSystem?: string;
  sortOrder?: number;
  isModified?: boolean;
}
