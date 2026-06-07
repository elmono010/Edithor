import React, { useState, useEffect } from "react";
import { FileNode } from "../types";
import { flattenFileTree } from "../utils/initialWorkspaces";
import fuzzysort from "fuzzysort";
import { 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Replace, 
  FileCode, 
  X,
  Settings,
  FolderClosed,
  List,
  BookOpen,
  FilePlus,
  SlidersHorizontal,
  RefreshCw,
  ArrowUpRight,
  Eye,
  History,
  Undo,
  Redo,
  AlertTriangle,
  Check
} from "lucide-react";

interface SearchMatch {
  filePath: string;
  line: number;
  column: number;
  matchText: string;
  originalText: string;
  replacedText: string;
  score?: number;
  indexes?: number[];
}

interface UndoRecord {
  id: string;
  timestamp: string;
  searchQuery: string;
  replaceQuery: string;
  affectedFilesCount: number;
  totalLineReplacements: number;
  filesBackup: { 
    filePath: string; 
    originalContent: string; 
    replacedContent: string; 
  }[];
}

interface SearchPanelProps {
  fileTree: FileNode[];
  onSelectFile: (path: string) => void;
  onUpdateFileContent: (path: string, newContent: string) => void;
  onPeekFile?: (path: string, line: number, column: number, matchText: string) => void;
  activePeekFile?: { filePath: string; line: number; column: number } | null;
}

