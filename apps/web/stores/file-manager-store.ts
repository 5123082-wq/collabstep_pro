import { create } from 'zustand';

export type FileObject = {
  id: string;
  organizationId: string;
  projectId: string | null;
  taskId: string | null;
  uploadedBy: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  storageUrl: string;
  sha256: string | null;
  description: string | null;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined data
  uploader?: {
    id: string;
    name: string;
    email: string;
  };
  project?: {
    id: string;
    title: string;
  };
  task?: {
    id: string;
    title: string;
  };
};

export type FolderObject = {
  id: string;
  organizationId: string;
  projectId: string | null;
  taskId: string | null;
  parentId: string | null;
  name: string;
  type: 'project' | 'task' | 'result' | 'custom';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Computed
  fileCount?: number;
  children?: FolderObject[];
};

export type ViewMode = 'list' | 'grid' | 'icons';
export type SortField = 'name' | 'size' | 'modified' | 'type';
export type SortOrder = 'asc' | 'desc';

type FileManagerState = {
  // Data
  files: FileObject[];
  folders: FolderObject[];
  trash: FileObject[];
  
  // Navigation
  currentFolderId: string | null;
  currentPath: FolderObject[];
  
  // Selection
  selectedFileIds: Set<string>;
  selectedFolderIds: Set<string>;
  lastSelectedId: string | null;
  
  // UI state
  viewMode: ViewMode;
  sortField: SortField;
  sortOrder: SortOrder;
  isLoading: boolean;
  isUploading: boolean;
  uploadProgress: number;
  searchQuery: string;
  showTrash: boolean;
  
  // Clipboard
  clipboard: {
    mode: 'copy' | 'cut' | null;
    fileIds: string[];
    folderIds: string[];
  };
  
  // Modals
  previewFileId: string | null;
  shareFileId: string | null;
  renameItemId: string | null;
  renameItemType: 'file' | 'folder' | null;
  showNewFolderDialog: boolean;
};

type FileManagerActions = {
  // Data loading
  setFiles: (files: FileObject[]) => void;
  setFolders: (folders: FolderObject[]) => void;
  setTrash: (files: FileObject[]) => void;
  addFile: (file: FileObject) => void;
  removeFile: (id: string) => void;
  updateFile: (id: string, updates: Partial<FileObject>) => void;
  addFolder: (folder: FolderObject) => void;
  removeFolder: (id: string) => void;
  updateFolder: (id: string, updates: Partial<FolderObject>) => void;
  
  // Navigation
  setCurrentFolderId: (id: string | null) => void;
  setCurrentPath: (path: FolderObject[]) => void;
  navigateToFolder: (folderId: string | null) => void;
  navigateUp: () => void;
  
  // Selection
  selectFile: (id: string, addToSelection?: boolean) => void;
  selectFolder: (id: string, addToSelection?: boolean) => void;
  selectRange: (fromId: string, toId: string) => void;
  toggleFileSelection: (id: string) => void;
  toggleFolderSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  
  // UI state
  setViewMode: (mode: ViewMode) => void;
  setSortField: (field: SortField) => void;
  setSortOrder: (order: SortOrder) => void;
  toggleSortOrder: () => void;
  setIsLoading: (loading: boolean) => void;
  setIsUploading: (uploading: boolean) => void;
  setUploadProgress: (progress: number) => void;
  setSearchQuery: (query: string) => void;
  setShowTrash: (show: boolean) => void;
  
  // Clipboard
  copySelected: () => void;
  cutSelected: () => void;
  clearClipboard: () => void;
  
  // Modals
  openPreview: (fileId: string) => void;
  closePreview: () => void;
  openShare: (fileId: string) => void;
  closeShare: () => void;
  openRename: (id: string, type: 'file' | 'folder') => void;
  closeRename: () => void;
  openNewFolderDialog: () => void;
  closeNewFolderDialog: () => void;
  
  // Helpers
  getSelectedFiles: () => FileObject[];
  getSelectedFolders: () => FolderObject[];
  getCurrentFolder: () => FolderObject | null;
  getFilesInCurrentFolder: () => FileObject[];
  getFoldersInCurrentFolder: () => FolderObject[];
  reset: () => void;
};

