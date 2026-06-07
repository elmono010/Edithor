import React, { useState, useEffect, useRef } from "react";
import { FileNode, ChatMessage, LLMConfig, ProposedEdit } from "../types";
import { flattenFileTree } from "../utils/initialWorkspaces";
import AgentChat from "./AgentChat";
import { 
  Smartphone, 
  Tablet, 
  Laptop, 
  RotateCw, 
  Terminal as TerminalIcon, 
  X, 
  AlertCircle, 
  Info, 
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Eye,
  Bot,
  Layers,
  Settings2,
  Cpu,
  Sliders,
  Sparkles,
  Search,
  Focus,
  Check,
  Code
} from "lucide-react";

interface WebPreviewProps {
  fileTree: FileNode[];
  activeFile: FileNode | null;
  onClose: () => void;
  
  // Shared Agent Chat Props
  chatHistory: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  llmConfig: LLMConfig;
  isLoading: boolean;
  onClearHistory: () => void;
  proposedEdits: ProposedEdit[];
  onAcceptEdit: (edit: ProposedEdit) => void;
  onRejectEdit: (edit: ProposedEdit) => void;
}

interface ConsoleLog {
  id: string;
  level: "log" | "warn" | "error";
  message: string;
  timestamp: string;
}

interface DetectedElement {
  index: number;
  tagName: string;
  id: string;
  text: string;
  classes: string;
}

interface ElementMetadata {
  index: number;
  tagName: string;
  id: string;
  text: string;
  classes: string;
  rect: {
    width: number;
    height: number;
    top: number;
    left: number;
  };
  styles: {
    backgroundColor: string;
    color: string;
    fontSize: string;
    fontFamily: string;
    padding: string;
    margin: string;
    display: string;
    borderRadius: string;
  };
  attributes: { name: string; value: string }[];
}

