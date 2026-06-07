import React, { useState, useEffect } from "react";
import { 
  History, 
  RefreshCw, 
  ArrowLeft, 
  Check, 
  Trash2, 
  ChevronRight, 
  Calendar,
  Layers,
  FileCheck2,
  FileCode,
  Plus,
  Clock,
  Clipboard,
  Trash
} from "lucide-react";
import { FileNode } from "../types";
import { flattenFileTree } from "../utils/initialWorkspaces";

export interface HistoryItem {
  id: string;
  filePath: string;
  content: string;
  timestamp: string; // ISO format
  linesCount: number;
  charsCount: number;
  changeSummary?: string;
}

interface LocalHistoryTimelineProps {
  activeFile: FileNode | null;
  fileTree: FileNode[];
  onSelectFile: (path: string) => void;
  onRestoreContent: (path: string, restoredContent: string) => void;
  onClose: () => void;
}

export default function LocalHistoryTimeline({
  activeFile,
  fileTree,
  onSelectFile,
  onRestoreContent,
  onClose
}: LocalHistoryTimelineProps) {
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [newSnapshotSummary, setNewSnapshotSummary] = useState<string>("");
  const [showFileList, setShowFileList] = useState<boolean>(false);

  const allFiles = flattenFileTree(fileTree).filter(node => node.type === "file");

  // Synchronize with active editor file unless user overrides it
  useEffect(() => {
    if (activeFile) {
      setSelectedFilePath(activeFile.path);
    }
  }, [activeFile?.path]);

  // Load history list when selected path changes
  useEffect(() => {
    if (!selectedFilePath) {
      setHistory([]);
      return;
    }
    try {
      const saved = localStorage.getItem(`local_history_${selectedFilePath}`);
      if (saved) {
        setHistory(JSON.parse(saved));
      } else {
        setHistory([]);
      }
      setSelectedSnapshotId(null);
    } catch (e) {
      console.error("Failed to load local history", e);
    }
  }, [selectedFilePath]);

  // Get current node details for the selected file path
  const currentFileNode = allFiles.find(file => file.path === selectedFilePath);

  const filesWithSnapshotCounts = allFiles.map(file => {
    let snapsCount = 0;
    try {
      const saved = localStorage.getItem(`local_history_${file.path}`);
      if (saved) {
        snapsCount = JSON.parse(saved).length;
      }
    } catch (e) {}
    return { ...file, snapsCount };
  });

  const handleClearHistory = () => {
    if (!selectedFilePath) return;
    if (window.confirm("¿Seguro que deseas vaciar el historial local para este archivo?")) {
      localStorage.removeItem(`local_history_${selectedFilePath}`);
      setHistory([]);
      setSelectedSnapshotId(null);
    }
  };

  const handleDeleteSnapshot = (snapshotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedFilePath) return;
    const updatedHistory = history.filter(item => item.id !== snapshotId);
    localStorage.setItem(`local_history_${selectedFilePath}`, JSON.stringify(updatedHistory));
    setHistory(updatedHistory);
    if (selectedSnapshotId === snapshotId) {
      setSelectedSnapshotId(null);
    }
  };

  const handleRestore = (snapshot: HistoryItem) => {
    onRestoreContent(snapshot.filePath, snapshot.content);
    // Make sure we select this file actively in the workspace
    onSelectFile(snapshot.filePath);
  };

  const handleCreateManualSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFileNode) return;
    const summaryText = newSnapshotSummary.trim() || `Instantánea captura manual`;
    try {
      const saved = localStorage.getItem(`local_history_${currentFileNode.path}`);
      let list = saved ? JSON.parse(saved) : [];
      const content = currentFileNode.content || "";
      const newItem: HistoryItem = {
        id: "snap-" + Date.now(),
        filePath: currentFileNode.path,
        content: content,
        timestamp: new Date().toISOString(),
        linesCount: content.split("\n").length,
        charsCount: content.length,
        changeSummary: summaryText
      };
      
      list = [newItem, ...list].slice(0, 15);
      localStorage.setItem(`local_history_${currentFileNode.path}`, JSON.stringify(list));
      setHistory(list);
      setNewSnapshotSummary("");
    } catch (e) {
      console.error("Failed to save local snapshot", e);
    }
  };

  const handleCopyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    alert("Código copiado al portapapeles.");
  };

  const handleFileSelect = (path: string) => {
    setSelectedFilePath(path);
    onSelectFile(path);
    setShowFileList(false);
  };

  const selectedSnapshot = history.find(s => s.id === selectedSnapshotId);

  // Parse lines diff to show some custom diff indicators when comparing snapshot with active content
  const renderSimpleDiff = (orig: string, current: string) => {
    const origLines = orig.split("\n");
    const currLines = current.split("\n");
    
    // Simple line-by-line visual rendering comparison
    return (
      <div className="flex-1 overflow-y-auto font-mono text-[10.5px] leading-relaxed bg-[#05070c] rounded-lg border border-white/5 p-3 select-text space-y-0.5 scrollbar-thin">
        {origLines.map((line, idx) => {
          const matchingCurrLine = currLines[idx];
          let statusColor = "text-slate-400";
          let prefix = "  ";

          if (matchingCurrLine === undefined) {
            statusColor = "text-rose-400 bg-rose-500/10 border-l-2 border-rose-500 pl-1.5 line-through decoration-rose-500/85";
            prefix = "- ";
          } else if (line !== matchingCurrLine) {
            statusColor = "text-amber-400 bg-amber-500/10 border-l-2 border-amber-500 pl-1.5";
            prefix = "⚡";
          } else {
            statusColor = "text-slate-500 hover:text-slate-400 pr-1";
          }

          return (
            <div key={idx} className={`${statusColor} whitespace-pre-wrap`}>
              <span className="text-slate-700 w-6 inline-block select-none text-[9px]">{idx + 1}</span>
              <span className="text-slate-650 font-bold mr-1 select-none">{prefix}</span>
              <span>{line || " "}</span>
            </div>
          );
        })}

        {currLines.length > origLines.length && (
          <div className="pt-2 mt-2 border-t border-white/5">
            <span className="text-[9px] text-emerald-400 font-bold block mb-1">NUEVAS LÍNEAS EN VERSIÓN ACTUAL:</span>
            {currLines.slice(origLines.length).map((line, idx) => (
              <div key={idx} className="text-[#10b981] bg-emerald-500/10 border-l-2 border-emerald-500 pl-1.5 whitespace-pre-wrap">
                <span className="text-emerald-700 w-6 inline-block select-none text-[9px]">{origLines.length + idx + 1}</span>
                <span className="font-bold mr-1 select-none">+ </span>
                <span>{line || " "}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#080a0f] text-slate-300 font-mono text-xs select-none">
      
      {/* Title bar banner */}
      <div className="p-4 border-b border-white/5 bg-slate-900/40 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-amber-500" />
          <div className="min-w-0">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">HISTORIAL LOCAL</span>
            <button 
              onClick={() => setShowFileList(!showFileList)}
              className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 focus:outline-none truncate w-full"
            >
              <span className="truncate">
                {currentFileNode ? `${currentFileNode.name}` : "Seleccionar archivo"}
              </span>
              <ChevronRight className={`w-3.5 h-3.5 transform transition-transform shrink-0 ${showFileList ? 'rotate-90' : ''}`} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {selectedFilePath && history.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="p-1 hover:bg-slate-800 rounded text-rose-500/70 hover:text-rose-400 transition-colors"
              title="Limpiar historial para este archivo"
              id="clear-all-history-btn"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Selector de archivos del Workspace */}
      {showFileList && (
        <div className="p-3 border-b border-white/5 bg-slate-950/85 max-h-[160px] overflow-y-auto divide-y divide-white/[0.03] scrollbar-thin shrink-0">
          <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest pb-1.5 px-1 select-none">
            Archivos del Workspace
          </div>
          {filesWithSnapshotCounts.map(file => (
            <button
              key={file.path}
              onClick={() => handleFileSelect(file.path)}
              className={`w-full text-left p-1.5 rounded transition-colors flex items-center justify-between hover:bg-white/[0.03] ${
                selectedFilePath === file.path ? "bg-amber-500/5 text-amber-400" : "text-slate-450"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <FileCode className={`w-3.5 h-3.5 shrink-0 ${selectedFilePath === file.path ? 'text-amber-400' : 'text-slate-500'}`} />
                <span className="truncate text-[10.5px]">{file.name}</span>
              </div>
              {file.snapsCount > 0 && (
                <span className="text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1 rounded-full font-sans">
                  {file.snapsCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 p-3 flex flex-col min-h-0">
        
        {/* Caso en que no hay ningún fichero seleccionado */}
        {!selectedFilePath ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 font-mono text-xs">
            <Layers className="w-8 h-8 text-slate-700 mb-2" />
            <div>Abre o selecciona un archivo para rastrear su historial local</div>
            <button
              onClick={() => setShowFileList(true)}
              className="mt-4 px-3 py-1.5 bg-slate-900 border border-white/10 hover:border-white/20 text-slate-350 rounded transition-all text-[10px]"
            >
              Ver archivos disponibles
            </button>
          </div>
        ) : selectedSnapshot ? (
          /* Vista de comparación de Snapshot seleccionado */
          <div className="flex-1 flex flex-col min-h-0 space-y-2">
            <div className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-lg border border-white/5 shrink-0 gap-1.5">
              <button
                onClick={() => setSelectedSnapshotId(null)}
                className="flex items-center gap-1 py-1 px-1.5 bg-[#080d15] hover:bg-[#121925] border border-white/5 rounded text-[10px] text-slate-400 hover:text-white transition-colors"
                id="back-to-timeline-btn"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Historial</span>
              </button>

              <button
                onClick={() => handleCopyToClipboard(selectedSnapshot.content)}
                className="p-1.5 bg-[#080d15] hover:bg-[#121925] text-slate-400 hover:text-white border border-white/5 rounded transition-colors"
                title="Copiar contenido"
              >
                <Clipboard className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleRestore(selectedSnapshot)}
                className="bg-purple-500 text-slate-950 px-2 py-1.5 rounded text-[10px] font-bold hover:bg-purple-400 flex items-center gap-1 transition-colors ml-auto shadow"
                id="restore-code-btn"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Restaurar</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-[9px] text-[#5e6675] uppercase font-bold shrink-0 px-1 py-0.5 select-none">
              <span>Timeline Diff</span>
              <span className="text-amber-400">⚡ Cambios de Línea</span>
            </div>

            {renderSimpleDiff(selectedSnapshot.content, currentFileNode?.content || "")}
          </div>
        ) : (
          /* Vista de la lista de Snapshots guardadas */
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            
            {/* Formulario para capturar instantánea manual */}
            {currentFileNode && (
              <form onSubmit={handleCreateManualSnapshot} className="p-2.5 rounded-lg border border-white/5 bg-slate-900/30 flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  placeholder="Etiquetar versión actual..."
                  value={newSnapshotSummary}
                  onChange={(e) => setNewSnapshotSummary(e.target.value)}
                  className="flex-1 bg-slate-950/80 border border-white/5 hover:border-white/10 focus:border-purple-500/40 rounded px-2 py-1 text-[10.5px] text-slate-200 outline-none placeholder-slate-600 font-sans"
                />
                <button
                  type="submit"
                  className="p-1.5 bg-purple-500/10 hover:bg-purple-500 hover:text-slate-950 text-purple-400 rounded transition-all focus:outline-none shrink-0 border border-purple-500/20 hover:border-transparent"
                  title="Guardar instantánea manual"
                  id="create-manual-snapshot-btn"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

            {/* Listado de snapshots en vertical timeline */}
            <div className="flex-1 overflow-y-auto pr-0.5 space-y-2 relative scrollbar-thin">
              {history.length > 0 ? (
                <div className="relative pl-3.5 divide-y divide-white/[0.02]">
                  {/* Vertical timeline path line */}
                  <div className="absolute left-1.5 top-2 bottom-2 w-[1px] bg-gradient-to-b from-amber-500/30 via-purple-500/20 to-slate-800/10 select-none pointer-events-none" />

                  {history.map((snapshot, index) => {
                    const date = new Date(snapshot.timestamp);
                    const isNewest = index === 0;

                    return (
                      <div
                        key={snapshot.id}
                        onClick={() => setSelectedSnapshotId(snapshot.id)}
                        className="group relative pb-3 pt-2 pl-3 cursor-pointer select-none"
                      >
                        {/* Bullet point on the timeline path */}
                        <div className={`absolute left-[-11px] top-4.5 w-2 h-2 rounded-full border transform -translate-x-[0.5px] transition-all group-hover:scale-125 ${
                          isNewest 
                            ? "bg-amber-400 border-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]" 
                            : "bg-slate-900 border-slate-700 group-hover:border-purple-400"
                        }`} />

                        <div className="flex items-start justify-between min-w-0 pr-1 gap-2 bg-[#090b12] hover:bg-[#11141e] border border-white/[0.04] p-2 rounded-md transition-all">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-sans font-medium">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>{date.toLocaleTimeString()}</span>
                              <span className="text-slate-600">•</span>
                              <span className="text-[9px] text-slate-500">{date.toLocaleDateString()}</span>
                            </div>

                            {snapshot.changeSummary && (
                              <div className="text-[10.5px] text-slate-200 mt-1 font-semibold truncate group-hover:text-purple-400 transition-colors">
                                {snapshot.changeSummary}
                              </div>
                            )}

                            <div className="text-[9px] text-slate-500 mt-1 flex items-center gap-1.5 font-mono select-none">
                              <span className="bg-slate-800 px-1 py-0.2 rounded text-slate-400">{snapshot.linesCount} líneas</span>
                              <span className="bg-slate-800 px-1 py-0.2 rounded text-slate-400">{snapshot.charsCount} bytes</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 select-none">
                            <button
                              onClick={(e) => handleDeleteSnapshot(snapshot.id, e)}
                              className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition-all focus:outline-none"
                              title="Eliminar snapshot"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-400 transition-colors" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-650">
                  <History className="w-9 h-9 text-slate-800/40 mb-2" />
                  <div className="text-xs font-semibold text-slate-500">Sin historial registrado</div>
                  <p className="text-[10px] text-slate-600 mt-1.5 font-sans leading-normal max-w-[200px]">
                    Presiona Guardar (Ctrl+S) en tu editor para guardar un punto en la línea de tiempo.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-white/5 bg-slate-950/40 text-[9px] text-slate-600 leading-relaxed font-sans shrink-0">
        El historial local almacena instantáneas de tus ediciones, permitiéndote volver en el tiempo o comparar diffs con la versión actual de forma persistente.
      </div>
    </div>
  );
}