const initialState: FileManagerState = {
  files: [],
  folders: [],
  trash: [],
  currentFolderId: null,
  currentPath: [],
  selectedFileIds: new Set(),
  selectedFolderIds: new Set(),
  lastSelectedId: null,
  viewMode: 'list',
  sortField: 'name',
  sortOrder: 'asc',
  isLoading: false,
  isUploading: false,
  uploadProgress: 0,
  searchQuery: '',
  showTrash: false,
  clipboard: {
    mode: null,
    fileIds: [],
    folderIds: [],
  },
  previewFileId: null,
  shareFileId: null,
  renameItemId: null,
  renameItemType: null,
  showNewFolderDialog: false,
};

export const useFileManagerStore = create<FileManagerState & FileManagerActions>((set, get) => ({
  ...initialState,

  // Data loading
  setFiles: (files) => set({ files }),
  setFolders: (folders) => set({ folders }),
  setTrash: (trash) => set({ trash }),
  
  addFile: (file) => set((state) => ({ files: [...state.files, file] })),
  
  removeFile: (id) => set((state) => ({
    files: state.files.filter((f) => f.id !== id),
    selectedFileIds: new Set([...state.selectedFileIds].filter((fid) => fid !== id)),
  })),
  
  updateFile: (id, updates) => set((state) => ({
    files: state.files.map((f) => (f.id === id ? { ...f, ...updates } : f)),
  })),
  
  addFolder: (folder) => set((state) => ({ folders: [...state.folders, folder] })),
  
  removeFolder: (id) => set((state) => ({
    folders: state.folders.filter((f) => f.id !== id),
    selectedFolderIds: new Set([...state.selectedFolderIds].filter((fid) => fid !== id)),
  })),
  
  updateFolder: (id, updates) => set((state) => ({
    folders: state.folders.map((f) => (f.id === id ? { ...f, ...updates } : f)),
  })),

  // Navigation
  setCurrentFolderId: (id) => set({ currentFolderId: id }),
  setCurrentPath: (path) => set({ currentPath: path }),
  
  navigateToFolder: (folderId) => {
    const { folders } = get();
    
    if (folderId === null) {
      set({ currentFolderId: null, currentPath: [] });
      return;
    }
    
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;
    
    // Build path to this folder
    const buildPath = (id: string | null): FolderObject[] => {
      if (!id) return [];
      const f = folders.find((folder) => folder.id === id);
      if (!f) return [];
      return [...buildPath(f.parentId), f];
    };
    
    set({
      currentFolderId: folderId,
      currentPath: buildPath(folderId),
      selectedFileIds: new Set(),
      selectedFolderIds: new Set(),
    });
  },
  
  navigateUp: () => {
    const { currentPath } = get();
    if (currentPath.length <= 1) {
      set({ currentFolderId: null, currentPath: [] });
    } else {
      const parentFolder = currentPath[currentPath.length - 2];
      if (parentFolder) {
        set({
          currentFolderId: parentFolder.id,
          currentPath: currentPath.slice(0, -1),
        });
      }
    }
  },

  // Selection
  selectFile: (id, addToSelection = false) => set((state) => {
    if (addToSelection) {
      const newSelection = new Set(state.selectedFileIds);
      newSelection.add(id);
      return { selectedFileIds: newSelection, lastSelectedId: id };
    }
    return {
      selectedFileIds: new Set([id]),
      selectedFolderIds: new Set(),
      lastSelectedId: id,
    };
  }),
  
  selectFolder: (id, addToSelection = false) => set((state) => {
    if (addToSelection) {
      const newSelection = new Set(state.selectedFolderIds);
      newSelection.add(id);
      return { selectedFolderIds: newSelection, lastSelectedId: id };
    }
    return {
      selectedFolderIds: new Set([id]),
      selectedFileIds: new Set(),
      lastSelectedId: id,
    };
  }),
  
  selectRange: () => {
    // TODO: Implement range selection based on visual order
  },
  
  toggleFileSelection: (id) => set((state) => {
    const newSelection = new Set(state.selectedFileIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    return { selectedFileIds: newSelection, lastSelectedId: id };
  }),
  
  toggleFolderSelection: (id) => set((state) => {
    const newSelection = new Set(state.selectedFolderIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    return { selectedFolderIds: newSelection, lastSelectedId: id };
  }),
  
  selectAll: () => {
    const { files, folders, currentFolderId } = get();
    const currentFiles = files.filter((f) => f.folderId === currentFolderId);
    const currentFolders = folders.filter((f) => f.parentId === currentFolderId);
    set({
      selectedFileIds: new Set(currentFiles.map((f) => f.id)),
      selectedFolderIds: new Set(currentFolders.map((f) => f.id)),
    });
  },
  
  clearSelection: () => set({
    selectedFileIds: new Set(),
    selectedFolderIds: new Set(),
    lastSelectedId: null,
  }),

  // UI state
  setViewMode: (mode) => set({ viewMode: mode }),
  setSortField: (field) => set({ sortField: field }),
  setSortOrder: (order) => set({ sortOrder: order }),
  toggleSortOrder: () => set((state) => ({
    sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc',
  })),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setIsUploading: (uploading) => set({ isUploading: uploading }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setShowTrash: (show) => set({ showTrash: show }),

  // Clipboard
  copySelected: () => set((state) => ({
    clipboard: {
      mode: 'copy',
      fileIds: [...state.selectedFileIds],
      folderIds: [...state.selectedFolderIds],
    },
  })),
  
  cutSelected: () => set((state) => ({
    clipboard: {
      mode: 'cut',
      fileIds: [...state.selectedFileIds],
      folderIds: [...state.selectedFolderIds],
    },
  })),
  
  clearClipboard: () => set({
    clipboard: { mode: null, fileIds: [], folderIds: [] },
  }),

  // Modals
  openPreview: (fileId) => set({ previewFileId: fileId }),
  closePreview: () => set({ previewFileId: null }),
  openShare: (fileId) => set({ shareFileId: fileId }),
  closeShare: () => set({ shareFileId: null }),
  openRename: (id, type) => set({ renameItemId: id, renameItemType: type }),
  closeRename: () => set({ renameItemId: null, renameItemType: null }),
  openNewFolderDialog: () => set({ showNewFolderDialog: true }),
  closeNewFolderDialog: () => set({ showNewFolderDialog: false }),

  // Helpers
  getSelectedFiles: () => {
    const { files, selectedFileIds } = get();
    return files.filter((f) => selectedFileIds.has(f.id));
  },
  
  getSelectedFolders: () => {
    const { folders, selectedFolderIds } = get();
    return folders.filter((f) => selectedFolderIds.has(f.id));
  },
  
  getCurrentFolder: () => {
    const { folders, currentFolderId } = get();
    if (!currentFolderId) return null;
    return folders.find((f) => f.id === currentFolderId) ?? null;
  },
  
  getFilesInCurrentFolder: () => {
    const { files, currentFolderId, searchQuery, sortField, sortOrder } = get();
    // When currentFolderId is null, show ALL files (root "All Files" view)
    // When currentFolderId is set, show only files in that folder
    let result = currentFolderId === null 
      ? files 
      : files.filter((f) => f.folderId === currentFolderId);
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((f) => f.filename.toLowerCase().includes(query));
    }
    
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.filename.localeCompare(b.filename);
          break;
        case 'size':
          cmp = a.sizeBytes - b.sizeBytes;
          break;
        case 'modified':
          cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'type':
          cmp = a.mimeType.localeCompare(b.mimeType);
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    
    return result;
  },
  
  getFoldersInCurrentFolder: () => {
    const { folders, currentFolderId, searchQuery, sortField, sortOrder } = get();
    // When currentFolderId is null (root), show top-level folders (parentId === null)
    let result = folders.filter((f) => f.parentId === currentFolderId);
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(query));
    }
    
    // Sort folders: project -> task -> result -> custom, then by name
    result.sort((a, b) => {
      const typeOrder: Record<FolderObject['type'], number> = {
        project: 0,
        task: 1,
        result: 2,
        custom: 3,
      };
      const typeCmp = typeOrder[a.type] - typeOrder[b.type];
      if (typeCmp !== 0) return typeCmp;
      
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'modified':
          cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        default:
          cmp = a.name.localeCompare(b.name);
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    
    return result;
  },
  
  reset: () => set(initialState),
}));

