import React, { useState, useEffect, useRef } from "react";
import { FileNode, GitCommit, Workspace } from "../types";
import { flattenFileTree, findFileByPath } from "../utils/initialWorkspaces";
import { 
  Terminal, 
  Plus, 
  Columns, 
  Trash2, 
  ChevronRight, 
  Check, 
  Settings,
  Circle,
  AlertTriangle,
  FolderOpen
} from "lucide-react";

export type ShellType = "bash" | "zsh" | "fish" | "pwsh";

export interface TerminalPane {
  id: string;
  shellType: ShellType;
  history: string[];
  input: string;
}

export interface TerminalSession {
  id: string;
  name: string;
  panes: TerminalPane[]; // handles splitting
  activePaneId: string;
}

interface TerminalPanelProps {
  currentWorkspace: Workspace;
  onUpdateWorkspaceGit: (updatedFields: Partial<Workspace>) => void;
  onSelectFile: (path: string) => void;
  onUpdateFileContent: (path: string, newContent: string) => void;
}

const GREETINGS: Record<ShellType, string[]> = {
  bash: [
    "GNU bash, version 5.2.15-release (x86_64-pc-linux-gnu)",
    "Type 'help' to show all virtual capabilities.",
    "Connected to workspace local container."
  ],
  zsh: [
    "--- Oh-My-Zsh Ultimate Shell v0.9 (antigravity-vm) ---",
    "Loaded autocompletes, dynamic plugins: [git, node, python, lsp]",
    "Type 'help' to review simulated commands."
  ],
  fish: [
    "Welcome to fish, the friendly interactive shell",
    "Type 'help' for simulated filesystem operations.",
    "fish: active theme set to 'Neon-Glow'"
  ],
  pwsh: [
    "PowerShell 7.4.2",
    "Copyright (c) Microsoft Corporation.",
    "Type 'help' for instructions."
  ]
};