export default function WebPreview({ 
  fileTree, 
  activeFile, 
  onClose,
  chatHistory,
  onSendMessage,
  llmConfig,
  isLoading,
  onClearHistory,
  proposedEdits,
  onAcceptEdit,
  onRejectEdit
}: WebPreviewProps) {
  const [viewportMode, setViewportMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isCompiling, setIsCompiling] = useState(false);
  const [addressBarText, setAddressBarText] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // HUD and elements inspection state
  const [activeTab, setActiveTab] = useState<"elements" | "inspector">("elements");
  const [detectedElements, setDetectedElements] = useState<DetectedElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<ElementMetadata | null>(null);
  const [isShowingIndices, setIsShowingIndices] = useState(true);

  // Compile workspace files into unified HTML source doc
  const compileWorkspace = (): string => {
    const allFiles = flattenFileTree(fileTree);
    
    // Choose entrypoint: active file if it is HTML, or index.html, or first html file
    let entryHtmlFile = null;
    if (activeFile && activeFile.name.endsWith(".html")) {
      entryHtmlFile = activeFile;
    } else {
      entryHtmlFile = allFiles.find(f => f.name === "index.html") || allFiles.find(f => f.name.endsWith(".html"));
    }

    // Intercept console & handle postMessage commands in preview page
    const interceptorScript = `
      <script>
        (function() {
          const _log = console.log;
          const _warn = console.warn;
          const _err = console.error;

          console.log = function(...args) {
            _log.apply(console, args);
            window.parent.postMessage({
              type: 'PREVIEW_CONSOLE_LOG',
              level: 'log',
              message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
            }, '*');
          };

          console.warn = function(...args) {
            _warn.apply(console, args);
            window.parent.postMessage({
              type: 'PREVIEW_CONSOLE_LOG',
              level: 'warn',
              message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
            }, '*');
          };

          console.error = function(...args) {
            _err.apply(console, args);
            window.parent.postMessage({
              type: 'PREVIEW_CONSOLE_LOG',
              level: 'error',
              message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
            }, '*');
          };

          window.addEventListener('error', function(e) {
            window.parent.postMessage({
              type: 'PREVIEW_CONSOLE_LOG',
              level: 'error',
              message: e.message + " (" + e.filename + ":" + e.lineno + ")"
            }, '*');
          });

          // Element indexing logic
          let indexedNodes = [];

          window.addEventListener('message', function(e) {
            if (!e.data || !e.data.type) return;

            if (e.data.type === 'LIST_ELEMENTS') {
              // 1. Clear previous bubbles and highlights
              const oldBubbles = document.querySelectorAll('.vivi-index-bubble');
              oldBubbles.forEach(b => b.remove());
              const oldHighlights = document.querySelectorAll('.vivi-highlight-outline');
              oldHighlights.forEach(h => h.remove());

              // 2. Select visual elements of interest
              const selector = 'button, a, input, select, textarea, h1, h2, h3, h4, h5, h6, .card, [role="button"], img, strong, p';
              const candidates = Array.from(document.querySelectorAll(selector));
              
              // Filter visible non-body nodes
              const visible = candidates.filter(node => {
                const rect = node.getBoundingClientRect();
                return rect.width > 2 && rect.height > 2 && node !== document.body && node !== document.documentElement;
              });

              indexedNodes = visible;

              // 3. Inject animation styles if missing
              if (!document.getElementById('vivi-interactive-styles')) {
                const style = document.createElement('style');
                style.id = 'vivi-interactive-styles';
                style.innerText = \`
                  @keyframes viviPulse {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7); }
                    70% { transform: scale(1.15); box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
                  }
                  .vivi-index-bubble {
                    transition: all 0.2s ease-in-out;
                  }
                \`;
                document.head.appendChild(style);
              }

              // 4. Create floating overlay labels
              const listData = [];
              visible.forEach((node, idx) => {
                const indexNum = idx + 1;
                const rect = node.getBoundingClientRect();
                
                const bubble = document.createElement('div');
                bubble.className = 'vivi-index-bubble';
                bubble.innerText = indexNum;
                
                Object.assign(bubble.style, {
                  position: 'absolute',
                  left: (rect.left + window.scrollX) + 'px',
                  top: (rect.top + window.scrollY - 10) + 'px',
                  backgroundColor: '#6366f1',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  padding: '1px 5px',
                  borderRadius: '10px',
                  border: '1px solid #ffffff',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.4)',
                  zIndex: '2147483647',
                  pointerEvents: 'none',
                  animation: 'viviPulse 1.6s infinite ease-in-out'
                });

                document.body.appendChild(bubble);

                listData.push({
                  index: indexNum,
                  tagName: node.tagName.toLowerCase(),
                  id: node.id || '',
                  text: (node.innerText || node.value || '').trim().substring(0, 32),
                  classes: node.className || ''
                });
              });

              // Send results back to parent WebPreview
              window.parent.postMessage({
                type: 'VIVI_ELEMENTS_LISTED',
                elements: listData
              }, '*');
            }

            if (e.data.type === 'CLEAR_BUBBLES') {
              const oldBubbles = document.querySelectorAll('.vivi-index-bubble');
              oldBubbles.forEach(b => b.remove());
              const oldHighlights = document.querySelectorAll('.vivi-highlight-outline');
              oldHighlights.forEach(h => h.remove());
            }

            if (e.data.type === 'HIGHLIGHT_ELEMENT') {
              const targetIndex = e.data.index;
              const node = indexedNodes[targetIndex - 1];

              if (node) {
                // Clear old highlights
                const oldHighlights = document.querySelectorAll('.vivi-highlight-outline');
                oldHighlights.forEach(h => h.remove());

                // Scroll smoothly
                node.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Overlay high-contrast glowing neon tracker
                const rect = node.getBoundingClientRect();
                const highlighter = document.createElement('div');
                highlighter.className = 'vivi-highlight-outline';
                
                Object.assign(highlighter.style, {
                  position: 'absolute',
                  left: (rect.left + window.scrollX - 4) + 'px',
                  top: (rect.top + window.scrollY - 4) + 'px',
                  width: (rect.width + 8) + 'px',
                  height: (rect.height + 8) + 'px',
                  border: '3px dashed #10b981',
                  borderRadius: '6px',
                  boxShadow: '0 0 20px rgba(16, 185, 129, 0.8), inset 0 0 10px rgba(16, 185, 129, 0.4)',
                  zIndex: '2147483646',
                  pointerEvents: 'none',
                  transition: 'all 0.3s'
                });

                document.body.appendChild(highlighter);

                // Quick flash animation
                highlighter.animate([
                  { opacity: 0.3, transform: 'scale(0.96)' },
                  { opacity: 1, transform: 'scale(1)' }
                ], { duration: 250 });

                // Precise styles calculation
                const computed = window.getComputedStyle(node);
                const metadata = {
                  index: targetIndex,
                  tagName: node.tagName.toLowerCase(),
                  id: node.id || '',
                  text: (node.innerText || node.value || '').trim(),
                  classes: node.className || '',
                  rect: {
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                    top: Math.round(rect.top + window.scrollY),
                    left: Math.round(rect.left + window.scrollX)
                  },
                  styles: {
                    backgroundColor: computed.backgroundColor,
                    color: computed.color,
                    fontSize: computed.fontSize,
                    fontFamily: computed.fontFamily,
                    padding: computed.padding,
                    margin: computed.margin,
                    display: computed.display,
                    borderRadius: computed.borderRadius
                  },
                  attributes: Array.from(node.attributes).map(attr => ({
                    name: attr.name,
                    value: attr.value
                  }))
                };

                // Send back to parent HUD
                window.parent.postMessage({
                  type: 'VIVI_ELEMENT_METADATA',
                  metadata: metadata
                }, '*');
              }
            }
          });
        })();
      </script>
    `;

    if (entryHtmlFile && entryHtmlFile.content) {
      let documentHtml = entryHtmlFile.content;

      // Ensure console interceptor is injected right before </head> or <body>
      if (documentHtml.includes("<head>")) {
        documentHtml = documentHtml.replace("<head>", `<head>\n${interceptorScript}`);
      } else {
        documentHtml = interceptorScript + documentHtml;
      }

      // Inject / Replace CSS Stylesheets internally to bypass sandbox cross-origin limitations
      allFiles.forEach(f => {
        if (f.name.endsWith(".css")) {
          const hrefRegex = new RegExp(`href=["']\\.?/?${f.name.replace(".", "\\.")}["']`, "g");
          const cssInject = `<style id="injected-style-${f.name}">${f.content || ""}</style>`;
          
          if (hrefRegex.test(documentHtml)) {
            const linkTagRegex = new RegExp(`<link[^>]*?href=["']\\.?/?${f.name.replace(".", "\\.")}["'][^>]*?>`, "gi");
            documentHtml = documentHtml.replace(linkTagRegex, cssInject);
          } else {
            documentHtml = documentHtml.replace("</head>", `${cssInject}\n</head>`);
          }
        }
      });

      // Inject / Replace Script tags internally
      allFiles.forEach(f => {
        if (f.name.endsWith(".js") && f.name !== "index.js") {
          const srcRegex = new RegExp(`src=["'](?:\\.?/?src/|\\.?/?)?${f.name.replace(".", "\\.")}["']`, "g");
          const jsInject = `<script id="injected-script-${f.name}">
            try {
              ${f.content || ""}
            } catch (err) {
              console.error("Error en ${f.name}: " + err.message);
            }
          </script>`;

          if (srcRegex.test(documentHtml)) {
            const scriptTagRegex = new RegExp(`<script[^>]*?src=["'](?:\\.?/?src/|\\.?/?)?${f.name.replace(".", "\\.")}["'][^>]*?></script>`, "gi");
            documentHtml = documentHtml.replace(scriptTagRegex, jsInject);
          } else {
            documentHtml = documentHtml.replace("</body>", `${jsInject}\n</body>`);
          }
        }
      });

      return documentHtml;
    }

    // Default Fallback compilation if there are no HTML files
    const mainJs = allFiles.find(f => f.name.endsWith(".js")) || activeFile;
    const mainCss = allFiles.find(f => f.name.endsWith(".css"));

    const isMarkdown = activeFile?.name.endsWith(".md");
    if (isMarkdown && activeFile?.content) {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Markdown Preview</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              body { background-color: #0b0f19; color: #cbd5e1; font-family: system-ui, sans-serif; padding: 2.5rem; }
            </style>
          </head>
          <body>
            <div class="max-w-xl mx-auto prose prose-invert bg-[#121826] border border-slate-800 p-8 rounded-xl shadow-2xl">
              <h1 class="text-2xl font-bold tracking-tight text-white mb-4 border-b border-slate-800 pb-3">${activeFile ? activeFile.name : "Markdown Preview"}</h1>
              <div class="text-slate-300 leading-relaxed space-y-4 whitespace-pre-wrap">${activeFile.content}</div>
            </div>
            ${interceptorScript}
          </body>
        </html>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Simulación de Sandbox</title>
          ${interceptorScript}
          <style>
            body { 
              background: #090c14; 
              color: #f1f5f9; 
              font-family: system-ui, -apple-system, sans-serif; 
              padding: 2.5rem; 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              min-height: 80vh; 
              margin: 0; 
              text-align: center;
              overflow-x: hidden;
            }
            .playground-box { 
              background: #111827; 
              border: 1px solid #374151; 
              border-radius: 12px; 
              padding: 2rem; 
              max-width: 500px; 
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); 
            }
            h1 { color: #38bdf8; font-size: 1.5rem; margin-top: 0; }
            p { color: #9ca3af; font-size: 0.95rem; line-height: 1.5; }
            .console-badge { 
              background: rgba(99, 102, 241, 0.2); 
              border: 1px solid rgba(99, 102, 241, 0.3); 
              color: #a5b4fc; 
              padding: 0.25rem 0.75rem; 
              border-radius: 9999px; 
              font-size: 11px; 
              font-family: monospace; 
              font-weight: bold; 
              display: inline-block; 
              margin-bottom: 1rem;
            }
            ${mainCss ? mainCss.content : ""}
          </style>
        </head>
        <body>
          <div class="playground-box">
            <span class="console-badge">ENTORNO COMPLETO VIRTUAL</span>
            <h1>Instanciando Ejecución</h1>
            <p>Se está reproduciendo el contenido secundario en tiempo real. Abre la pestaña consola inferior si haces acciones lógicas.</p>
            <div id="playground-outlet" style="margin-top: 1rem; border-top: 1px solid #1f2937; padding-top: 1rem; font-family: monospace; color: #a855f7;">
              [Esperando disparador en ${activeFile?.name || "archivo"}]
            </div>
          </div>
          <script>
            try {
              ${mainJs ? mainJs.content : "console.log('Sandbox activo sin archivo principal JS');"}
            } catch (err) {
              console.error("Error al ejecutar script: " + err.message);
            }
          </script>
        </body>
      </html>
    `;
  };

  // Compile on change
  useEffect(() => {
    setIsCompiling(true);
    const timer = setTimeout(() => {
      setIsCompiling(false);
    }, 450);

    const targetPath = activeFile ? activeFile.path : "index.html";
    setAddressBarText(`http://localhost:3000/${targetPath}`);

    return () => clearTimeout(timer);
  }, [fileTree, activeFile, refreshKey]);

  // Command handlers to communicate with iframe window scope
  const runIframeCommandlist = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      if (isShowingIndices) {
        iframeRef.current.contentWindow.postMessage({ type: "LIST_ELEMENTS" }, "*");
      } else {
        iframeRef.current.contentWindow.postMessage({ type: "CLEAR_BUBBLES" }, "*");
      }
    }
  };

  const handleHighlightNode = (index: number) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: "HIGHLIGHT_ELEMENT", index }, "*");
    }
  };

  // Sync index labels when visibility flag changes or iframe finishes loading
  useEffect(() => {
    const t = setTimeout(() => {
      runIframeCommandlist();
    }, 500);
    return () => clearTimeout(t);
  }, [isShowingIndices, isCompiling, refreshKey]);

  // Handle messages posted by the iframe (e.g. console logs, listed elements, element metadata)
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.data || !e.data.type) return;

      if (e.data.type === "PREVIEW_CONSOLE_LOG") {
        const newLog: ConsoleLog = {
          id: `log-${Date.now()}-${Math.random()}`,
          level: e.data.level,
          message: e.data.message,
          timestamp: new Date().toLocaleTimeString()
        };
        setConsoleLogs(prev => [...prev.slice(-99), newLog]);
      }

      if (e.data.type === "VIVI_ELEMENTS_LISTED") {
        setDetectedElements(e.data.elements || []);
      }

      if (e.data.type === "VIVI_ELEMENT_METADATA") {
        setSelectedElement(e.data.metadata || null);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setConsoleLogs([]); 
  };

  const clearConsole = () => {
    setConsoleLogs([]);
  };

  const getViewportWidth = () => {
    switch (viewportMode) {
      case "tablet": return "max-w-[768px]";
      case "mobile": return "max-w-[390px]";
      default: return "w-full";
    }
  };

  // Intercept messages inside the preview panel chat tab to do real-time element actions!
  const handleInterceptedSendMessage = async (text: string) => {
    const lowerText = text.toLowerCase();
    
    // Check if the user is listing elements
    const isListCmd = /(listar|muestra|mostrar)\s+(elementos|componentes|nodos|items)/gi.test(lowerText);
    
    // Check if the user is focusing/inspecting an element
    const editMatch = /(editar|seleccionar|enfocar|ver|focus)\s+(elemento|componente|nodo|id|item)?\s*(\d+)/gi.exec(lowerText);

    if (isListCmd) {
      setIsShowingIndices(true);
      runIframeCommandlist();
      setActiveTab("elements");
    } else if (editMatch) {
      const elementNum = parseInt(editMatch[3], 10);
      setIsShowingIndices(true);
      handleHighlightNode(elementNum);
      setActiveTab("inspector");
    }

    // Always deliver the message safely down to our primary AI loop that writes code or answers questions!
    await onSendMessage(text);
  };

  const contentSource = compileWorkspace();

  return (
    <div id="web-preview-container" className="flex flex-col h-full w-full bg-[#080a10] border border-white/5 rounded-xl overflow-hidden shadow-2xl relative">
      
      {/* IMMERSIVE HEADER CHROME */}
      <div id="browser-chrome-header" className="h-11 bg-[#10141f] border-b border-white/5 flex items-center justify-between px-3 shrink-0 select-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/85"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/85"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/85"></span>
          </div>

          <span className="text-[10px] uppercase font-mono font-bold text-gray-400 tracking-wider hidden sm:inline flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-400 animate-spin" />
            Lienzo Sandbox Interactivo
          </span>
        </div>

        {/* RESPONSIVE VIEWPORT WIDTH SELECTOR */}
        <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/5">
          <button
            type="button"
            onClick={() => setViewportMode("desktop")}
            className={`p-1.5 rounded-md transition-all cursor-pointer ${viewportMode === "desktop" ? "bg-indigo-600 text-white shadow font-bold animate-none" : "text-gray-500 hover:text-gray-300"}`}
            title="Vista de Computadora Desktop"
          >
            <Laptop className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewportMode("tablet")}
            className={`p-1.5 rounded-md transition-all cursor-pointer ${viewportMode === "tablet" ? "bg-indigo-600 text-white shadow font-bold animate-none" : "text-gray-500 hover:text-gray-300"}`}
            title="Vista de Tableta Tablet"
          >
            <Tablet className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewportMode("mobile")}
            className={`p-1.5 rounded-md transition-all cursor-pointer ${viewportMode === "mobile" ? "bg-indigo-600 text-white shadow font-bold animate-none" : "text-gray-500 hover:text-gray-300"}`}
            title="Vista de Celular Mobile"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="p-1 px-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1"
          title="Cerrar Vista Previa"
        >
          <span>Cerrar</span>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ADDRESS BAR CHROME */}
      <div className="h-10 bg-[#0c0e14] border-b border-white/5 flex items-center justify-between px-3 gap-2 shrink-0 select-none">
        
        <div className="flex items-center gap-1.5">
          <button disabled className="p-1 hover:bg-white/5 text-gray-700/60 rounded-md">
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button disabled className="p-1 hover:bg-white/5 text-gray-700/60 rounded-md">
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          
          <button
            type="button"
            onClick={handleRefresh}
            className={`p-1 hover:bg-white/5 text-gray-400 hover:text-white rounded-md cursor-pointer transition-colors ${isCompiling ? "animate-spin text-indigo-400" : ""}`}
            title="Sincronizar y recargar lienzo"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 max-w-lg flex items-center bg-white/[0.03] border border-white/5 rounded-lg px-2.5 py-1 text-xs text-slate-400 gap-2 overflow-hidden mx-auto">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <input
            type="text"
            readOnly
            value={addressBarText}
            className="bg-transparent border-none outline-none w-full text-[11px] font-mono select-all text-slate-450 tracking-tight"
          />
          {isCompiling ? (
            <span className="text-[9px] font-bold text-indigo-400 shrink-0 uppercase tracking-widest font-mono animate-pulse">Compilando...</span>
          ) : (
            <span className="text-[9px] font-bold text-emerald-500 shrink-0 uppercase tracking-widest font-mono">En Vivo</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Indexing Toggle bubble indicator */}
          <button
            onClick={() => {
              setIsShowingIndices(prev => !prev);
              runIframeCommandlist();
            }}
            className={`px-2 py-0.5 rounded-full border text-[10px] flex items-center gap-1 cursor-pointer transition-colors ${
              isShowingIndices
                ? "border-emerald-500/25 text-emerald-400 bg-emerald-500/10 font-medium"
                : "border-gray-800 text-gray-500 bg-transparent hover:text-gray-300 hover:border-gray-700"
            }`}
            title="Mostrar u ocultar burbujas numéricas en el preview"
          >
            <Eye className="w-3 h-3" />
            <span>Índices: {isShowingIndices ? "ON" : "OFF"}</span>
          </button>
        </div>
      </div>

      {/* CORES HORIZONTAL GRID SPLIT LAYOUT */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 min-w-0 bg-[#090b10]">
        
        {/* LEFT VIEWPORT COL - Compiled rendering container */}
        <div className="flex-1 bg-[#090b10] flex flex-col p-4 overflow-auto relative self-stretch border-r border-white/5">
          <div 
            className={`h-full w-full bg-[#0a0c12] rounded-xl overflow-hidden transition-all duration-300 shadow-xl relative ${getViewportWidth()} border border-white/5 flex flex-col mx-auto`}
            style={{ transition: "max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}
          >
            {/* Sandboxed Iframe sandbox */}
            <iframe
              ref={iframeRef}
              srcDoc={contentSource}
              onLoad={runIframeCommandlist}
              sandbox="allow-scripts allow-modals allow-same-origin allow-popups"
              referrerPolicy="no-referrer"
              className="flex-1 w-full bg-white text-black border-none"
              title="Lienzo de Vista Previa"
            />

            {/* SIMULATED CONSOLE LOGS INSIDE THE VIEWPORT */}
            <div 
              className={`border-t border-white/5 bg-[#0b0e14] transition-all flex flex-col font-mono text-[11px] overflow-hidden ${
                isConsoleOpen ? "h-40 shrink-0" : "h-7 shrink-0"
              }`}
            >
              <div 
                onClick={() => setIsConsoleOpen(prev => !prev)}
                className="h-7 bg-[#111622] hover:bg-[#151b2a] flex items-center justify-between px-3 cursor-pointer text-slate-400 hover:text-white transition-colors select-none"
              >
                <div className="flex items-center gap-2">
                  <TerminalIcon className={`w-3.5 h-3.5 transition-transform ${isConsoleOpen ? "text-indigo-400 rotate-90" : "text-gray-505"}`} />
                  <span className="font-bold uppercase text-[9px] tracking-wider">Consola Interactiva</span>
                  {consoleLogs.length > 0 && (
                    <span className="bg-indigo-550/20 border border-indigo-500/30 text-indigo-300 font-bold px-1.5 py-0.2 rounded-full text-[9px]">
                      {consoleLogs.length}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {isConsoleOpen && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        clearConsole();
                      }}
                      className="text-[9px] font-bold text-gray-500 hover:text-rose-450 transition-colors uppercase"
                    >
                      Limpiar
                    </button>
                  )}
                  <span className="text-[10px] text-gray-500 font-mono font-semibold">
                    {isConsoleOpen ? "CONTRAER" : "EXPANDIR"}
                  </span>
                </div>
              </div>

              {isConsoleOpen && (
                <div className="flex-1 overflow-y-auto p-2 divide-y divide-white/[0.02] space-y-1 select-text scrollbar-thin">
                  {consoleLogs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600 text-[10px] italic py-8">
                      <span>Sin registros de consola de ejecución.</span>
                    </div>
                  ) : (
                    consoleLogs.map(log => {
                      let logIcon = <Info className="w-3.5 h-3.5 text-blue-405 shrink-0" />;
                      let logClass = "text-slate-300";
                      if (log.level === "warn") {
                        logIcon = <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
                        logClass = "bg-amber-950/15 border-l-2 border-amber-500/50 pl-1 text-amber-300";
                      } else if (log.level === "error") {
                        logIcon = <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
                        logClass = "bg-rose-950/20 border-l-2 border-rose-500/50 pl-1 text-rose-300";
                      }
                      return (
                        <div key={log.id} className={`py-1 flex items-start gap-2 ${logClass} font-mono leading-relaxed`}>
                          <div className="pt-0.5 shrink-0">{logIcon}</div>
                          <div className="flex-1 whitespace-pre-wrap break-all">{log.message}</div>
                          <span className="text-[9px] text-gray-600 shrink-0 pt-0.5 select-none">{log.timestamp}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR PANEL - "El chat se pasará para el preview" HUD and inspector properties */}
        <div className="w-full lg:w-[400px] bg-[#0c0f16] border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col shrink-0 overflow-hidden h-full">
          
          {/* Tabs Selector list */}
          <div className="flex items-center border-b border-white/5 bg-[#0e121c] px-2 shrink-0 select-none">
            <button
              onClick={() => {
                setActiveTab("elements");
                runIframeCommandlist();
              }}
              className={`flex-1 py-3 text-xs font-semibold relative transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "elements" ? "text-indigo-400 font-bold border-b-2 border-indigo-500 bg-[#0c0f16]/30" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Elementos ({detectedElements.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("inspector")}
              className={`flex-1 py-3 text-xs font-semibold relative transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "inspector" ? "text-indigo-400 font-bold border-b-2 border-indigo-500 bg-[#0c0f16]/30" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Propiedades</span>
              {selectedElement && (
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0"></span>
              )}
            </button>
          </div>

          {/* ACTIVE TAB DISPLAY CONTAINER */}
          <div className="flex-1 overflow-hidden min-h-0 flex flex-col">

            {/* TAB 2: DETECTED ELEMENTS INDEX LIST */}
            {activeTab === "elements" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="flex items-center justify-between text-[10px] uppercase font-mono font-bold tracking-widest text-slate-500 py-1 border-b border-white/5">
                  <span>Nodos del DOM Indices ({detectedElements.length})</span>
                  <button 
                    onClick={() => {
                      setIsShowingIndices(true);
                      runIframeCommandlist();
                    }}
                    className="text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer text-[9px] uppercase font-bold"
                  >
                    Actualizar
                  </button>
                </div>

                {detectedElements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-16 text-slate-500 space-y-3">
                    <Layers className="w-10 h-10 text-slate-700 animate-pulse" />
                    <div className="space-y-1">
                      <p className="text-xs font-semibold">No se cargaron los nodos del DOM</p>
                      <p className="text-[10px] text-slate-605 max-w-[220px] mx-auto leading-relaxed">
                        Asegúrate de tener un archivo HTML activo o haz clic en "Actualizar" para escanear el lienzo.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {detectedElements.map((el) => (
                      <button
                        key={el.index}
                        onClick={() => {
                          handleHighlightNode(el.index);
                          setActiveTab("inspector");
                        }}
                        className={`w-full text-left p-2.5 rounded-lg border border-white/5 bg-slate-900/40 hover:bg-slate-900/90 hover:border-indigo-500/40 transition-all flex items-center justify-between text-xs cursor-pointer group ${
                          selectedElement?.index === el.index ? "border-indigo-500/50 bg-indigo-500/5" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden truncate">
                          {/* Circle marker showing index number */}
                          <span className="w-5 h-5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-mono text-[10px] flex items-center justify-center font-bold shrink-0">
                            {el.index}
                          </span>
                          <div className="truncate text-left">
                            <span className="font-mono text-xs text-indigo-300 font-semibold group-hover:text-indigo-200">
                              &lt;{el.tagName}&gt;
                            </span>
                            {el.id && (
                              <span className="ml-1 text-[9px] text-gray-500 font-mono font-medium lowercase">#{el.id}</span>
                            )}
                            {el.text && (
                              <p className="text-[10px] text-gray-400 truncate mt-0.5 max-w-[190px] italic">
                                "{el.text}"
                              </p>
                            )}
                          </div>
                        </div>

                        <span className="text-[9px] font-mono text-slate-600 truncate max-w-[80px] block font-normal">
                          {el.classes ? `.${el.classes.split(" ")[0].substring(0, 15)}` : "sin_clase"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: IMMERSIVE PROPERTIES INSPECTOR HUD */}
            {activeTab === "inspector" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="text-[10px] uppercase font-mono font-bold tracking-widest text-slate-500 py-1 border-b border-white/5">
                  <span>Inspector de Propiedades</span>
                </div>

                {!selectedElement ? (
                  <div className="flex flex-col items-center justify-center text-center py-16 text-slate-500 space-y-4">
                    <Sliders className="w-10 h-10 text-slate-700 animate-pulse" />
                    <div className="space-y-1 block px-2">
                      <p className="text-xs font-semibold">Ningún Elemento Enfocado</p>
                      <p className="text-[10px] text-slate-600 max-w-[240px] mx-auto leading-relaxed">
                        Selecciona un elemento de la pestaña <strong className="text-slate-400">"Elementos"</strong>, haz clic sobre uno de ellos o dile al Chat de la parte superior: <strong className="text-indigo-400">"editar elemento 2"</strong> para analizar sus propiedades.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-xs">
                    
                    {/* Element HUD Header */}
                    <div className="p-3 bg-[#0f1420] border border-white/5 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <span className="w-7 h-7 rounded-lg bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981] font-mono text-xs flex items-center justify-center font-bold shrink-0 shadow-lg shadow-emerald-520/10">
                          {selectedElement.index}
                        </span>
                        <div className="overflow-hidden">
                          <h4 className="font-mono text-sm text-emerald-400 font-bold flex items-center gap-1">
                            <span>&lt;{selectedElement.tagName}&gt;</span>
                            {selectedElement.id && <span className="text-gray-400 text-xs font-medium">#{selectedElement.id}</span>}
                          </h4>
                          <p className="text-[10px] text-gray-500 truncate mt-0.5">Visor de propiedades en tiempo real</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleHighlightNode(selectedElement.index)}
                        className="px-2 py-1 bg-white/5 text-[10px] rounded hover:bg-white/10 text-gray-300 font-bold cursor-pointer transition-colors"
                        title="Localizar elemento con un flash destellante"
                      >
                        Localizar
                      </button>
                    </div>

                    {/* Visor text content preview */}
                    {selectedElement.text && (
                      <div className="space-y-1 block">
                        <span className="text-[9px] uppercase tracking-wider font-bold text-gray-650 font-mono">Texto Interior / Contenido</span>
                        <div className="p-2.5 bg-slate-900/60 border border-white/5 rounded-lg text-[11px] text-slate-350 italic max-h-24 overflow-y-auto break-words select-text">
                          "{selectedElement.text}"
                        </div>
                      </div>
                    )}

                    {/* Interactive blueprint visual metrics card */}
                    <div className="space-y-1 block bg-slate-900/40 p-3 rounded-xl border border-white/5">
                      <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500 font-mono block mb-2.5">Modelo de Caja & Dimensiones (px)</span>
                      
                      <div className="flex justify-center flex-col items-center">
                        {/* Nested simulated box-model blueprint layout */}
                        <div className="w-full border border-[#10b981]/30 bg-[#10b981]/5 rounded p-2 text-center relative flex justify-between items-center px-4 self-stretch font-mono">
                          <span className="text-[9px] text-[#10b981] font-bold">Elemento</span>
                          <div className="text-white text-xs font-bold leading-none py-1">
                            {selectedElement.rect.width} <span className="text-[#10b981] text-[9px] font-mono">w</span> &times; {selectedElement.rect.height} <span className="text-[#10b981] text-[9px] font-mono">h</span>
                          </div>
                          <span className="text-[9px] text-emerald-500 font-bold opacity-60">Box</span>
                        </div>

                        <div className="w-full grid grid-cols-2 gap-1.5 mt-2 text-[10px] font-mono">
                          <div className="p-1 px-2 bg-slate-900 border border-white/5 rounded flex justify-between">
                            <span className="text-gray-500">Left:</span>
                            <span className="text-slate-300">{selectedElement.rect.left}px</span>
                          </div>
                          <div className="p-1 px-2 bg-slate-900 border border-white/5 rounded flex justify-between">
                            <span className="text-gray-500">Top:</span>
                            <span className="text-slate-300">{selectedElement.rect.top}px</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Computed layout metrics detail list */}
                    <div className="space-y-1 block p-3 bg-[#0a0d15] rounded-xl border border-white/5 select-text">
                      <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500 font-mono block mb-2">Estilos Computados Clave</span>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-gray-500">Display:</span>
                          <p className="text-slate-300 truncate font-semibold bg-white/[0.02] p-1.5 rounded">{selectedElement.styles.display}</p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-gray-500">Color Texto:</span>
                          <p className="text-slate-300 truncate font-semibold bg-white/[0.02] p-1.5 rounded flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded border border-white/10 shrink-0" style={{ backgroundColor: selectedElement.styles.color }}></span>
                            <span>{selectedElement.styles.color.replace(/\s+/g, '')}</span>
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-gray-500">Fondo:</span>
                          <p className="text-slate-300 truncate font-semibold bg-white/[0.02] p-1.5 rounded flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded border border-white/10 shrink-0" style={{ backgroundColor: selectedElement.styles.backgroundColor }}></span>
                            <span className="truncate">{selectedElement.styles.backgroundColor.replace(/\s+/g, '')}</span>
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-gray-500">Tamaño Fuente:</span>
                          <p className="text-slate-300 truncate font-semibold bg-white/[0.02] p-1.5 rounded">{selectedElement.styles.fontSize}</p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-gray-500 font-mono">Margen / Padding:</span>
                          <p className="text-gray-400 text-[9px] truncate bg-white/[0.02] p-1.5 rounded">
                            m: {selectedElement.styles.margin.substring(0, 8)} / p: {selectedElement.styles.padding.substring(0, 8)}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-gray-500">Borde Redondeado:</span>
                          <p className="text-slate-300 truncate font-semibold bg-white/[0.02] p-1.5 rounded">{selectedElement.styles.borderRadius || "0px"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Native list of attributes */}
                    {selectedElement.attributes && selectedElement.attributes.length > 0 && (
                      <div className="space-y-1 block bg-slate-900/20 p-3 rounded-xl border border-white/5 select-text">
                        <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500 font-mono block mb-2">Atributos HTML ({selectedElement.attributes.length})</span>
                        
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {selectedElement.attributes.map((attr, idx) => (
                            <div key={idx} className="flex items-center gap-1 text-[11px] font-mono leading-none border-b border-white/[0.02] pb-1.5">
                              <span className="text-indigo-400 font-bold shrink-0">{attr.name}=</span>
                              <span className="text-amber-300 truncate font-medium">"{attr.value}"</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Classes list directory wrapper */}
                    {selectedElement.classes && (
                      <div className="space-y-1 block select-text">
                        <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500 font-mono">Clases CSS Completas</span>
                        <div className="flex flex-wrap gap-1 p-2 bg-slate-900/60 border border-white/5 rounded-lg max-h-32 overflow-y-auto">
                          {selectedElement.classes.split(/\s+/).filter(Boolean).map((cls, idx) => (
                            <span 
                              key={idx} 
                              className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 font-mono text-[9px] border border-white/5 cursor-pointer max-w-full truncate block"
                              title={cls}
                            >
                              {cls}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </div>

      {/* FOOTER BAR */}
      <div className="h-6 bg-[#0c0e14] border-t border-white/5 px-3 flex items-center justify-between text-[9px] text-gray-500 shrink-0 font-mono select-none">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
          <span>Sincronizado con el sistema de archivos virtual</span>
        </div>
        <span>Consola & Inspector de Elementos Activo</span>
      </div>
    </div>
  );
}
