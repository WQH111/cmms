// src/types/TreeNode.ts

// Custom fields structure (cf1-cf50)
export interface CustomFields {
  [key: string]: {
    label?: string;
    value?: string;
    labelHeader?: string;
    valueHeader?: string;
  };
}

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

  // Basic identification fields
  objectId?: string;
  originalId?: string;
  siteCode?: string;

  // Asset management fields
  assetCategory?: string;
  itemCategory?: string;
  partNumber?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  notes?: string;
  quantity?: string;
  barcode?: string;
  composed?: string;
  emissionPoint?: string;
  costCenter?: string;

  // Custom fields (cf1-cf29)
  customFields?: CustomFields;
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

  // Basic identification fields
  objectId?: string;
  originalId?: string;
  siteCode?: string;

  // Asset management fields
  assetCategory?: string;
  itemCategory?: string;
  partNumber?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  notes?: string;
  quantity?: string;
  barcode?: string;
  composed?: string;
  emissionPoint?: string;
  costCenter?: string;

  // Custom fields
  customFields?: CustomFields;
}

export interface TreeNodeUpdate {
  name?: string;
  code?: string;
  description?: string;
  system?: string;
  subSystem?: string;
  sortOrder?: number;
  isModified?: boolean;

  // Basic identification fields
  objectId?: string;
  originalId?: string;
  siteCode?: string;

  // Asset management fields
  assetCategory?: string;
  itemCategory?: string;
  partNumber?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  notes?: string;
  quantity?: string;
  barcode?: string;
  composed?: string;
  emissionPoint?: string;
  costCenter?: string;

  // Custom fields
  customFields?: CustomFields;
}