export default function TerminalPanel({
  currentWorkspace,
  onUpdateWorkspaceGit,
  onSelectFile,
  onUpdateFileContent
}: TerminalPanelProps) {
  // Session list
  const [sessions, setSessions] = useState<TerminalSession[]>(() => {
    return [
      {
        id: "s-1",
        name: "Terminal 1",
        activePaneId: "pane-1a",
        panes: [
          {
            id: "pane-1a",
            shellType: "bash",
            history: [
              "Virtual Node VM started successfully.",
              "Ready to receive commands. Type 'help' to list keys."
            ],
            input: ""
          }
        ]
      }
    ];
  });
  
  const [activeSessionId, setActiveSessionId] = useState("s-1");
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  // Auto-scroll each terminal pane content
  useEffect(() => {
    activeSession.panes.forEach(p => {
      const el = scrollRefs.current[`${activeSession.id}-${p.id}`];
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }, [sessions, activeSessionId]);

  // Terminal session management
  const handleAddSession = () => {
    const newId = "s-" + Date.now();
    const newPaneId = "p-" + Date.now() + "a";
    const sessionNo = sessions.length + 1;
    
    const newSession: TerminalSession = {
      id: newId,
      name: `Terminal ${sessionNo}`,
      activePaneId: newPaneId,
      panes: [
        {
          id: newPaneId,
          shellType: "zsh",
          history: [
            ...GREETINGS["zsh"],
            `Session slot ${sessionNo} online.`
          ],
          input: ""
        }
      ]
    };
    setSessions([...sessions, newSession]);
    setActiveSessionId(newId);
  };

  const handleRemoveSession = (idToRem: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) return;
    
    const filtered = sessions.filter(s => s.id !== idToRem);
    setSessions(filtered);
    if (activeSessionId === idToRem) {
      setActiveSessionId(filtered[0].id);
    }
  };

  // Split-pane toggle (Splits active session into left/right splits)
  const handleSplitSession = () => {
    if (activeSession.panes.length >= 2) return; // limit to 2 splits max
    
    const secondPaneId = "p-" + Date.now() + "b";
    const currentPane = activeSession.panes[0];
    const secondPane: TerminalPane = {
      id: secondPaneId,
      shellType: currentPane.shellType,
      history: [
        ...GREETINGS[currentPane.shellType],
        `Split shell pane initialized successfully.`
      ],
      input: ""
    };

    const updatedSessions = sessions.map(s => {
      if (s.id === activeWorkspaceId || s.id === activeSession.id) {
        return {
          ...s,
          panes: [s.panes[0], secondPane],
          activePaneId: secondPaneId
        };
      }
      return s;
    });
    setSessions(updatedSessions);
  };

  const activeWorkspaceId = currentWorkspace.id;

  const handleUnsplitSession = (paneIdToRemove: string) => {
    if (activeSession.panes.length <= 1) return;
    
    const remainingPane = activeSession.panes.find(p => p.id !== paneIdToRemove);
    if (!remainingPane) return;

    setSessions(sessions.map(s => {
      if (s.id === activeSession.id) {
        return {
          ...s,
          panes: [remainingPane],
          activePaneId: remainingPane.id
        };
      }
      return s;
    }));
  };

  // Shell switching controller
  const handleSwitchShell = (paneId: string, type: ShellType) => {
    setSessions(sessions.map(s => {
      if (s.id === activeSession.id) {
        return {
          ...s,
          panes: s.panes.map(p => {
            if (p.id === paneId) {
              return {
                ...p,
                shellType: type,
                history: [...p.history, `[SHELL CONFIG] Shell switched to ${type.toUpperCase()}`, ...GREETINGS[type]]
              };
            }
            return p;
          })
        };
      }
      return s;
    }));
  };

  // Interactive command compiler pipeline
  const processTerminalCommand = (paneId: string, cmdStr: string) => {
    const trimmed = cmdStr.trim();
    if (!trimmed) return;

    // Get prompt characters based on shellType
    const pane = activeSession.panes.find(p => p.id === paneId);
    if (!pane) return;

    const currentShell = pane.shellType;
    let promptLine = "";
    const wsSlug = currentWorkspace.name.toLowerCase().replace(/\s+/g, "-");

    if (currentShell === "bash") {
      promptLine = `neon@workspace:~/${wsSlug}$ ${trimmed}`;
    } else if (currentShell === "zsh") {
      promptLine = `➜  ~/${wsSlug} git:(main) ✗ ${trimmed}`;
    } else if (currentShell === "fish") {
      promptLine = `~/${wsSlug} (master) > ${trimmed}`;
    } else {
      promptLine = `PS C:\\workspace\\${currentWorkspace.name}> ${trimmed}`;
    }

    // Command parser
    const tokens = trimmed.split(/\s+/);
    const cmd = tokens[0].toLowerCase();
    const args = tokens.slice(1);
    
    let outputs: string[] = [promptLine];

    // Shell independent utilities
    switch (cmd) {
      case "help":
        outputs.push("=== SIMULATED SHELL HELP ===");
        outputs.push("  help                         - Muestra este panel de ayuda.");
        outputs.push("  clear                        - Limpia el historial del panel.");
        outputs.push("  whoami                       - Muestra el usuario activo en el sandbox.");
        outputs.push("  ls                           - Lista ficheros y carpetas locales.");
        outputs.push("  cat <fichero>                - Muestra el contenido de un archivo.");
        outputs.push("  echo <texto>                 - Replica el mensaje provisto.");
        outputs.push("  python <f> / node <f>        - Ejecuta de forma integrada código.");
        outputs.push("=== CLS GIT COMMANDS ===");
        outputs.push("  git status                   - Muestra el estado del stage.");
        outputs.push("  git add <fichero>            - Prepara un archivo para commit.");
        outputs.push("  git commit -m '<mensaje>'    - Confirma los cambios preparados.");
        outputs.push("  git log                      - Imprime el historial binario.");
        outputs.push("  git blame <fichero>          - Revisa autorías por línea.");
        break;

      case "clear":
        // Immediate clean
        setSessions(sessions.map(s => {
          if (s.id === activeSession.id) {
            return {
              ...s,
              panes: s.panes.map(p => (p.id === paneId ? { ...p, history: [], input: "" } : p))
            };
          }
          return s;
        }));
        return;

      case "whoami":
        outputs.push(currentWorkspace.gitCommits?.[0]?.author || "Julian Posada");
        break;

      case "echo":
        outputs.push(args.join(" "));
        break;

      case "ls":
        const fileList = flattenFileTree(currentWorkspace.fileTree);
        outputs.push(`Directorio activo: ~/${wsSlug}`);
        if (fileList.length === 0) {
          outputs.push("  (directorio vacío)");
        } else {
          fileList.forEach(file => {
            const size = (file.content || "").length;
            const sizeStr = `${size} bytes`.padStart(11);
            outputs.push(`  -rwxr-xr-x    ${sizeStr}    ${file.path}`);
          });
        }
        break;

      case "cat":
        if (args.length === 0) {
          outputs.push("Uso: cat <ruta_completa_archivo>");
        } else {
          const filepath = args[0];
          const found = findFileByPath(currentWorkspace.fileTree, filepath);
          if (found && found.content !== undefined) {
            outputs.push(`--- Leyendo de ${filepath} (${found.content.length} bytes) ---`);
            found.content.split("\n").forEach((lineContent, i) => {
              outputs.push(`  ${(i + 1).toString().padStart(2)}: ${lineContent}`);
            });
          } else {
            outputs.push(`cat: ${filepath}: No existe el fichero especificado.`);
          }
        }
        break;

      case "python":
      case "node":
        if (args.length === 0) {
          outputs.push(`Uso: ${cmd} <fichero.py/js>`);
        } else {
          const runFile = args[0];
          const target = findFileByPath(currentWorkspace.fileTree, runFile);
          if (target && target.content !== undefined) {
            outputs.push(`[EJECUCIÓN] Iniciando micro-runtime sandbox en ${cmd.toUpperCase()}...`);
            outputs.push(`[STDOUT] Compilando ${runFile}...`);
            setTimeout(() => {
              // Append code result as output
              addLateOutputs(paneId, [
                `[STDOUT] Proceso completado exitosamente con código de salida 0.`,
                `[STDOUT] Resultado del bloque lsp compile check: O.K.`
              ]);
            }, 500);
          } else {
            outputs.push(`${cmd}: No se encuentra el script '${runFile}'.`);
          }
        }
        break;

      // GIT COMMAND LINE INTERFACE IMPLEMENTATION (cohesive with visual GitPanel)
      case "git":
        const gitCmd = args[0]?.toLowerCase();
        const gitArg = args.slice(1).join(" ");
        const staged = currentWorkspace.gitStagedPaths || [];
        const baseTree = currentWorkspace.gitBaseTree || JSON.parse(JSON.stringify(currentWorkspace.fileTree));
        const commits = currentWorkspace.gitCommits || [];
        const flatCurrent = flattenFileTree(currentWorkspace.fileTree);
        const flatBase = flattenFileTree(baseTree);

        if (!gitCmd) {
          outputs.push("Uso: git [status | add | commit | log | blame]");
        } else if (gitCmd === "status") {
          outputs.push(`En la rama principal 'main'`);
          outputs.push(`Tu rama está al día con 'origin/main'.`);
          outputs.push("");

          // calculate changes lists
          const basePaths = new Set(flatBase.map(f => f.path));
          const currPaths = new Set(flatCurrent.map(f => f.path));
          
          const addedList: string[] = [];
          const modifiedList: string[] = [];
          const deletedList: string[] = [];

          flatBase.forEach(bf => {
            if (!currPaths.has(bf.path)) {
              deletedList.push(bf.path);
            }
          });

          flatCurrent.forEach(cf => {
            if (!basePaths.has(cf.path)) {
              addedList.push(cf.path);
            } else {
              const bf = flatBase.find(f => f.path === cf.path);
              if (bf && bf.content !== cf.content) {
                modifiedList.push(cf.path);
              }
            }
          });

          const stagedAdded = addedList.filter(p => staged.includes(p));
          const stagedModified = modifiedList.filter(p => staged.includes(p));
          const stagedDeleted = deletedList.filter(p => staged.includes(p));

          const unstagedAdded = addedList.filter(p => !staged.includes(p));
          const unstagedModified = modifiedList.filter(p => !staged.includes(p));
          const unstagedDeleted = deletedList.filter(p => !staged.includes(p));

          if (stagedAdded.length + stagedModified.length + stagedDeleted.length > 0) {
            outputs.push("Cambios listos para ser confirmados (Staged Changes):");
            outputs.push("  (usa 'git restore --staged <archivo>...' para sacar del stage)");
            stagedAdded.forEach(p => outputs.push(`\t[STAGED ADDED]    ${p}`));
            stagedModified.forEach(p => outputs.push(`\t[STAGED MODIFIED] ${p}`));
            stagedDeleted.forEach(p => outputs.push(`\t[STAGED DELETED]  ${p}`));
            outputs.push("");
          }

          if (unstagedAdded.length + unstagedModified.length + unstagedDeleted.length > 0) {
            outputs.push("Cambios no preparados para el commit (Unstaged Changes):");
            outputs.push("  (usa 'git add <archivo>...' para incluir en el stage)");
            unstagedAdded.forEach(p => outputs.push(`\t[UNSTAGED NEW]      ${p}`));
            unstagedModified.forEach(p => outputs.push(`\t[UNSTAGED MODIFIED]  ${p}`));
            unstagedDeleted.forEach(p => outputs.push(`\t[UNSTAGED DELETED]   ${p}`));
            outputs.push("");
          }

          if (gitStatusIsEmpty(addedList, modifiedList, deletedList)) {
            outputs.push("nada para confirmar, el árbol de trabajo está limpio.");
          }
        } 
        else if (gitCmd === "add") {
          if (!gitArg) {
            outputs.push("Error: especifica el archivo a agregar. Ej: 'git add index.html'");
          } else {
            const matches = flatCurrent.filter(f => f.path === gitArg || gitArg === ".");
            if (matches.length > 0) {
              const newStag = [...staged];
              matches.forEach(m => {
                if (!newStag.includes(m.path)) newStag.push(m.path);
              });
              onUpdateWorkspaceGit({ gitStagedPaths: newStag });
              outputs.push(`añadido '${gitArg}' al índice de staging de git.`);
            } else {
              outputs.push(`Error: No coincide ningún archivo con '${gitArg}'.`);
            }
          }
        } 
        else if (gitCmd === "commit") {
          if (staged.length === 0) {
            outputs.push("Error: No hay cambios listos en el stage de Git. Ejecuta 'git add' primero.");
          } else {
            // Find message in arg
            let msg = "commit desde terminal integrada";
            const matchMsg = gitArg.match(/-m\s+["'](.+?)["']/);
            if (matchMsg) {
              msg = matchMsg[1];
            } else if (gitArg.includes("-m")) {
              msg = gitArg.split("-m")[1]?.trim().replace(/['"]/g, "") || msg;
            }

            // Create file base changes
            let newSnapshot = JSON.parse(JSON.stringify(baseTree));
            staged.forEach(stgPath => {
              const curF = flatCurrent.find(f => f.path === stgPath);
              if (curF) {
                newSnapshot = updateFileInSnapshotTree(newSnapshot, stgPath, curF.content || "", curF.name);
              } else {
                newSnapshot = removeFileFromSnapshotTree(newSnapshot, stgPath);
              }
            });

            const authorName = "Terminal Developer";
            const randomHash = Math.random().toString(16).substring(2, 9);
            const newCommit: GitCommit = {
              id: "c-" + Date.now(),
              hash: randomHash,
              message: msg,
              author: authorName,
              date: new Date().toISOString(),
              snapshot: JSON.parse(JSON.stringify(newSnapshot))
            };

            onUpdateWorkspaceGit({
              gitBaseTree: newSnapshot,
              gitStagedPaths: [],
              gitCommits: [newCommit, ...commits]
            });

            outputs.push(`[main ${randomHash}] Commit completado exitosamente: "${msg}"`);
            outputs.push(` ${staged.length} archivos cambiados, staging vaciado.`);
          }
        } 
        else if (gitCmd === "log") {
          outputs.push(`=== HISTORIAL DE COMMITS (git log) ===`);
          commits.forEach(c => {
            outputs.push(`commit ${c.hash}`);
            outputs.push(`Author: ${c.author}`);
            outputs.push(`Date:   ${c.date}`);
            outputs.push(`    ${c.message}`);
            outputs.push("");
          });
        } 
        else if (gitCmd === "blame") {
          if (!gitArg) {
            outputs.push("Uso: git blame <fichero>");
          } else {
            const fileBlm = findFileByPath(currentWorkspace.fileTree, gitArg);
            if (fileBlm && fileBlm.content) {
              outputs.push(`^fffffff (${gitArg}) Blaming telemetry results:`);
              fileBlm.content.split("\n").forEach((lineText, idx) => {
                const author = idx % 2 === 0 ? "Julian Posada" : "Antigravity AI";
                const dateCommit = idx % 2 === 0 ? "2026-06-05" : "2026-06-07";
                const hashMock = idx % 2 === 0 ? "8bfd9a2" : "a2fe89b";
                outputs.push(`  ${hashMock} (${author.padEnd(16)} ${dateCommit} ${idx+1}): ${lineText}`);
              });
            } else {
              outputs.push(`git blame: ${gitArg}: No existe el archivo especificado.`);
            }
          }
        } 
        else {
          outputs.push(`git: '${gitCmd}' no es un comando de git simulado reconocido.`);
        }
        break;

      default:
        outputs.push(`bash: comando no encontrado: '${cmd}'. Escribe 'help' para ver los comandos válidos.`);
    }

    setSessions(sessions.map(s => {
      if (s.id === activeSession.id) {
        return {
          ...s,
          panes: s.panes.map(p => {
            if (p.id === paneId) {
              return {
                ...p,
                history: [...p.history, ...outputs],
                input: ""
              };
            }
            return p;
          })
        };
      }
      return s;
    }));
  };

  const gitStatusIsEmpty = (a: any[], m: any[], d: any[]) => {
    return a.length === 0 && m.length === 0 && d.length === 0;
  };

  const addLateOutputs = (paneId: string, extraOutputs: string[]) => {
    setSessions(prev => prev.map(s => {
      return {
        ...s,
        panes: s.panes.map(p => {
          if (p.id === paneId) {
            return {
              ...p,
              history: [...p.history, ...extraOutputs]
            };
          }
          return p;
        })
      };
    }));
  };

  // Snapshot recursive tree builders duplicated for terminals
  const updateFileInSnapshotTree = (nodes: FileNode[], pathStr: string, content: string, name: string): FileNode[] => {
    const flat = flattenFileTree(nodes);
    const exists = flat.some(f => f.path === pathStr);

    if (exists) {
      return nodes.map(node => {
        if (node.path === pathStr) return { ...node, content };
        if (node.type === "directory" && node.children) {
          return {
            ...node,
            children: updateFileInSnapshotTree(node.children, pathStr, content, name)
          };
        }
        return node;
      });
    } else {
      const parts = pathStr.split("/");
      if (parts.length === 1) {
        return [...nodes, { name, path: pathStr, type: "file", content }];
      } else {
        const parentPath = parts.slice(0, -1).join("/");
        return nodes.map(node => {
          if (node.path === parentPath && node.type === "directory") {
            return { ...node, children: [...(node.children || []), { name, path: pathStr, type: "file", content }] };
          }
          if (node.type === "directory" && node.children) {
            return { ...node, children: updateFileInSnapshotTree(node.children, pathStr, content, name) };
          }
          return node;
        });
      }
    }
  };

  const removeFileFromSnapshotTree = (nodes: FileNode[], pathStr: string): FileNode[] => {
    return nodes
      .filter(n => n.path !== pathStr)
      .map(node => {
        if (node.type === "directory" && node.children) {
          return {
            ...node,
            children: removeFileFromSnapshotTree(node.children, pathStr)
          };
        }
        return node;
      });
  };

  const handleInputChange = (paneId: string, val: string) => {
    setSessions(sessions.map(s => {
      if (s.id === activeSession.id) {
        return {
          ...s,
          panes: s.panes.map(p => (p.id === paneId ? { ...p, input: val } : p))
        };
      }
      return s;
    }));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0c10] select-none text-slate-350">
      
      {/* Session Tab and Pane controller header ribbon */}
      <div className="flex items-center justify-between border-b border-slate-900 bg-slate-935 px-4 h-9">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none h-full">
          {sessions.map(s => (
            <div
              key={s.id}
              onClick={() => setActiveSessionId(s.id)}
              className={`h-full px-3.5 flex items-center justify-center gap-2 border-r border-[#151a25] cursor-pointer text-xs font-semibold relative transition-colors ${
                s.id === activeSessionId
                  ? "bg-[#0c0e16] text-[#60a5fa]"
                  : "text-gray-500 hover:text-gray-300 hover:bg-[#0c0e16]/30"
              }`}
            >
              <Terminal className="w-3.5 h-3.5 shrink-0" />
              <span>{s.name}</span>
              {sessions.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => handleRemoveSession(s.id, e)}
                  className="p-0.5 rounded text-gray-600 hover:text-rose-450 hover:bg-white/5"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          {/* New session button */}
          <button
            onClick={handleAddSession}
            id="terminal-add-session-btn"
            className="p-1 hover:bg-slate-800 rounded text-gray-500 hover:text-white transition-colors cursor-pointer ml-1"
            title="Abrir nueva sesión de terminal"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Action controllers */}
        <div className="flex items-center gap-3">
          {activeSession.panes.length < 2 && (
            <button
              onClick={handleSplitSession}
              id="terminal-split-btn"
              className="flex items-center gap-1.5 py-1 px-2 rounded hover:bg-slate-800 text-[10.5px] font-mono text-gray-400 hover:text-[#60a5fa] cursor-pointer"
              title="Dividir en splits paralelos de terminal"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>SPLIT</span>
            </button>
          )}
          <span className="text-gray-800">|</span>
          <div className="flex items-center gap-1 cursor-pointer">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[9.5px] text-gray-500 font-mono hover:text-slate-300 transition-colors uppercase">
              Terminal activa: {activeSession.name}
            </span>
          </div>
        </div>
      </div>

      {/* Pane screen splits */}
      <div id="terminal-panes-deck" className="flex-1 flex overflow-hidden bg-slate-950 divide-x divide-slate-900 border-t border-white/[0.02]">
        
        {activeSession.panes.map(pane => {
          const isSelectedPane = activeSession.activePaneId === pane.id;
          
          return (
            <div
              key={pane.id}
              onClick={() => {
                setSessions(sessions.map(s => (s.id === activeSession.id ? { ...s, activePaneId: pane.id } : s)));
              }}
              className={`flex-1 flex flex-col overflow-hidden h-full animate-fadeIn transition-colors relative ${
                isSelectedPane ? "bg-[#06080c]" : "bg-[#06080c]/60 opacity-60 hover:opacity-90"
              }`}
            >
              
              {/* Floating shell configuration selector inside pane */}
              <div className="absolute right-3.5 top-2.5 z-10 flex items-center gap-1 select-none">
                <select
                  value={pane.shellType}
                  onChange={(e) => handleSwitchShell(pane.id, e.target.value as ShellType)}
                  className="bg-black/40 border border-white/5 rounded px-1.5 py-0.5 text-[9.5px] text-slate-400 font-mono focus:outline-none focus:border-[#60a5fa] cursor-pointer hover:text-white"
                >
                  <option value="bash">bash</option>
                  <option value="zsh">zsh</option>
                  <option value="fish">fish</option>
                  <option value="pwsh">pwsh</option>
                </select>
                
                {activeSession.panes.length > 1 && (
                  <button
                    onClick={() => handleUnsplitSession(pane.id)}
                    className="p-1 rounded bg-[#0b0c10] border border-white/5 text-gray-500 hover:text-rose-455 ml-1 cursor-pointer hover:bg-white/5"
                    title="Cerrar split de terminal"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Logs block screen */}
              <div
                ref={el => {
                  scrollRefs.current[`${activeSession.id}-${pane.id}`] = el;
                }}
                className="flex-1 p-4 overflow-y-auto space-y-1 font-mono text-xs text-gray-400 select-text scrollbar-thin"
              >
                {pane.history.map((log, idx) => {
                  let textClass = "text-gray-400";
                  if (log.startsWith("neon@workspace") || log.startsWith("➜") || log.startsWith("PS C:")) {
                    textClass = "text-sky-400 border-l border-sky-500/20 pl-1.5";
                  } else if (log.startsWith("=== SIMULATED") || log.startsWith("commit") || log.startsWith("^fffffff")) {
                    textClass = "text-[#818cf8] font-bold";
                  } else if (log.startsWith("[EJECUCIÓN]")) {
                    textClass = "text-amber-400 font-semibold";
                  } else if (log.startsWith("[STDOUT]")) {
                    textClass = "text-emerald-400";
                  } else if (log.includes("Error") || log.startsWith("cat: ") || log.includes("Error:")) {
                    textClass = "text-rose-400 font-semibold";
                  } else if (log.startsWith(" PS C:")) {
                    textClass = "text-sky-350";
                  }

                  return (
                    <div key={idx} className={`${textClass} leading-relaxed whitespace-pre-wrap font-mono font-normal`}>
                      {log}
                    </div>
                  );
                })}

                {/* Prompt Row */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    processTerminalCommand(pane.id, pane.input);
                  }}
                  className="flex items-center gap-1.5 pt-1.5 select-none"
                >
                  {/* CLI Powerline styling based on shell type */}
                  {pane.shellType === "bash" && (
                    <span className="text-sky-500 font-mono font-bold shrink-0">
                      neon@workspace:~/{currentWorkspace.name.toLowerCase().replace(/\s+/g, "-")}$
                    </span>
                  )}
                  {pane.shellType === "zsh" && (
                    <span className="text-emerald-400 font-mono shrink-0 flex items-center gap-1">
                      <span>➜</span>
                      <span className="text-gray-600 font-mono font-bold">[main]</span>
                      <span className="w-1.5 h-1.5 bg-[#4f46e5]/40 rounded-full animate-ping shrink-0" />
                    </span>
                  )}
                  {pane.shellType === "fish" && (
                    <span className="text-[#38bdf8] font-mono shrink-0 font-semibold">
                      ~/{currentWorkspace.name.toLowerCase().replace(/\s+/g, "-").slice(0, 15)} &gt;
                    </span>
                  )}
                  {pane.shellType === "pwsh" && (
                    <span className="text-[#a7f3d0] font-mono shrink-0">
                      PS C:\workspace\{currentWorkspace.name.replace(/\s+/g, "")}&gt;
                    </span>
                  )}

                  <input
                    type="text"
                    placeholder="Escribe 'help', 'ls', 'git status', 'python main.js'..."
                    value={pane.input}
                    onChange={(e) => handleInputChange(pane.id, e.target.value)}
                    className="flex-1 bg-transparent text-white border-none outline-none font-mono text-xs focus:ring-0 placeholder:text-gray-800"
                    autoFocus={isSelectedPane}
                  />
                </form>
              </div>

            </div>
          );
        })}

      </div>
    </div>
  );
}
