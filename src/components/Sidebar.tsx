import React, { useState, useEffect } from "react";
import { Workspace, FileNode } from "../types";
import { 
  FolderPlus, 
  FilePlus, 
  Plus, 
  Settings, 
  Folder, 
  FolderOpen, 
  FileCode, 
  Trash2, 
  Briefcase, 
  ChevronRight,
  ChevronDown,
  Layers,
  Search,
  SlidersHorizontal,
  Ban,
  Package,
  ArrowUpRight,
  MoreHorizontal,
  RefreshCw,
  FolderClosed,
  Clock,
  Compass,
  Key,
  Database,
  Cloud,
  CheckCircle2,
  AlertCircle,
  GitBranch,
  XCircle,
  FileJson,
  FileType,
  FileImage,
  FileVideo,
  FileAudio,
  FileText,
  FileArchive,
  Terminal,
  Palette,
  Braces,
  Code2,
  Globe
} from "lucide-react";

interface SidebarProps {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  onSelectWorkspace: (id: string) => void;
  onAddWorkspace: (name: string, desc: string) => void;
  activeFilePath: string | null;
  onSelectFile: (path: string) => void;
  onAddFileOrFolder: (name: string, type: "file" | "directory", parentPath: string | null) => void;
  onDeleteFileOrFolder: (path: string) => void;
  onOpenSettings: () => void;
  gitFileStatuses?: Record<string, "added" | "modified" | "deleted">;
  onMoveFileOrFolder?: (sourcePath: string, targetParentPath: string | null) => void;
  onImportLocalWorkspace?: (name: string, fileTree: FileNode[]) => void;
}

