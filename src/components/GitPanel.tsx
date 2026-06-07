import React, { useState, useEffect } from "react";
import { FileNode, GitCommit, Workspace } from "../types";
import { flattenFileTree, findFileByPath } from "../utils/initialWorkspaces";
import { 
  GitBranch, 
  Check, 
  RotateCcw, 
  Plus, 
  Minus,
  FileCode, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Eye, 
  FileDiff,
  Flame,
  User,
  Users,
  Grid,
  Divide,
  CornerDownRight,
  ShieldAlert
} from "lucide-react";

interface GitStatusItem {
  filePath: string;
  name: string;
  status: "added" | "modified" | "deleted";
  isStaged: boolean;
}

interface GitPanelProps {
  currentWorkspace: Workspace;
  onUpdateWorkspaceGit: (updatedFields: Partial<Workspace>) => void;
  onSelectFile: (path: string) => void;
  onUpdateFileContent: (path: string, newContent: string) => void;
  isBlameEnabled: boolean;
  onToggleBlame: () => void;
}

const EMPTY_ARRAY: any[] = [];

export default function GitPanel({
  currentWorkspace,
  onUpdateWorkspaceGit,
  onSelectFile,
  onUpdateFileContent,
  isBlameEnabled,
  onToggleBlame
}: GitPanelProps) {
  const [commitMessage, setCommitMessage] = useState("");
  const [gitStatusList, setGitStatusList] = useState<GitStatusItem[]>([]);
  const [selectedFileDiff, setSelectedFileDiff] = useState<string | null>(null);
  const [activeConflictFile, setActiveConflictFile] = useState<string | null>(null);
  
  const [simulateAuthor, setSimulateAuthor] = useState("Julian Posada");
  const [successMsg, setSuccessMsg] = useState("");

  // Base snapshot tree fallback (if workspace has no gitBaseTree, snapshot is the initial loaded state)
  const baseTree = currentWorkspace.gitBaseTree || EMPTY_ARRAY;
  const stagedPaths = currentWorkspace.gitStagedPaths || EMPTY_ARRAY;
  const commits = currentWorkspace.gitCommits || EMPTY_ARRAY;

  // Track differences between baseTree and current file tree
  const currentFlat = flattenFileTree(currentWorkspace.fileTree);
  const baseFlat = flattenFileTree(baseTree);

  useEffect(() => {
    // If workspace doesn't have a gitBaseTree yet, initialize it
    if (!currentWorkspace.gitBaseTree) {
      onUpdateWorkspaceGit({
        gitBaseTree: JSON.parse(JSON.stringify(currentWorkspace.fileTree)),
        gitStagedPaths: [],
        gitCommits: [
          {
            id: "c-init",
            hash: "8bfd9a2",
            message: "Initial design configuration check",
            author: "Julian Posada",
            date: "2026-06-05T12:00:00Z",
            snapshot: JSON.parse(JSON.stringify(currentWorkspace.fileTree))
          }
        ]
      });
    }
  }, [currentWorkspace.id]);

  useEffect(() => {
    calculateGitStatus();
  }, [currentWorkspace.fileTree, baseTree, stagedPaths]);

  const calculateGitStatus = () => {
    const list: GitStatusItem[] = [];
    const basePaths = new Set(baseFlat.map(f => f.path));
    const currentPaths = new Set(currentFlat.map(f => f.path));

    // Deleted files
    baseFlat.forEach(bf => {
      if (!currentPaths.has(bf.path)) {
        list.push({
          filePath: bf.path,
          name: bf.name,
          status: "deleted",
          isStaged: stagedPaths.includes(bf.path)
        });
      }
    });

    // Added and Modified files
    currentFlat.forEach(cf => {
      const isStaged = stagedPaths.includes(cf.path);
      if (!basePaths.has(cf.path)) {
        list.push({
          filePath: cf.path,
          name: cf.name,
          status: "added",
          isStaged
        });
      } else {
        const bf = baseFlat.find(f => f.path === cf.path);
        if (bf && bf.content !== cf.content) {
          list.push({
            filePath: cf.path,
            name: cf.name,
            status: "modified",
            isStaged
          });
        }
      }
    });

    // Detect if conflicts exist in current flat node
    const conflictFile = currentFlat.find(f => f.content && f.content.includes("<<<<<<< HEAD"));
    if (conflictFile) {
      setActiveConflictFile(conflictFile.path);
    } else {
      setActiveConflictFile(null);
    }

    setGitStatusList(list);
  };

  const handleStageFile = (filePath: string) => {
    if (!stagedPaths.includes(filePath)) {
      onUpdateWorkspaceGit({
        gitStagedPaths: [...stagedPaths, filePath]
      });
    }
  };

  const handleUnstageFile = (filePath: string) => {
    onUpdateWorkspaceGit({
      gitStagedPaths: stagedPaths.filter(p => p !== filePath)
    });
  };

  const handleStageAll = () => {
    const unstaged = gitStatusList.filter(item => !item.isStaged).map(item => item.filePath);
    onUpdateWorkspaceGit({
      gitStagedPaths: [...stagedPaths, ...unstaged]
    });
  };

  const handleUnstageAll = () => {
    onUpdateWorkspaceGit({
      gitStagedPaths: []
    });
  };

  const handleCommitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim()) return;
    if (stagedPaths.length === 0) return;

    // Build the new GitSnapshot by starting from the base tree
    // and overlaying STAGED files only.
    let newBaseTreeSnapshot = JSON.parse(JSON.stringify(baseTree));

    // Overlay staged changes
    stagedPaths.forEach(stagedPath => {
      const currentFile = currentFlat.find(f => f.path === stagedPath);
      if (currentFile) {
        // Overlay in snapshot
        newBaseTreeSnapshot = updateFileInSnapshot(newBaseTreeSnapshot, stagedPath, currentFile.content || "", currentFile.name);
      } else {
        // File was deleted
        newBaseTreeSnapshot = removeFileFromSnapshot(newBaseTreeSnapshot, stagedPath);
      }
    });

    // Generate random hash
    const randomHash = Math.random().toString(16).substring(2, 9);
    const newCommit: GitCommit = {
      id: "c-" + Date.now(),
      hash: randomHash,
      message: commitMessage.trim(),
      author: simulateAuthor || "Julian Posada",
      date: new Date().toISOString(),
      snapshot: JSON.parse(JSON.stringify(newBaseTreeSnapshot))
    };

    onUpdateWorkspaceGit({
      gitBaseTree: newBaseTreeSnapshot,
      gitStagedPaths: [], // clear staging area
      gitCommits: [newCommit, ...commits]
    });

    setCommitMessage("");
    setSuccessMsg(`Commiteado con éxito como [commit ${randomHash}]`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  // Helper snapshot update
  const updateFileInSnapshot = (nodes: FileNode[], pathStr: string, content: string, name: string): FileNode[] => {
    // Check if node already exists in parent tree
    const flat = flattenFileTree(nodes);
    const exists = flat.some(f => f.path === pathStr);

    if (exists) {
      return nodes.map(node => {
        if (node.path === pathStr) return { ...node, content };
        if (node.type === "directory" && node.children) {
          return {
            ...node,
            children: updateFileInSnapshot(node.children, pathStr, content, name)
          };
        }
        return node;
      });
    } else {
      // Find where to insert
      // Simplest way: Add to root if path has no folders
      const pathParts = pathStr.split("/");
      if (pathParts.length === 1) {
        return [...nodes, { name, path: pathStr, type: "file", content }];
      } else {
        // Create matching directories as needed, simplified by recursively pushing to flat
        // or inserting node under its parent path
        const parentPath = pathParts.slice(0, -1).join("/");
        return insertSnapshotNode(nodes, parentPath, { name, path: pathStr, type: "file", content });
      }
    }
  };

  const insertSnapshotNode = (nodes: FileNode[], parentPath: string, newNode: FileNode): FileNode[] => {
    return nodes.map(node => {
      if (node.path === parentPath && node.type === "directory") {
        return {
          ...node,
          children: [...(node.children || []), newNode]
        };
      }
      if (node.type === "directory" && node.children) {
        return {
          ...node,
          children: insertSnapshotNode(node.children, parentPath, newNode)
        };
      }
      return node;
    });
  };

  const removeFileFromSnapshot = (nodes: FileNode[], pathStr: string): FileNode[] => {
    return nodes
      .filter(n => n.path !== pathStr)
      .map(node => {
        if (node.type === "directory" && node.children) {
          return {
            ...node,
            children: removeFileFromSnapshot(node.children, pathStr)
          };
        }
        return node;
      });
  };

  // Trigger Conflict Simulation
  const handleSimulateConflict = () => {
    const fileToConflict = currentFlat.find(f => f.type === "file") || currentWorkspace.fileTree[0];
    if (!fileToConflict) return;

    const originalContent = fileToConflict.content || "";
    const lines = originalContent.split("\n");
    
    // Inject visual conflict blocks in the middle of file
    const mid = Math.floor(lines.length / 2);
    const conflictedLines = [
      ...lines.slice(0, mid),
      "<<<<<<< HEAD (Tus cambios locales guardados)",
      `// Cambios locales implementados por el desarrollador`,
      `const buildMode = "dev-offline-mode";`,
      `console.log("Optimizando layout local...");`,
      "=======",
      `// Cambios remotos entrantes de Antigravity AI`,
      `const buildMode = "production-cloud-native";`,
      `console.log("Aplicando optimización global con LLM...");`,
      `>>>>>>> incoming (Rama remota entrante)`,
      ...lines.slice(mid)
    ];

    onUpdateFileContent(fileToConflict.path, conflictedLines.join("\n"));
    onSelectFile(fileToConflict.path);
    setActiveConflictFile(fileToConflict.path);
  };

  // Visual Merge Resolution logic
  const handleResolveConflict = (resolution: "current" | "incoming" | "both") => {
    if (!activeConflictFile) return;
    const fileNode = currentFlat.find(f => f.path === activeConflictFile);
    if (!fileNode || !fileNode.content) return;

    const text = fileNode.content;
    const lines = text.split("\n");
    const result: string[] = [];
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (line.startsWith("<<<<<<<")) {
        // Collect current local changes
        const currentBlock: string[] = [];
        i++; // skip <<<<<<< line
        while (i < lines.length && !lines[i].startsWith("=======")) {
          currentBlock.push(lines[i]);
          i++;
        }
        
        // Collect incoming changes
        const incomingBlock: string[] = [];
        i++; // skip ======= line
        while (i < lines.length && !lines[i].startsWith(">>>>>>>")) {
          incomingBlock.push(lines[i]);
          i++;
        }
        
        i++; // skip >>>>>>> line

        if (resolution === "current") {
          result.push(...currentBlock);
        } else if (resolution === "incoming") {
          result.push(...incomingBlock);
        } else if (resolution === "both") {
          result.push(...currentBlock, ...incomingBlock);
        }
      } else {
        result.push(line);
        i++;
      }
    }

    onUpdateFileContent(activeConflictFile, result.join("\n"));
    setActiveConflictFile(null);
    setSuccessMsg("Conflicto resuelto éxitosamente!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  // Split changes based on stages
  const stagedItems = gitStatusList.filter(item => item.isStaged);
  const unstagedItems = gitStatusList.filter(item => !item.isStaged);

  // Line-by-line Diff Visualizer
  const renderLineDiff = (filePath: string) => {
    const curFile = currentFlat.find(f => f.path === filePath);
    const basFile = baseFlat.find(f => f.path === filePath);
    
    const curContent = curFile?.content || "";
    const basContent = basFile?.content || "";

    const curLines = curContent.split("\n");
    const basLines = basContent.split("\n");

    return (
      <div className="bg-[#05060b] border border-white/5 rounded-md p-2.5 space-y-1.5 font-mono text-[10.5px] max-h-[160px] overflow-y-auto select-text scrollbar-thin">
        <div className="flex items-center justify-between text-[9px] text-gray-500 uppercase pb-1.5 border-b border-white/5">
          <span>{filePath} - Unified Diff</span>
          <button 
            onClick={() => setSelectedFileDiff(null)}
            className="text-rose-450 hover:text-white"
          >
            Cerrar
          </button>
        </div>
        
        {/* Simple line comparisons */}
        {basLines.map((line, bIdx) => {
          const correspondingCurLine = curLines[bIdx];
          if (correspondingCurLine === undefined) {
            // Deleted line
            return (
              <div key={`bas-${bIdx}`} className="bg-rose-500/10 text-rose-450 px-1 py-0.5 rounded flex items-start gap-1 justify-between select-text group/line">
                <span className="truncate flex-1 font-mono"><span className="text-rose-500 mr-1 select-none font-bold">-</span>{line}</span>
                <span className="text-[8px] text-rose-600 font-bold shrink-0 self-center">BORRADO</span>
              </div>
            );
          }
          if (line !== correspondingCurLine) {
            // Line modified
            return (
              <div key={`diff-${bIdx}`} className="space-y-0.5">
                <div className="bg-rose-505/5 text-rose-400 opacity-60 px-1 py-0.2 rounded font-mono truncate">
                  <span className="text-rose-500 mr-1 select-none font-bold font-mono">-</span>{line}
                </div>
                <div className="bg-emerald-500/10 text-emerald-400 font-semibold px-1 py-0.2 rounded font-mono flex items-center justify-between select-text group/line">
                  <span className="truncate flex-grow font-mono"><span className="text-emerald-500 mr-1 select-none font-bold">+</span>{correspondingCurLine}</span>
                  <button
                    onClick={() => {
                      // Selective line staging!
                      // For simplicity we toggle full file staging or trigger inline notification
                      handleStageFile(filePath);
                    }}
                    className="opacity-0 group-hover/line:opacity-100 text-[8px] px-1 py-0.2 rounded font-bold bg-emerald-500 text-slate-950 ml-1 cursor-pointer shrink-0"
                    title="Poner línea en Staging"
                  >
                    Stg
                  </button>
                </div>
              </div>
            );
          }
          return (
            <div key={`eq-${bIdx}`} className="text-gray-500 truncate leading-tight select-none">
              <span className="opacity-25 mr-1 font-bold"> </span>{line}
            </div>
          );
        })}

        {/* Added extra lines at the end */}
        {curLines.slice(basLines.length).map((line, extraIdx) => (
          <div key={`ex-${extraIdx}`} className="bg-emerald-500/10 text-emerald-400 font-semibold px-1 py-0.5 rounded flex items-center justify-between select-text group/line">
            <span className="truncate flex-grow font-mono"><span className="text-emerald-500 mr-1 select-none font-bold">+</span>{line}</span>
            <button
              onClick={() => handleStageFile(filePath)}
              className="opacity-0 group-hover/line:opacity-100 text-[8px] px-1 py-0.2 rounded font-bold bg-emerald-500 text-slate-950 ml-1 cursor-pointer shrink-0"
              title="Poner línea en Staging"
            >
              Stg
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 font-sans select-none">
      
      {/* Visual Merge Interactive Screen */}
      {activeConflictFile && (
        <div className="m-3 p-3.5 bg-rose-550/15 border border-rose-500/30 rounded-xl space-y-3 shadow-lg select-text animate-pulse duration-1000">
          <div className="flex items-center gap-1.5 text-rose-400">
            <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
            <span className="text-xs font-black uppercase font-mono tracking-wider">
              ¡Conflicto de fusión detectado!
            </span>
          </div>
          
          <p className="text-[11px] text-gray-300 leading-normal font-sans">
            El archivo <code className="font-bold font-mono text-white text-[11px] bg-rose-950/40 px-1 rounded">{activeConflictFile.split("/").pop()}</code> presenta marcadores de colisión <code className="font-mono text-rose-300 font-bold">&lt;&lt;&lt;&lt;&lt;&lt;&lt; HEAD</code>. Resuélvelos con el editor de merge visual:
          </p>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => handleResolveConflict("current")}
              className="p-2 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/20 text-[10px] text-white hover:bg-rose-400/30 font-bold cursor-pointer transition-transform active:scale-95 text-center leading-normal"
            >
              Aceptar Local (HEAD)
            </button>
            <button
              onClick={() => handleResolveConflict("incoming")}
              className="p-2 py-1.5 rounded-lg border border-sky-500/30 bg-sky-500/20 text-[10px] text-white hover:bg-sky-400/30 font-bold cursor-pointer transition-transform active:scale-95 text-center leading-normal"
            >
              Aceptar Entrante
            </button>
            <button
              onClick={() => handleResolveConflict("both")}
              className="p-2 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/20 text-[10px] text-white hover:bg-purple-400/30 font-bold cursor-pointer transition-transform active:scale-95 text-center leading-normal"
            >
              Aceptar Ambos (Merge)
            </button>
          </div>
        </div>
      )}

      {/* Control panel form */}
      <div className="p-3 border-b border-slate-900 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
            Control de Versiones Integrado
          </span>
          <button
            onClick={onToggleBlame}
            className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
              isBlameEnabled
                ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-400"
                : "bg-slate-900 border-white/5 text-slate-400 hover:text-white"
            }`}
            title="Muestra quién escribió cada línea en el editor de código"
          >
            <Users className="w-3 h-3" />
            {isBlameEnabled ? "Blame: ON" : "Blame: OFF"}
          </button>
        </div>

        {/* Simulated author select */}
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-md">
          <User className="w-3.5 h-3.5 text-indigo-400 shrink-0 ml-1" />
          <span className="text-[10px] text-gray-500 font-bold uppercase shrink-0 font-mono">Autor:</span>
          <select
            value={simulateAuthor}
            onChange={(e) => setSimulateAuthor(e.target.value)}
            className="flex-1 bg-transparent border-none text-[10.5px] outline-none text-gray-300 font-mono py-0 cursor-pointer"
          >
            <option value="Julian Posada">Julian Posada (Base)</option>
            <option value="Antigravity AI">Antigravity AI (Agent)</option>
            <option value="Colaborador Externo">Colaborador Externo</option>
          </select>
        </div>

        {/* Submit commit form */}
        <form onSubmit={handleCommitSubmit} className="space-y-2">
          <textarea
            required
            rows={2}
            placeholder="Mensaje de confirmación (commit)..."
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500 font-mono resize-none"
          />
          <div className="flex items-center gap-1.5">
            <button
              type="submit"
              disabled={stagedPaths.length === 0}
              className={`flex-1 py-1 px-3 text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-all select-none bg-indigo-500 text-white hover:bg-indigo-400 cursor-pointer ${
                stagedPaths.length === 0 ? "opacity-35 cursor-not-allowed" : "active:scale-95"
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirmar Commit ({stagedPaths.length})</span>
            </button>
            <button
              type="button"
              onClick={handleSimulateConflict}
              className="px-2 py-1 text-[11px] font-bold tracking-tight rounded bg-rose-500 text-white hover:bg-rose-400 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              title="Crea un conflicto simulado para testear el visual git merge editor"
            >
              <Flame className="w-3 h-3 text-white" />
              <span>Conflicto</span>
            </button>
          </div>
        </form>
      </div>

      {/* Main Diff Area & Status list */}
      <div className="flex-grow overflow-y-auto px-3 py-2 space-y-3.5 scrollbar-thin">
        {successMsg && (
          <div className="p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 flex items-center gap-2 text-emerald-400 font-sans text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {/* Selected diff panel inline overlay */}
        {selectedFileDiff && (
          <div className="animate-fadeIn">
            {renderLineDiff(selectedFileDiff)}
          </div>
        )}

        {/* 1. Staged Changes changes */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-emerald-500 font-bold font-mono tracking-wider uppercase border-b border-emerald-500/10 pb-1 mr-1.5">
            <span>Staged Changes (Cambios preparados) • {stagedItems.length}</span>
            {stagedItems.length > 0 && (
              <button 
                onClick={handleUnstageAll}
                className="text-[9px] hover:text-white lowercase transition-colors font-semibold"
              >
                unstage todos
              </button>
            )}
          </div>
          
          {stagedItems.length === 0 ? (
            <span className="text-[10px] text-gray-700 italic block pl-1 mr-1.5 py-1 text-center">
              No hay cambios preparados. Usa el botón (+) de abajo para agregarlos.
            </span>
          ) : (
            <div className="space-y-1">
              {stagedItems.map(item => (
                <div key={`staged-${item.filePath}`} className="flex items-center justify-between p-1.5 bg-emerald-500/[0.02] border border-emerald-500/10 rounded mr-1.5">
                  <div className="flex items-center gap-1.5 min-w-0" onClick={() => onSelectFile(item.filePath)}>
                    <span 
                      className={`text-[9px] font-bold shrink-0 w-4.5 h-4.5 rounded flex items-center justify-center font-mono border ${
                        item.status === 'added' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                        item.status === 'modified' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                        'bg-rose-500/10 border-rose-500/20 text-rose-455'
                      }`}
                    >
                      {item.status === "added" ? "A" : item.status === "modified" ? "M" : "D"}
                    </span>
                    <span className="text-xs text-white truncate cursor-pointer font-mono hover:text-sky-400">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleUnstageFile(item.filePath)}
                      title="Dejar de preparar (Unstage)"
                      className="p-0.5 rounded hover:bg-slate-800 text-slate-500 hover:text-sky-400 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Unstaged Changes changes */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-amber-500 font-bold font-mono tracking-wider uppercase border-b border-amber-500/10 pb-1 mr-1.5">
            <span>Changes (Cambios no preparados) • {unstagedItems.length}</span>
            {unstagedItems.length > 0 && (
              <button 
                onClick={handleStageAll}
                className="text-[9px] hover:text-white lowercase transition-colors font-semibold"
              >
                preparar todos
              </button>
            )}
          </div>

          {gitStatusList.length === 0 ? (
            <div className="text-center py-6 block pr-1.5 mr-1.5">
              <CheckCircle2 className="w-7 h-7 mx-auto mb-1 opacity-25 text-emerald-500" />
              <p className="text-[10.5px] text-emerald-400/90 font-bold font-mono">Workspace limpio</p>
              <p className="text-[9.5px] text-gray-600 mt-1">
                No hay modificaciones en tus ficheros en comparación con el último commit.
              </p>
            </div>
          ) : null}

          {unstagedItems.length > 0 && (
            <div className="space-y-1">
              {unstagedItems.map(item => (
                <div key={`unstaged-${item.filePath}`} className="flex items-center justify-between p-1.5 bg-white/[0.01] border border-white/[0.04] rounded mr-1.5">
                  <div className="flex items-center gap-1.5 min-w-0" onClick={() => onSelectFile(item.filePath)}>
                    <span 
                      className={`text-[9.5px] font-bold shrink-0 w-4.5 h-4.5 rounded flex items-center justify-center font-mono border ${
                        item.status === 'added' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                        item.status === 'modified' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                        'bg-rose-500/10 border-rose-500/20 text-rose-455'
                      }`}
                    >
                      {item.status === "added" ? "U" : item.status === "modified" ? "M" : "D"}
                    </span>
                    <span className="text-xs text-slate-300 truncate cursor-pointer font-mono hover:text-sky-400">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleStageFile(item.filePath)}
                      title="Preparar cambios (Stage)"
                      className="p-0.5 rounded hover:bg-slate-800 text-slate-500 hover:text-emerald-400 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    {item.status !== "added" && (
                      <button
                        onClick={() => setSelectedFileDiff(selectedFileDiff === item.filePath ? null : item.filePath)}
                        title="Ver cambios línea por línea (Visual Diff)"
                        className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-indigo-400 cursor-pointer"
                      >
                        <FileDiff className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Commit Logs history list */}
        <div className="space-y-2 pt-2.5">
          <div className="text-[10px] text-indigo-400 font-bold font-mono tracking-wider uppercase border-b border-indigo-400/10 pb-1 mr-1.5 flex items-center gap-1 leading-none select-none">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Historial (git commit log) • {commits.length}</span>
          </div>

          <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 select-text scrollbar-thin">
            {commits.map(commit => (
              <div key={commit.id} className="p-2 border border-white/[0.02] bg-white/[0.01] rounded hover:bg-white/[0.02] text-xs">
                <div className="flex items-center justify-between text-[10px] text-slate-500 select-none">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-indigo-400" />
                    <span className="font-mono text-[9px] text-gray-400 font-bold uppercase">{commit.author.split(" ")[0]}</span>
                  </div>
                  <span className="font-mono bg-white/5 border border-white/5 rounded px-1 text-[9px] hover:text-sky-300 font-bold cursor-help" title={commit.hash}>
                    {commit.hash}
                  </span>
                </div>
                <div className="text-gray-300 font-mono mt-1 font-semibold leading-relaxed">
                  {commit.message}
                </div>
                <div className="text-[9px] text-indigo-500 font-mono text-right mt-1 select-none">
                  {new Date(commit.date).toLocaleDateString("es-ES")} {new Date(commit.date).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
