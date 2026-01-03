'use client';

import { useEffect, useState, useCallback } from 'react';
import { useFileManagerStore } from '@/stores/file-manager-store';
import { useOrganization } from '@/components/organizations/OrganizationContext';
import {
  FileBreadcrumbs,
  FileToolbar,
  FolderTreeSidebar,
  FileListingView,
  FileUploadZone,
  FilePreviewModal,
  TrashView,
  NewFolderDialog,
  ShareFileDialog,
} from '@/components/files';
import { toast } from '@/lib/ui/toast';

type ShareScope = 'view' | 'download';

type ShareLink = {
  id: string;
  token: string;
  scope: ShareScope;
  expiresAt: string | null;
  createdAt: string;
  url: string;
};

export default function DocsFilesPage() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const { currentOrgId, currentOrganization, isLoading: orgLoading } = useOrganization();
  // Use organization from context
  const organizationId = currentOrgId;

  const {
    setFiles,
    setFolders,
    setTrash,
    setIsLoading,
    showTrash,
    currentFolderId,
    openShare,
    getSelectedFiles,
    addFolder,
    removeFile,
    openNewFolderDialog,
  } = useFileManagerStore();

  // Load files and folders when organization is available
  useEffect(() => {
    // Wait for organization to load
    if (orgLoading || !organizationId) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load folders
        // API returns { ok: true, data: { folders: [...] } }
        const foldersResponse = await fetch(`/api/files/folders?organizationId=${organizationId}`);
        if (foldersResponse.ok) {
          const foldersData = await foldersResponse.json();
          const folders = foldersData.data?.folders ?? foldersData.folders ?? [];
          setFolders(folders);
        }

        // Load files
        // API returns { ok: true, data: { files: [...] } }
        const filesResponse = await fetch(`/api/files/org/${organizationId}`);
        if (filesResponse.ok) {
          const filesData = await filesResponse.json();
          const files = filesData.data?.files ?? filesData.files ?? [];
          setFiles(files);
        }

        // Load trash
        // API returns { ok: true, data: { files: [...] } }
        const trashResponse = await fetch(`/api/files/trash?organizationId=${organizationId}`);
        if (trashResponse.ok) {
          const trashData = await trashResponse.json();
          const trashFiles = trashData.data?.files ?? trashData.files ?? [];
          setTrash(trashFiles);
        }
      } catch (error) {
        console.error('Error loading files:', error);
        toast('Не удалось загрузить файлы', 'warning');
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [organizationId, orgLoading, setFiles, setFolders, setTrash, setIsLoading]);

  const handleUploadClick = useCallback(() => {
    setShowUploadModal(true);
  }, []);

  const handleCreateFolder = useCallback(async (name: string, parentId: string | null) => {
    if (!organizationId) throw new Error('Организация не загружена');

    const response = await fetch('/api/files/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        parentId,
        organizationId,
        type: 'custom',
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Не удалось создать папку');
    }

    const data = await response.json();
    addFolder(data.folder);
    toast('Папка создана', 'success');
  }, [organizationId, addFolder]);

  const handleDownloadFile = useCallback(async (fileId: string) => {
    try {
      // Get file info first
      const response = await fetch(`/api/files/${fileId}`);
      if (!response.ok) throw new Error('File not found');
      
      const { file } = await response.json();
      
      // Create download link
      const link = document.createElement('a');
      link.href = file.storageUrl;
      link.download = file.filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      toast('Не удалось скачать файл', 'warning');
    }
  }, []);

  const handleDownloadSelected = useCallback(() => {
    const selectedFiles = getSelectedFiles();
    selectedFiles.forEach((file) => {
      void handleDownloadFile(file.id);
    });
  }, [getSelectedFiles, handleDownloadFile]);

  const handleShareSelected = useCallback(() => {
    const selectedFiles = getSelectedFiles();
    if (selectedFiles.length === 1 && selectedFiles[0]) {
      openShare(selectedFiles[0].id);
    }
  }, [getSelectedFiles, openShare]);

  const handleDeleteFile = useCallback(async (fileId: string) => {
    if (!confirm('Переместить файл в корзину?')) return;

    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Не удалось удалить файл');
      }

      removeFile(fileId);
      toast('Файл перемещён в корзину', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Не удалось удалить файл', 'warning');
    }
  }, [removeFile]);

  const handleDeleteFolder = useCallback(async (folderId: string) => {
    if (!confirm('Удалить папку и все файлы в ней?')) return;

    try {
      const response = await fetch(`/api/files/folders/${folderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Не удалось удалить папку');
      }

      toast('Папка удалена', 'success');
      // Reload data
      window.location.reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Не удалось удалить папку', 'warning');
    }
  }, []);

  const handleRestoreFile = useCallback(async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}/restore`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Не удалось восстановить файл');
      }

      toast('Файл восстановлен', 'success');
      // Reload data
      window.location.reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Не удалось восстановить файл', 'warning');
    }
  }, []);

  const handlePermanentDelete = useCallback(async (fileId: string) => {
    if (!confirm('Удалить файл навсегда? Это действие нельзя отменить.')) return;

    try {
      const response = await fetch(`/api/files/${fileId}?permanent=true`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Не удалось удалить файл');
      }

      toast('Файл удалён навсегда', 'success');
      // Reload data
      window.location.reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Не удалось удалить файл', 'warning');
    }
  }, []);

  const handleCreateShare = useCallback(async (fileId: string, scope: ShareScope, expiresIn: number | null): Promise<ShareLink> => {
    const response = await fetch('/api/files/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileId,
        scope,
        expiresInHours: expiresIn,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Не удалось создать ссылку');
    }

    const data = await response.json();
    return {
      ...data.share,
      url: `${window.location.origin}/share/${data.share.token}`,
    };
  }, []);

  const handleDeleteShare = useCallback(async (shareId: string) => {
    const response = await fetch(`/api/files/share/${shareId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Не удалось удалить ссылку');
    }
  }, []);

  const handlePaste = useCallback(async () => {
    // TODO: Implement paste functionality
    toast('Вставка файлов пока не реализована', 'info');
  }, []);

  const handleUploadComplete = useCallback(() => {
    setShowUploadModal(false);
  }, []);

  // Page title with organization name
  const pageTitle = currentOrganization 
    ? `Файлы — ${currentOrganization.name}`
    : 'Файлы';

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-neutral-800 px-6 py-4">
        <h1 className="text-xl font-semibold text-white">{pageTitle}</h1>
        <p className="mt-1 text-sm text-neutral-400">
          {currentOrganization 
            ? `Файловое хранилище организации ${currentOrganization.name}`
            : 'Единое файловое хранилище для команды и подрядчиков'
          }
        </p>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Folder tree */}
        <FolderTreeSidebar 
          className="w-64 flex-shrink-0 border-r border-neutral-800 bg-neutral-950/50" 
          onDeleteFolder={handleDeleteFolder}
        />

        {/* Main area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Breadcrumbs */}
          <div className="border-b border-neutral-800 px-6">
            <FileBreadcrumbs />
          </div>

          {/* Toolbar */}
          <div className="border-b border-neutral-800 px-6 py-3">
            <FileToolbar
              onUploadClick={handleUploadClick}
              onCreateFolder={openNewFolderDialog}
              onDownload={handleDownloadSelected}
              onShare={handleShareSelected}
              onPaste={handlePaste}
            />
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-6">
            {showTrash ? (
              <TrashView
                onRestore={handleRestoreFile}
                onPermanentDelete={handlePermanentDelete}
              />
            ) : (
              <FileListingView
                onUploadClick={handleUploadClick}
                onDownloadFile={handleDownloadFile}
                onDeleteFile={handleDeleteFile}
                onDeleteFolder={handleDeleteFolder}
              />
            )}
          </div>
        </div>
      </div>

      {/* Upload modal */}
      {showUploadModal && organizationId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowUploadModal(false);
            }
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Загрузить файлы</h2>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white"
              >
                ✕
              </button>
            </div>
            <FileUploadZone
              organizationId={organizationId}
              folderId={currentFolderId}
              onUploadComplete={handleUploadComplete}
            />
          </div>
        </div>
      )}

      {/* Preview modal */}
      <FilePreviewModal
        onDownload={handleDownloadFile}
        onShare={(fileId) => openShare(fileId)}
      />

      {/* New folder dialog */}
      <NewFolderDialog
        {...(organizationId ? { organizationId } : {})}
        onCreateFolder={handleCreateFolder}
      />

      {/* Share dialog */}
      <ShareFileDialog
        onCreateShare={handleCreateShare}
        onDeleteShare={handleDeleteShare}
      />
    </div>
  );
}
