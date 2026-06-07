import React, { useState } from "react";
import { 
  ShoppingBag, 
  Check, 
  ArrowRight, 
  Trash, 
  Star, 
  Users, 
  Award, 
  Puzzle, 
  RefreshCw, 
  ShieldAlert, 
  Zap,
  Tag
} from "lucide-react";

export interface ExtensionItem {
  id: string;
  name: string;
  version: string;
  developer: string;
  description: string;
  longDescription: string;
  rating: number;
  downloads: string;
  icon: string; // Emoji or Tailwind character
  category: "Formatters" | "Linters" | "Themes" | "Testing" | "Utility";
  isInstalled: boolean;
  isPremium?: boolean;
}

interface ExtensionsMarketplaceProps {
  activeExtensions: string[];
  onToggleExtension: (id: string) => void;
}

const INITIAL_EXTENSIONS: ExtensionItem[] = [
  {
    id: "ext-prettier",
    name: "Prettier - Code Formatter",
    version: "3.2.1",
    developer: "Prettier Team",
    description: "Formaton-Save editor code. Enforces standardized visual line spacing and formatting rules.",
    longDescription: "El formateador por excelencia. Al estar activo, cada vez que guardes un archivo mediante Ctrl+S o mediante la paleta de comandos, se eliminará el espaciado inconsistente y se uniformarán los sangrados automáticamente.",
    rating: 4.9,
    downloads: "24.5M",
    icon: "🎨",
    category: "Formatters",
    isInstalled: true,
    isPremium: false
  },
  {
    id: "ext-eslint",
    name: "ESLint Premium Parser",
    version: "8.56.0",
    developer: "ESLint Org",
    description: "Visual analysis for variables, syntax structures, rendering real-time lint warnings in your line gutter.",
    longDescription: "Analizador de sintaxis de alto rendimiento. Muestra advertencias interactivas sobre variables no declaradas o bloques vacíos en la barra lateral e inyecta subrayados ondulados en el código activo.",
    rating: 4.8,
    downloads: "19.2M",
    icon: "🛡️",
    category: "Linters",
    isInstalled: true,
    isPremium: false
  },
  {
    id: "ext-themes",
    name: "Neon Synthwave Theme Pack",
    version: "1.4.0",
    developer: "Tokyo Designs",
    description: "Unlocks extra aesthetic high-contrast themes including Synthwave '84, Solarized Cyber, Tokyo Night.",
    longDescription: "Suma esquemas de color adicionales ultra-nítidos al selector de temas del editor de código, incluyendo luces retro de neón y fondos oscuros cibernéticos inspirados en Shibuya.",
    rating: 4.7,
    downloads: "8.4M",
    icon: "🌌",
    category: "Themes",
    isInstalled: false,
    isPremium: true
  },
  {
    id: "ext-testrunner",
    name: "Vitest / Jest Pro Runner",
    version: "2.1.2",
    developer: "Vitest Co",
    description: "Auto-runs virtual unit test scripts continuously upon saving your python/javascript elements.",
    longDescription: "Habilita la integración de pruebas continuas. Cada vez que guardes un archivo, el sistema simula inmediatamente la suite de pruebas unitarias y actualiza los indicadores de cobertura en verde/rojo.",
    rating: 4.9,
    downloads: "5.1M",
    icon: "⚡",
    category: "Testing",
    isInstalled: false,
    isPremium: true
  },
  {
    id: "ext-autoprefixer",
    name: "CSS Overrides Autoprefixer",
    version: "10.0.1",
    developer: "PostCSS Core",
    description: "Automatically analyzes stylesheet rules to correct multi-browser visual prefix elements.",
    longDescription: "Complemento para desarrolladores web. Revisa y formatea ficheros CSS locales para asegurar que las esquinas y sombras se visualicen perfectamente en todos los navegadores móviles.",
    rating: 4.5,
    downloads: "3.2M",
    icon: "📦",
    category: "Utility",
    isInstalled: false,
    isPremium: false
  }
];

