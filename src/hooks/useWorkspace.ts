import { useState, useEffect, useCallback } from 'react';
import { Workspace, FileNode } from '../types';
import { initialWorkspaces, findFileByPath, updateFileContent, addNewNodeToTree, deleteNodeFromTree, flattenFileTree, moveNodeInTree, createRecursiveFoldersInTree } from '../utils/initialWorkspaces';

const LOCAL_STORAGE_PROJECTS_KEY = 'workspace_ide_projects';
const LOCAL_STORAGE_ACTIVE_ID_KEY = 'workspace_ide_active_id';

export function useWorkspace() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_PROJECTS_KEY);
    return saved ? JSON.parse(saved) : initialWorkspaces;
  });

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_ACTIVE_ID_KEY);
    return saved || initialWorkspaces[0]?.id || '';
  });

  // Persist workspaces
  useEffect(() => {
    if (workspaces.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(workspaces));
    }
  }, [workspaces]);

  // Persist active workspace ID
  useEffect(() => {
    if (activeWorkspaceId) {
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_ID_KEY, activeWorkspaceId);
    }
  }, [activeWorkspaceId]);

  const currentWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  const handleSelectWorkspace = useCallback((workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
  }, []);

  const handleAddWorkspace = useCallback(() => {
    const newWorkspace: Workspace = {
      id: `ws-${Date.now()}`,
      name: `Proyecto ${workspaces.length + 1}`,
      fileTree: [],
      activeFilePath: null,
      chatHistory: [],
      gitBaseTree: undefined
    };
    setWorkspaces(prev => [...prev, newWorkspace]);
    setActiveWorkspaceId(newWorkspace.id);
  }, [workspaces.length]);

  const handleImportLocalWorkspace = useCallback(async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      return new Promise<void>((resolve, reject) => {
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) {
            reject(new Error('No file selected'));
            return;
          }

          try {
            const content = await file.text();
            const importedWorkspace = JSON.parse(content) as Workspace;
            
            if (!importedWorkspace.id || !importedWorkspace.name || !Array.isArray(importedWorkspace.fileTree)) {
              alert('Archivo JSON inválido. Debe contener un workspace válido.');
              reject(new Error('Invalid workspace format'));
              return;
            }

            importedWorkspace.id = `ws-imported-${Date.now()}`;
            importedWorkspace.name = `${importedWorkspace.name} (Importado)`;
            
            setWorkspaces(prev => [...prev, importedWorkspace]);
            setActiveWorkspaceId(importedWorkspace.id);
            resolve();
          } catch (err) {
            alert('Error al parsear el archivo JSON.');
            reject(err);
          }
        };
        input.click();
      });
    } catch (error) {
      console.error('Error importing workspace:', error);
      throw error;
    }
  }, []);

  const handleSelectFile = useCallback((filePath: string) => {
    setWorkspaces(prev => prev.map(ws => {
      if (ws.id === activeWorkspaceId) {
        return { ...ws, activeFilePath: filePath };
      }
      return ws;
    }));
  }, [activeWorkspaceId]);

  const handleContentChange = useCallback((filePath: string, newContent: string) => {
    setWorkspaces(prev => prev.map(ws => {
      if (ws.id === activeWorkspaceId) {
        const updatedTree = updateFileContent(ws.fileTree, filePath, newContent);
        return { ...ws, fileTree: updatedTree };
      }
      return ws;
    }));
  }, [activeWorkspaceId]);

  const handleAddFileOrFolder = useCallback((name: string, type: 'file' | 'directory', parentPath: string | null) => {
    let computedPath = name;
    if (parentPath) {
      computedPath = `${parentPath}/${name}`;
    }

    const newNode: FileNode = {
      name,
      path: computedPath,
      type,
      ...(type === 'file' ? { content: `// Archivo: ${name}\n\n` } : { children: [] })
    };

    setWorkspaces(prev => prev.map(ws => {
      if (ws.id === activeWorkspaceId) {
        const updatedTree = addNewNodeToTree(ws.fileTree, parentPath, newNode);
        return {
          ...ws,
          fileTree: updatedTree,
          activeFilePath: type === 'file' ? computedPath : ws.activeFilePath
        };
      }
      return ws;
    }));

    return computedPath;
  }, [activeWorkspaceId]);

  const handleDeleteFileOrFolder = useCallback((pathStr: string) => {
    setWorkspaces(prev => prev.map(ws => {
      if (ws.id === activeWorkspaceId) {
        const updatedTree = deleteNodeFromTree(ws.fileTree, pathStr);
        const isOpenDeleted = ws.activeFilePath === pathStr;
        return {
          ...ws,
          fileTree: updatedTree,
          activeFilePath: isOpenDeleted ? null : ws.activeFilePath
        };
      }
      return ws;
    }));
  }, [activeWorkspaceId]);

  const handleMoveFileOrFolder = useCallback((sourcePath: string, targetParentPath: string | null) => {
    setWorkspaces(prev => prev.map(ws => {
      if (ws.id === activeWorkspaceId) {
        const updatedTree = moveNodeInTree(ws.fileTree, sourcePath, targetParentPath);
        return { ...ws, fileTree: updatedTree };
      }
      return ws;
    }));
  }, [activeWorkspaceId]);

  const handleCreateFoldersRecursively = useCallback((folders: string[]) => {
    setWorkspaces(prev => prev.map(ws => {
      if (ws.id === activeWorkspaceId) {
        const updatedTree = createRecursiveFoldersInTree(ws.fileTree, folders);
        return { ...ws, fileTree: updatedTree };
      }
      return ws;
    }));
  }, [activeWorkspaceId]);

  const handleUpdateWorkspaceGit = useCallback((updatedFields: Partial<Workspace>) => {
    setWorkspaces(prev => prev.map(ws => {
      if (ws.id === activeWorkspaceId) {
        return { ...ws, ...updatedFields };
      }
      return ws;
    }));
  }, [activeWorkspaceId]);

  return {
    workspaces,
    setWorkspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    currentWorkspace,
    handleSelectWorkspace,
    handleAddWorkspace,
    handleImportLocalWorkspace,
    handleSelectFile,
    handleContentChange,
    handleAddFileOrFolder,
    handleDeleteFileOrFolder,
    handleMoveFileOrFolder,
    handleCreateFoldersRecursively,
    handleUpdateWorkspaceGit
  };
}