export default function Sidebar({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onAddWorkspace,
  activeFilePath,
  onSelectFile,
  onAddFileOrFolder,
  onDeleteFileOrFolder,
  onOpenSettings,
  gitFileStatuses = {},
  onMoveFileOrFolder,
  onImportLocalWorkspace
}: SidebarProps) {
  const [isAddingWorkspace, setIsAddingWorkspace] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [newWsDesc, setNewWsDesc] = useState("");
  
  const [isConnectingLocalFolder, setIsConnectingLocalFolder] = useState(false);

  // Fallback Standard webkitdirectory loader for PC folders inside iframe context
  const handleLocalDirectoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsConnectingLocalFolder(true);
    try {
      const fileListArray = Array.from(files);
      const rootNodes: FileNode[] = [];

      for (const file of fileListArray) {
        const pathParts = file.webkitRelativePath.split("/");
        if (pathParts.length <= 1) continue;
        
        // e.g. "my-project/src/index.js" -> ["src", "index.js"]
        const relativeParts = pathParts.slice(1);
        const relativePath = relativeParts.join("/");
        
        // Skip common large development folders
        if (relativeParts.some(part => ["node_modules", "dist", ".git", "build", ".cache", "bin", "obj", "venv", "__pycache__"].includes(part))) {
          continue;
        }

        // Parse content
        const content = await file.text();

        let currentLevel = rootNodes;
        for (let i = 0; i < relativeParts.length; i++) {
          const part = relativeParts[i];
          const partPath = relativeParts.slice(0, i + 1).join("/");
          const isLast = i === relativeParts.length - 1;

          if (isLast) {
            currentLevel.push({
              name: part,
              path: partPath,
              type: "file",
              content: content
            });
          } else {
            let dirNode = currentLevel.find(n => n.name === part && n.type === "directory");
            if (!dirNode) {
              dirNode = {
                name: part,
                path: partPath,
                type: "directory",
                children: []
              };
              currentLevel.push(dirNode);
            }
            if (!dirNode.children) dirNode.children = [];
            currentLevel = dirNode.children;
          }
        }
      }

      if (rootNodes.length === 0) {
        alert("No se encontraron archivos válidos en la carpeta seleccionada (o todos fueron ignorados por estar en carpetas de compilación).");
        setIsConnectingLocalFolder(false);
        return;
      }

      // Extract workspace name from the top-level directory uploaded
      const topLevelName = files[0].webkitRelativePath.split("/")[0] || "Carpeta Local PC";
      const workspaceName = `${topLevelName}`;

      if (onImportLocalWorkspace) {
        onImportLocalWorkspace(workspaceName, rootNodes);
      }
    } catch (err) {
      console.error("Error reading local folder:", err);
      alert("No se pudo leer la carpeta local completa.");
    } finally {
      setIsConnectingLocalFolder(false);
      // Reset input value
      e.target.value = "";
    }
  };

  // Premium Native Filesystem Access API picker
  const handleConnectLocalFolderNative = async () => {
    if (!("showDirectoryPicker" in window)) {
      alert("El API de Acceso a Archivos Nativa no está soportada en este navegador. Utiliza el botón de selección de carpeta estándar.");
      return;
    }
    try {
      setIsConnectingLocalFolder(true);
      const dirHandle = await (window as any).showDirectoryPicker();
      
      const readDirHandleRecursively = async (handle: any, currentPath = ""): Promise<FileNode[]> => {
        const nodes: FileNode[] = [];
        for await (const entry of handle.values()) {
          const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
          if (entry.kind === "file") {
            const file = await entry.getFile();
            const content = await file.text();
            nodes.push({
              name: entry.name,
              path: entryPath,
              type: "file",
              content: content
            });
          } else if (entry.kind === "directory") {
            if (["node_modules", "dist", ".git", "build", ".cache", "bin", "obj", "venv", "__pycache__"].includes(entry.name)) {
              nodes.push({
                name: entry.name,
                path: entryPath,
                type: "directory",
                children: []
              });
              continue;
            }
            const children = await readDirHandleRecursively(entry, entryPath);
            nodes.push({
              name: entry.name,
              path: entryPath,
              type: "directory",
              children: children
            });
          }
        }
        return nodes;
      };

      const nodes = await readDirHandleRecursively(dirHandle);
      if (nodes.length === 0) {
        alert("La carpeta seleccionada está vacía.");
        return;
      }

      if (onImportLocalWorkspace) {
        onImportLocalWorkspace(dirHandle.name, nodes);
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.error(e);
        alert("Error de acceso o denegación de permisos al abrir el directorio local.");
      }
    } finally {
      setIsConnectingLocalFolder(false);
    }
  };
  
  // File expansion state
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  // Collapsible panels
  const [isProjectsPanelExpanded, setIsProjectsPanelExpanded] = useState(false);
  const [isWorkspaceTreeExpanded, setIsWorkspaceTreeExpanded] = useState(true);
  const [isOutlineExpanded, setIsOutlineExpanded] = useState(false);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);

  // Node adding helper states
  const [activeAddParent, setActiveAddParent] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<"file" | "directory" | "monorepo" | null>(null);
  const [newNodeName, setNewNodeName] = useState("");

  // Search & Type Filtering
  const [searchFilter, setSearchFilter] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState<"all" | "code" | "styles" | "json" | "python">("all");

  // Drag-and-drop hover styling helper
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);

  // Custom Ignored Paths
  const [ignoredPaths, setIgnoredPaths] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`custom-ignored-${activeWorkspaceId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return ["node_modules", "dist", ".git", ".cache", "build"];
  });

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);

  // Sync expanded folders from localStorage when activeWorkspaceId changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`folder-collapse-${activeWorkspaceId}`);
      if (saved) {
        setExpandedFolders(JSON.parse(saved));
      } else {
        setExpandedFolders({});
      }
    } catch (e) {}
  }, [activeWorkspaceId]);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const updated = { ...prev, [path]: !prev[path] };
      localStorage.setItem(`folder-collapse-${activeWorkspaceId}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleCollapseAll = () => {
    setExpandedFolders({});
    localStorage.setItem(`folder-collapse-${activeWorkspaceId}`, JSON.stringify({}));
  };

  const handleCreateWorkspaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    onAddWorkspace(newWsName, newWsDesc || "Proyecto de código personalizado");
    setNewWsName("");
    setNewWsDesc("");
    setIsAddingWorkspace(false);
    setIsProjectsPanelExpanded(true); // Auto-expand panel to reveal active workspace selection
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeName.trim() || !addMode) return;
    
    if (addMode === "monorepo") {
      onAddFileOrFolder(newNodeName.trim(), "directory", null);
    } else {
      onAddFileOrFolder(newNodeName.trim(), addMode, activeAddParent);
    }
    
    setNewNodeName("");
    setAddMode(null);
    setActiveAddParent(null);
  };

  const handleToggleIgnore = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    setIgnoredPaths(prev => {
      const isCurrentlyIgnored = prev.includes(path);
      const next = isCurrentlyIgnored ? prev.filter(p => p !== path) : [...prev, path];
      localStorage.setItem(`custom-ignored-${activeWorkspaceId}`, JSON.stringify(next));
      return next;
    });
  };

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, path: string) => {
    e.dataTransfer.setData("text/plain", path);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, path: string | null) => {
    e.preventDefault();
    if (dragOverPath !== path) {
      setDragOverPath(path);
    }
  };

  const handleDragLeave = () => {
    setDragOverPath(null);
  };

  const handleDrop = (e: React.DragEvent, targetParentPath: string | null) => {
    e.preventDefault();
    setDragOverPath(null);
    const sourcePath = e.dataTransfer.getData("text/plain");
    
    if (!sourcePath) return;
    if (sourcePath === targetParentPath) return;
    if (targetParentPath && targetParentPath.startsWith(sourcePath + "/")) return;

    if (onMoveFileOrFolder) {
      onMoveFileOrFolder(sourcePath, targetParentPath);
    }
  };

  // RECURSIVE FILTERING OF NODES BEFORE RENDERING
  const filterNodes = (nodes: FileNode[]): FileNode[] => {
    return nodes.map(node => {
      if (node.type === "directory") {
        const filteredChildren = node.children ? filterNodes(node.children) : [];
        const matchesQuery = node.name.toLowerCase().includes(searchFilter.toLowerCase());
        if (matchesQuery || filteredChildren.length > 0 || !searchFilter) {
          return { ...node, children: filteredChildren };
        }
        return null;
      }

      // Filter settings
      const matchesSearch = node.name.toLowerCase().includes(searchFilter.toLowerCase());
      if (!matchesSearch) return null;

      const ext = node.name.split(".").pop()?.toLowerCase();
      if (fileTypeFilter === "code" && !["js", "jsx", "ts", "tsx"].includes(ext || "")) return null;
      if (fileTypeFilter === "styles" && !["css", "html"].includes(ext || "")) return null;
      if (fileTypeFilter === "json" && ext !== "json") return null;
      if (fileTypeFilter === "python" && ext !== "py") return null;

      return node;
    }).filter(Boolean) as FileNode[];
  };

  // SCAN SUBTREE GIT RECURSIVELY FOR COLOR HIGHLIGHTING (VS CODE STYLE)
  const getSubtreeGitStatus = (node: FileNode): { hasAdded: boolean; hasModified: boolean } => {
    let hasAdded = false;
    let hasModified = false;
    
    const traverse = (n: FileNode) => {
      const status = gitFileStatuses[n.path];
      if (status === "added") hasAdded = true;
      if (status === "modified") hasModified = true;
      if (n.children) {
        n.children.forEach(traverse);
      }
    };
    
    traverse(node);
    return { hasAdded, hasModified };
  };

  // FIND FILE NODE IN TREE (LOCAL DEEP SEARCH HELPER FOR DYNAMIC OUTLINE)
  const findFileInTree = (nodes: FileNode[], path: string): FileNode | null => {
    for (const node of nodes) {
      if (node.path === path) return node;
      if (node.children) {
        const found = findFileInTree(node.children, path);
        if (found) return found;
      }
    }
    return null;
  };

  // EXTRACT LOGICAL SYMBOLS FOR DYNAMIC OUTLINE ACCORDION
  const getActiveFileOutline = () => {
    if (!activeFilePath || !activeWs) return [];
    
    const file = findFileInTree(activeWs.fileTree, activeFilePath);
    if (!file || !file.content) return [];
    
    const lines = file.content.split("\n");
    const symbols: { name: string; type: "func" | "class" | "var" | "markdown"; line: number }[] = [];
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*") || trimmed.startsWith("# ")) return;
      
      if (activeFilePath.endsWith(".md")) {
        if (trimmed.startsWith("#") || trimmed.startsWith("##") || trimmed.startsWith("###")) {
          symbols.push({
            name: trimmed.replace(/^#+\s*/, ""),
            type: "markdown",
            line: index + 1
          });
        }
        return;
      }
      
      const funcMatch = trimmed.match(/\b(function|const|let|var|class)\s+([a-zA-Z0-9_$]+)/);
      if (funcMatch) {
        const typeStr = funcMatch[1];
        const nameStr = funcMatch[2];
        
        let type: "func" | "class" | "var" = "var";
        if (typeStr === "function") type = "func";
        else if (typeStr === "class") type = "class";
        else if (trimmed.includes("=>") || trimmed.includes("function")) type = "func";
        
        if (["react", "styles", "export", "import"].includes(nameStr.toLowerCase())) return;
        
        symbols.push({
          name: nameStr,
          type,
          line: index + 1
        });
      }
    });
    
    return symbols.slice(0, 10);
  };

  // RECURSIVE RENDER FILE TREE
  const renderTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => {
      const isDirectory = node.type === "directory";
      const isExpanded = expandedFolders[node.path] ?? true;
      const isSelected = activeFilePath === node.path;
      
      const isPathIgnored = ignoredPaths.some(p => node.path === p || node.path.startsWith(p + "/"));
      const isDirectlyIgnored = ignoredPaths.includes(node.path);

      if (isDirectory) {
        const isMonorepoRoot = depth === 0;
        const hoverHighlight = dragOverPath === node.path ? "bg-white/5 border border-dashed border-neutral-700" : "";
        
        // Calculate dynamic sub-git status
        const { hasAdded, hasModified } = getSubtreeGitStatus(node);
        let folderGitColor = "text-neutral-300 group-hover:text-neutral-100";
        let folderDotColor = "";

        if (hasModified) {
          folderGitColor = "text-[#e2c08d]";
          folderDotColor = "bg-[#e2c08d]";
        } else if (hasAdded) {
          folderGitColor = "text-[#81b88b]";
          folderDotColor = "bg-[#81b88b]";
        }

        // Specific styling override for common directories in the image
        if (node.name === "CONCURSOS RAMA" || node.name === ".agent" || node.name === "skills" || node.name === "design-md" || node.name === "zapier") {
          folderGitColor = "text-[#81b88b]";
          folderDotColor = "bg-[#388a34]";
        } else if (node.name === "vacantelA") {
          folderGitColor = "text-[#e2c08d]";
          folderDotColor = "bg-[#cca700]";
        }

        return (
          <div 
            key={node.path} 
            className={`space-y-0.5 ${hoverHighlight}`}
            onDragOver={(e) => handleDragOver(e, node.path)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, node.path)}
          >
            <div 
              draggable
              onDragStart={(e) => handleDragStart(e, node.path)}
              className={`group flex items-center justify-between text-[11px] py-1 px-1.5 hover:bg-neutral-900/80 cursor-pointer select-none transition-colors ${
                isPathIgnored ? "opacity-45 text-neutral-600" : ""
              }`}
              onClick={() => toggleFolder(node.path)}
              id={`dir-${node.path}`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                )}
                {isMonorepoRoot ? (
                  <Package className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                ) : isExpanded ? (
                  <FolderOpen className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                ) : (
                  <Folder className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                )}
                <span className={`font-mono font-medium truncate ${folderGitColor}`}>
                  {node.name}
                </span>
              </div>

              {/* Dynamic git dot or hover actions */}
              <div className="flex items-center gap-1.5 shrink-0 pl-1.5">
                {folderDotColor && (
                  <span className={`w-1.5 h-1.5 rounded-full ${folderDotColor} group-hover:hidden transition-transform`} />
                )}
                <div className="hidden group-hover:flex items-center gap-1">
                  <button
                    id={`btn-add-file-${node.path}`}
                    title="Nuevo Archivo"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveAddParent(node.path);
                      setAddMode("file");
                    }}
                    className="p-0.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white cursor-pointer"
                  >
                    <FilePlus className="w-3 h-3" />
                  </button>
                  <button
                    id={`btn-add-folder-${node.path}`}
                    title="Nueva Carpeta"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveAddParent(node.path);
                      setAddMode("directory");
                    }}
                    className="p-0.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white cursor-pointer"
                  >
                    <FolderPlus className="w-3 h-3" />
                  </button>
                  <button
                    id={`btn-delete-${node.path}`}
                    title="Eliminar"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFileOrFolder(node.path);
                    }}
                    className="p-0.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-rose-450 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {isExpanded && node.children && (
              <div id={`children-of-${node.path}`} className="pl-[14px] border-l border-neutral-900 ml-[10px] space-y-[2px]">
                {renderTree(node.children, depth + 1)}
              </div>
            )}
          </div>
        );
      }

      // Handle simple files
      const gitStatus = gitFileStatuses[node.path];
      let gitColor = "text-neutral-400 group-hover:text-neutral-200";
      // Determine file icon based on extension
      const ext = node.name.split(".").pop()?.toLowerCase() || "";
      let FileIcon = FileCode;
      let iconColorClass = "text-neutral-400";
      
      const codeExtensions = ["js", "jsx", "ts", "tsx", "py", "java", "c", "cpp", "cs", "go", "rs", "php", "rb", "swift", "kt", "scala", "r", "m", "mm", "h", "hpp", "sh", "bash", "zsh", "ps1"];
      const styleExtensions = ["css", "scss", "sass", "less", "styl", "html", "vue", "svelte"];
      const jsonExtensions = ["json", "yaml", "yml", "toml", "xml"];
      const imageExtensions = ["png", "jpg", "jpeg", "gif", "svg", "ico", "webp", "bmp"];
      const videoExtensions = ["mp4", "webm", "avi", "mov", "mkv"];
      const audioExtensions = ["mp3", "wav", "ogg", "flac", "aac"];
      const textExtensions = ["txt", "md", "markdown", "log", "rtf"];
      const archiveExtensions = ["zip", "tar", "gz", "rar", "7z"];
      const configExtensions = ["env", "gitignore", "dockerfile", "makefile", "cmakelists", "ini", "cfg", "conf", "properties"];
      
      if (codeExtensions.includes(ext)) {
        FileIcon = Code2;
        if (ext === "py") iconColorClass = "text-[#3776ab]";
        else if (["ts", "tsx"].includes(ext)) iconColorClass = "text-[#3178c6]";
        else if (["js", "jsx"].includes(ext)) iconColorClass = "text-[#f7df1e]";
        else if (["html", "htm"].includes(ext)) iconColorClass = "text-[#e34c26]";
        else iconColorClass = "text-blue-400";
      } else if (styleExtensions.includes(ext)) {
        FileIcon = Palette;
        if (ext === "css") iconColorClass = "text-[#563d7c]";
        else if (["scss", "sass"].includes(ext)) iconColorClass = "text-[#cc6699]";
        else iconColorClass = "text-pink-400";
      } else if (jsonExtensions.includes(ext)) {
        FileIcon = Braces;
        iconColorClass = "text-yellow-400";
      } else if (imageExtensions.includes(ext)) {
        FileIcon = FileImage;
        iconColorClass = "text-purple-400";
      } else if (videoExtensions.includes(ext)) {
        FileIcon = FileVideo;
        iconColorClass = "text-red-400";
      } else if (audioExtensions.includes(ext)) {
        FileIcon = FileAudio;
        iconColorClass = "text-green-400";
      } else if (textExtensions.includes(ext)) {
        FileIcon = FileText;
        iconColorClass = "text-gray-300";
      } else if (archiveExtensions.includes(ext)) {
        FileIcon = FileArchive;
        iconColorClass = "text-orange-400";
      } else if (configExtensions.includes(ext) || node.name.startsWith(".") || node.name.toLowerCase().includes("config")) {
        FileIcon = Settings;
        iconColorClass = "text-gray-400";
      } else if (["lock"].includes(ext)) {
        FileIcon = Key;
        iconColorClass = "text-yellow-600";
      } else {
        FileIcon = FileType;
      }

      return (
        <div 
          key={node.path}
          id={`file-${node.path}`}
          onClick={() => onSelectFile(node.path)}
          draggable
          onDragStart={(e) => handleDragStart(e, node.path)}
          className={`group flex items-center justify-between text-[11px] py-1 px-1.5 cursor-pointer relative font-mono transition-colors ${
            isSelected 
              ? "bg-[#094771] text-white font-medium" 
              : "hover:bg-neutral-900 bg-transparent"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1 pl-1">
            <FileIcon className={`w-3.5 h-3.5 shrink-0 ${
              isSelected 
                ? "text-neutral-100" 
                : isPathIgnored
                  ? "text-neutral-600"
                  : gitStatus === "added"
                    ? "text-[#81b88b]"
                    : gitStatus === "modified"
                      ? "text-[#eed07c]"
                      : iconColorClass
            }`} />
            <span className={`truncate flex-1 ${isSelected ? "text-white" : isPathIgnored ? "text-neutral-600 line-through decoration-neutral-700/60" : gitStatus === "added" ? "text-[#81b88b]" : gitStatus === "modified" ? "text-[#eed07c]" : "text-neutral-400 group-hover:text-neutral-200"}`}>{node.name}</span>
            {gitStatus && (
              <span className={`text-[10px] font-bold font-mono px-1 shrink-0 ml-auto mr-1 ${
                isSelected 
                  ? "text-white opacity-85" 
                  : isPathIgnored
                    ? "text-neutral-600 font-mono"
                    : gitStatus === "added" 
                      ? "text-[#81b88b]" 
                      : "text-[#eed07c]"
              }`}>
                {gitStatus === "added" ? "U" : "M"}
              </span>
            )}
          </div>

          <div className="hidden group-hover:flex items-center gap-1 shrink-0 ml-1">
            <button
              id={`delete-file-btn-${node.path}`}
              onClick={(e) => {
                e.stopPropagation();
                onDeleteFileOrFolder(node.path);
              }}
              className="p-0.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-rose-450 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      );
    });
  };

  const processedTree = activeWs ? filterNodes(activeWs.fileTree) : [];
  const activeFileOutlineSymbols = getActiveFileOutline();

  return (
    <div 
      id="ide-sidebar" 
      className="w-full flex flex-col h-full bg-[#000000] select-none text-neutral-300 font-sans border-r border-neutral-900"
      onDragOver={(e) => handleDragOver(e, null)}
      onDrop={(e) => handleDrop(e, null)}
    >
      {/* 1. TOP HEADER: "Explorer" */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-neutral-900 bg-[#000000]">
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest font-mono">
          Explorer
        </span>
        <button 
          onClick={onOpenSettings} 
          title="Ver Ajustes de Workspace" 
          className="p-1 hover:bg-neutral-900 rounded group transition-all"
        >
          <MoreHorizontal className="w-4 h-4 text-neutral-500 group-hover:text-neutral-200 transition-colors cursor-pointer" />
        </button>
      </div>

      {/* Accordion container */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-900/60 scrollbar-none">
        
        {/* COLLAPSIBLE ACCORDION A: PROYECTOS / ACTIVE WORKSPACES */}
        <div>
          <button 
            type="button"
            onClick={() => setIsProjectsPanelExpanded(!isProjectsPanelExpanded)}
            className="w-full flex items-center gap-1.5 px-3 py-1.5 bg-[#080808]/40 hover:bg-[#0c0c0c] text-neutral-400 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-wider font-mono border-y border-neutral-900/30"
          >
            {isProjectsPanelExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
            <span>Configuración de Workspace ({workspaces.length})</span>
          </button>

          {isProjectsPanelExpanded && (
            <div className="p-3 bg-[#080808]/20 space-y-3.5 border-b border-neutral-900/60 animate-fadeIn font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Seleccionar Proyecto</span>
                <button 
                  onClick={() => setIsAddingWorkspace(!isAddingWorkspace)}
                  className="p-0.5 hover:bg-neutral-900 rounded text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  title="Crear Nuevo Proyecto"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {isAddingWorkspace && (
                <form onSubmit={handleCreateWorkspaceSubmit} className="bg-[#0c0c0c] border border-neutral-800 p-2.5 rounded space-y-2.5 animate-fadeIn">
                  <input 
                    type="text" 
                    maxLength={40}
                    placeholder="Nombre del Proyecto..."
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                    className="w-full bg-[#000000] text-[10.5px] border border-neutral-800 px-2.5 py-1.5 rounded text-white focus:outline-none focus:border-neutral-500"
                    autoFocus
                  />
                  <input 
                    type="text" 
                    maxLength={80}
                    placeholder="Descripción..."
                    value={newWsDesc}
                    onChange={(e) => setNewWsDesc(e.target.value)}
                    className="w-full bg-[#000000] text-[10.5px] border border-neutral-800 px-2.5 py-1.5 rounded text-white focus:outline-none focus:border-neutral-500"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button 
                      type="button" 
                      onClick={() => setIsAddingWorkspace(false)}
                      className="px-2 py-1 text-[9.5px] text-neutral-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      className="px-2.5 py-1 bg-white text-black rounded text-[9.5px] font-bold hover:bg-neutral-200"
                    >
                      Añadir
                    </button>
                  </div>
                </form>
              )}

              {/* 💻 CONECTAR CARPETA LOCAL (ANTIGRAVITY FEEL) */}
              <div className="space-y-1.5 border border-[#388a34]/15 bg-[#388a34]/5 p-2 rounded-lg text-left select-none">
                <span className="text-[8.5px] font-bold text-[#81b88b] uppercase tracking-wider font-mono block">Sync Carpeta Local PC</span>
                <label className="flex items-center justify-center gap-1.5 w-full py-2 px-3 border border-dashed border-[#81b88b]/30 bg-[#388a34]/10 hover:bg-[#388a34]/20 hover:border-[#81b88b]/50 rounded-md cursor-pointer text-[10.5px] text-[#81b88b] font-bold transition-all text-center">
                  <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>{isConnectingLocalFolder ? "Vinculando..." : "Vincular Carpeta de mi PC"}</span>
                  <input
                    type="file"
                    {...{ webkitdirectory: "", directory: "" }}
                    multiple
                    onChange={handleLocalDirectoryUpload}
                    className="hidden"
                    disabled={isConnectingLocalFolder}
                  />
                </label>
                {("showDirectoryPicker" in window) && (
                  <button
                    type="button"
                    onClick={handleConnectLocalFolderNative}
                    disabled={isConnectingLocalFolder}
                    className="text-[8px] text-neutral-500 hover:text-neutral-400 font-medium active:scale-[0.98] w-full text-center hover:underline transition-all block"
                  >
                    o usar API Nativa de Carpetas
                  </button>
                )}
              </div>

              <select
                value={activeWorkspaceId}
                onChange={(e) => onSelectWorkspace(e.target.value)}
                className="w-full bg-[#0c0c0c] border border-neutral-800 rounded px-2.5 py-1.5 text-[11px] text-white font-medium outline-none cursor-pointer focus:border-neutral-600"
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id} className="bg-[#0c0c0c]">
                    💼 {w.name}
                  </option>
                ))}
              </select>

              {/* Filtering */}
              <div className="bg-[#0c0c0c] border border-neutral-850 rounded flex items-center px-1.5 py-1 gap-1.5 focus-within:border-neutral-600">
                <Search className="w-3 h-3 text-neutral-600" />
                <input
                  type="text"
                  placeholder="Filtrar archivos..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="flex-1 bg-transparent border-none text-[10px] outline-none placeholder:text-neutral-700 text-white h-4 font-mono font-medium"
                />
              </div>

              {/* Extension type pill selector */}
              <div className="flex gap-1 overflow-x-auto scrollbar-none pb-0.5">
                {[
                  { id: "all", label: "ALL" },
                  { id: "code", label: "JS/TS" },
                  { id: "styles", label: "CSS" },
                  { id: "json", label: "JSON" },
                  { id: "python", label: "PY" }
                ].map(pill => (
                  <button
                    key={pill.id}
                    onClick={() => setFileTypeFilter(pill.id as any)}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider shrink-0 cursor-pointer border select-none ${
                      fileTypeFilter === pill.id
                        ? "bg-white/10 border-neutral-700 text-white"
                        : "bg-transparent border-neutral-900 text-neutral-500 hover:text-neutral-400"
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* COLLAPSIBLE ACCORDION B: ACTIVE WORKSPACE CORE FILE TREE (DEFAULT EXPANDED) */}
        <div>
          <div 
            onClick={() => setIsWorkspaceTreeExpanded(!isWorkspaceTreeExpanded)}
            className="group/header w-full flex items-center justify-between px-3 py-1.5 bg-[#080808]/40 hover:bg-[#0c0c0c] text-neutral-400 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-wider font-mono border-y border-neutral-900/30 cursor-pointer select-none"
          >
            <div className="flex items-center gap-1.5">
              {isWorkspaceTreeExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-hover/header:text-white" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover/header:text-white" />
              )}
              <span className="truncate max-w-[130px]">{activeWs?.name || "Untitled"} (Workspace)</span>
            </div>

            {/* Quick Actions (only visible when expanded) */}
            {isWorkspaceTreeExpanded && (
              <div className="flex items-center gap-1.5 shrink-0 pl-1">
                <button
                  title="Nuevo Archivo en Raíz"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveAddParent(null);
                    setAddMode("file");
                  }}
                  className="p-0.5 hover:bg-neutral-800 rounded text-neutral-500 hover:text-white"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                </button>
                <button
                  title="Nueva Carpeta en Raíz"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveAddParent(null);
                    setAddMode("directory");
                  }}
                  className="p-0.5 hover:bg-neutral-800 rounded text-neutral-500 hover:text-white"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
                <button
                  title="Colapsar Todo"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCollapseAll();
                  }}
                  className="p-0.5 hover:bg-neutral-800 rounded text-neutral-500 hover:text-white"
                >
                  <FolderClosed className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {isWorkspaceTreeExpanded && (
            <div className="py-2.5 animate-fadeIn">
              
              {/* Add item prompt inline */}
              {addMode && (
                <div className="px-3 pb-2">
                  <form onSubmit={handleAddSubmit} className="bg-[#0c0c0c] border border-neutral-800 p-2 rounded space-y-1.5 animate-fadeIn font-mono">
                    <span className="text-[8.5px] text-neutral-400 font-bold block capitalize select-none">
                      Añadiendo {addMode === "file" ? "Archivo" : addMode === "monorepo" ? "Raíz de Monorepo" : "Carpeta"} {activeAddParent ? `en ${activeAddParent}` : "en la raíz"}
                    </span>
                    <input
                      type="text"
                      placeholder={addMode === "file" ? "index.js, README.md..." : "nombre_carpeta..."}
                      value={newNodeName}
                      onChange={(e) => setNewNodeName(e.target.value)}
                      className="w-full bg-[#000000] text-[11px] px-2 py-1.5 border border-neutral-850 rounded focus:outline-none focus:border-neutral-550 text-white font-mono"
                      autoFocus
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setAddMode(null);
                          setActiveAddParent(null);
                        }}
                        className="px-1.5 py-0.5 text-[9px] text-neutral-400 hover:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-1.5 py-0.5 bg-white text-black rounded text-[9px] font-bold hover:bg-neutral-200"
                      >
                        Crear
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Tree Container */}
              <div id="file-tree-container" className="space-y-[2px]">
                {processedTree.length > 0 ? (
                  renderTree(processedTree)
                ) : (
                  <div className="text-[10px] text-neutral-600 text-center py-4 font-mono leading-relaxed">
                    Ningún archivo coincide con los filtros.
                  </div>
                )}
              </div>
              
              {/* Visual drag and drop cue */}
              {dragOverPath === null && (
                <div className="mt-2 mx-3 text-[8.5px] text-neutral-600 border border-dashed border-neutral-900 bg-[#080808]/10 py-1 px-1.5 text-center rounded tracking-wide select-none font-mono">
                  Mueve arrastrando elementos aquí
                </div>
              )}

            </div>
          )}
        </div>

        {/* COLLAPSIBLE ACCORDION C: OUTLINE SYMBOLS (COLLAPSED BY DEFAULT) */}
        <div>
          <button 
            type="button"
            onClick={() => setIsOutlineExpanded(!isOutlineExpanded)}
            className="w-full flex items-center gap-1.5 px-3 py-1.5 bg-[#080808]/40 hover:bg-[#0c0c0c] text-neutral-400 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-wider font-mono border-y border-neutral-900/30"
          >
            {isOutlineExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 animate-in hover:scale-105" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 animate-in hover:scale-105" />
            )}
            <span>Outline</span>
          </button>

          {isOutlineExpanded && (
            <div className="p-3.5 bg-[#080808]/10 border-b border-neutral-900/40 animate-fadeIn font-mono">
              {activeFilePath ? (
                <div className="space-y-2">
                  <div className="text-[10px] text-neutral-500 font-bold mb-2 truncate">
                    📑 ESTRUCTURA: {activeFilePath.split("/").pop()}
                  </div>
                  {activeFileOutlineSymbols.length > 0 ? (
                    <div className="space-y-1.5 pl-1.5">
                      {activeFileOutlineSymbols.map((sym, si) => (
                        <div key={si} className="flex items-center gap-2 text-[10px] hover:text-white py-0.5 cursor-pointer">
                          {sym.type === "func" ? (
                            <span className="w-4 h-4 rounded bg-[#388a34]/10 text-[#54c462] flex items-center justify-center font-bold text-[8.5px]">ƒ</span>
                          ) : sym.type === "class" ? (
                            <span className="w-4 h-4 rounded bg-[#cca700]/10 text-[#e6b527] flex items-center justify-center font-bold text-[8.5px]">𝓒</span>
                          ) : sym.type === "markdown" ? (
                            <span className="text-neutral-550 mr-0.5 font-bold text-[9px]">#</span>
                          ) : (
                            <span className="w-4 h-4 rounded bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-[8.5px]">𝓋</span>
                          )}
                          <span className="truncate font-sans font-medium">{sym.name}</span>
                          <span className="text-[8.5px] text-neutral-600 ml-auto select-none">L:{sym.line}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[9.5px] text-neutral-650 italic">
                      No se detectaron marcas lógicas automáticas en {activeFilePath.split("/").pop()}.
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[9.5px] text-neutral-600 font-sans leading-relaxed">
                  Abre un archivo para visualizar la jerarquía y marcas automáticas de código.
                </p>
              )}
            </div>
          )}
        </div>

        {/* COLLAPSIBLE ACCORDION D: TIMELINE Snappy VCS snap Logs (COLLAPSED BY DEFAULT) */}
        <div>
          <button 
            type="button"
            onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
            className="w-full flex items-center gap-1.5 px-3 py-1.5 bg-[#080808]/40 hover:bg-[#0c0c0c] text-neutral-400 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-wider font-mono border-y border-neutral-900/30"
          >
            {isTimelineExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
            <span>Timeline</span>
          </button>

          {isTimelineExpanded && (
            <div className="p-3.5 bg-[#080808]/10 border-b border-neutral-900/40 animate-fadeIn font-mono">
              <div className="space-y-3 pl-1.5">
                <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wide">Snapshots Locales</div>
                
                {[
                  { text: "Archivo guardado automáticamente", time: "hace 2 min", active: true },
                  { text: "Refactorización general de estilos y layouts", time: "hace 10 min", active: false },
                  { text: "Modificaciones y mejoras del linter", time: "hace 1 hora", active: false },
                  { text: "Commit Inicial - Proyecto Creado", time: "hace 4 horas", active: false }
                ].map((tim, ti) => (
                  <div key={ti} className="relative pl-4 border-l border-neutral-900 space-y-0.5">
                    <span className={`absolute -left-[3.5px] top-1.5 w-1.5 h-1.5 rounded-full ${tim.active ? "bg-sky-400" : "bg-neutral-800"}`} />
                    <p className="text-[10px] text-neutral-350 leading-snug">{tim.text}</p>
                    <span className="text-[8.5px] text-neutral-600 block">{tim.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* 2. FOOTER STATUS BAR (Identical to VSC status bar layout on the image) */}
      <div 
        onClick={onOpenSettings}
        className="h-6.5 shrink-0 bg-[#005fb8] hover:bg-[#007acc] text-white flex items-center justify-between px-3.5 text-[10px] select-none font-sans cursor-pointer transition-colors"
        title="Settings de LLM & IDE"
      >
        {/* Status Bar Left Elements */}
        <div className="flex items-center gap-3 font-medium select-none truncate">
          <span className="font-bold flex items-center gap-1 truncate uppercase max-w-[120px] tracking-wide">
            📁 {activeWs?.name || "CONCURSOS RAMA"}
          </span>
          <span className="flex items-center gap-1 text-sky-100 font-semibold select-none pr-1">
            <GitBranch className="w-3 h-3 text-sky-200" /> main*
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-sky-100 opacity-90">
            <Cloud className="w-3 h-3" /> Sync Activo
          </span>
        </div>

        {/* Status Bar Right Elements */}
        <div className="flex items-center gap-3.5 shrink-0 text-white select-none">
          <span className="flex items-center gap-1 font-bold">
            <XCircle className="w-3 h-3 text-white" /> 0
          </span>
          <span className="flex items-center gap-1 font-bold">
            <AlertCircle className="w-3 h-3 text-white" /> 0
          </span>
        </div>
      </div>

    </div>
  );
}
