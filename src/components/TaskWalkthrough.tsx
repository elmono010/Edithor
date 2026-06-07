import React from "react";
import { TaskItem, ProposedEdit } from "../types";
import { 
  CheckSquare, 
  Square, 
  Loader2, 
  Play, 
  CheckCircle, 
  AlertCircle, 
  FileCode, 
  ShieldAlert, 
  ShieldCheck, 
  RefreshCw,
  Sparkles
} from "lucide-react";
import { motion } from "motion/react";

export interface TaskWalkthroughProps {
  tasks: TaskItem[];
  phase: "idle" | "planning" | "execution" | "verification" | "completed";
  onToggleTask?: (id: string) => void;
  currentFileBeingEdited?: string | null;
  verificationStatus?: "pending" | "success" | "error" | null;
  verificationLogs?: string[];
  onReset?: () => void;
  proposedEdits?: ProposedEdit[];
}

export default function TaskWalkthrough({
  tasks,
  phase,
  onToggleTask,
  currentFileBeingEdited,
  verificationStatus,
  verificationLogs = [],
  onReset,
  proposedEdits = []
}: TaskWalkthroughProps) {
  if (phase === "idle" && tasks.length === 0) return null;

  const isAllCompleted = tasks.length > 0 && (phase === "completed" || tasks.every(t => t.status === "completed"));

  // Header styles and labels
  let badgeColor = "bg-neutral-800 text-neutral-400 border-neutral-700";
  let bgGradient = "from-neutral-900/60 to-neutral-950/40 border-neutral-900";
  let title = "Agente Inactivo";
  let subtitle = "Esperando la siguiente instrucción...";

  if (phase === "planning") {
    badgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
    bgGradient = "from-amber-950/20 via-[#0e1017] to-amber-950/10 border-amber-500/15";
    title = "FASE 1: Planificando Pasos";
    subtitle = "La IA está descomponiendo la tarea en subtareas...";
  } else if (phase === "execution") {
    badgeColor = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
    bgGradient = "from-indigo-950/20 via-[#0e1017] to-indigo-950/10 border-indigo-500/15";
    title = "FASE 2: Ejecutando Cambios";
    subtitle = "Modificando archivos del editor de código...";
  } else if (phase === "verification") {
    badgeColor = "bg-sky-500/10 text-sky-400 border-sky-500/20 animate-pulse";
    bgGradient = "from-sky-950/20 via-[#0e1017] to-sky-950/10 border-sky-500/15";
    title = "FASE 3: Auto-Verificación";
    subtitle = "Comprobando la integridad de imports y LSP...";
  } else if (phase === "completed" || isAllCompleted) {
    badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    bgGradient = "from-emerald-950/15 via-[#0A0B0E] to-emerald-950/5 border-emerald-500/20";
    title = "¡Tarea Completada!";
    subtitle = "Todos los cambios se han verificado con éxito.";
  }

  // Extract unique modified file paths from proposedEdits during this session
  const modifiedFilenames = Array.from(
    new Set(proposedEdits.map((pe) => pe.filePath.split("/").pop()))
  ).filter(Boolean);

  return (
    <div className={`mx-3 my-2 p-3 rounded-xl bg-gradient-to-r ${bgGradient} border shadow-lg transition-all text-neutral-300 font-sans`}>
      {/* Header and Phase Title */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-neutral-900/60">
        <div className="min-w-0">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase ${badgeColor}`}>
            {phase === "planning" && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
            {phase === "execution" && <FileCode className="w-2.5 h-2.5 animate-pulse" />}
            {phase === "verification" && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
            {(phase === "completed" || isAllCompleted) && <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />}
            <span>{phase === "completed" || isAllCompleted ? "completado" : phase}</span>
          </span>
          <h4 className="text-[11.5px] font-bold text-neutral-100 tracking-wide mt-1.5 font-sans leading-none">{title}</h4>
          <p className="text-[9.5px] text-neutral-500 font-sans mt-1 leading-normal font-medium">{subtitle}</p>
        </div>

        {onReset && (phase === "completed" || isAllCompleted || tasks.length > 0) && (
          <button
            type="button"
            onClick={onReset}
            className="text-[9.5px] font-bold font-sans text-neutral-400 hover:text-emerald-400 border border-neutral-900 hover:border-emerald-500/20 px-2 py-1 rounded bg-[#0A0B0E] cursor-pointer transition-colors"
            title="Reiniciar rastrear walkthrough"
          >
            Aceptar
          </button>
        )}
      </div>

      {/* Conditionally Render SUMMARY or CHECKLIST list */}
      {isAllCompleted ? (
        /* SUMMARY FOR COMPLETED PLAN (Checklist is hidden / has disappeared) */
        <div className="space-y-3 pt-1 animate-fadeIn">
          <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[9px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Resumen de Trabajo Realizado</span>
          </div>

          <div className="space-y-1 bg-neutral-950/65 rounded-lg p-2 border border-neutral-900/60 text-[10.5px]">
            <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-wider font-mono">Tareas Ejecutadas con Éxito:</span>
            <div className="space-y-1 mt-1 max-h-[120px] overflow-y-auto scrollbar-thin">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-start gap-1.5 text-neutral-300">
                  <span className="text-emerald-500 select-none font-bold shrink-0">✓</span>
                  <span className="font-sans text-[10px]">{task.text}</span>
                </div>
              ))}
            </div>
          </div>

          {modifiedFilenames.length > 0 && (
            <div className="space-y-1">
              <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-wider font-mono block">Archivos Modificados:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {modifiedFilenames.map((name, i) => (
                  <span key={i} className="text-[8.5px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
                    📄 {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {verificationStatus === "success" && (
            <div className="flex items-center gap-1.5 p-1.5 rounded bg-emerald-500/5 text-emerald-400 font-sans text-[9px] font-semibold border border-emerald-500/10 mt-1">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
              <span>Auto-Verificación completada sin errores. Todo el proyecto compila correctamente.</span>
            </div>
          )}
        </div>
      ) : (
        /* STANDARD LIVING PLAN CHECKLIST */
        tasks.length > 0 && (
          <div className="space-y-1.5 my-2.5">
            <span className="text-[8.5px] font-bold uppercase tracking-wider text-neutral-450 font-mono block mb-1">
              Lista de Tareas Planificadas (::PLAN::)
            </span>
            <div className="space-y-1 max-h-[140px] overflow-y-auto scrollbar-thin rounded-lg bg-neutral-950/40 p-1.5 border border-neutral-900/60">
              {tasks.map((task) => {
                const checked = task.status === "completed";
                const isRunning = task.status === "running";
                
                let rowStyle = "text-neutral-400 hover:text-neutral-200";
                let badgeDot = "bg-neutral-800";
                
                if (checked) {
                  rowStyle = "text-neutral-500/80 line-through select-none";
                  badgeDot = "bg-emerald-500";
                } else if (isRunning) {
                  rowStyle = "text-indigo-300 font-semibold border-l-2 border-indigo-500/30 pl-1";
                  badgeDot = "bg-indigo-500 animate-ping";
                }

                return (
                  <motion.div 
                    key={task.id} 
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    onClick={() => onToggleTask?.(task.id)}
                    className={`flex items-start gap-2 py-1 px-1.5 rounded hover:bg-[#111219]/30 transition-all cursor-pointer text-[10.5px] font-sans ${rowStyle}`}
                  >
                    <button type="button" className="shrink-0 mt-0.5" aria-label={checked ? "Marcar incompleto" : "Marcar completo"}>
                      {checked ? (
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-500 animate-bounce" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-neutral-600 hover:text-indigo-400" />
                      )}
                    </button>
                    <span className="flex-1 break-words">{task.text}</span>
                    <div className="flex items-center shrink-0 h-4 pl-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${badgeDot}`} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* Real-time Execution Output (Fase 2) */}
      {phase === "execution" && currentFileBeingEdited && (
        <div className="p-2 border border-indigo-500/10 rounded-lg bg-[#07080b]/90 font-mono text-[9px] text-[#8e95ac] space-y-1 my-2.5 animate-pulse">
          <div className="flex items-center justify-between">
            <span className="text-neutral-400 font-bold uppercase text-[7.5px] px-1 bg-indigo-500/10 text-indigo-400 rounded">
              Editando Archivo
            </span>
            <span className="text-[7.5px] text-indigo-400 font-bold">Write In Progress</span>
          </div>
          <div className="flex items-center gap-1 text-neutral-200">
            <span className="text-indigo-400">⚡</span>
            <span className="truncate">{currentFileBeingEdited}</span>
          </div>
        </div>
      )}

      {/* Auto-Verification Checklist Output (Fase 3 & Done - only if not fully completed yet or if has errors) */}
      {!isAllCompleted && (phase === "verification" || phase === "completed") && (
        <div className="p-2 border border-[#1b343b]/40 rounded-lg bg-[#07090d]/90 font-mono text-[9px] space-y-1.5 my-2.5">
          <div className="flex items-center justify-between pb-1 border-b border-[#142328]">
            <span className="text-neutral-400 font-bold uppercase text-[7.5px] px-1 bg-sky-500/10 text-sky-400 rounded">
              AUTO-VERIFICACIÓN DE IMPORTS
            </span>
            <span className="text-[7.5px] font-mono text-neutral-500">Self-Check Module</span>
          </div>
          
          <div className="space-y-1 font-sans text-neutral-400 text-[9.5px]">
            {verificationLogs.length > 0 ? (
              verificationLogs.map((log, idx) => {
                const isCheck = log.startsWith("✓");
                const isError = log.includes("Error") || log.includes("Inconsistencia") || log.startsWith("✗");
                let color = "text-neutral-400";
                if (isCheck) color = "text-emerald-450";
                if (isError) color = "text-rose-400 font-semibold";
                return (
                  <div key={idx} className={`flex items-start gap-1 py-0.5 leading-normal ${color}`}>
                    <span className="shrink-0">{isCheck ? "✓" : isError ? "✗" : "•"}</span>
                    <span>{log.replace(/^[✓✗•]\s+/, "")}</span>
                  </div>
                );
              })
            ) : (
              <div className="flex items-center gap-1.5 text-neutral-600 italic">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                <span>Validando estructura de dependencias...</span>
              </div>
            )}
          </div>

          {verificationStatus === "success" && (
            <div className="flex items-center gap-1.5 p-1 rounded bg-emerald-500/5 text-emerald-400 font-sans text-[9.5px] font-semibold border border-emerald-500/10 mt-1">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>✓ Todos los imports coinciden con el FileTree actual.</span>
            </div>
          )}

          {verificationStatus === "error" && (
            <div className="flex items-center gap-1.5 p-1 rounded bg-rose-500/5 text-rose-450 font-sans text-[9.5px] font-semibold border border-rose-500/10 mt-1">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>Inconsistencias halladas. Solicitando auto-corrección...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