export default function SearchPanel({
  fileTree,
  onSelectFile,
  onUpdateFileContent,
  onPeekFile,
  activePeekFile
}: SearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState("localhost");
  const [replaceQuery, setReplaceQuery] = useState("Replace");
  const [matchCase, setMatchCase] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [preserveCase, setPreserveCase] = useState(false);
  
  const [fileExtensionFilter, setFileExtensionFilter] = useState("e.g. *.ts, src/**/include (↑↓ for history)");
  const [filesToExclude, setFilesToExclude] = useState("");
  const [fileFuzzyQuery, setFileFuzzyQuery] = useState("");
  
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [selectedMatches, setSelectedMatches] = useState<Record<string, boolean>>({});
  const [searchExecuted, setSearchExecuted] = useState(false);
  const [showReplacePreview, setShowReplacePreview] = useState(false);
  const [replaceSuccess, setReplaceSuccess] = useState(false);
  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({});

  // States for Refactoring Confirmation and Undo Rollback Stack
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [undoStack, setUndoStack] = useState<UndoRecord[]>([]);
  const [redoStack, setRedoStack] = useState<UndoRecord[]>([]);
  const [recentlyReplacedInfo, setRecentlyReplacedInfo] = useState<{
    affectedFilesCount: number;
    totalLineReplacements: number;
    searchQuery: string;
    replaceQuery: string;
    timestamp: string;
  } | null>(null);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  // Initialize all found matches as selected by default
  useEffect(() => {
    const initialSelected: Record<string, boolean> = {};
    matches.forEach((m, idx) => {
      const key = `${m.filePath}:${m.line}:${m.column}:${idx}`;
      initialSelected[key] = true;
    });
    setSelectedMatches(initialSelected);
  }, [matches]);

  // Tabs for file type filters
  const [activeTab, setActiveTab] = useState<"all" | "ts-js" | "markdown" | "css-html" | "json">("all");

  // Trigger search on mount and when changes occur
  useEffect(() => {
    const timer = setTimeout(() => {
      executeGlobalSearch();
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery, replaceQuery, matchCase, matchWholeWord, useRegex, fileExtensionFilter, filesToExclude, fileFuzzyQuery, fileTree]);

  const executeGlobalSearch = () => {
    const actualQuery = searchQuery.trim();
    if (!actualQuery) {
      if (matches.length > 0) {
        setMatches([]);
      }
      setSearchExecuted(false);
      return;
    }

    try {
      localStorage.setItem("task_fuzzy_search_count", "1");
    } catch (e) {}

    const flatFiles = flattenFileTree(fileTree);
    const results: SearchMatch[] = [];

    // Filter by file extension/path if configured (and not the placeholder)
    const isIncludePlaceholder = fileExtensionFilter.startsWith("e.g. *.ts");
    const includePattern = isIncludePlaceholder ? "" : fileExtensionFilter.trim();
    
    const filteredFiles = flatFiles.filter(file => {
      // Exclude files
      if (filesToExclude) {
        const excludes = filesToExclude.split(",").map(f => f.trim().toLowerCase());
        const lowerName = file.name.toLowerCase();
        const lowerPath = file.path.toLowerCase();
        if (excludes.some(exc => lowerName.includes(exc) || lowerPath.includes(exc))) {
          return false;
        }
      }

      // Include files
      if (!includePattern) return true;
      const filters = includePattern.split(",").map(f => f.trim().toLowerCase().replace("*.", "."));
      const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
      return filters.some(f => ext.endsWith(f) || file.name.toLowerCase().endsWith(f) || file.path.toLowerCase().includes(f));
    });

    for (const file of filteredFiles) {
      if (!file.content) continue;
      const lines = file.content.split("\n");

      // Score files where the name matches the query word first
      const fileName = file.name.toLowerCase();
      let fileRelevanceBonus = 0;
      const fileMatchObj = fuzzysort.single(actualQuery, fileName);
      if (fileMatchObj) {
        // Boost files that have search matches inside their names (closer score to 0 means higher relevance)
        fileRelevanceBonus = Math.abs(fileMatchObj.score) * 0.25 + 150;
      }

      lines.forEach((lineText, idx) => {
        const lineNo = idx + 1;
        let isMatch = false;
        let startIdx = 0;
        let matchedPart = "";
        let finalReplaced = lineText;
        let indexes: number[] | undefined = undefined;
        let finalScore = -10000;

        // Custom exact substring match check first for maximum accuracy and high score boost
        const exactIdx = matchCase 
          ? lineText.indexOf(actualQuery) 
          : lineText.toLowerCase().indexOf(actualQuery.toLowerCase());

        // Respect regex if activated
        if (useRegex) {
          try {
            const flags = matchCase ? "g" : "gi";
            const regex = new RegExp(actualQuery, flags);
            const match = regex.exec(lineText);
            if (match) {
              isMatch = true;
              startIdx = match.index;
              matchedPart = match[0];
              finalReplaced = lineText.replace(regex, replaceQuery);
              finalScore = 2000; // Constant good score for regex matches
            }
          } catch (e) {
            // Raw pattern recovery
          }
        } else if (exactIdx !== -1) {
          // Exact substring matches get highest relevance score
          isMatch = true;
          startIdx = exactIdx;
          matchedPart = lineText.substring(exactIdx, exactIdx + actualQuery.length);
          
          const replaceText = replaceQuery === "Replace" ? "" : replaceQuery;
          const regex = new RegExp(actualQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), matchCase ? "g" : "gi");
          finalReplaced = lineText.replace(regex, replaceText);
          
          finalScore = 5000 + fileRelevanceBonus - lineNo * 0.1; // Bonus for early lines
          
          // Generate indexes for highlighting
          indexes = [];
          for (let i = 0; i < actualQuery.length; i++) {
            indexes.push(exactIdx + i);
          }
        } else {
          // Run fuzzysort score match
          const fuzzyRes = fuzzysort.single(actualQuery, lineText);
          if (fuzzyRes) {
            // Filter noise out of short search strings
            const minAllowedScore = actualQuery.length === 1 ? -15 : actualQuery.length === 2 ? -45 : -400;
            if (fuzzyRes.score >= minAllowedScore) {
              isMatch = true;
              startIdx = fuzzyRes.indexes[0] ?? 0;
              matchedPart = lineText.substring(startIdx, (fuzzyRes.indexes[fuzzyRes.indexes.length - 1] ?? startIdx) + 1);
              indexes = Array.from(fuzzyRes.indexes);
              
              const replaceText = replaceQuery === "Replace" ? "" : replaceQuery;
              const regex = new RegExp(actualQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), matchCase ? "g" : "gi");
              finalReplaced = lineText.replace(regex, replaceText);
              
              finalScore = fuzzyRes.score + fileRelevanceBonus - lineNo * 0.1;
            }
          }
        }

        if (isMatch) {
          results.push({
            filePath: file.path,
            line: lineNo,
            column: startIdx + 1,
            matchText: matchedPart,
            originalText: lineText,
            replacedText: finalReplaced,
            score: finalScore,
            indexes: indexes
          });
        }
      });
    }

    // Sort globally by score descending to push high-relevance items to the absolute top
    results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const isDifferent = results.length !== matches.length || results.some((r, idx) => {
      const match = matches[idx];
      return !match ||
             r.filePath !== match.filePath ||
             r.line !== match.line ||
             r.column !== match.column ||
             r.matchText !== match.matchText ||
             r.replacedText !== match.replacedText;
    });

    if (isDifferent) {
      setMatches(results);
    }
    setSearchExecuted(true);
  };

  const executeGlobalReplace = () => {
    if (matches.length === 0) return;
    setShowReplacePreview(true);
  };

  const commitBulkReplacement = () => {
    // Filter out only the selected matches using selectedMatches mapping
    const activeSelectedMatches = matches.filter((m, idx) => {
      const key = `${m.filePath}:${m.line}:${m.column}:${idx}`;
      return !!selectedMatches[key];
    });

    if (activeSelectedMatches.length === 0) {
      alert("No has seleccionado ningún cambio para aplicar.");
      return;
    }

    // Group selected matches by file path to apply all updates smoothly at once
    const fileMatchesMap: Record<string, SearchMatch[]> = {};
    activeSelectedMatches.forEach(m => {
      if (!fileMatchesMap[m.filePath]) fileMatchesMap[m.filePath] = [];
      fileMatchesMap[m.filePath].push(m);
    });

    const flatFiles = flattenFileTree(fileTree);
    const backupList: { filePath: string; originalContent: string; replacedContent: string }[] = [];

    // Capture individual file states BOTH before and after mutation
    Object.entries(fileMatchesMap).forEach(([filePath, matchItems]) => {
      const fileNode = flatFiles.find(f => f.path === filePath);
      if (fileNode && fileNode.content !== undefined) {
        const fileLines = fileNode.content.split("\n");
        const fileLinesCopy = [...fileLines];
        matchItems.forEach(item => {
          fileLinesCopy[item.line - 1] = item.replacedText;
        });
        const replacedContent = fileLinesCopy.join("\n");

        backupList.push({
          filePath,
          originalContent: fileNode.content,
          replacedContent
        });
      }
    });

    const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Construct undo record holding the backup array with both original and replaced states
    const undoRecord: UndoRecord = {
      id: "refactor-" + Math.random().toString(36).substring(2, 9),
      timestamp: timestampStr,
      searchQuery,
      replaceQuery,
      affectedFilesCount: Object.keys(fileMatchesMap).length,
      totalLineReplacements: activeSelectedMatches.length,
      filesBackup: backupList
    };

    // Safely write replaced text to the active lines of code
    backupList.forEach(backup => {
      onUpdateFileContent(backup.filePath, backup.replacedContent);
    });

    // Save to rollback history queue (max size 5) and clear current redo tree
    setUndoStack(prev => [undoRecord, ...prev].slice(0, 5));
    setRedoStack([]); // Clear redo options on a primary user iteration action
    
    setRecentlyReplacedInfo({
      affectedFilesCount: Object.keys(fileMatchesMap).length,
      totalLineReplacements: activeSelectedMatches.length,
      searchQuery,
      replaceQuery,
      timestamp: timestampStr
    });

    setReplaceSuccess(true);
    setShowConfirmModal(false);
    setShowReplacePreview(false);
    setSearchQuery("");
    setReplaceQuery("");
    setTimeout(() => {
      setReplaceSuccess(false);
    }, 5000);
  };

  const handleUndoRefactor = (record: UndoRecord) => {
    record.filesBackup.forEach(backup => {
      onUpdateFileContent(backup.filePath, backup.originalContent);
    });
    setUndoStack(prev => prev.filter(r => r.id !== record.id));
    setRedoStack(prev => [record, ...prev].slice(0, 5));
    setRecentlyReplacedInfo(null);
  };

  const handleRedoRefactor = (record: UndoRecord) => {
    record.filesBackup.forEach(backup => {
      onUpdateFileContent(backup.filePath, backup.replacedContent);
    });
    setRedoStack(prev => prev.filter(r => r.id !== record.id));
    setUndoStack(prev => [record, ...prev].slice(0, 5));
    setRecentlyReplacedInfo({
      affectedFilesCount: record.affectedFilesCount,
      totalLineReplacements: record.totalLineReplacements,
      searchQuery: record.searchQuery,
      replaceQuery: record.replaceQuery,
      timestamp: record.timestamp
    });
  };

  const handleUndoAll = () => {
    undoStack.forEach(record => {
      record.filesBackup.forEach(backup => {
        onUpdateFileContent(backup.filePath, backup.originalContent);
      });
    });
    setRedoStack(prev => [...undoStack, ...prev].slice(0, 5));
    setUndoStack([]);
    setRecentlyReplacedInfo(null);
  };

  const toggleFileCollapse = (path: string) => {
    setCollapsedFiles(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const handleToggleAllOverall = () => {
    const totalSelected = matches.filter((m, idx) => selectedMatches[`${m.filePath}:${m.line}:${m.column}:${idx}`]).length;
    const allSelected = totalSelected === matches.length;

    setSelectedMatches(prev => {
      const copy = { ...prev };
      matches.forEach((m, idx) => {
        const key = `${m.filePath}:${m.line}:${m.column}:${idx}`;
        copy[key] = !allSelected;
      });
      return copy;
    });
  };

  const handleSelectAllGroup = (fileMatches: SearchMatch[]) => {
    const isAnyUnchecked = fileMatches.some((m) => {
      const idx = matches.indexOf(m);
      const key = `${m.filePath}:${m.line}:${m.column}:${idx}`;
      return !selectedMatches[key];
    });

    setSelectedMatches(prev => {
      const copy = { ...prev };
      fileMatches.forEach((m) => {
        const idx = matches.indexOf(m);
        const key = `${m.filePath}:${m.line}:${m.column}:${idx}`;
        copy[key] = isAnyUnchecked;
      });
      return copy;
    });
  };

  const getFileContextFolder = (path: string) => {
    const parts = path.split("/").filter(Boolean);
    if (parts.length > 1) {
      const folder = parts[parts.length - 2];
      return folder.toUpperCase();
    }
    return "CONCURSOS RAMA";
  };

  // Render highlights inside characters safely
  const renderLineWithSearchHighlights = (text: string, phrase: string, indexes?: number[]) => {
    // If we have precise match indices from the fuzzysort library, highlight individual characters beautifully
    if (indexes && indexes.length > 0) {
      const elements: React.ReactNode[] = [];
      const indexSet = new Set(indexes);

      for (let i = 0; i < text.length; i++) {
        if (indexSet.has(i)) {
          elements.push(
            <mark 
              key={i} 
              className="bg-[#663c1a] text-amber-200 rounded-[1px] px-[1px] border-b border-[#ffae00]/40 font-bold font-mono inline select-text cursor-pointer hover:bg-[#7c4d26] transition-all"
              title="Fuzzy Match Character"
            >
              {text[i]}
            </mark>
          );
        } else {
          elements.push(<span key={i} className="text-neutral-300">{text[i]}</span>);
        }
      }

      return (
        <span className="font-mono text-[10.5px] leading-relaxed select-text tracking-wide whitespace-pre">
          {elements}
        </span>
      );
    }

    if (!phrase) return <span>{text}</span>;
    try {
      const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${escaped})`, matchCase ? "g" : "gi");
      const parts = text.split(regex);
      
      return (
        <span className="font-mono text-[10.5px] leading-relaxed select-text tracking-wide whitespace-pre">
          {parts.map((part, index) => 
            part.toLowerCase() === phrase.toLowerCase() ? (
              <mark 
                key={index} 
                className="bg-[#542c13] text-neutral-150 rounded-[1px] px-0.5 border-b border-[#ffd700]/15 font-semibold font-mono inline select-text cursor-pointer hover:bg-[#6c3a19] transition-all"
              >
                {part}
              </mark>
            ) : (
              <span key={index} className="text-neutral-300">{part}</span>
            )
          )}
        </span>
      );
    } catch (e) {
      return <span className="text-neutral-300">{text}</span>;
    }
  };

  // Global counts across all file types computed reactively for counters on tabs
  const counts = {
    all: matches.length,
    tsJs: matches.filter(m => {
      const ext = m.filePath.split(".").pop()?.toLowerCase() || "";
      return ["ts", "tsx", "js", "jsx"].includes(ext);
    }).length,
    markdown: matches.filter(m => {
      return m.filePath.endsWith(".md");
    }).length,
    cssHtml: matches.filter(m => {
      const ext = m.filePath.split(".").pop()?.toLowerCase() || "";
      return ["css", "html"].includes(ext);
    }).length,
    json: matches.filter(m => {
      const ext = m.filePath.split(".").pop()?.toLowerCase() || "";
      return ["json", "yaml", "yml", "toml"].includes(ext) || m.filePath.includes("config");
    }).length,
  };

  // Filter actual results dynamically based on Active Tab & Fuzzy file name match (using Fuzzysort)
  const filteredMatches = (() => {
    let list = matches.filter(m => {
      const ext = m.filePath.split(".").pop()?.toLowerCase() || "";
      if (activeTab === "all") return true;
      if (activeTab === "ts-js") return ["ts", "tsx", "js", "jsx"].includes(ext);
      if (activeTab === "markdown") return ext === "md";
      if (activeTab === "css-html") return ["css", "html"].includes(ext);
      if (activeTab === "json") return ["json", "yaml", "yml", "toml"].includes(ext) || m.filePath.includes("config");
      return true;
    });

    if (fileFuzzyQuery.trim()) {
      const q = fileFuzzyQuery.trim().toLowerCase();
      const uniquePaths = Array.from(new Set(list.map(m => m.filePath)));
      // Use fuzzysort.go to evaluate matching score of file paths
      const fuzzyResults = fuzzysort.go(q, uniquePaths);
      const passedPaths = new Set(fuzzyResults.map(res => res.target));
      list = list.filter(m => passedPaths.has(m.filePath));
    }
    return list;
  })();

  // Group filtered matches helper
  const groupedMatches: Record<string, SearchMatch[]> = {};
  filteredMatches.forEach(m => {
    if (!groupedMatches[m.filePath]) groupedMatches[m.filePath] = [];
    groupedMatches[m.filePath].push(m);
  });

  const totalResultsCount = filteredMatches.length;
  const totalFilesCount = Object.keys(groupedMatches).length;

  // Fuzzy files from all workspace files when searchQuery is empty
  const fuzzyWorkspaceFiles = (() => {
    if (searchQuery.trim() || !fileFuzzyQuery.trim()) {
      return [];
    }
    const flatFiles = flattenFileTree(fileTree);
    const filePaths = flatFiles.map(f => f.path);
    const fuzzyResults = fuzzysort.go(fileFuzzyQuery.trim(), filePaths);
    
    // Sort and present structured fuzzy elements
    return fuzzyResults.map(res => {
      const path = res.target;
      const fileNode = flatFiles.find(f => f.path === path);
      return {
        path,
        name: path.split("/").pop() || "",
        score: res.score,
        indexes: Array.from(res.indexes),
        node: fileNode
      };
    });
  })();

  return (
    <div className="flex-1 flex flex-col h-full bg-[#000000] font-sans select-none border-r border-neutral-900">
      
      {/* 1. HEADER ROW: "Code Search" with interactive control icons */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-neutral-900 bg-[#000000]">
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest font-mono">
          Code Search
        </span>
        <div className="flex items-center gap-2 text-neutral-400 shrink-0">
          <button 
            title="Sincronizar Búsqueda" 
            className="p-1 hover:bg-neutral-900 hover:text-white rounded transition-colors cursor-pointer"
            onClick={executeGlobalSearch}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button 
            title={`Refactor History / Undo Stack (${undoStack.length} active)`} 
            onClick={() => setShowHistoryPanel(!showHistoryPanel)}
            className={`p-1 rounded transition-all cursor-pointer relative ${
              showHistoryPanel 
                ? "bg-[#007acc]/20 text-sky-450 border border-[#007acc]/30" 
                : "hover:bg-neutral-900 hover:text-white"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            {undoStack.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
            )}
          </button>
          <button title="Formato Lista (VSC)" className="p-1 hover:bg-neutral-900 hover:text-white rounded transition-all cursor-pointer">
            <List className="w-3.5 h-3.5 text-neutral-400" />
          </button>
          <button title="Nuevo Archivo" className="p-1 hover:bg-neutral-900 hover:text-white rounded transition-all cursor-pointer">
            <FilePlus className="w-3.5 h-3.5 text-neutral-500" />
          </button>
          <button title="Alternar Filtros" className="p-1 hover:bg-neutral-900 hover:text-white rounded transition-all cursor-pointer">
            <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500" />
          </button>
          <button 
            title="Colapsar Todo" 
            onClick={() => {
              const allCollapsed: Record<string, boolean> = {};
              Object.keys(groupedMatches).forEach(fp => {
                allCollapsed[fp] = true;
              });
              setCollapsedFiles(allCollapsed);
            }}
            className="p-1 hover:bg-neutral-900 hover:text-white rounded transition-all cursor-pointer"
          >
            <FolderClosed className="w-3.5 h-3.5 text-neutral-500" />
          </button>
        </div>
      </div>

      {/* Refactor history panel */}
      {showHistoryPanel && (
        <div className="m-3.5 p-3.5 rounded border border-neutral-800 bg-[#070707] flex flex-col gap-2.5 font-mono select-text">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-400 flex items-center gap-1.5 uppercase font-sans">
              <History className="w-3.5 h-3.5 text-sky-400" />
              Refactor History / Undo-Redo Stack
            </span>
            <button 
              onClick={() => setShowHistoryPanel(false)}
              className="text-neutral-550 hover:text-white cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          
          {undoStack.length === 0 && redoStack.length === 0 ? (
            <div className="text-[9.5px] text-neutral-605 italic py-2 leading-relaxed">
              No recent bulk replacements recorded in this session. Edits will show up here as rollbacks.
            </div>
          ) : (
            <div className="space-y-3 mt-1.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
              {/* Undoable Items */}
              {undoStack.map((record, idx) => (
                <div key={record.id} className="p-2.5 border border-neutral-850 rounded hover:border-neutral-800 bg-neutral-950/60 flex flex-col gap-1.5 select-text">
                  <div className="flex items-center justify-between text-[9px] text-neutral-550">
                    <span>🕒 {record.timestamp}</span>
                    <span className="text-[8px] font-bold text-sky-400 bg-sky-505/10 px-1 rounded font-sans uppercase">Can Undo ({idx === 0 ? "Last" : `-${idx}`})</span>
                  </div>

                  <div className="text-[10.5px] text-neutral-300 leading-normal font-sans">
                    Replaced <strong className="text-red-400 font-bold">"{record.searchQuery}"</strong> with <strong className="text-emerald-400 font-bold">"{record.replaceQuery}"</strong>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-neutral-550">
                    <span>
                      📄 {record.affectedFilesCount} files • {record.totalLineReplacements} lines
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUndoRefactor(record)}
                      className="px-2 py-0.5 bg-neutral-900 hover:bg-sky-950 hover:text-sky-405 border border-neutral-800 rounded transition-all text-neutral-450 font-sans text-[8px] uppercase tracking-wide cursor-pointer font-bold flex items-center gap-1"
                    >
                      <Undo className="w-2.5 h-2.5" />
                      Undo Revert
                    </button>
                  </div>
                </div>
              ))}

              {/* Redoable Items */}
              {redoStack.map((record) => (
                <div key={record.id} className="p-2.5 border border-neutral-850 rounded hover:border-neutral-800 bg-[#121212]/30 flex flex-col gap-1.5 select-text opacity-75 hover:opacity-100 transition-opacity">
                  <div className="flex items-center justify-between text-[9px] text-neutral-550">
                    <span>🕒 {record.timestamp}</span>
                    <span className="text-[8px] font-bold text-amber-500 bg-amber-505/10 px-1 rounded font-sans uppercase">Can Redo</span>
                  </div>

                  <div className="text-[10.5px] text-neutral-400 leading-normal font-sans">
                    Redo <strong className="text-red-400 font-medium">"{record.searchQuery}"</strong> with <strong className="text-emerald-450 font-bold">"{record.replaceQuery}"</strong>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-neutral-500">
                    <span>
                      📄 {record.affectedFilesCount} files • {record.totalLineReplacements} lines
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRedoRefactor(record)}
                      className="px-2 py-0.5 bg-neutral-900 hover:bg-emerald-950 hover:text-emerald-405 border border-neutral-800 rounded transition-all text-neutral-450 font-sans text-[8px] uppercase tracking-wide cursor-pointer font-bold flex items-center gap-1"
                    >
                      <Redo className="w-2.5 h-2.5 text-emerald-500" />
                      Redo Apply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. TEXT SEARCH INPUT PANEL */}
      <div className="p-3.5 border-b border-neutral-900 flex flex-col gap-2.5 bg-[#000000]/60">
        <div className="space-y-2 select-text">
          
          {/* Row A: SEARCH INPUT */}
          <div className="relative group">
            <input
              type="text"
              placeholder="localhost"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121212] border border-neutral-800 hover:border-neutral-700 focus:border-[#007acc] rounded px-2.5 py-1.5 pr-20 text-[11px] text-neutral-200 placeholder:text-neutral-700 focus:outline-none font-mono"
            />
            {/* Right side aligned options inside input box */}
            <div className="absolute right-2 top-1 flex items-center gap-0.5 select-none bg-transparent">
              <button
                type="button"
                onClick={() => setMatchCase(!matchCase)}
                title="Coincidir Mayúsculas (Aa)"
                className={`px-1 py-0.5 rounded text-[10px] font-mono transition-colors font-semibold cursor-pointer ${
                  matchCase 
                    ? "bg-[#007acc]/20 border border-[#007acc]/40 text-sky-400" 
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                Aa
              </button>
              <button
                type="button"
                onClick={() => setMatchWholeWord(!matchWholeWord)}
                title="Palabra Completa (ab|)"
                className={`px-1 py-0.5 rounded text-[10px] font-mono transition-colors font-semibold cursor-pointer ${
                  matchWholeWord 
                    ? "bg-[#007acc]/20 border border-[#007acc]/40 text-sky-400" 
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                ab
              </button>
              <button
                type="button"
                onClick={() => setUseRegex(!useRegex)}
                title="Usar Expresión Regular (.*)"
                className={`px-1 py-0.5 rounded text-[10px] font-mono transition-colors font-semibold cursor-pointer ${
                  useRegex 
                    ? "bg-[#007acc]/20 border border-[#007acc]/40 text-sky-400" 
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                .*
              </button>
            </div>
          </div>

          {/* Row B: REPLACE INPUT */}
          <div className="relative group">
            <input
              type="text"
              placeholder="Replace with..."
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  executeGlobalReplace();
                }
              }}
              className="w-full bg-[#121212] border border-neutral-800 hover:border-neutral-700 focus:border-[#007acc] rounded px-2.5 py-1.5 pr-14 text-[11px] text-neutral-200 placeholder:text-neutral-700 focus:outline-none font-mono"
            />
            <div className="absolute right-2 top-1 flex items-center gap-1 select-none bg-transparent">
              <button
                type="button"
                onClick={() => setPreserveCase(!preserveCase)}
                title="Preservar Mayúsculas/Minúsculas"
                className={`px-1 py-0.5 rounded text-[9.5px] font-mono font-bold cursor-pointer transition-colors ${
                  preserveCase 
                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-500" 
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                AB
              </button>
              <button
                type="button"
                onClick={executeGlobalReplace}
                title="Ver Vista Previa y Comparador de Diferencias (Enter)"
                className="p-1 rounded text-neutral-500 hover:text-white cursor-pointer active:scale-90 transition-all font-mono"
              >
                <Replace className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Row C: FUZZY FILE FILTER */}
          <div className="space-y-1">
            <label className="block text-[9.5px] uppercase font-bold text-neutral-450 tracking-wide font-mono flex items-center justify-between select-none">
              <span>fuzzy file filter</span>
              <span className="text-[7.5px] text-amber-500 font-mono font-bold uppercase select-none">by fuzzysort</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Fuzzy match file names (e.g. schema, App, types)"
                value={fileFuzzyQuery}
                onChange={(e) => setFileFuzzyQuery(e.target.value)}
                className="w-full bg-[#121212] border border-neutral-800 hover:border-neutral-700 focus:border-[#007acc] rounded px-2.5 py-1.5 pr-8 text-[11px] text-neutral-200 placeholder:text-neutral-700 focus:outline-none font-mono"
              />
              <FileCode className="w-3.5 h-3.5 text-amber-500 absolute right-2.5 top-2.5" />
            </div>
          </div>

          {/* Row D: FILES TO INCLUDE */}
          <div className="space-y-1">
            <label className="block text-[9.5px] uppercase font-bold text-neutral-450 tracking-wide font-mono">
              files to include
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. *.ts, src/**/include (↑↓ for history)"
                value={fileExtensionFilter}
                onChange={(e) => setFileExtensionFilter(e.target.value)}
                className="w-full bg-[#121212] border border-neutral-800 hover:border-neutral-700 focus:border-[#007acc] rounded px-2.5 py-1.5 pr-8 text-[11px] text-neutral-300 placeholder:text-neutral-700 focus:outline-none font-mono"
              />
              <BookOpen className="w-3.5 h-3.5 text-neutral-500 absolute right-2.5 top-2.5 hover:text-white cursor-pointer" />
            </div>
          </div>

          {/* Row E: FILES TO EXCLUDE */}
          <div className="space-y-1">
            <label className="block text-[9.5px] uppercase font-bold text-[#8c8c8c] tracking-wide font-mono">
              files to exclude
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder=""
                value={filesToExclude}
                onChange={(e) => setFilesToExclude(e.target.value)}
                className="w-full bg-[#121212] border border-neutral-800 hover:border-neutral-700 focus:border-[#007acc] rounded px-2.5 py-1.5 pr-8 text-[11px] text-neutral-300 placeholder:text-neutral-700 focus:outline-none font-mono"
              />
              <Settings className="w-3.5 h-3.5 text-neutral-500 absolute right-2.5 top-2.5 hover:text-white cursor-pointer" />
            </div>
          </div>

        </div>
      </div>

      {/* 3. DEDICATED TYPE TABS Switcher Panel (VS Code style with counts) */}
      <div className="px-3 py-2 flex items-center gap-1 overflow-x-auto scrollbar-none bg-[#0a0a0a] border-b border-neutral-900 shrink-0">
        {[
          { id: "all", label: "All", count: counts.all, dot: "text-neutral-400" },
          { id: "ts-js", label: "TS/JS", count: counts.tsJs, dot: "text-sky-500" },
          { id: "markdown", label: "Markdown", count: counts.markdown, dot: "text-teal-400" },
          { id: "css-html", label: "CSS/HTML", count: counts.cssHtml, dot: "text-orange-500" },
          { id: "json", label: "JSON/Config", count: counts.json, dot: "text-amber-400" },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono font-semibold transition-all cursor-pointer select-none shrink-0 border ${
                isActive
                  ? "bg-[#1f1f1f] border-neutral-700 text-white shadow-sm"
                  : "bg-transparent border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900/40"
              }`}
            >
              <span className={`text-[8px] ${tab.dot}`}>●</span>
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`text-[8.5px] font-bold px-1 rounded font-mono ${
                  isActive ? "bg-neutral-800 text-neutral-300" : "bg-neutral-900/50 text-neutral-600"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. CORE RELEVANCE RANKED RESULTS LIST */}
      <div className="flex-1 overflow-y-auto px-1 py-2.5 scrollbar-none font-mono">
        
        {replaceSuccess && (
          <div className="mx-2 mb-3 mt-1.5 p-3 rounded border border-emerald-500/20 bg-emerald-500/10 flex flex-col gap-2 font-sans text-emerald-400 select-text">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 animate-pulse" />
                Listo! Reemplazo aplicado con éxito.
              </span>
              <span className="text-[9px] text-neutral-500 font-mono">{recentlyReplacedInfo?.timestamp}</span>
            </div>
            
            {recentlyReplacedInfo && (
              <p className="text-[10px] text-neutral-400 leading-normal">
                Se modificaron <strong className="text-emerald-300">{recentlyReplacedInfo.totalLineReplacements}</strong> líneas en <strong className="text-emerald-300">{recentlyReplacedInfo.affectedFilesCount}</strong> archivos ("{recentlyReplacedInfo.searchQuery}" ➔ "{recentlyReplacedInfo.replaceQuery}").
              </p>
            )}

            {undoStack.length > 0 && (
              <button
                type="button"
                onClick={() => handleUndoRefactor(undoStack[0])}
                className="mt-1 w-full bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/20 text-sky-450 hover:text-sky-350 py-1.5 px-2 text-[9px] font-bold uppercase rounded cursor-pointer transition-colors font-mono flex items-center justify-center gap-1"
              >
                <Undo className="w-3 h-3" />
                Deshacer / Undo Last Refactor
              </button>
            )}
          </div>
        )}

        {/* Bulk Replace Warning/Diff-Trigger Banner */}
        {searchExecuted && totalResultsCount > 0 && replaceQuery.trim() !== "" && (
          <div className="mx-2 mb-3 p-2.5 rounded border border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/15 transition-all flex flex-col gap-1.5 select-text">
            <div className="flex items-center justify-between text-[10px] text-amber-500 font-bold uppercase tracking-wider font-sans">
              <span>⚠️ REEMPLAZO DISPONIBLE</span>
              <span className="text-[8px] bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded">Bulk Diff Mode</span>
            </div>
            <p className="text-[9.5px] text-neutral-400 leading-normal font-sans">
              Se modificarán <strong className="text-amber-200">{totalResultsCount}</strong> líneas de <strong className="text-amber-200">{totalFilesCount}</strong> archivos.
            </p>
            <button
              type="button"
              onClick={() => setShowReplacePreview(true)}
              className="mt-1 w-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-mono text-[9px] font-bold py-1 px-2 rounded border border-amber-500/20 active:scale-[0.98] transition-all text-center cursor-pointer flex items-center justify-center gap-1"
            >
              <Replace className="w-3 h-3 text-amber-400" />
              Previsualizar & Aplicar Cambios (Diff)
            </button>
          </div>
        )}

        {/* Results Info Counter bar */}
        {searchExecuted && totalResultsCount > 0 && (
          <div className="flex items-center gap-2 px-2.5 py-1 pt-0.5 pb-2.5 text-[10.5px] text-neutral-500 tracking-wide font-medium font-mono select-none">
            <span className="text-neutral-350">
              <strong className="text-neutral-300">{totalResultsCount}</strong> resultados en <strong className="text-neutral-300">{totalFilesCount}</strong> files
            </span>
            <span>-</span>
            <button 
              type="button" 
              onClick={() => setShowReplacePreview(!showReplacePreview)}
              className="text-[#007acc] hover:underline cursor-pointer font-semibold transition-colors"
            >
              Open in editor
            </button>
          </div>
        )}

        {/* Default initial message / Fuzzy files matching lists */}
        {!searchQuery.trim() && !fileFuzzyQuery.trim() && (
          <div className="text-center py-16 px-4 text-neutral-600 font-sans">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-25 text-neutral-400 animate-pulse" />
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest font-mono">BÚSQUEDA GLOBAL FUZZY</p>
            <p className="text-[10px] balance mt-2 leading-relaxed select-none">
              Escribe código o clases para buscar instantáneamente coincidencias semánticas.
            </p>
          </div>
        )}

        {/* Workspace Fuzzy File Results (fuzzysort list of files) */}
        {!searchQuery.trim() && fileFuzzyQuery.trim() && (
          <div className="space-y-1.5 px-2 select-text animate-fade-in">
            <div className="flex items-center justify-between px-2.5 py-1 pt-0.5 pb-2 text-[10.5px] text-neutral-500 tracking-wide font-medium font-mono select-none border-b border-neutral-900/40 mb-2">
              <span className="text-neutral-405 flex items-center gap-1.5">
                <span className="text-amber-500 font-black uppercase tracking-tight">Fuzzysort</span>
                <span>•</span>
                <span>Found <strong className="text-neutral-350 font-mono font-bold">{fuzzyWorkspaceFiles.length}</strong> matched files</span>
              </span>
            </div>

            {fuzzyWorkspaceFiles.length === 0 ? (
              <div className="text-center py-12 px-4 text-neutral-600 font-sans select-none">
                <X className="w-8 h-8 mx-auto mb-2 opacity-25 text-neutral-450" />
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest font-mono">NO FILES FOUND</p>
                <p className="text-[10px] mt-2 leading-relaxed">
                  No files fuzzy-matched with the query "{fileFuzzyQuery}".
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {fuzzyWorkspaceFiles.map((fileItem, idx) => {
                  const scorePercent = Math.min(100, Math.max(15, Math.floor(((fileItem.score + 1000) / 1000) * 100)));
                  const context = getFileContextFolder(fileItem.path);

                  return (
                    <div 
                      key={fileItem.path}
                      onClick={() => onSelectFile(fileItem.path)}
                      className="flex items-center justify-between py-2 px-2.5 bg-neutral-950/40 hover:bg-[#181818]/60 border border-neutral-900/60 hover:border-neutral-800 rounded cursor-pointer transition-all font-mono select-text"
                    >
                      <div className="flex items-center min-w-0 flex-1 gap-2">
                        <FileCode className="w-4 h-4 text-sky-400 shrink-0 select-none" />
                        <div className="flex flex-col min-w-0 leading-normal">
                          <span className="text-[11.5px] font-bold text-sky-450 truncate">
                            {renderLineWithSearchHighlights(fileItem.name, fileFuzzyQuery, fileItem.indexes)}
                          </span>
                          <span className="text-[9px] text-neutral-500 truncate font-semibold select-none mt-0.5">
                            {fileItem.path} • {context}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2 select-none font-mono text-[9px]">
                        <span 
                          className="w-1.5 h-4 text-neutral-800 rounded-sm relative overflow-hidden" 
                          title={`Score: ${fileItem.score}`}
                        >
                          <span 
                            className="absolute bottom-0 left-0 right-0 bg-sky-400" 
                            style={{ height: `${scorePercent}%` }} 
                          />
                        </span>
                        <div className="bg-[#1f1f1f] text-neutral-400 font-bold px-1.5 py-0.5 rounded">
                          {fileItem.score}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* No outcomes warning */}
        {searchExecuted && totalResultsCount === 0 && searchQuery.trim() !== "" && (
          <div className="text-center py-16 px-4 text-neutral-600 font-sans">
            <X className="w-8 h-8 mx-auto mb-2 opacity-20 text-neutral-400" />
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest font-mono">SIN COINCIDENCIAS</p>
            <p className="text-[10px] mt-2 leading-relaxed select-none">
              No se hallaron coincidencias en el proyecto que respeten los filtros definidos.
            </p>
          </div>
        )}

        {/* Render Accordion Groupings */}
        {searchExecuted && totalResultsCount > 0 && (
          <div className="space-y-1.5 px-1">
            {Object.entries(groupedMatches).map(([filePath, fileMatches]) => {
              const isCollapsed = collapsedFiles[filePath];
              const context = getFileContextFolder(filePath);
              const fileName = filePath.split("/").pop();
              const fileMatchesCount = fileMatches.length;

              // Calculate top match score to indicate relevance (visual gradient bar representation)
              const topScoreObj = fileMatches[0];
              const scorePercent = topScoreObj && topScoreObj.score ? Math.min(100, Math.max(10, Math.floor(((topScoreObj.score + 500) / 5500) * 100))) : 40;

              return (
                <div key={filePath} className="rounded select-none">
                  
                  {/* File accordion header bar */}
                  <div 
                    onClick={() => toggleFileCollapse(filePath)}
                    className="flex items-center justify-between py-1 px-1.5 hover:bg-neutral-900/60 rounded cursor-pointer transition-colors"
                  >
                    <div className="flex items-center min-w-0 flex-1 gap-1">
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      )}
                      
                      {/* VSC Git indicators representing mod statuses */}
                      <span className="text-[#81b88b] text-[9.5px] font-bold shrink-0 mr-1 select-none font-mono">M+</span>
                      <FileCode className="w-3.5 h-3.5 text-[#81b88b] shrink-0" />
                      
                      {/* File Name */}
                      <span className="text-[11px] font-bold text-[#81b88b] truncate ml-0.5 mr-1 bg-transparent select-text">
                        {fileName}
                      </span>
                      
                      {/* Context Path / Folder Context */}
                      <span className="text-[9.5px] text-neutral-550 truncate font-medium bg-transparent select-none max-w-[140px]">
                        {context} • .... U
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {/* Relevance indicators bar */}
                      <span 
                        className="w-1.5 h-3.5 rounded-sm bg-neutral-800 relative overflow-hidden" 
                        title={`Relevancia: ${scorePercent}%`}
                      >
                        <span 
                          className="absolute bottom-0 left-0 right-0 bg-amber-400" 
                          style={{ height: `${scorePercent}%` }} 
                        />
                      </span>
                      {/* count bubble */}
                      <div className="bg-[#242424] text-neutral-400 font-bold font-mono text-[9px] px-1.5 py-0.5 rounded-full select-none">
                        {fileMatchesCount}
                      </div>
                    </div>
                  </div>

                  {/* Lines list */}
                  {!isCollapsed && (
                    <div className="pl-6 pt-0.5 pb-1 select-text border-l border-neutral-900/40 ml-3.5 space-y-1">
                      {fileMatches.map((m, idx) => {
                        const trimmedLine = m.originalText.trim();
                        const isPeeked = activePeekFile && 
                          activePeekFile.filePath === m.filePath && 
                          activePeekFile.line === m.line && 
                          activePeekFile.column === m.column;

                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              try {
                                localStorage.setItem("task_peek_count", "1");
                              } catch (e) {}
                              if (onPeekFile) {
                                onPeekFile(m.filePath, m.line, m.column, m.matchText);
                              } else {
                                onSelectFile(m.filePath);
                              }
                            }}
                            className={`group/item relative py-1.5 pr-2 pl-2 rounded border-l select-text cursor-pointer transition-all block font-mono text-[10.5px] truncate leading-normal ${
                              isPeeked 
                                ? "bg-amber-950/40 border-amber-500 text-amber-200 shadow-sm" 
                                : "hover:bg-neutral-900/60 border-transparent text-neutral-400 hover:text-neutral-200"
                            }`}
                          >
                            {/* Line, score, and quick action options */}
                            <div className="flex items-center justify-between text-[9px] select-none mb-1 font-bold font-mono">
                              <div className="flex items-center gap-1.5 text-neutral-500 font-bold">
                                <span className={isPeeked ? "text-amber-400" : "text-[#a3a3a3]"}>L:{m.line}</span>
                                <span>•</span>
                                <span>Relevance:</span>
                                <span className={m.score && m.score > 4000 ? "text-emerald-400" : m.score && m.score > 200 ? "text-sky-450 font-semibold" : "text-neutral-500"}>
                                  {m.score && m.score > 0 ? "High" : "Fuzzy"}
                                </span>
                              </div>

                              {/* Hover / Quick selectors */}
                              <div className="flex items-center gap-1 opacity-40 group-hover/item:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  title="Vista Previa Rápida (Peek)"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onPeekFile) {
                                      onPeekFile(m.filePath, m.line, m.column, m.matchText);
                                    }
                                  }}
                                  className={`p-0.5 rounded cursor-pointer transition-colors ${
                                    isPeeked ? "bg-amber-500/20 text-amber-400" : "hover:bg-neutral-800 text-neutral-400 hover:text-amber-400"
                                  }`}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  title="Abrir Editor en Pestaña"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectFile(m.filePath);
                                    setTimeout(() => {
                                      const activePane = "left";
                                      const box = document.getElementById(`editor-textarea-${activePane}`) as HTMLTextAreaElement | null;
                                      if (box) {
                                        box.focus();
                                        const text = box.value;
                                        const rawLines = text.split("\n");
                                        let finalPos = 0;
                                        for (let l = 0; l < m.line - 1 && l < rawLines.length; l++) {
                                          finalPos += rawLines[l].length + 1;
                                        }
                                        finalPos += m.column - 1;
                                        box.selectionStart = finalPos;
                                        box.selectionEnd = finalPos + m.matchText.length;
                                        box.scrollTop = Math.max(0, (m.line - 5) * 20);
                                      }
                                    }, 50);
                                  }}
                                  className="p-0.5 hover:bg-[#1f1f1f] rounded text-neutral-500 hover:text-white cursor-pointer transition-colors"
                                >
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            
                            {/* Exact character highlighting using index mapping */}
                            <div className="overflow-hidden truncate select-text">
                              {renderLineWithSearchHighlights(trimmedLine, m.matchText, m.indexes)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* 5. MULTI-FILE DIFF COMPARISON VIEWPORT (MODAL OVERLAY) */}
      {showReplacePreview && (() => {
        const previewGrouped: Record<string, { matchesWithOrigIndex: { m: SearchMatch; originalIndex: number }[] }> = {};
        filteredMatches.forEach((m) => {
          const originalIndex = matches.findIndex(match => match === m);
          if (!previewGrouped[m.filePath]) {
            previewGrouped[m.filePath] = { matchesWithOrigIndex: [] };
          }
          previewGrouped[m.filePath].matchesWithOrigIndex.push({ m, originalIndex });
        });

        const totalSelectedCount = matches.filter((m, idx) => selectedMatches[`${m.filePath}:${m.line}:${m.column}:${idx}`]).length;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
            <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-[#0b0b0b] border border-neutral-800 rounded-lg shadow-2xl overflow-hidden select-text text-neutral-205">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-[#121212]">
                <div className="flex items-center gap-2.5">
                  <Replace className="w-5 h-5 text-amber-500 animate-pulse" />
                  <div>
                    <h3 className="text-sm font-bold tracking-tight text-white uppercase font-mono">
                      Bulk Replace: Multi-File Diff View
                    </h3>
                    <p className="text-[10px] text-neutral-500 font-medium font-mono mt-0.5">
                      Check and select the changes you want to apply before finalizing the bulk replacement.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReplacePreview(false)}
                  className="p-1 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                  title="Close Diff Preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* General summaries / Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 border-b border-neutral-850 bg-[#141414] text-xs text-neutral-400 font-mono">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    📄 Files: <strong className="text-white font-bold">{totalFilesCount}</strong>
                  </span>
                  <span className="text-neutral-700">|</span>
                  <span className="flex items-center gap-1">
                    ✍️ Total Matches: <strong className="text-amber-400 font-bold">{totalResultsCount}</strong>
                  </span>
                  <span className="text-neutral-700">|</span>
                  <span className="flex items-center gap-1 flex-wrap">
                    ✓ Selected to Replace: <strong className="text-sky-400 font-bold">{totalSelectedCount}</strong>
                  </span>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleToggleAllOverall}
                    className="px-2.5 py-1 text-[10px] bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:text-white rounded cursor-pointer transition-all font-semibold"
                  >
                    {totalSelectedCount === matches.length ? "Deselect All" : "Select All"}
                  </button>
                </div>
              </div>

              {/* Scrollable Viewport Compare Container */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin bg-neutral-950/40">
                {Object.keys(previewGrouped).length === 0 ? (
                  <div className="text-center py-16 text-neutral-500 font-mono text-xs leading-relaxed max-w-sm mx-auto">
                    No matching search lines found. Please check your query or active file type filters in the search box.
                  </div>
                ) : (
                  Object.entries(previewGrouped).map(([filePath, group]) => {
                    const fileName = filePath.split("/").pop();
                    const fileMatches = group.matchesWithOrigIndex.map(item => item.m);
                    const isAnyFileMatchChecked = group.matchesWithOrigIndex.some(
                      item => selectedMatches[`${item.m.filePath}:${item.m.line}:${item.m.column}:${item.originalIndex}`]
                    );
                    const areAllFileMatchesChecked = group.matchesWithOrigIndex.every(
                      item => selectedMatches[`${item.m.filePath}:${item.m.line}:${item.m.column}:${item.originalIndex}`]
                    );

                    return (
                      <div key={filePath} className="border border-neutral-850 bg-[#111111] rounded-md overflow-hidden">
                        
                        {/* Box Header containing files path */}
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-850 bg-neutral-900/60 select-none">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={areAllFileMatchesChecked}
                              ref={(el) => {
                                if (el) {
                                  el.indeterminate = isAnyFileMatchChecked && !areAllFileMatchesChecked;
                                }
                              }}
                              onChange={() => handleSelectAllGroup(fileMatches)}
                              className="rounded border-neutral-700 text-sky-500 focus:ring-sky-500 focus:ring-offset-black cursor-pointer w-3.5 h-3.5 accent-sky-500"
                            />
                            <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="text-[11.5px] font-bold text-emerald-400 truncate">
                              {fileName}
                            </span>
                            <span className="text-[9px] text-neutral-500 truncate font-semibold">
                              ({filePath})
                            </span>
                          </div>
                          <div className="text-[9px] font-bold bg-neutral-900 text-neutral-400 border border-neutral-800 rounded px-1.5 py-0.5">
                            {fileMatches.length} occurrences
                          </div>
                        </div>

                        {/* File details list of line comparisons */}
                        <div className="divide-y divide-neutral-900 bg-[#080808]">
                          {group.matchesWithOrigIndex.map(({ m, originalIndex }) => {
                            const key = `${m.filePath}:${m.line}:${m.column}:${originalIndex}`;
                            const isChecked = !!selectedMatches[key];

                            return (
                              <div 
                                key={key} 
                                className={`flex items-start gap-3.5 p-3.5 hover:bg-neutral-900/35 transition-colors ${
                                  !isChecked ? "opacity-35" : ""
                                }`}
                              >
                                
                                <div className="flex items-center h-5 pt-0.5 select-none">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      setSelectedMatches(prev => ({
                                        ...prev,
                                        [key]: !prev[key]
                                      }));
                                    }}
                                    className="rounded border-neutral-750 text-[#007acc] focus:ring-[#007acc] cursor-pointer w-3.5 h-3.5 accent-[#007acc]"
                                  />
                                </div>

                                <div className="flex-1 min-w-0 leading-normal font-mono text-[10.5px]">
                                  <div className="text-[9.5px] font-bold text-neutral-550 uppercase tracking-wide mb-2 flex items-center justify-between">
                                    <span>LINE {m.line} • COLUMN {m.column}</span>
                                    <span className="text-neutral-600 text-[8px]">Index: {originalIndex}</span>
                                  </div>
                                  
                                  {/* Old original text */}
                                  <div className="flex items-start w-full bg-[#522d2d]/15 border-l-2 border-red-500/80 px-2.5 py-1.5 rounded-sm mb-1 text-red-200/90 break-all">
                                    <span className="text-red-500 font-bold mr-2 select-none shrink-0">-</span>
                                    <span className="whitespace-pre-wrap select-text leading-relaxed">{m.originalText}</span>
                                  </div>

                                  {/* New replaced text */}
                                  <div className="flex items-start w-full bg-[#1c3a2f]/15 border-l-2 border-emerald-500/80 px-2.5 py-1.5 rounded-sm text-emerald-200/90 break-all">
                                    <span className="text-emerald-500 font-bold mr-2 select-none shrink-0">+</span>
                                    <span className="whitespace-pre-wrap select-text leading-relaxed">{m.replacedText}</span>
                                  </div>

                                </div>

                              </div>
                            );
                          })}
                        </div>

                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer Controls */}
              <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-neutral-800 bg-[#121212]">
                <button
                  type="button"
                  onClick={() => setShowReplacePreview(false)}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-medium font-mono text-[10px] uppercase rounded transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={totalSelectedCount === 0}
                  className="px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-900 disabled:text-neutral-600 text-white font-bold font-mono text-[10px] uppercase rounded transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/20 disabled:cursor-not-allowed"
                >
                  <Replace className="w-3.5 h-3.5 shrink-0" />
                  Commit {totalSelectedCount} Selected Replacements
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {showConfirmModal && (() => {
        const activeSelectedMatches = matches.filter((m, idx) => {
          const key = `${m.filePath}:${m.line}:${m.column}:${idx}`;
          return !!selectedMatches[key];
        });

        const fileMatchesMap: Record<string, SearchMatch[]> = {};
        activeSelectedMatches.forEach(m => {
          if (!fileMatchesMap[m.filePath]) fileMatchesMap[m.filePath] = [];
          fileMatchesMap[m.filePath].push(m);
        });

        const affectedFilesCount = Object.keys(fileMatchesMap).length;
        const totalLineReplacements = activeSelectedMatches.length;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in font-sans">
            <div className="relative w-full max-w-md bg-[#0d0d0d] border border-neutral-800 rounded-lg shadow-2xl p-5 select-text text-neutral-300">
              
              <div className="flex items-start gap-4 mb-4">
                <div className="p-2.5 bg-indigo-500/10 rounded-full text-indigo-400">
                  <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase font-mono tracking-tight">
                    Confirm Bulk Refactor
                  </h3>
                  <p className="text-[10px] text-neutral-500 font-medium font-mono mt-0.5">
                    Verify scope of code overwriting across your workspace.
                  </p>
                </div>
              </div>

              {/* Summary card details */}
              <div className="bg-[#121212] border border-neutral-850 rounded p-3.5 space-y-3 mb-5 font-mono text-[10.5px]">
                <div className="flex items-center justify-between text-neutral-400">
                  <span>Scope Action:</span>
                  <span className="text-white font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded text-[8px]">
                    Batch Overwrite
                  </span>
                </div>
                <div className="h-px bg-neutral-900" />
                <div className="flex items-center justify-between">
                  <span className="text-neutral-450">Search Query:</span>
                  <span className="text-red-450 bg-red-500/5 px-2 py-0.5 rounded border border-red-500/10 max-w-[200px] truncate text-right font-semibold" title={searchQuery}>
                    "{searchQuery}"
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-450">Replace With:</span>
                  <span className="text-emerald-450 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 max-w-[200px] truncate text-right font-semibold" title={replaceQuery}>
                    "{replaceQuery}"
                  </span>
                </div>
                <div className="h-px bg-neutral-900" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-neutral-500 text-[9px] uppercase">Affected Files</div>
                    <div className="text-white text-base font-bold tracking-tight mt-0.5">{affectedFilesCount}</div>
                  </div>
                  <div>
                    <div className="text-neutral-550 text-[9px] uppercase">Line Replacements</div>
                    <div className="text-amber-400 text-base font-bold tracking-tight mt-0.5">{totalLineReplacements}</div>
                  </div>
                </div>
              </div>

              {/* Affected Files List scrollable context */}
              <div className="mb-5 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                <div className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest font-mono">
                  Affected files overview:
                </div>
                {Object.entries(fileMatchesMap).map(([path, lineMatches]) => {
                  const filename = path.split("/").pop();
                  return (
                    <div key={path} className="flex items-center justify-between text-[10px] py-1 px-2 rounded bg-neutral-950 border border-neutral-900 font-mono">
                      <span className="text-neutral-400 truncate max-w-[240px]" title={path}>
                        📄 {filename} <span className="text-neutral-600 text-[8.5px]">({path})</span>
                      </span>
                      <span className="text-sky-400 font-bold bg-sky-500/10 px-1.5 py-0.5 rounded">
                        x{lineMatches.length} lines
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Previous active refactorings in memory */}
              {undoStack.length > 0 && (
                <div className="mb-5 border border-amber-500/25 bg-amber-500/5 rounded p-3 text-neutral-300 font-sans">
                  <div className="flex items-center justify-between text-[10px] font-bold text-amber-500 font-mono mb-1.5 uppercase">
                    <span>⚠️ HISTORIAL DE REEMPLAZOS EN MEMORIA</span>
                    <span>{undoStack.length} Activo(s)</span>
                  </div>
                  
                  <p className="text-[9.5px] text-neutral-450 leading-normal mb-3">
                    Already have bulk replacements applied in this session? You can revert those with a single click right here:
                  </p>

                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    <button
                      type="button"
                      onClick={() => {
                        handleUndoAll();
                        setShowConfirmModal(false);
                      }}
                      className="w-full py-2 px-2 bg-red-950/40 hover:bg-neutral-900 border border-red-500/30 text-rose-300 hover:text-rose-200 font-mono text-[9px] font-bold uppercase rounded cursor-pointer transition-all flex items-center justify-center gap-1.5 focus:outline-none"
                    >
                      <Undo className="w-3.5 h-3.5 text-rose-450" />
                      Deshacer TODOS los cambios anteriores ({undoStack.length})
                    </button>
                    
                    {undoStack.map((record, index) => (
                      <div key={record.id} className="flex items-center justify-between bg-neutral-950 border border-neutral-900 rounded p-1.5 text-[9px] font-mono gap-1.5 font-bold">
                        <span className="text-neutral-450 truncate max-w-[190px]" title={`Undo "${record.searchQuery}" ➔ "${record.replaceQuery}"`}>
                          #{index + 1}: "{record.searchQuery}" ➔ "{record.replaceQuery}"
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUndoRefactor(record)}
                          className="px-2 py-0.5 bg-neutral-900 hover:bg-red-950 hover:text-red-400 border border-neutral-800 rounded transition-colors text-[8px] font-bold uppercase cursor-pointer shrink-0 font-sans"
                        >
                          Undo
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Redo stack in memory */}
              {redoStack.length > 0 && (
                <div className="mb-5 border border-emerald-500/25 bg-emerald-500/5 rounded p-3 text-neutral-300 font-sans">
                  <div className="flex items-center justify-between text-[10px] font-bold text-emerald-400 font-mono mb-1.5 uppercase">
                    <span>🔁 REDO STACK EN MEMORIA</span>
                    <span>{redoStack.length} Redo(s)</span>
                  </div>

                  <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                    {redoStack.map((record, index) => (
                      <div key={record.id} className="flex items-center justify-between bg-neutral-950 border border-neutral-900 rounded p-1.5 text-[9px] font-mono gap-1.5 font-bold">
                        <span className="text-neutral-450 truncate max-w-[190px]" title={`Redo "${record.searchQuery}" ➔ "${record.replaceQuery}"`}>
                          #{index + 1}: "{record.searchQuery}" ➔ "{record.replaceQuery}"
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRedoRefactor(record)}
                          className="px-2 py-0.5 bg-neutral-900 hover:bg-emerald-950 hover:text-emerald-400 border border-neutral-800 rounded transition-colors text-[8px] font-bold uppercase cursor-pointer shrink-0 font-sans"
                        >
                          Redo Apply
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 rounded border border-sky-500/15 bg-sky-500/5 text-sky-400 font-sans text-xs mb-5 flex gap-2.5 leading-relaxed">
                <Undo className="w-5 h-5 text-sky-400 shrink-0 mt-0.5 animate-pulse" />
                <p className="text-[9.5px]">
                  <strong>Undo Stack Safeguard active:</strong> A complete snapshot copy of these {affectedFilesCount} files will be held in memory. Revert this action instantly at any point during this session.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 px-1">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-3.5 py-2 hover:bg-neutral-900 text-neutral-400 hover:text-white font-semibold font-mono text-[9.5px] uppercase rounded transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={commitBulkReplacement}
                  className="px-4.5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold font-mono text-[9.5px] uppercase rounded transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer shadow-lg shadow-sky-950/20"
                >
                  <Replace className="w-4 h-4 text-white" />
                  Confirm & Overwrite Files
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}
