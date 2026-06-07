import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  Terminal, 
  Folder, 
  FileCode, 
  Palette, 
  GitBranch, 
  Settings, 
  Play, 
  Eye, 
  Sparkles, 
  HelpCircle,
  Trash
} from "lucide-react";
import { Workspace, FileNode } from "../types";
import { flattenFileTree } from "../utils/initialWorkspaces";

interface CommandItem {
  id: string;
  category: "Files" | "Editor" | "Git" | "Tools" | "Themes";
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  currentWorkspace: Workspace;
  onSelectFile: (path: string) => void;
  onTriggerTheme: (themeName: string) => void;
  onTriggerAction: (actionKey: string) => void;
  availableThemes?: string[];
}

export default function CommandPalette({
  isOpen,
  onClose,
  currentWorkspace,
  onSelectFile,
  onTriggerTheme,
  onTriggerAction,
  availableThemes = ["One Dark Pro", "Synthwave Neon", "Solarized Dark", "Cyberpunk Red", "Tokyo Night", "GitHub Light"]
}: CommandPaletteProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle escape, enter and arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredItems.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, search, currentWorkspace]);

  // Auto-scroll list item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
    if (selectedElement) {
      const containerHeight = listRef.current.clientHeight;
      const elementTop = selectedElement.offsetTop;
      const elementHeight = selectedElement.clientHeight;
      
      if (elementTop + elementHeight > listRef.current.scrollTop + containerHeight) {
        listRef.current.scrollTop = elementTop + elementHeight - containerHeight;
      } else if (elementTop < listRef.current.scrollTop) {
        listRef.current.scrollTop = elementTop;
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const flatFiles = flattenFileTree(currentWorkspace?.fileTree || []);

  const items: CommandItem[] = [
    // --- GENERAL TOOL ACTIONS ---
    {
      id: "action-format",
      category: "Editor",
      title: "Prettier: Auto-formatear código activo",
      subtitle: "Corrige y alinea automáticamente estilos de indentación del búfer activo",
      icon: <FileCode className="w-4 h-4 text-emerald-400" />,
      action: () => onTriggerAction("format"),
      shortcut: "Alt + Shift + F"
    },
    {
      id: "action-blame",
      category: "Git",
      title: "Git Blame: Mostrar autoría por línea",
      subtitle: "Alterna la barra lateral con información sobre cambios y autoría de commits",
      icon: <GitBranch className="w-4 h-4 text-amber-400" />,
      action: () => onTriggerAction("blame"),
      shortcut: "Alt + B"
    },
    {
      id: "action-git-stage",
      category: "Git",
      title: "Git: Guardar los archivos cambiados en Stage",
      subtitle: "Prepara todos los cambios modificados del Workspace para commit simulado",
      icon: <GitBranch className="w-4 h-4 text-emerald-400" />,
      action: () => onTriggerAction("git-stage-all"),
      shortcut: "Ctrl + G"
    },
    {
      id: "action-test",
      category: "Tools",
      title: "Dev: Ejecutar Suite de Tests Integrada",
      subtitle: "Inicia la suite virtual de Jest/Vitest del archivo activo",
      icon: <Play className="w-4 h-4 text-indigo-400" />,
      action: () => onTriggerAction("run-tests"),
      shortcut: "Ctrl + Shift + T"
    },
    {
      id: "action-clear",
      category: "Tools",
      title: "Terminal: Limpiar historial de consolas",
      subtitle: "Limpia de forma integrada las terminales activas",
      icon: <Terminal className="w-4 h-4 text-gray-400" />,
      action: () => onTriggerAction("clear-terminal"),
      shortcut: "Ctrl + L"
    },
    {
      id: "action-toggle-preview",
      category: "Editor",
      title: "Preview: Alternar visualización del iframe en vivo",
      subtitle: "Abre o cierra el mini-navegador de renderizado dinámico",
      icon: <Eye className="w-4 h-4 text-sky-400" />,
      action: () => onTriggerAction("toggle-preview"),
      shortcut: "Ctrl + P"
    },
    {
      id: "action-history",
      category: "Editor",
      title: "Timeline: Mostrar Historial de Edición Local",
      subtitle: "Abre la vista cronológica de cambios guardados por sesión",
      icon: <Sparkles className="w-4 h-4 text-purple-400" />,
      action: () => onTriggerAction("local-history"),
      shortcut: "Alt + H"
    },
    {
      id: "action-settings",
      category: "Tools",
      title: "Ajustes: Abrir panel de configuración del editor",
      subtitle: "Configuración global de Sandbox, LLMs y Marketplace",
      icon: <Settings className="w-4 h-4 text-pink-400" />,
      action: () => onTriggerAction("settings")
    },
    // --- THEMES LIST ---
    ...availableThemes.map(themeName => ({
      id: `theme-${themeName.toLowerCase().replace(/\s+/g, "-")}`,
      category: "Themes" as const,
      title: `Estilo: Cambiar tema a "${themeName}"`,
      subtitle: "Aplica instantáneamente esta capa cromática de diseño antifatiga",
      icon: <Palette className="w-4 h-4 text-pink-400" />,
      action: () => onTriggerTheme(themeName)
    })),
    // --- FILE SYSTEM LIST ---
    ...flatFiles.map(file => ({
      id: `file-${file.path}`,
      category: "Files" as const,
      title: `Abrir: ${file.name}`,
      subtitle: `~/workspace/${file.path}`,
      icon: <FileCode className="w-4 h-4 text-sky-400" />,
      action: () => onSelectFile(file.path)
    }))
  ];

  // Fuzzy-ish filter
  const filteredItems = items.filter(item => {
    const query = search.toLowerCase().trim();
    if (!query) return true;
    return (
      item.title.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(query))
    );
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-[10vh] animate-fadeIn p-4">
      <div 
        className="w-full max-w-xl bg-slate-950 border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col font-mono text-xs text-gray-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Search header container */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-slate-900/60 shrink-0">
          <Search className="w-4 h-4 text-gray-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Escribe para buscar comandos o archivos (ej. format, main.py, One Dark)..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent border-none outline-none font-mono text-sm text-white focus:ring-0 placeholder:text-gray-600 h-6"
          />
          <span className="text-[9px] text-gray-600 font-bold border border-gray-800 px-1.5 py-0.5 rounded font-mono shrink-0 select-none">
            ESC PARA CERRAR
          </span>
        </div>

        {/* Categories helper */}
        <div className="flex flex-wrap gap-2 px-4 py-2 border-b border-white/[0.03] bg-slate-900/20 text-[9px] text-slate-500 font-bold tracking-wider shrink-0 select-none uppercase">
          <span className="text-gray-400">Categorías:</span>
          <span>Editor</span>
          <span>•</span>
          <span>Git</span>
          <span>•</span>
          <span>Tools</span>
          <span>•</span>
          <span>Themes</span>
          <span>•</span>
          <span>Files</span>
        </div>

        {/* Search results list */}
        <div 
          ref={listRef}
          className="flex-1 max-h-[340px] overflow-y-auto divide-y divide-white/5 scrollbar-thin scrollbar-thumb-white/5"
        >
          {filteredItems.length > 0 ? (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-all ${
                    isSelected 
                      ? "bg-slate-800 text-white border-l-2 border-indigo-500 pl-3.5" 
                      : "hover:bg-slate-900 text-slate-350"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded transition-transform ${isSelected ? "bg-slate-700/50 scale-105" : "bg-slate-900/50"}`}>
                      {item.icon}
                    </div>
                    <div className="min-w-0 select-none">
                      <div className="font-semibold text-[11px] truncate">{item.title}</div>
                      {item.subtitle && (
                        <div className="text-[9px] text-slate-500 truncate mt-0.5 font-normal">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 select-none">
                    <span className="text-[8px] uppercase tracking-wider font-bold text-slate-600 bg-slate-900 px-1.5 py-0.5 rounded">
                      {item.category}
                    </span>
                    {item.shortcut && (
                      <span className="text-[9px] font-bold text-slate-500 font-mono border border-slate-850 px-1 py-0.5 rounded">
                        {item.shortcut}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-600">
              <HelpCircle className="w-8 h-8 text-slate-700 mb-1.5" />
              <div className="text-[11px] font-bold">No se encontraron resultados</div>
              <div className="text-[9px] text-slate-705 mt-0.5">Prueba a escribir términos genéricos de comandos o extensiones</div>
            </div>
          )}
        </div>

        {/* Footer shortcuts helper info */}
        <div className="border-t border-white/5 bg-slate-950 p-2.5 flex justify-between items-center text-[9px] text-[#5e6675] font-semibold tracking-wide select-none">
          <span>Soporta búsqueda parcial de archivos y comandos</span>
          <div className="flex items-center gap-1.5">
            <span>↑↓ para navegar</span>
            <span>•</span>
            <span>[Enter] para ejecutar</span>
          </div>
        </div>
      </div>
    </div>
  );
}
