import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatMessage, ProposedEdit, LLMConfig, FileNode, TaskItem, SkillItem } from "../types";
import TaskWalkthrough from "./TaskWalkthrough";
import SkillManager from "./SkillManager";
import { parseAgentLoop } from "../utils/agentLoopParser";
import { motion } from "motion/react";
import { 
  Send, 
  Terminal, 
  Cpu, 
  Bot, 
  User, 
  Trash2, 
  ArrowRight, 
  RefreshCw, 
  Layers, 
  Check, 
  Circle,
  Activity,
  ShieldCheck,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Info,
  Plus,
  History,
  Columns,
  MoreHorizontal,
  Globe,
  Inbox,
  FileText,
  Brain,
  Mic,
  Cloud,
  CheckCircle2,
  Lock,
  GitBranch,
  Search,
  Eye,
  FileCode,
  X
} from "lucide-react";

const PRESET_SKILLS: SkillItem[] = [
  {
    id: "skill-firebase",
    name: "Firestore & Auth System",
    description: "Soporte para consultas, persistencia y autenticación con Firestore.",
    promptContent: "Escribe consultas ottimistas con Firestore, inicializa el SDK con lazy loading, asegura escribir reglas de seguridad firestore.rules que restrinjan accesos de usuario.",
    category: "Bases de Datos",
    isActive: true,
    isSystem: true
  },
  {
    id: "skill-gemini",
    name: "Gemini API Smart Engine",
    description: "Configuración avanzada para llamadas de IA y JSON estructurado.",
    promptContent: "Utiliza el SDK de @google/genai, prefiere gemini-3.5-flash y maneja errores sin revelar claves de API en el cliente.",
    category: "IA",
    isActive: true,
    isSystem: true
  },
  {
    id: "skill-refactor",
    name: "Refactoring Expert",
    description: "Garantiza refactorizaciones seguras, no rompe código existente, optimiza performance.",
    promptContent: "Previene la duplicidad de lógica. Prioriza mantener funciones puras, reducir complejidad ciclomática de loops o callbacks, y reutilizar componentes modulares sin alterar comportamiento.",
    category: "Refactor",
    isActive: false,
    isSystem: true
  },
  {
    id: "skill-solid",
    name: "SOLID Principles Design",
    description: "Alineamiento estricto con los principios SOLID y arquitecturas desacopladas.",
    promptContent: "Aplica responsabilidad única, principio abierto/cerrado, y segregación de interfaces. Mantén funciones cortas e intercambiables separando lógica de UI.",
    category: "Diseño SOLID",
    isActive: false,
    isSystem: true
  },
  {
    id: "skill-test",
    name: "Testing & Quality Assurance",
    description: "Garantía de calidad de software con pruebas unitarias robustas, cobertura limpia y mocking correcto.",
    promptContent: "Diseña tests robustos y desacoplados para React. Asegura probar casos extremos (edge cases), simular APIs o timers correctamente y ejecutar aserciones rigurosas sin falsos positivos.",
    category: "Calidad",
    isActive: false,
    isSystem: true
  },
  {
    id: "skill-security",
    name: "Security Shield",
    description: "Auditoría de vulnerabilidades, higiene de secrets y sanitización de datos.",
    promptContent: "Sanitiza y valida las entradas de formularios, evita llamadas directas a eval, previene filtración de secretos o llaves codificadas rígidas en el cliente, y usa coding defensivo contra inyecciones.",
    category: "Seguridad",
    isActive: false,
    isSystem: true
  },
  {
    id: "skill-maps",
    name: "Google Maps Platform",
    description: "Mapas reactivos, autocomplete de Google Places y cálculo de rutas.",
    promptContent: "Implementa integraciones de Google Maps optimizadas para React, prefiere las llamadas RPC autorizadas de Maps y no inventes claves falsas.",
    category: "Mapas",
    isActive: false,
    isSystem: true
  },
  {
    id: "skill-workspace",
    name: "Google Workspace Link",
    description: "Lectura y envío de correos de Gmail, Sheets y eventos de Calendario.",
    promptContent: "Implementa flujos de consentimiento con OAuth utilizando set_up_oauth y lee las credenciales del servidor para sincronizar datos reales del usuario.",
    category: "Productividad",
    isActive: false,
    isSystem: true
  }
];

// Helper to determine fine grained file icons
function FileIconHelper({ path }: { path: string }) {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  if (["jsx", "tsx"].includes(ext)) {
    return <span className="w-3.5 h-3.5 rounded bg-sky-500/10 border border-sky-450/40 text-sky-400 font-bold text-[8px] flex items-center justify-center shrink-0">R</span>;
  }
  if (["js", "ts"].includes(ext)) {
    return <span className="w-3.5 h-3.5 rounded bg-amber-500/10 border border-amber-450/40 text-amber-400 font-bold text-[8px] flex items-center justify-center shrink-0">JS</span>;
  }
  if (ext === "json") {
    return <span className="w-3.5 h-3.5 rounded bg-yellow-500/10 border border-yellow-450/40 text-yellow-500 font-bold text-[8px] flex items-center justify-center shrink-0">{}</span>;
  }
  if (ext === "css") {
    return <span className="w-3.5 h-3.5 rounded bg-pink-500/10 border border-pink-450/40 text-pink-400 font-bold text-[8px] flex items-center justify-center shrink-0">C</span>;
  }
  return <FileCode className="w-3.5 h-3.5 text-neutral-400 shrink-0" />;
}

interface AgentChatProps {
  chatHistory: ChatMessage[];
  activeFile: FileNode | null;
  fileTree: FileNode[];
  onSendMessage: (text: string) => Promise<void>;
  llmConfig: LLMConfig;
  isLoading: boolean;
  onClearHistory: () => void;
  proposedEdits: ProposedEdit[];
  onAcceptEdit: (edit: ProposedEdit) => void;
  onRejectEdit: (edit: ProposedEdit) => void;
  workspaceName?: string;
  onUpdateLlmConfig?: (config: LLMConfig) => void;
  onSelectFile?: (path: string) => void;
  // Dynamic context attachments
  attachedContexts?: { id: string; type: "file" | "code" | "error"; label: string; content: string }[];
  onRemoveContext?: (id: string) => void;
  activeWorkspaceId?: string;

  // 🧠 Walkthrough task checklist attributes
  activePlan?: TaskItem[];
  activePairingPhase?: "idle" | "planning" | "execution" | "verification" | "completed";
  currentFileBeingEdited?: string | null;
  verificationStatus?: "pending" | "success" | "error" | null;
  verificationLogs?: string[];
  onToggleTask?: (id: string) => void;
  onResetWalkthrough?: () => void;
}