export default function ExtensionsMarketplace({
  activeExtensions,
  onToggleExtension
}: ExtensionsMarketplaceProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [detailedExtensionId, setDetailedExtensionId] = useState<string | null>(null);

  // Load state
  const [extensions, setExtensions] = useState<ExtensionItem[]>(() => {
    const saved = localStorage.getItem("neon_marketplace_extensions");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Sync with activeExtensions array from parent
          return parsed.map(ext => ({
            ...ext,
            isInstalled: activeExtensions.includes(ext.id)
          }));
        }
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_EXTENSIONS.map(ext => ({
      ...ext,
      isInstalled: activeExtensions.includes(ext.id)
    }));
  });

  const handleInstallToggle = (id: string) => {
    const updated = extensions.map(ext => {
      if (ext.id === id) {
        const nextState = !ext.isInstalled;
        return { ...ext, isInstalled: nextState };
      }
      return ext;
    });
    setExtensions(updated);
    localStorage.setItem("neon_marketplace_extensions", JSON.stringify(updated));
    onToggleExtension(id);
  };

  const filteredExtensions = extensions.filter(ext => {
    const matchesSearch = ext.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          ext.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ext.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || ext.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const activeDetail = extensions.find(ext => ext.id === detailedExtensionId);

  return (
    <div className="flex flex-col h-full bg-[#080a0f] text-slate-300 font-mono text-xs select-none">
      
      {/* Drawer Title Bar */}
      <div className="p-4 border-b border-white/5 bg-slate-900/40 shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-pink-400" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Plugins & Extensiones</span>
        </div>
        <p className="text-[10px] text-slate-500 mt-1 leading-normal font-sans">
          Marketplace local de extensiones de Antigravity. Activa herramientas o estilos de diseño.
        </p>
      </div>

      {/* Category selector pills */}
      <div className="px-3 pt-3 flex flex-wrap gap-1.5 shrink-0">
        {["All", "Formatters", "Linters", "Themes", "Testing", "Utility"].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-2 py-1 rounded text-[9px] font-bold border transition-all cursor-pointer ${
              selectedCategory === cat
                ? "bg-pink-500/10 text-pink-400 border-pink-500/30"
                : "bg-slate-900/40 text-slate-500 border-white/5 hover:border-slate-800"
            }`}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Search Input Container */}
      <div className="p-3 shrink-0">
        <div className="bg-[#05070a] border border-white/5 rounded-lg flex items-center px-2 py-1.5 gap-2">
          <input
            type="text"
            placeholder="Buscar extensiones, formatters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder:text-gray-700 h-5"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")} 
              className="text-[9px] text-gray-500 hover:text-white"
            >
              LIMPIAR
            </button>
          )}
        </div>
      </div>

      {/* Cards List Panel */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2.5 scrollbar-thin">
        {filteredExtensions.map(ext => {
          const isInstalled = activeExtensions.includes(ext.id);
          return (
            <div
              key={ext.id}
              className={`p-3 rounded-lg border bg-[#0d1017]/80 hover:bg-[#11151f] transition-all relative group flex flex-col justify-between ${
                isInstalled 
                  ? "border-[#ec4899]/20 shadow-[0_0_8px_rgba(236,72,153,0.03)]" 
                  : "border-white/5 hover:border-slate-800"
              }`}
            >
              <div 
                className="cursor-pointer"
                onClick={() => setDetailedExtensionId(ext.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl shrink-0 select-none">{ext.icon}</span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-[11px] text-slate-200 truncate group-hover:text-pink-400 transition-colors">
                        {ext.name}
                      </h4>
                      <p className="text-[9px] text-[#5e6675] mt-0.5">
                        v{ext.version} • {ext.developer}
                      </p>
                    </div>
                  </div>

                  {ext.isPremium && (
                    <span className="text-[7.5px] font-bold tracking-wider text-pink-400 bg-pink-500/10 border border-pink-500/20 px-1 py-0.5 rounded uppercase select-none">
                      PREMIUM
                    </span>
                  )}
                </div>

                <p className="text-[10.5px] text-slate-400 mt-2 leading-relaxed font-sans line-clamp-2">
                  {ext.description}
                </p>

                {/* Rating and Downloads */}
                <div className="flex items-center gap-3 mt-2.5 text-[9px] text-slate-500 select-none font-sans">
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span className="font-bold text-slate-400">{ext.rating}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Users className="w-3 h-3 text-slate-600" />
                    <span>{ext.downloads} descargas</span>
                  </div>
                </div>
              </div>

              {/* Install button */}
              <div className="mt-3.5 pt-2.5 border-t border-white/[0.04] flex items-center justify-between">
                <span className="text-[8px] bg-slate-900 border border-white/5 px-1.5 py-0.5 rounded text-gray-500 font-mono select-none">
                  {ext.category.toUpperCase()}
                </span>

                <button
                  onClick={() => handleInstallToggle(ext.id)}
                  id={`install-btn-${ext.id}`}
                  className={`px-3 py-1 rounded text-[10px] font-bold font-mono cursor-pointer transition-all ${
                    isInstalled
                      ? "bg-slate-900 border border-white/5 text-rose-400 hover:bg-rose-500/5 hover:text-rose-300"
                      : "bg-pink-500 text-slate-950 hover:bg-pink-400"
                  }`}
                >
                  {isInstalled ? "Desactivar" : "Instalar"}
                </button>
              </div>
            </div>
          );
        })}

        {filteredExtensions.length === 0 && (
          <div className="text-center py-12 text-slate-600 font-sans">
            Ningún complemento coincide con los filtros aplicados.
          </div>
        )}
      </div>

      {/* Expanded Extension Detail Overlay Modal */}
      {activeDetail && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div 
            className="w-full max-w-md bg-slate-950 border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col font-mono text-xs text-gray-300 animate-fadeIn"
            onClick={e => e.stopPropagation()}
          >
            {/* Header info */}
            <div className="p-4 border-b border-white/5 bg-slate-900/60 flex items-start gap-3">
              <span className="text-3xl select-none p-1.5 bg-slate-900 rounded-lg">{activeDetail.icon}</span>
              <div className="min-w-0 flex-1">
                <span className="text-[8px] font-bold text-pink-400 tracking-widest uppercase block mb-1">
                  PRO COMPONENT • {activeDetail.category.toUpperCase()}
                </span>
                <h3 className="font-bold text-sm text-white truncate">{activeDetail.name}</h3>
                <p className="text-[10px] text-slate-500 mt-1">
                  Creado por <span className="text-slate-350">{activeDetail.developer}</span> • v{activeDetail.version}
                </p>
              </div>
              <button 
                onClick={() => setDetailedExtensionId(null)}
                className="text-gray-500 hover:text-white p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Core details */}
            <div className="p-4 space-y-4 max-h-[300px] overflow-y-auto font-sans leading-relaxed text-slate-400 scrollbar-thin">
              <div>
                <h5 className="font-mono text-[9px] font-bold text-[#ec4899] uppercase tracking-wider mb-1">Descripción General</h5>
                <p className="text-xs text-slate-300">{activeDetail.description}</p>
              </div>

              <div>
                <h5 className="font-mono text-[9px] font-bold text-[#ec4899] uppercase tracking-wider mb-1">Detalles Operativos</h5>
                <p className="text-xs">{activeDetail.longDescription}</p>
              </div>

              <div className="bg-slate-900/50 p-3 rounded-lg border border-white/5 flex justify-between items-center text-[10px] font-mono">
                <div className="flex flex-col gap-1">
                  <span className="text-slate-500 font-sans">Puntuación:</span>
                  <div className="flex items-center gap-1 font-bold text-slate-300">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>{activeDetail.rating} / 5</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 font-mono">
                  <span className="text-slate-500 font-sans">Descargas:</span>
                  <span className="font-bold text-slate-300">{activeDetail.downloads}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-500 font-sans">Tipo:</span>
                  <span className="font-bold text-pink-400">{activeDetail.isPremium ? "Premium" : "Libre"}</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions footer */}
            <div className="p-3 border-t border-white/5 bg-slate-900/20 flex gap-2 justify-end">
              <button
                onClick={() => setDetailedExtensionId(null)}
                className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 font-mono hover:text-white cursor-pointer"
              >
                Cerrar Información
              </button>
              <button
                onClick={() => {
                  handleInstallToggle(activeDetail.id);
                  setDetailedExtensionId(null);
                }}
                className={`px-4 py-1.5 rounded font-bold font-mono cursor-pointer transition-all ${
                  activeDetail.isInstalled
                    ? "bg-slate-800 border border-white/5 text-rose-400 hover:bg-rose-500/5"
                    : "bg-pink-500 text-slate-950 hover:bg-pink-400"
                }`}
              >
                {activeDetail.isInstalled ? "Desactivar Extensión" : "Activar Ahora"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
