import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Compass, 
  CheckCircle2, 
  Code2, 
  Terminal, 
  Search, 
  Sparkles, 
  Zap, 
  ChevronRight, 
  BookOpen, 
  Layers, 
  HelpCircle,
  Eye,
  Check,
  MousePointerClick,
  AlertTriangle,
  Play
} from "lucide-react";

interface WalkthroughDashboardProps {
  onSelectSampleFile?: (path: string) => void;
  activePeekFile?: any;
  onOpenSearch?: () => void;
}

export default function WalkthroughDashboard({ 
  onSelectSampleFile,
  activePeekFile,
  onOpenSearch
}: WalkthroughDashboardProps) {
  const [activeTab, setActiveTab] = useState<"walkthrough" | "tasks">("walkthrough");
  const [walkthroughStep, setWalkthroughStep] = useState(0);

  // Gamified tasks state loaded from localStorage
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({
    fuzzy_search: false,
    peek_result: false,
    ai_chat: false,
    lsp_autocomplete: false,
    inline_ai: false,
    ghost_tab: false,
    bug_audit: false
  });

  // Load from localStorage on mount and periodically sync
  useEffect(() => {
    const syncTasks = () => {
      try {
        const fuzzySearchCount = parseInt(localStorage.getItem("task_fuzzy_search_count") || "0");
        const peekCount = parseInt(localStorage.getItem("task_peek_count") || "0");
        const chatCount = parseInt(localStorage.getItem("task_chat_count") || "0");
        const lspCount = parseInt(localStorage.getItem("task_lsp_count") || "0");
        const inlineCount = parseInt(localStorage.getItem("task_inline_count") || "0");
        const ghostCount = parseInt(localStorage.getItem("task_ghost_count") || "0");
        const auditCount = parseInt(localStorage.getItem("task_audit_count") || "0");

        setCompletedTasks({
          fuzzy_search: fuzzySearchCount > 0,
          peek_result: peekCount > 0 || !!activePeekFile,
          ai_chat: chatCount > 0,
          lsp_autocomplete: lspCount > 0,
          inline_ai: inlineCount > 0,
          ghost_tab: ghostCount > 0,
          bug_audit: auditCount > 0
        });
      } catch (e) {
        console.error("Error loading task completions", e);
      }
    };

    syncTasks();
    const interval = setInterval(syncTasks, 1500);
    return () => clearInterval(interval);
  }, [activePeekFile]);

  // Handle manual toggle for testing
  const toggleTaskManual = (key: string) => {
    try {
      const currentVal = completedTasks[key];
      const storageKey = `task_${key}_count`;
      localStorage.setItem(storageKey, currentVal ? "0" : "1");
      setCompletedTasks(prev => ({
        ...prev,
        [key]: !currentVal
      }));
    } catch (e) {}
  };

  const steps = [
    {
      title: "1. El Patrón 'Agentic Loop'",
      icon: <Zap className="w-4 h-4 text-amber-400" />,
      tag: "PATRÓN MÁYOR",
      desc: "Inspirado en Cursor, Windsurf y Claude Code. Cuando envías una solicitud de programación, nuestra inteligencia artificial no solo genera texto; sigue un bucle continuo de fases representadas con elementos visuales en el chat en tiempo real:",
      elements: [
        { phase: "Fase 1 — Intent Parsing", detail: "Clasifica tu tarea por intención (refactor, bugfix, new_feature, explain o test), determinando el alcance del workspace." },
        { phase: "Fase 2 — Context Gathering", detail: "Escanea automáticamente tus pestañas activas, código circundante, errores de linter e importaciones relacionadas para inyectar contexto." },
        { phase: "Fase 3 — Task Decomposing", detail: "Desglosa la solución en una lista estructurada de tareas y hitos de ejecución lógicos con estados en tiempo real." },
        { phase: "Fase 4 — Live Execution Stream", detail: "Presenta el flujo detallado de refactorización incremental de archivos evitando los reemplazos destructivos de código." },
        { phase: "Fase 5 — Self-Verification", detail: "Aplica validaciones de compilación avanzadas y pruebas estáticas para asegurar que tu código final compila con éxito." }
      ]
    },
    {
      title: "2. Búsqueda Fuzzy Global con 'fuzzysort'",
      icon: <Search className="w-4 h-4 text-indigo-400" />,
      tag: "BUSCADOR MEJORADO",
      desc: "Diseñamos un sistema de filtrado difuso de archivos rápido de usar desde el panel lateral izquierdo. Prioriza nombres exactos antes de indagar en carpetas profundas:",
      elements: [
        { phase: "Coincidencias Parciales", detail: "Escribe letras desordenadas y el ordenamiento por relevancia y peso deducirá qué archivo buscas al instante." },
        { phase: "Función 'Peek' (Vista Previa)", detail: "Haz clic en una línea de resultado. Abrirá un visualizador de vista previa abajo en el editor de código sin crear pestañas persistentes para evitar perturbar tus archivos de trabajo." }
      ]
    },
    {
      title: "3. Experiencia de Edición Multi-Capa",
      icon: <Code2 className="w-4 h-4 text-sky-400" />,
      tag: "EDITOR DE CÓDIGO",
      desc: "El editor tiene integrado soporte semántico dual alineado perfectamente a nivel de cursor y capas:",
      elements: [
        { phase: "Ctrl + Space", detail: "Despliega una lista flotante inteligente de completado de palabras con priorización de palabras clave integradas y variables." },
        { phase: "Ghost Suggestions con 'Tab'", detail: "Mientras escribes tu lógica de programación, el editor muestra en gris sugerencias inteligentes. Pulsa Tabulador para completarlas." },
        { phase: "Asistente AI Inline (Ctrl+I)", detail: "Invoca un asistente IA de código rápido en cualquier sección del editor para optimizar, añadir try-catch o documentar instantáneamente." },
        { phase: "Auditar de Bugs", detail: "Analiza el archivo activo contra errores lógicos con el botón superior para ver guías de subrayado onduladas de diagnósticos." }
      ]
    }
  ];

  const totalTasks = Object.keys(completedTasks).length;
  const completedTasksCount = Object.values(completedTasks).filter(Boolean).length;
  const completionPercentage = Math.round((completedTasksCount / totalTasks) * 100);

  return (
    <div id="walkthrough-dashboard-container" className="flex-1 w-full bg-[#05070d] flex flex-col overflow-hidden h-full">
      {/* Top Welcome Title Grid */}
      <div className="border-b border-white/5 bg-[#0a0d16] p-6 shrink-0 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Layers className="w-48 h-48 text-indigo-500" />
        </div>
        <div className="flex items-center gap-2 mb-2">
          <div className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-mono font-bold tracking-wider text-indigo-400 uppercase">
            IDE ONboarding v2.5
          </div>
          <span className="text-[10px] text-neutral-405 font-mono">• Guía de Desarrollo Activa</span>
        </div>
        
        <h1 className="font-sans font-medium text-lg text-neutral-100 tracking-tight flex items-center gap-2">
          ¡Bienvenido a <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-amber-400">AI Studio Advanced IDE</span>!
        </h1>
        <p className="text-[11px] text-neutral-400 max-w-2xl font-mono mt-1 leading-relaxed">
          Explora la guía de características o navega a la pestaña de Misiones del IDE para completar y evaluar tus habilidades.
        </p>

        {/* Tab Selection Row */}
        <div className="flex gap-2.5 mt-5">
          <button
            onClick={() => setActiveTab("walkthrough")}
            className={`px-4.5 py-1.5 rounded-md font-mono text-[10.5px] font-bold tracking-wide transition-all cursor-pointer flex items-center gap-2 border ${
              activeTab === "walkthrough"
                ? "bg-indigo-950/40 text-indigo-200 border-indigo-500/45 shadow-[0_2px_12px_rgba(99,102,241,0.08)]"
                : "bg-transparent border-transparent text-neutral-400 hover:bg-neutral-900/60 hover:text-neutral-200"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Guía Interactiva
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={`px-4.5 py-1.5 rounded-md font-mono text-[10.5px] font-bold tracking-wide transition-all cursor-pointer flex items-center gap-2 border relative ${
              activeTab === "tasks"
                ? "bg-amber-950/40 text-amber-200 border-amber-500/45 shadow-[0_2px_12px_rgba(245,158,11,0.08)]"
                : "bg-transparent border-transparent text-neutral-400 hover:bg-neutral-900/60 hover:text-neutral-200"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Misiones de Entrenamiento
            {completedTasksCount < totalTasks ? (
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping absolute top-1 right-1" />
            ) : null}
            <span className="bg-neutral-900/80 px-1.5 py-0.2 rounded-full text-[8.5px] font-mono border border-white/5 text-neutral-300">
              {completedTasksCount}/{totalTasks}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
        
        {/* TAB 1: WALKTHROUGH */}
        {activeTab === "walkthrough" && (
          <div className="max-w-4xl space-y-5 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Stepper Side Navigation */}
              <div className="md:col-span-1 space-y-1 bg-neutral-950/45 p-2 rounded-lg border border-white/5 h-fit font-mono text-[10px]">
                <div className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest px-2.5 py-1.5 border-b border-white/5 mb-1.5">
                  Secciones
                </div>
                {steps.map((step, idx) => (
                  <button
                    key={idx}
                    onClick={() => setWalkthroughStep(idx)}
                    className={`w-full text-left px-3 py-2 rounded transition-all flex items-center gap-2 cursor-pointer ${
                      walkthroughStep === idx
                        ? "bg-indigo-950/30 text-indigo-300 border-l-2 border-indigo-400 font-semibold"
                        : "hover:bg-neutral-900/40 text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    {step.icon}
                    <span className="truncate">{step.title.substring(3)}</span>
                  </button>
                ))}
              </div>

              {/* Step Detail Panel */}
              <div className="md:col-span-3">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={walkthroughStep}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                    className="bg-[#070911] border border-white/5 rounded-lg p-5"
                  >
                    <div className="flex items-center gap-2 mb-3.5">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[8.5px] font-mono font-bold tracking-wider text-indigo-400 uppercase">
                        {steps[walkthroughStep].tag}
                      </span>
                      <h2 className="font-mono text-xs font-bold text-neutral-100 uppercase tracking-wide">
                        {steps[walkthroughStep].title}
                      </h2>
                    </div>

                    <p className="text-[11px] text-neutral-400 leading-relaxed font-mono mb-4">
                      {steps[walkthroughStep].desc}
                    </p>

                    {/* Step Elements Details List */}
                    <div className="space-y-3 font-mono text-[10.5px]">
                      {steps[walkthroughStep].elements.map((el, eidx) => (
                        <div key={eidx} className="bg-neutral-950/40 border border-neutral-900/50 p-3 rounded-md hover:border-neutral-800 transition-all">
                          <div className="text-neutral-200 font-semibold flex items-center gap-1.5 mb-1 text-[11px]">
                            <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            {el.phase}
                          </div>
                          <p className="text-[10px] text-neutral-401 pl-5 leading-relaxed text-neutral-400">
                            {el.detail}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Quick Start Buttons for current section */}
                    <div className="mt-5.5 pt-4.5 border-t border-white/5 flex gap-2 justify-end">
                      {walkthroughStep === 1 && onOpenSearch && (
                        <button
                          onClick={onOpenSearch}
                          className="px-3.5 py-1.5 bg-[#0e1628] hover:bg-neutral-900 text-indigo-300 rounded border border-indigo-500/20 text-[10px] font-semibold flex items-center gap-1.5 cursor-pointer font-mono"
                        >
                          <Search className="w-3 h-3" />
                          Prueba Búsqueda Fuzzy Global
                        </button>
                      )}
                      
                      {walkthroughStep === 2 && onSelectSampleFile && (
                        <button
                          onClick={() => onSelectSampleFile("src/components/CodeEditor.tsx")}
                          className="px-3.5 py-1.5 bg-[#0e2226] hover:bg-neutral-900 text-teal-300 rounded border border-teal-500/20 text-[10px] font-semibold flex items-center gap-1.5 cursor-pointer font-mono"
                        >
                          <Code2 className="w-3 h-3" />
                          Abrir `CodeEditor.tsx` para Ejemplos
                        </button>
                      )}

                      {walkthroughStep < steps.length - 1 ? (
                        <button
                          onClick={() => setWalkthroughStep(prev => prev + 1)}
                          className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-800 text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer font-mono"
                        >
                          Siguiente Sección
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setActiveTab("tasks")}
                          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer font-mono"
                        >
                          Ir a las Misiones
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                  </motion.div>
                </AnimatePresence>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: TASKS EXPLORER */}
        {activeTab === "tasks" && (
          <div className="max-w-4xl space-y-5 animate-fadeIn">
            {/* Completion Meter */}
            <div className="bg-neutral-950/45 p-4 rounded-lg border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 font-mono">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-amber-500/10 rounded-full border border-amber-500/20 shrink-0">
                  <Compass className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-neutral-100 uppercase tracking-wider">Porcentaje de Completado</h3>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Navega e interactúa para completar todas las misiones lúdicas del workspace.</p>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full md:w-fit shrink-0">
                <div className="w-36 h-2 bg-neutral-900 rounded-full overflow-hidden border border-white/5 text-right relative">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-amber-400">{completionPercentage}%</span>
              </div>
            </div>

            {/* Tasks Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  key: "fuzzy_search",
                  title: "Filtro Fuzzy Global con fuzzysort",
                  desc: "Escribe letras en el buscador de archivos para filtrar por similitud de relevancia.",
                  howTo: "Abre el panel lateral de búsqueda ('Buscar / Reemplazar' arriba o la lupa), escribe un término de archivo."
                },
                {
                  key: "peek_result",
                  title: "Función Peek (Vista Previa)",
                  desc: "Mira el interior de los archivos de búsqueda sin crear pestañas persistentes.",
                  howTo: "Realiza una búsqueda de texto y haz clic sobre los resultados de coincidencias de línea."
                },
                {
                  key: "ai_chat",
                  title: "Iniciar Chat Agentic Loop",
                  desc: "Consigue que el Agente AI use el patrón Cursor loop (PLAN, TAREAS, VERIFICAR).",
                  howTo: "Pregúntale algo de código en el panel de chat de la derecha y visualiza la lista de tareas."
                },
                {
                  key: "lsp_autocomplete",
                  title: "Llamar Completado LSP (Ctrl+Space)",
                  desc: "Despliega el floating selector de Intellisense local dentro de un archivo abierto.",
                  howTo: "Abre cualquier archivo de código, haz clic en el contenido y presiona Ctrl + Space."
                },
                {
                  key: "ghost_tab",
                  title: "Aceptar Ghost Line (Tab)",
                  desc: "Autocompleta las líneas sugeridas del asistente integradas al instante.",
                  howTo: "Escribe código de forma regular en un archivo y presiona la tecla Tabulador cuando veas el texto gris."
                },
                {
                  key: "inline_ai",
                  title: "Invocación de la IA Inline (Ctrl+I)",
                  desc: "Lanza la ventana de asistente sobre la sección de tu archivo para optimizaciones rápidas.",
                  howTo: "Haz clic y escribe un prompt en la burbuja asistente inferior flotante de tu editor."
                },
                {
                  key: "bug_audit",
                  title: "Auditar Bugs del Código",
                  desc: "Genera diagnósticos y análisis de linter local de fallos en el archivo activo.",
                  howTo: "Con un archivo abierto, haz clic en el botón 'Auditar Bugs' en la barra de pestañas superior."
                }
              ].map(task => {
                const isDone = completedTasks[task.key];
                return (
                  <div 
                    key={task.key}
                    className={`border rounded-lg p-4 font-mono transition-all relative overflow-hidden ${
                      isDone 
                        ? "bg-[#0b130e] border-[#1b3d24]/60 text-emerald-200" 
                        : "bg-[#060810] border-white/5 hover:border-neutral-800 text-neutral-400"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => toggleTaskManual(task.key)}
                          className={`w-4.5 h-4.5 rounded flex items-center justify-center border shrink-0 transition-all hover:scale-105 cursor-pointer ${
                            isDone 
                              ? "bg-emerald-500 border-none text-black" 
                              : "bg-[#0d101a] border-neutral-700 text-transparent"
                          }`}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </button>
                        <span className={`text-[11.5px] font-bold ${isDone ? "text-emerald-300" : "text-neutral-200"}`}>
                          {task.title}
                        </span>
                      </div>
                      
                      {isDone && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[8.5px] text-emerald-400 font-extrabold uppercase shrink-0">
                          Completada
                        </span>
                      )}
                    </div>

                    <p className="text-[10px] text-neutral-400 leading-relaxed mb-3 pr-4">
                      {task.desc}
                    </p>

                    <div className="p-2 py-1.5 bg-black/40 border border-white/5 rounded text-[9px] text-neutral-500 leading-relaxed">
                      <span className="font-bold text-neutral-400">Cómo probar:</span> {task.howTo}
                    </div>

                    {/* Decorator background spark icon for done */}
                    {isDone && (
                      <div className="absolute top-1/2 right-2 -translate-y-1/2 opacity-[0.035] pointer-events-none">
                        <Sparkles className="w-20 h-20 text-emerald-300" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