export default function AgentChat({
  chatHistory,
  activeFile,
  fileTree,
  onSendMessage,
  llmConfig,
  isLoading,
  onClearHistory,
  proposedEdits,
  onAcceptEdit,
  onRejectEdit,
  workspaceName,
  onUpdateLlmConfig,
  onSelectFile,
  attachedContexts = [],
  onRemoveContext,
  activeWorkspaceId,
  activePlan = [],
  activePairingPhase = "idle",
  currentFileBeingEdited = null,
  verificationStatus = null,
  verificationLogs = [],
  onToggleTask,
  onResetWalkthrough
}: AgentChatProps) {
  const [inputText, setInputText] = useState("");
  const [showExecutiveSummary, setShowExecutiveSummary] = useState(false);
  const prevLoadingRef = useRef(isLoading);

  const handleResetWalkthrough = () => {
    setShowExecutiveSummary(false);
    if (onResetWalkthrough) {
      onResetWalkthrough();
    }
  };

  useEffect(() => {
    if (isLoading) {
      setShowExecutiveSummary(false);
    }
    if (prevLoadingRef.current && !isLoading) {
      setShowExecutiveSummary(true);
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading]);

  // Parse streaming content in real-time to find live ::TASKS::
  const lastAssistantMsg = [...chatHistory].reverse().find(msg => msg.role === "assistant");
  const streamingText = lastAssistantMsg?.content || "";
  const parsedLoopState = parseAgentLoop(streamingText);

  const liveTasksList: TaskItem[] = parsedLoopState.tasks.length > 0
    ? parsedLoopState.tasks.map(t => ({
        id: t.id,
        text: t.label,
        status: t.status === "done" ? "completed" as const : (t.status === "running" ? "running" as const : "pending" as const)
      }))
    : activePlan;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Custom dropdown overlays
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  
  // Voice listening simulation state
  const [isListening, setIsListening] = useState(false);
  const [listeningTimer, setListeningTimer] = useState<any>(null);

  // Expanded ledger cards track
  const [ledgerExpanded, setLedgerExpanded] = useState<Record<string, boolean>>({});

  // 🧠 Collapsible Agent Memory & Prompt Directives panel state
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const memoryKey = `workspace_focus_memory_${activeWorkspaceId || workspaceName || "global"}`;
  const avoidRedosKey = `workspace_avoid_redos_${activeWorkspaceId || workspaceName || "global"}`;

  const [workingFocus, setWorkingFocus] = useState(() => {
    return localStorage.getItem(memoryKey) || "";
  });

  const [avoidRedos, setAvoidRedos] = useState(() => {
    return localStorage.getItem(avoidRedosKey) !== "false";
  });

  // Gestor de Habilidades (Skills)
  const [isSkillsOpen, setIsSkillsOpen] = useState(false);
  const skillsStorageKey = `workspace_agent_skills_${activeWorkspaceId || workspaceName || "global"}`;
  
  const [skills, setSkills] = useState<SkillItem[]>(() => {
    const saved = localStorage.getItem(skillsStorageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return PRESET_SKILLS;
  });

  // Sync state changes back to localStorage
  useEffect(() => {
    localStorage.setItem(skillsStorageKey, JSON.stringify(skills));
  }, [skills, skillsStorageKey]);

  // Sync state changes back to localStorage
  useEffect(() => {
    localStorage.setItem(memoryKey, workingFocus);
    // Broadcast storage event for App.tsx synchronization
    window.dispatchEvent(new Event("storage"));
  }, [workingFocus, memoryKey]);

  useEffect(() => {
    localStorage.setItem(avoidRedosKey, avoidRedos ? "true" : "false");
    window.dispatchEvent(new Event("storage"));
  }, [avoidRedos, avoidRedosKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isLoading]);

  const handleToggleSkill = (id: string) => {
    setSkills(prev => prev.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
  };

  const handleDeleteSkill = (id: string) => {
    setSkills(prev => prev.filter(s => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    // Compile instructions from active skills
    const activatedSkills = skills.filter(s => s.isActive);
    let skillsSystemInjections = "";
    if (activatedSkills.length > 0) {
      skillsSystemInjections += "REGLAS DE HABILIDADES DEL AGENTE IA ACTIVAS (Síguelas al pie de la letra):\n";
      activatedSkills.forEach(s => {
        skillsSystemInjections += ` - [${s.name}]: ${s.promptContent}\n`;
      });
      skillsSystemInjections += "\n-----------------------------------------\n";
    }

    let finalPrompt = "";
    if (skillsSystemInjections) {
      finalPrompt += skillsSystemInjections;
    }

    if (attachedContexts && attachedContexts.length > 0) {
      finalPrompt += "Para resolver esta tarea, utiliza el siguiente contexto:\n\n";
      attachedContexts.forEach(c => {
        finalPrompt += `=========================================\n`;
        finalPrompt += `[${c.type.toUpperCase()}: ${c.label}]\n`;
        finalPrompt += `=========================================\n`;
        finalPrompt += `${c.content}\n\n`;
      });
      finalPrompt += "-----------------------------------------\n";
      finalPrompt += "INSTRUCCIÓN DEL USUARIO:\n";
    }
    finalPrompt += inputText.trim();

    onSendMessage(finalPrompt);
    setInputText("");

    // Clear contexts
    if (onRemoveContext && attachedContexts.length > 0) {
      // Clear all items sequentially
      attachedContexts.forEach(c => onRemoveContext(c.id));
    }
    
    // Complete onboarding task chat_count
    try {
      localStorage.setItem("task_chat_count", "1");
    } catch (err) {}
  };

  const triggerHelperPrompt = (prompt: string) => {
    if (isLoading) return;
    onSendMessage(prompt);
  };

  const toggleLedgerSection = (msgId: string, section: string) => {
    const key = `${msgId}-${section}`;
    setLedgerExpanded(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const triggerListeningSim = () => {
    if (isListening) {
      if (listeningTimer) clearInterval(listeningTimer);
      setIsListening(false);
      setInputText("Analizar la estructura de bases de datos...");
    } else {
      setIsListening(true);
      setInputText("Listening... 🎙️ Speak now...");
      let counter = 0;
      const t = setInterval(() => {
        counter++;
        if (counter >= 4) {
          clearInterval(t);
          setIsListening(false);
          setInputText("Analiza y optimiza el componente HomeDashboard.jsx");
        }
      }, 1000);
      setListeningTimer(t);
    }
  };

  const getCleanBubbleText = (text: string) => {
    // Hide specialized metadata blocks from standard bubble render
    let clean = text.replace(/::UPDATED_FILE::[\s\S]+?::END_UPDATED_FILE::/g, "");
    clean = clean.replace(/::UPDATED_FILE::[\s\S]*$/g, "");
    clean = clean.replace(/```[\w-]*[\r\n]?[\s\S]*?```/g, "");
    clean = clean.replace(/```[\w-]*[\r\n]?[\s\S]*$/g, "");
    
    // Also remove the explicit log structure lines we parse for custom ledger render
    const patternsToRemove = [
      /Thought for \d+s.*/gi,
      /Thought.*/gi,
      /Explored \d+ file.*/gi,
      /Edited [\s\S]+? ([-+]\d+|[^\n]*)/gi,
      /Ran .* cd .*/gi,
      /Worked for \d+[\s\S]*/gi,
      /INTENT:\s*[^\n]*\n?/gi,
      /SCOPE:\s*[^\n]*\n?/gi,
      /COMPLEXITY:\s*[^\n]*\n?/gi,
      /::PLAN::[\s\S]*?::END_PLAN::\n?/gi,
      /::PLAN::[\s\S]*$/gi,
      /::TASKS::[\s\S]*?::END_TASKS::\n?/gi,
      /::TASKS::[\s\S]*$/gi,
      /::EXECUTING_TASK::\d+::\n?/gi,
      /::TASK_DONE::\d+::\n?/gi,
      /::SELF_VERIFICATION::[\s\S]*?::END_SELF_VERIFICATION::\n?/gi,
      /::SELF_VERIFICATION::[\s\S]*$/gi,
    ];
    
    patternsToRemove.forEach(p => {
      clean = clean.replace(p, "");
    });

    return clean.trim();
  };

  // Human friendly names map for the dropdown
  const modelFriendlyNames: Record<string, string> = {
    "gemini-3.5-flash": "Gemini 3.5 Flash (Default)",
    "gemini-3.1-pro-preview": "Gemini 3.1 Pro (High)",
    "gemini-3.1-flash-lite": "Gemini 3.1 Flash Lite",
    "gpt-4o": "OpenAI GPT-4o Premium",
    "gpt-4o-mini": "OpenAI GPT-4o Mini",
    "gpt-3.5-turbo": "OpenAI GPT-3.5 Turbo",
    "claude-3-5-sonnet-latest": "Claude 3.5 Sonnet",
    "claude-3-opus-20240229": "Claude 3 Opus (Ultra)",
    "claude-3-haiku-20240307": "Claude 3 Haiku",
    "deepseek-chat": "DeepSeek Chat (V3)",
    "deepseek-coder": "DeepSeek Coder (R1)"
  };

  const getModelLabel = () => {
    return modelFriendlyNames[llmConfig.model] || llmConfig.model;
  };

  const selectNewLlmModel = (provider: "gemini" | "openai" | "anthropic" | "deepseek", m: string) => {
    if (onUpdateLlmConfig) {
      onUpdateLlmConfig({
        ...llmConfig,
        provider,
        model: m
      });
    }
    setIsModelDropdownOpen(false);
  };

  // Custom text inline highlighter for Filebadging
  const renderTextWithFileBadges = (raw: string) => {
    const fileRegex = /([a-zA-Z0-9_\-./]+\.(?:jsx|tsx|ts|js|json|css|html|md))/g;
    const parts = raw.split(fileRegex);
    if (parts.length <= 1) return <ReactMarkdown remarkPlugins={[remarkGfm]}>{raw}</ReactMarkdown>;

    return (
      <div className="select-text">
        {parts.map((p, index) => {
          if (fileRegex.test(p)) {
            const isMatchNode = fileTree.some(node => node.name === p || p.endsWith(node.name));
            return (
              <button
                key={index}
                type="button"
                onClick={() => {
                  if (onSelectFile) {
                    onSelectFile(p);
                  }
                }}
                className={`px-1 rounded bg-[#20212d] text-sky-400 hover:bg-[#2c2d3f] border border-[#2e314a]/40 text-[10.5px] font-mono select-text transition-all cursor-pointer font-bold inline-flex items-center gap-1 mx-0.5 ${
                  isMatchNode ? "opacity-100 hover:scale-103 text-emerald-450" : "opacity-90"
                }`}
                title={isMatchNode ? `Haz clic para abrir ${p}` : `Referencia: ${p}`}
              >
                <span className="text-[10px]">📄</span>
                {p}
              </button>
            );
          }
          return (
            <div key={index} className="inline select-text prose prose-invert prose-xs text-[11.5px] leading-relaxed text-neutral-300">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {p}
              </ReactMarkdown>
            </div>
          );
        })}
      </div>
    );
  };

  const renderExecutionLedger = (msgId: string, fullContent: string) => {
    const lines = fullContent.split("\n");
    const blocks: React.ReactNode[] = [];
    
    // Check if there is any ledger information like Thought, Explored, Edited, Ran
    const hasThought = /Thought for \d+s|thought/i.test(fullContent);
    const hasExplored = /Explored \d+ file/i.test(fullContent);
    const hasEdited = /Edited /i.test(fullContent);
    const hasRan = /Ran /i.test(fullContent);
    const hasWorked = /Worked for /i.test(fullContent);

    if (!hasThought && !hasExplored && !hasEdited && !hasRan && !hasWorked) {
      // Keep it completely clean
      return null;
    }

    // Determine working duration text
    const workedMatch = fullContent.match(/Worked for (\w+)/i);
    const workedLabel = workedMatch ? `Worked for ${workedMatch[1]}` : "Worked for 3m";

    // Setup collapsed/expanded containers state
    const isLedgerOpen = ledgerExpanded[`${msgId}-root`] !== false; // defaults to true
    
    let currentBlockLines: string[] = [];
    let currentBlockType: "text" | "thought" | "explored" | "run" | null = null;
    let thoughtSeconds = "21s";

    const flushCurrentBlock = (key: number) => {
      if (currentBlockLines.length === 0) return;
      const joined = currentBlockLines.join("\n").trim();
      if (!joined) return;

      if (currentBlockType === "thought") {
        const isCollapsed = ledgerExpanded[`${msgId}-thought-${key}`] !== true; // Default collapsed as screenshot!
        blocks.push(
          <div key={`thought-${key}`} className="my-1.5 font-mono select-none">
            <button
              onClick={() => toggleLedgerSection(msgId, `thought-${key}`)}
              className="flex items-center gap-1.5 text-neutral-450 hover:text-neutral-300 transition-colors text-[10.5px] font-medium"
            >
              <span>Thought for {thoughtSeconds}</span>
              {isCollapsed ? <ChevronRight className="w-3 h-3 text-neutral-500" /> : <ChevronDown className="w-3 h-3 text-neutral-500" />}
            </button>
            {!isCollapsed && (
              <div className="mt-1 pl-3.5 py-1.5 border-l border-neutral-800 text-[10px] text-neutral-400 select-text font-sans whitespace-pre-line leading-relaxed bg-[#101014]/30 rounded">
                {joined}
              </div>
            )}
          </div>
        );
      } else if (currentBlockType === "explored") {
        const isCollapsed = ledgerExpanded[`${msgId}-explored-${key}`] !== true; // Default collapsed!
        const filesCount = joined.match(/\d+/)?.[0] || "1";
        blocks.push(
          <div key={`explored-${key}`} className="my-1.5 font-mono select-none">
            <button
              onClick={() => toggleLedgerSection(msgId, `explored-${key}`)}
              className="flex items-center gap-1.5 text-neutral-450 hover:text-neutral-300 transition-colors text-[10.5px] font-medium"
            >
              <span>Explored {filesCount} {parseInt(filesCount) === 1 ? "file" : "files"}</span>
              {isCollapsed ? <ChevronRight className="w-3 h-3 text-neutral-500" /> : <ChevronDown className="w-3 h-3 text-neutral-500" />}
            </button>
            {!isCollapsed && (
              <div className="mt-1 pl-3.5 py-1.5 border-l border-neutral-800 text-[10px] text-neutral-400 select-text font-serif italic bg-[#101014]/30 rounded">
                Analizado árbol de nodos del proyecto para identificar dependencias clave de SIMO.
              </div>
            )}
          </div>
        );
      } else if (currentBlockType === "run") {
        // Render precise collapsible terminal emulator!
        const isCollapsed = ledgerExpanded[`${msgId}-run-${key}`] === true; // Default expanded!
        const cmdMatch = joined.match(/Ran cd "([^"]+)"|Ran (.*)/i);
        const cmdTitle = cmdMatch ? (cmdMatch[1] || cmdMatch[2]) : `cd "e:\\NEXT-ID AGENCY\\CONCURSOS RAMA\\vacanteIA"`;
        
        blocks.push(
          <div key={`run-${key}`} className="my-2.5 font-mono select-none">
            <button
              onClick={() => toggleLedgerSection(msgId, `run-${key}`)}
              className="flex items-center gap-1.5 text-neutral-300 hover:text-white transition-colors text-[10.5px] font-semibold"
            >
              <span>Ran cd "{cmdTitle.length > 20 ? cmdTitle.substring(0, 20) + "..." : cmdTitle}"</span>
              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-neutral-500" /> : <ChevronDown className="w-3.5 h-3.5 text-[#ffb000]" />}
            </button>
            {!isCollapsed && (
              <div className="mt-1.5 p-3 rounded-lg border border-neutral-800/40 bg-[#040508]/98 select-text font-mono text-[10.5px] text-neutral-300 leading-relaxed shadow-lg max-w-full overflow-x-auto">
                <div className="flex gap-1.5 items-start">
                  <span className="text-neutral-500 select-none">...\vacanteIA &gt;</span>
                  <p className="whitespace-pre-wrap select-text text-neutral-350">
                    <span className="text-blue-400">cd</span> <span className="text-emerald-400">"e:\NEXT-ID AGENCY\CONCURSOS RAMA\vacanteIA"</span> && <span className="text-blue-400">git</span> add . && <span className="text-blue-400">git</span> commit <span className="text-amber-500">-m</span> <span className="text-emerald-400">"fix: vacante.id bug, settings dark theme, navbar bell removal, search button redesign"</span> && <span className="text-blue-400">git</span> push origin main
                  </p>
                </div>
                <div className="text-[9.5px] text-neutral-500 mt-2 border-t border-neutral-900 pt-1.5 flex justify-between select-none">
                  <span>🚀 push remoto completado con éxito</span>
                  <span className="text-emerald-400 font-bold">git:origin/main</span>
                </div>
              </div>
            )}
          </div>
        );
      } else {
        // Plain text/markdown paragraph
        blocks.push(
          <div key={`text-${key}`} className="my-2 text-[11.5px] leading-relaxed select-text font-sans text-neutral-350">
            {renderTextWithFileBadges(joined)}
          </div>
        );
      }

      currentBlockLines = [];
    };

    let keyCounter = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Check for Thought block starts
      const thoughtMatch = trimmed.match(/Thought for (\d+s)/i);
      if (trimmed.startsWith("Thought for") || trimmed.toLowerCase().startsWith("thought")) {
        flushCurrentBlock(keyCounter++);
        currentBlockType = "thought";
        thoughtSeconds = thoughtMatch ? thoughtMatch[1] : "21s";
        continue;
      }

      // Check for Explored file starts
      if (trimmed.startsWith("Explored ") && trimmed.includes("file")) {
        flushCurrentBlock(keyCounter++);
        currentBlockType = "explored";
        currentBlockLines.push(trimmed);
        continue;
      }

      // Check for command ran block starts
      if (trimmed.startsWith("Ran ") || trimmed.startsWith("cd ") || trimmed.startsWith("...\\vacanteIA")) {
        flushCurrentBlock(keyCounter++);
        currentBlockType = "run";
        currentBlockLines.push(trimmed);
        continue;
      }

      // Render edited files ribbon immediately to preserve exact position
      if (trimmed.startsWith("Edited") && (trimmed.includes("+") || trimmed.includes("-") || trimmed.includes(".jsx") || trimmed.includes(".tsx"))) {
        flushCurrentBlock(keyCounter++);
        
        const fileParts = trimmed.match(/Edited\s+([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)\s*(\+\d+)?\s*(-\d+)?/i);
        const fileName = fileParts ? fileParts[1] : "HomeDashboard.jsx";
        const additions = fileParts?.[2] || "+13";
        const deletions = fileParts?.[3] || "-23";

        blocks.push(
          <div key={`edited-${keyCounter++}`} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-[#14151e]/40 hover:bg-[#1a1c28]/60 border border-[#252837]/30 my-2.5 transition-all select-none">
            <div className="flex items-center gap-2 min-w-0">
              <FileIconHelper path={fileName} />
              <button
                type="button"
                onClick={() => onSelectFile && onSelectFile(fileName)}
                className="text-[10.5px] font-semibold text-neutral-300 font-mono truncate hover:underline text-left cursor-pointer"
              >
                {fileName}
              </button>
            </div>
            <div className="flex items-center gap-2 font-mono text-[9.5px] select-text">
              <span className="text-emerald-400 font-bold">{additions}</span>
              <span className="text-rose-500 font-medium">{deletions}</span>
            </div>
          </div>
        );
        continue;
      }

      // Normal line accumulation
      currentBlockLines.push(line);
    }
    flushCurrentBlock(keyCounter++);

    return (
      <div className="w-full select-text border border-[#1d1f2e]/40 rounded-xl bg-[#090b10]/95 shadow-md flex flex-col p-4 my-3 text-xs">
        <button
          type="button"
          onClick={() => toggleLedgerSection(msgId, "root")}
          className="flex items-center gap-1 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer select-none font-bold text-[11px] mb-2.5"
        >
          <span>{workedLabel}</span>
          {isLedgerOpen ? <ChevronDown className="w-3.5 h-3.5 text-neutral-500" /> : <ChevronUp className="w-3.5 h-3.5 text-neutral-500" />}
        </button>

        {isLedgerOpen && (
          <div className="pl-1 space-y-1 border-l border-neutral-900/50 mt-1">
            {blocks}
          </div>
        )}
      </div>
    );
  };

  return (
    <div id="ide-chat" className="w-[370px] bg-[#0A0B0E] border-l border-neutral-900 flex h-full shrink-0 relative select-text">
      {/* Columna Principal del Chat */}
      <div className="flex-1 flex flex-col min-w-0 h-full border-r border-[#151821]/40">
        
        {/* 1. PROFESSIONAL HEADER */}
        <div className="px-4 py-3 border-b border-neutral-900 bg-[#0A0B0E] flex items-center justify-between shrink-0 select-none">
          <span className="text-[10.5px] font-semibold text-neutral-300 font-sans tracking-wide truncate max-w-[145px]" title={workspaceName || "AI Vacancy Finder"}>
            Building {workspaceName || "AI-Powered SIMO Vacancy Finder"}
          </span>
          
          <div className="flex items-center gap-2 text-neutral-400">
            <button 
              type="button"
              onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
              className="p-1 hover:bg-neutral-900 hover:text-white rounded transition-colors cursor-pointer focus:outline-none"
              title="Añadir contexto o referencias"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          
          <button 
            type="button"
            onClick={() => alert("Historial del agente cargado desde memoria interna.")}
            className="p-1 hover:bg-neutral-900 hover:text-white rounded transition-colors cursor-pointer focus:outline-none"
            title="Historial de Git / Loops"
          >
            <History className="w-3.5 h-3.5" />
          </button>
          
          <button 
            type="button"
            onClick={() => {
              // Toggle compare panel or editor splits
              const splitBtn = document.getElementById("toggle-split-btn");
              if (splitBtn) splitBtn.click();
            }}
            className="p-1 hover:bg-neutral-900 hover:text-white rounded transition-colors cursor-pointer focus:outline-none"
            title="Dividir editor en pestañas"
          >
            <Columns className="w-3.5 h-3.5" />
          </button>
          
          <button 
            type="button"
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className="p-1 hover:bg-neutral-900 hover:text-white rounded transition-colors cursor-pointer focus:outline-none"
            title="Más Opciones"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Popovers details */}
      {isPlusMenuOpen && (
        <div className="absolute right-2 top-11 w-48 bg-[#0a0c10] border border-neutral-800 p-2 rounded-lg shadow-2xl z-40 text-[10.5px] font-mono text-neutral-300 space-y-1">
          <button onClick={() => { setIsPlusMenuOpen(false); setInputText("Por favor analiza el archivo abierto..."); }} className="w-full text-left p-1.5 hover:bg-neutral-900 hover:text-white rounded cursor-pointer truncate">📂 Add active file to prompt</button>
          <button onClick={() => { setIsPlusMenuOpen(false); setInputText("Generar test con las reglas de negocio..."); }} className="w-full text-left p-1.5 hover:bg-neutral-900 hover:text-white rounded cursor-pointer truncate">📝 Attach workspace rules</button>
          <button onClick={() => { setIsPlusMenuOpen(false); alert("Directorio de imágenes listo para adjuntar."); }} className="w-full text-left p-1.5 hover:bg-neutral-900 hover:text-white rounded cursor-pointer truncate">🖼️ Select workspace screenshots</button>
        </div>
      )}

      {isMoreMenuOpen && (
        <div className="absolute right-2 top-11 w-44 bg-[#0a0c10] border border-neutral-800 p-2 rounded-lg shadow-2xl z-40 text-[10.5px] font-mono text-neutral-355 space-y-1">
          <button 
            onClick={() => {
              setIsMoreMenuOpen(false);
              const auditBtn = document.getElementById("ai-audit-bugs-btn");
              if (auditBtn) auditBtn.click();
            }} 
            className="w-full text-left p-1.5 hover:bg-neutral-900 hover:text-white rounded cursor-pointer text-indigo-300"
          >
            🔍 Semantics Bug Audit
          </button>
          <button 
            onClick={() => {
              setIsMoreMenuOpen(false);
              onClearHistory();
            }} 
            className="w-full text-left p-1.5 hover:bg-red-950 hover:text-red-300 rounded cursor-pointer text-rose-450"
          >
            🗑️ Clear chat history
          </button>
          <button 
            onClick={() => {
              setIsMoreMenuOpen(false);
              alert("LSP Server: 🟢 Online\nActive files: 83\nInference latency: 190ms");
            }} 
            className="w-full text-left p-1.5 hover:bg-neutral-900 hover:text-white rounded cursor-pointer"
          >
            ⚡ LSP Diagnostics Info
          </button>
        </div>
      )}

      {/* 🧠 Collapsible Panel for Memoria (Brain) */}
      {isMemoryOpen && (
        <div className="mx-3 mt-2 mb-1.5 p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/45 via-[#0e1017] to-indigo-950/30 border border-indigo-600/30 shadow-lg font-sans text-neutral-300 relative animate-fadeIn">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-indigo-950/90 font-mono text-[10px] text-indigo-400 font-bold">
            <div className="flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-indigo-400 animate-pulse shrink-0" />
              <span>MEMORIA Y CONTEXTO ACTIVO</span>
            </div>
            <button 
              type="button"
              onClick={() => setIsMemoryOpen(false)}
              className="text-neutral-500 hover:text-neutral-300 text-[9px] uppercase font-bold transition-colors cursor-pointer font-bold"
            >
              Cerrar
            </button>
          </div>
          
          {/* Part 1: Persistent Working Memory Notebook */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[9px] font-bold text-neutral-400 font-mono">
              <span>🎯 MEMORIA DE TRABAJO (OBJETIVOS):</span>
              {workingFocus.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("¿Limpiar memoria de trabajo actual?")) setWorkingFocus("");
                  }}
                  className="text-rose-450 hover:underline cursor-pointer"
                >
                  Borrar
                </button>
              )}
            </div>
            <textarea
              placeholder="Ejemplo: 'Quitar icono de campana', 'Usar paleta de colores claros', 'No cambiar el Navbar superior'."
              value={workingFocus}
              onChange={(e) => setWorkingFocus(e.target.value)}
              rows={2}
              className="w-full bg-neutral-950/90 border border-neutral-900 focus:border-indigo-500/50 rounded-lg p-1.5 font-sans text-[10.5px] text-neutral-200 placeholder-neutral-600 outline-none resize-none leading-relaxed"
            />
            <p className="text-[9px] text-neutral-500 leading-normal italic font-sans home-text">
              👉 Todo lo que anotes aquí se inyectará en segundo plano como instrucción fija para que el agente nunca lo olvide.
            </p>
          </div>

          {/* Part 2: Code Generation Strategy Option */}
          <div className="mt-3 flex items-center justify-between p-1.5 bg-neutral-950/40 rounded-lg border border-neutral-900/60 text-[10px] font-sans">
            <div className="flex items-center gap-1.5 shrink-0">
              <input
                type="checkbox"
                id={`avoid-redos-chk-${workspaceName}`}
                checked={avoidRedos}
                onChange={(e) => setAvoidRedos(e.target.checked)}
                className="rounded border-neutral-800 bg-neutral-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor={`avoid-redos-chk-${workspaceName}`} className="font-bold text-neutral-300 cursor-pointer">
                Modo de Edición Incremental
              </label>
            </div>
            <span className="text-[8.5px] uppercase font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1 py-0.2 rounded shrink-0">
              {avoidRedos ? "Active" : "Off"}
            </span>
          </div>
          {avoidRedos && (
            <p className="text-[9px] text-neutral-500 leading-normal pl-1.5 -mt-1 font-sans">
              💡 Le ordena al agente sugerir diffs focalizados en lugar de reescribir todo tu archivo desde cero.
            </p>
          )}

          {/* Part 3: Memory timeline indicators */}
          <div className="space-y-1.5 pt-1.5 mt-3 border-t border-indigo-950/40">
            <span className="text-[9px] font-bold text-neutral-450 font-mono block">📊 MEMORIA DE EVENTOS DE SESIÓN:</span>
            <div className="space-y-1 max-h-[100px] overflow-y-auto font-mono text-[9.5px] text-neutral-500 scrollbar-thin divide-y divide-[#181a24]/40">
              {proposedEdits.length > 0 ? (
                proposedEdits.map((edit, index) => (
                  <div key={index} className="flex items-center justify-between py-1 text-neutral-400 animate-fadeIn">
                    <span className="truncate max-w-[170px] font-semibold text-neutral-350">
                      📄 {edit.filePath.split("/").pop()}
                    </span>
                    <span className={`text-[8px] px-1 py-0.1 select-none rounded font-bold uppercase ${
                      edit.status === "applied" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15" : 
                      edit.status === "rejected" ? "bg-rose-500/10 text-rose-450" : "bg-amber-500/10 text-amber-450 animate-pulse"
                    }`}>
                      {edit.status === "applied" ? "Applied" : edit.status === "rejected" ? "Rejected" : "Pending"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-1 flex items-center gap-1.5 text-neutral-600 italic">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/40"></span>
                  <span>No hay cambios aplicados en la sesión actual.</span>
                </div>
              )}
              {activeFile && (
                <div className="flex items-center gap-1.5 py-1 text-sky-450">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
                  <span className="truncate justify-between">File focus: {activeFile.name} (LSP active)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🛠️ Collapsible Panel for Skills (Layers) */}
      {isSkillsOpen && (
        <div className="mx-3 mt-2 mb-1.5 p-3 rounded-xl bg-gradient-to-r from-emerald-950/20 via-[#0a0c11] to-emerald-950/10 border border-emerald-500/20 shadow-lg font-sans text-neutral-300 relative animate-fadeIn">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-950/80 font-mono text-[10px] text-emerald-400 font-bold">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>GESTOR DE HABILIDADES DEL AGENTE</span>
            </div>
            <button 
              type="button"
              onClick={() => setIsSkillsOpen(false)}
              className="text-neutral-500 hover:text-neutral-300 text-[9px] uppercase font-bold transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>

          <SkillManager 
            skills={skills}
            onToggleSkill={handleToggleSkill}
            onDeleteSkill={handleDeleteSkill}
            onAddSkill={(newSkill) => {
              const skillToAdd: SkillItem = {
                id: `user-skill-${Date.now()}`,
                name: newSkill.name,
                description: newSkill.description,
                promptContent: newSkill.promptContent,
                category: newSkill.category,
                isActive: true,
                isSystem: false
              };
              setSkills(prev => [...prev, skillToAdd]);
            }}
          />
        </div>
      )}

      {/* 🧠 1.6. AGENT WALKTHROUGH & AGENTIC LOOP PANEL OR EXECUTIVE SUMMARY CARD */}
      {showExecutiveSummary && liveTasksList.length > 0 ? (
        <div className="mx-3 mt-1.5 mb-2.5 p-3.5 rounded-xl bg-gradient-to-br from-emerald-950/20 via-[#0A0B0E] to-emerald-950/5 border border-emerald-500/20 shadow-xl text-neutral-300 font-sans animate-fadeIn">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-emerald-950/65">
            <div className="flex items-center gap-1.5 font-bold text-emerald-400 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>✓ Plan ejecutado correctamente</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowExecutiveSummary(false)}
                className="text-[9px] text-neutral-450 hover:text-white bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors font-sans"
              >
                Detalles
              </button>
              <button
                onClick={handleResetWalkthrough}
                className="text-[9.5px] font-bold font-sans text-slate-950 bg-emerald-400 hover:bg-emerald-350 px-2 py-0.5 rounded cursor-pointer transition-all shadow-md"
              >
                Aceptar
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            <div>
              <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-wider font-mono block">Resumen del Plan:</span>
              <p className="text-[10px] text-neutral-300 mt-0.5 pl-1 border-l-2 border-emerald-500/10 italic">
                {liveTasksList.length} subtareas completadas de manera secuencial conforme a las directivas de calidad del agente.
              </p>
            </div>

            {proposedEdits.length > 0 && (
              <div>
                <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-wider font-mono block mb-1">Archivos Modificados y Extractos:</span>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto scrollbar-thin">
                  {proposedEdits.map((edit, idx) => {
                    const lines = edit.newContent.split("\n").filter(l => l.trim().length > 0);
                    const extractLines = lines.slice(0, 3);
                    return (
                      <div key={idx} className="bg-neutral-950/80 rounded-lg p-2 border border-neutral-900/60 font-mono">
                        <div className="flex items-center gap-1.5 text-[9.5px] font-bold text-slate-300 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>{edit.filePath}</span>
                        </div>
                        {extractLines.length > 0 && (
                          <pre className="text-[8.5px] text-neutral-500 pl-2 leading-tight overflow-x-auto select-none bg-neutral-950/30 py-1 rounded max-h-[60px] scrollbar-none font-mono">
                            {extractLines.join("\n")}
                            {lines.length > 3 && "\n..."}
                          </pre>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <TaskWalkthrough
          tasks={liveTasksList}
          phase={activePairingPhase}
          onToggleTask={onToggleTask}
          currentFileBeingEdited={currentFileBeingEdited}
          verificationStatus={verificationStatus}
          verificationLogs={verificationLogs}
          onReset={handleResetWalkthrough}
          proposedEdits={proposedEdits}
        />
      )}

      {/* 2. CHAT MESSAGES STREAM LIST */}
      <div id="chat-messages-container" className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">
        {chatHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 space-y-4">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
            <div className="space-y-1 px-4 balance">
              <h5 className="text-[11.5px] font-semibold text-neutral-200">Asistente de Desarrollo AI</h5>
              <p className="text-[10px] text-neutral-500 leading-relaxed max-w-xs">
                Modifica y optimiza el backend/frontend de tu SIMO Finder de manera completamente integrada.
              </p>
            </div>

            <div className="w-full pt-4 space-y-1.5 text-left px-2">
              <span className="text-[8.5px] uppercase tracking-widest font-bold text-neutral-500 block px-1">Misiones Rápidas</span>
              {[
                { label: "Corregir race conditions", prompt: "En WoodDashboard.jsx, encuentra y soluciona cualquier race condition al guardar el token de SIMO." },
                { label: "Modo Oscuro a Claro Profesional", prompt: "Modifica el modal de Settings en ClientDashboard.jsx para usar una limpia paleta clara (light theme) en lugar de la oscura." },
                { label: "Quitar barra de notificaciones", prompt: "En ClientDashboard.jsx, elimina el icono de Bell (Campana) y haz el navbar superior más compacto." }
              ].map((item, idx) => (
                <button
                  id={`helper-prompt-btn-${idx}`}
                  key={idx}
                  onClick={() => triggerHelperPrompt(item.prompt)}
                  className="w-full text-[10.5px] text-left text-neutral-400 py-2 px-2.5 bg-neutral-950 border border-neutral-900 rounded-lg hover:border-indigo-500 hover:text-indigo-300 transition-all truncate block cursor-pointer"
                >
                  ⚡ {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {chatHistory.map((msg) => {
              const isAssistant = msg.role === "assistant";
              const cleanText = getCleanBubbleText(msg.content);

              return (
                <div key={msg.id} className="flex flex-col gap-1.5">
                  <div className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
                    
                    {/* User Prompt (Renders exactly like 'Continue' in screenshot) */}
                    {!isAssistant ? (
                      <div className="max-w-[90%] rounded-xl px-3.5 py-1.5 text-[11.5px] leading-relaxed bg-[#1b1c24] text-[#efeff1] border border-transparent shadow select-text">
                        {cleanText}
                      </div>
                    ) : (
                      /* Assistant conversational body part */
                      cleanText && (
                        <div className="max-w-[95%] text-[11.5px] leading-relaxed text-neutral-300 select-text prose prose-invert max-w-none">
                          {renderTextWithFileBadges(cleanText)}
                        </div>
                      )
                    )}
                  </div>

                  {/* Execution Ledger Card for Assistant logic logs */}
                  {isAssistant && renderExecutionLedger(msg.id, msg.content)}
                </div>
              );
            })}
          </div>
        )}

        {/* Live Loading state indicators */}
        {isLoading && (
          <div className="space-y-3.5">
            <div className="flex gap-2 items-center text-[10px] text-neutral-500 select-none animate-pulse font-mono">
              <RefreshCw className="w-3 h-3 animate-spin text-indigo-400 shrink-0" />
              <span>Pensando y planificando cambios...</span>
            </div>
            
            {chatHistory[chatHistory.length - 1]?.content && (
              <div className="opacity-90 animate-pulse">
                {renderExecutionLedger("streaming-live", chatHistory[chatHistory.length - 1].content)}
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. CONTEXT / TOOLS FLOATING PANEL (Just above the input field) */}
      <div className="px-3 py-1.5 bg-[#08090d]/80 border-t border-neutral-900/50 flex items-center justify-between z-10 select-none">
        <div className="flex items-center gap-3 text-neutral-500">
          <button 
            type="button"
            onClick={() => alert(`Archivo activo del buffer: ${activeFile ? activeFile.path : "Ninguo"}`)}
            className="hover:text-neutral-300 cursor-pointer focus:outline-none"
            title="Ver archivo activo"
          >
            <FileText className="w-3.5 h-3.5 text-neutral-550" />
          </button>
          
          <button 
            type="button"
            onClick={() => {
              const termToggleBtn = document.getElementById("toggle-terminal-btn");
              if (termToggleBtn) termToggleBtn.click();
            }}
            className="hover:text-neutral-300 cursor-pointer focus:outline-none"
            title="Alternar Consola Terminal"
          >
            <Terminal className="w-3.5 h-3.5 text-neutral-550" />
          </button>
          
          {/* PR / Mailbox inbox notifications simulated with a blue dot indicator */}
          <div className="relative cursor-pointer hover:text-neutral-300" onClick={() => alert("Notificación: Actualizaciones de rama remotas sincronizadas.")}>
            <Inbox className="w-3.5 h-3.5 text-neutral-550" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
          </div>
          
          {/* Chrome/Preview with blue dot indicator! */}
          <div className="relative cursor-pointer hover:text-neutral-300" onClick={() => {
            const previewToggle = document.getElementById("mobile-preview-toggle-btn");
            if (previewToggle) {
              previewToggle.click();
            } else {
              alert("Actualizando Web Preview en puerto 3000!");
            }
          }}>
            <Globe className="w-3.5 h-3.5 text-neutral-550" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
          </div>
        </div>

        {/* REVIEW CHANGES ACTION */}
        {proposedEdits.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              // Click the first pending proposed edit accept
              const pending = proposedEdits.find(e => e.status === "pending");
              if (pending) {
                onAcceptEdit(pending);
                alert(`Cambios aplicados automáticamente para ${pending.filePath}`);
              } else {
                alert("No hay cambios pendientes para revisar.");
              }
            }}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-neutral-900 hover:bg-neutral-850/80 border border-neutral-800 text-[10px] font-medium text-neutral-300 cursor-pointer transition-colors"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Review Changes</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => alert("Revisando inconsistencias locales del árbol de Git...")}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#111218]/40 hover:bg-neutral-900 border border-neutral-800/60 text-[9.5px] font-sans text-neutral-450 cursor-pointer transition-colors"
          >
            <span>Review Changes</span>
          </button>
        )}
      </div>

      {/* 5. INTERACTIVE FOOTER FORM */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-neutral-900/60 bg-[#0A0B0E] flex flex-col gap-2 shrink-0">
        
        {/* Context attachments list rendering container */}
        {attachedContexts.length > 0 && (
          <div className="flex flex-wrap gap-1 p-1 bg-neutral-950/80 rounded-lg border border-neutral-900 font-mono text-[9.5px]">
            <div className="w-full text-slate-500 font-sans font-semibold text-[8px] uppercase px-1 pb-1 flex justify-between items-center">
              <span>Contexto Adjuntado ({attachedContexts.length})</span>
              <button
                type="button"
                onClick={() => {
                  if (onRemoveContext) {
                    attachedContexts.forEach(c => onRemoveContext(c.id));
                  }
                }}
                className="text-[8px] hover:underline text-rose-400 font-semibold cursor-pointer"
              >
                Limpiar todo
              </button>
            </div>
            {attachedContexts.map(ctx => {
              let tagColor = "bg-sky-500/10 border-sky-500/20 text-sky-450";
              if (ctx.type === "code") tagColor = "bg-amber-450/10 border-amber-450/20 text-amber-450";
              if (ctx.type === "error") tagColor = "bg-rose-500/10 border-rose-500/20 text-rose-400";
              return (
                <div key={ctx.id} className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${tagColor}`} title={ctx.content}>
                  <span className="truncate max-w-[130px] font-semibold">{ctx.label}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveContext?.(ctx.id)}
                    className="p-0.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white cursor-pointer shrink-0"
                    title="Quitar"
                  >
                    <X className="w-2.5 h-2.5 animate-in" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Suggest / Active Skills Panel when user is writing a message */}
        {inputText.trim().length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-1.5 p-2 bg-gradient-to-r from-emerald-950/20 via-[#0A0B0E] to-emerald-950/5 rounded-xl border border-emerald-500/15 text-[10px]"
          >
            <div className="flex justify-between items-center px-1 font-semibold text-neutral-400">
              <span className="flex items-center gap-1.5 font-mono text-[8.5px] uppercase text-emerald-400 font-bold tracking-wider">
                <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Catálogo de Habilidades
              </span>
              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={() => setSkills(prev => prev.map(s => ({ ...s, isActive: true })))}
                  className="text-[8.5px] font-mono font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer transition-all"
                >
                  Aplicar todas
                </button>
                <span className="text-neutral-700 select-none">|</span>
                <button
                  type="button"
                  onClick={() => setSkills(prev => prev.map(s => ({ ...s, isActive: false })))}
                  className="text-[8.5px] font-mono font-bold text-neutral-500 hover:text-neutral-400 cursor-pointer transition-all"
                >
                  Sin skills
                </button>
              </div>
            </div>
            <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-thin">
              {skills.map(skill => (
                <button
                  type="button"
                  key={skill.id}
                  onClick={() => handleToggleSkill(skill.id)}
                  title={skill.description}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#07080c] border shrink-0 text-[10px] cursor-pointer transition-all ${
                    skill.isActive 
                      ? "border-emerald-500/25 text-emerald-300" 
                      : "border-neutral-900 text-neutral-450 hover:border-neutral-850"
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full transition-all ${skill.isActive ? "bg-emerald-400 animate-pulse scale-110" : "bg-neutral-850"}`} />
                  <span className="font-bold font-sans">{skill.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Core Chat Box Text Area */}
        <div className="flex gap-1.5 items-center bg-[#07080c] border border-neutral-850/80 rounded-xl px-2.5 py-2 group focus-within:border-indigo-650 transition-all">
          <input
            id="chat-input-text"
            type="text"
            disabled={isLoading || isListening}
            placeholder="Ask anything, @ to mention, / for actions"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-transparent text-[11.5px] text-neutral-100 placeholder:text-neutral-550 focus:outline-none min-w-0"
          />
          <button
            id="chat-submit-btn"
            type="submit"
            disabled={(!inputText.trim() || isLoading) && !isListening}
            className="p-1 px-1.5 bg-indigo-500/10 text-indigo-400 disabled:opacity-40 disabled:hover:bg-transparent hover:bg-indigo-500/25 rounded-md transition-all cursor-pointer font-bold shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Tools & Dropdown row */}
        <div className="flex items-center justify-between select-none relative pt-0.5">
          <div className="flex items-center gap-1.5">
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
              className="p-1 hover:bg-neutral-900 text-neutral-450 hover:text-white rounded transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            {/* Models Dropdown Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="flex items-center gap-1 bg-[#12141c] hover:bg-[#1b1e2a] border border-[#252839]/45 text-[10.5px] font-sans font-medium text-neutral-350 px-2.5 py-1.2 rounded-lg transition-all cursor-pointer"
              >
                {/* Cloud indicator with Cloud shape and Red Status indicator inside */}
                <div className="flex items-center gap-1 relative mr-0.5 shrink-0">
                  <Cloud className="w-3 h-3 text-sky-400" />
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse block absolute -bottom-0.5 -right-0.5 border border-[#12141c]" />
                </div>
                <span className="truncate max-w-[120px]">{getModelLabel()}</span>
                <ChevronDown className="w-3 h-3 text-neutral-500" />
              </button>

              {/* Providers & Models List Card Selection */}
              {isModelDropdownOpen && (
                <div className="absolute bottom-9 left-0 w-56 bg-[#090b0f] border border-neutral-850 p-2.5 rounded-xl shadow-2xl z-40 space-y-2 select-none animate-in fade-in duration-100">
                  <span className="text-[8.5px] uppercase tracking-wider font-extrabold text-neutral-500 block px-1">Seleccionar Proveedor AI</span>
                  
                  <div className="max-h-52 overflow-y-auto space-y-2.5 pr-1 font-sans text-[10px]">
                    {/* Gemini Category */}
                    <div className="space-y-1">
                      <span className="text-[8px] font-bold text-sky-400/90 block border-b border-sky-400/20 pb-0.5">Google Gemini API</span>
                      {["gemini-3.5-flash", "gemini-3.1-pro-preview", "gemini-3.1-flash-lite"].map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => selectNewLlmModel("gemini", m)}
                          className={`w-full text-left py-1 px-1.5 rounded text-neutral-300 hover:bg-neutral-900 cursor-pointer flex justify-between items-center ${
                            llmConfig.model === m ? "bg-indigo-950/40 text-indigo-300 font-bold" : ""
                          }`}
                        >
                          <span>{modelFriendlyNames[m]}</span>
                          {llmConfig.model === m && <Check className="w-3 h-3 text-indigo-400" />}
                        </button>
                      ))}
                    </div>

                    {/* OpenAI Category */}
                    <div className="space-y-1">
                      <span className="text-[8px] font-bold text-emerald-400 block border-b border-emerald-400/20 pb-0.5">OpenAI Providers</span>
                      {["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"].map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => selectNewLlmModel("openai", m)}
                          className={`w-full text-left py-1 px-1.5 rounded text-neutral-300 hover:bg-neutral-900 cursor-pointer flex justify-between items-center ${
                            llmConfig.model === m ? "bg-indigo-950/40 text-indigo-300 font-bold" : ""
                          }`}
                        >
                          <span>{modelFriendlyNames[m]}</span>
                          {llmConfig.model === m && <Check className="w-3 h-3 text-indigo-450" />}
                        </button>
                      ))}
                    </div>

                    {/* Anthropic Category */}
                    <div className="space-y-1">
                      <span className="text-[8px] font-bold text-amber-500 block border-b border-amber-505/20 pb-0.5">Anthropic Claude</span>
                      {["claude-3-5-sonnet-latest", "claude-3-opus-20240229", "claude-3-haiku-20240307"].map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => selectNewLlmModel("anthropic", m)}
                          className={`w-full text-left py-1 px-1.5 rounded text-neutral-300 hover:bg-neutral-900 cursor-pointer flex justify-between items-center ${
                            llmConfig.model === m ? "bg-indigo-950/40 text-indigo-300 font-bold" : ""
                          }`}
                        >
                          <span>{modelFriendlyNames[m]}</span>
                          {llmConfig.model === m && <Check className="w-3 h-3 text-indigo-455" />}
                        </button>
                      ))}
                    </div>

                    {/* DeepSeek Category */}
                    <div className="space-y-1">
                      <span className="text-[8px] font-bold text-violet-400 block border-b border-violet-405/20 pb-0.5">DeepSeek</span>
                      {["deepseek-chat", "deepseek-coder"].map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => selectNewLlmModel("deepseek", m)}
                          className={`w-full text-left py-1 px-1.5 rounded text-neutral-300 hover:bg-neutral-900 cursor-pointer flex justify-between items-center ${
                            llmConfig.model === m ? "bg-indigo-950/40 text-indigo-300 font-bold" : ""
                          }`}
                        >
                          <span>{modelFriendlyNames[m]}</span>
                          {llmConfig.model === m && <Check className="w-3 h-3 text-indigo-460" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Voice Input Microphone Trigger */}
          <button
            type="button"
            onClick={triggerListeningSim}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              isListening 
                ? "bg-rose-500/25 text-rose-400 animate-pulse border border-rose-500/40" 
                : "text-neutral-450 hover:bg-neutral-900 hover:text-white"
            }`}
            title={isListening ? "Desactivar Micrófono" : "Dictado por Voz AI"}
          >
            <Mic className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
      </div>

      {/* Riel de Actividad Derecho (Brain & Skills) */}
      <div className="w-12 bg-[#0c0e15] border-l border-neutral-900/60 flex flex-col justify-between items-center py-4 shrink-0 select-none">
        <div className="flex flex-col gap-5 items-center w-full">
          {/* Cerebro Button (Análisis / Memoria) */}
          <button 
            type="button"
            onClick={() => {
              setIsMemoryOpen(!isMemoryOpen);
              setIsSkillsOpen(false);
            }}
            className={`p-2 rounded-lg cursor-pointer transition-all relative flex items-center justify-center ${
              isMemoryOpen 
                ? "text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 shadow-[0_0_8px_rgba(99,102,241,0.2)]" 
                : "text-gray-500 hover:text-gray-350 hover:bg-white/[0.02]"
            }`}
            title="Memoria de Análisis (Cerebro)"
          >
            <Brain className={`w-5 h-5 ${workingFocus.trim() ? "text-amber-400 fill-amber-400/20" : ""}`} />
            {workingFocus.trim() && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" />
            )}
          </button>

          {/* Skill Button (Configuración de Instructivos) */}
          <button 
            type="button"
            onClick={() => {
              setIsSkillsOpen(!isSkillsOpen);
              setIsMemoryOpen(false);
            }}
            className={`p-2 rounded-lg cursor-pointer transition-all relative flex items-center justify-center ${
              isSkillsOpen 
                ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.2)]" 
                : "text-gray-500 hover:text-gray-350 hover:bg-white/[0.02]"
            }`}
            title="Gestor de Habilidades (Skills)"
          >
            <Layers className={`w-5 h-5 ${skills.some(s => s.isActive) ? "text-emerald-400" : ""}`} />
            {skills.some(s => s.isActive) && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            )}
          </button>
        </div>

        {/* Status indicator bottom */}
        <div className="flex flex-col items-center gap-4">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Sistemas Activos" />
        </div>
      </div>
    </div>
  );
}
