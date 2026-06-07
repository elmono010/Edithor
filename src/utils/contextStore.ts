export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export interface ContextStoreItem {
  timestamp: string;
  userQuery: string;
  filesModified: string[];
  summary: string;
}

/**
 * Salva un nuevo resumen de sesión de edición de código en el Context Store local,
 * analizando el historial de chat reciente para auto-extraer detalles técnicos.
 */
export function saveWorkspaceContextSummary(
  workspaceId: string,
  userQuery: string,
  filesModified: string[],
  planTasks: string[],
  chatHistory?: ChatMessage[]
) {
  if (!workspaceId) return;
  const storeKey = `workspace_context_store_recaps_${workspaceId}`;
  let existingStore: ContextStoreItem[] = [];
  try {
    existingStore = JSON.parse(localStorage.getItem(storeKey) || "[]");
  } catch (e) {}

  // Analiza el historial reciente de chat si hay mensajes disponibles
  let technicalDetail = "";
  if (chatHistory && chatHistory.length > 0) {
    // Buscar el último mensaje del asistente que contiene la respuesta con código de la sesión actual
    const lastAssistantMessages = [...chatHistory]
      .reverse()
      .filter((msg) => msg.role === "assistant" && msg.content && msg.content.trim().length > 0);

    if (lastAssistantMessages.length > 0) {
      const assistantContent = lastAssistantMessages[0].content;
      
      // Intentar extraer subtítulos o explicaciones clave del texto omitiendo bloques grandes de código.
      // Filtramos líneas que no sean parte de ::UPDATED_FILE:: ni de bloques de código markdown grandes.
      const lines = assistantContent.split("\n");
      const cleanExplanationLines: string[] = [];
      let inCodeBlock = false;
      let inUpdatedFileBlock = false;

      for (let line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("```") || trimmed.includes("::UPDATED_FILE::")) {
          inCodeBlock = !inCodeBlock;
          continue;
        }
        if (trimmed.includes("::END_UPDATED_FILE::") || trimmed.includes("::END_PLAN::")) {
          continue;
        }
        if (inCodeBlock) continue;

        // Conservar líneas cortas explicativas o puntos clave de cambios
        if (trimmed && (trimmed.startsWith("-") || trimmed.startsWith("*") || trimmed.match(/^\d+\./) || trimmed.toLowerCase().includes("implement") || trimmed.toLowerCase().includes("crea") || trimmed.toLowerCase().includes("agrega") || trimmed.toLowerCase().includes("modifica") || trimmed.toLowerCase().includes("ajusta") || trimmed.toLowerCase().includes("corrige"))) {
          if (cleanExplanationLines.length < 4 && trimmed.length > 10 && trimmed.length < 150) {
            cleanExplanationLines.push(trimmed.replace(/^[-*•]\s*/, ""));
          }
        }
      }

      if (cleanExplanationLines.length > 0) {
        technicalDetail = cleanExplanationLines.map(l => `   - ${l}`).join("\n");
      }
    }
  }

  // Construit un string de resumen claro estructurado
  const dateFormatted = new Date().toLocaleTimeString();
  let summaryPart = planTasks.length > 0 
    ? `Completó el plan de tareas: ${planTasks.join(" ➔ ")}`
    : `Se realizaron ediciones directas sobre los archivos o comandos en respuesta a la solicitud '${userQuery}'.`;

  if (technicalDetail) {
    summaryPart += `\nDetalles Técnicos extraídos de la sesión:\n${technicalDetail}`;
  }

  const newItem: ContextStoreItem = {
    timestamp: new Date().toISOString(),
    userQuery: userQuery.length > 120 ? userQuery.slice(0, 120) + "..." : userQuery,
    filesModified,
    summary: `${summaryPart} [${dateFormatted}]`
  };

  // Mantener las últimas 5 sesiones de edición del workspace para no sobrecargar el almacenamiento local
  existingStore = [newItem, ...existingStore].slice(0, 5);
  localStorage.setItem(storeKey, JSON.stringify(existingStore));
}

/**
 * Recupera un historial de resúmenes estructurados listos para ser inyectados en el system prompt.
 */
export function getWorkspaceContextSummary(workspaceId: string): string {
  if (!workspaceId) return "";
  const storeKey = `workspace_context_store_recaps_${workspaceId}`;
  let existingStore: ContextStoreItem[] = [];
  try {
    existingStore = JSON.parse(localStorage.getItem(storeKey) || "[]");
  } catch (e) {}

  if (existingStore.length === 0) return "";

  let recapText = "[CONTEXT MEMORY SUMMARY - HISTORIAL DE RECIENTES SESIONES DE EDICIÓN EN ESTE WORKSPACE]:\n";
  recapText += "Este resumen te ayuda a RECORDAR el foco previo de desarrollo y decisiones técnicas tomadas, para evitar que borres, reescribas o deshagas modificaciones previas:\n";
  
  existingStore.forEach((item, index) => {
    recapText += `- Sesión #${index + 1} (${new Date(item.timestamp).toLocaleDateString()}):
  • Lo que pidió el usuario: "${item.userQuery}"
  • Archivos modificados: ${JSON.stringify(item.filesModified)}
  • Resumen técnico de la sesión: ${item.summary}\n`;
  });
  
  recapText += "\n⚠️ DIRECTIVA CRÍTICA: Prioriza siempre respetar y construir sobre los archivos modificados en estas sesiones anteriores, evitando reconstruirlos desde cero.\n\n";
  return recapText;
}
